import { BrandProfile, fallbackCalendar } from "@/lib/brand";
import { getRepo } from "@/lib/db/fileRepo";
import { ChatStore } from "@/lib/db/chatStore";
import { isStrictAiMode } from "@/lib/agents/runner";
import {
  AGENCY_ORG_CHART,
  buildManagerDirectives,
  reviewItemByContentManager,
} from "@/lib/agents/org";
import {
  auditRun,
  brandVoiceRun,
  ceoPlan,
  contentRun,
  criticRun,
  designerRun,
  performanceStrategyRun,
  researcherRun,
  seoRun,
  strategistRun,
  videoRun,
} from "@/lib/agents";
import { classifyIntent } from "@/lib/agents/intent";
import { buildClarifyingQuestions, optionalFollowUps } from "@/lib/agents/missingFacts";
import { renderCreative } from "@/lib/image/provider";
import { buildCampaignContext, contextToPrompt } from "@/lib/campaignContext";
import {
  buildMarketQueries,
  collectMarketTrends,
  eventsForMonth,
  benchmarksForIndustry,
  marketIntelligencePromptBlock,
  type MarketTrendItem,
} from "@/lib/market/intelligence";
import {
  createActiveTask,
  updateTaskWithUserInput,
  isTaskReadyToExecute,
  formatTaskContextPrompt,
} from "@/lib/agents/taskState";
import { extractFacts } from "@/lib/agents/factExtractor";
import {
  detectIndustry,
  recommendedChannelsFor,
  findContamination,
  type IndustryProfile,
} from "@/lib/agents/industry";
import {
  buildMandatoryRequirements,
  evaluateMandatoryGate,
  formatGateFailures,
  type ActualDeliverables,
  type QAGateResult,
} from "@/lib/agents/qaGate";
import { validateContent, checkDuplicatesForItem } from "@/lib/validation";
import type {
  ActiveTask,
  AgentActivity,
  AgentRole,
  Deliverable,
  DeliverableAudit,
  DeliverableBrandVoice,
  DeliverableCalendar,
  DeliverableClarifications,
  DeliverableCreatives,
  DeliverableCritic,
  DeliverableOverview,
  DeliverablePerformance,
  DeliverableResearch,
  DeliverableSeo,
  DeliverableStrategy,
  DeliverableSummary,
  DeliverableVideos,
  DeliverableContentPosts,
  DeliverableCrmLeads,
} from "@/types/chat";
import type { RequestIntent } from "@/lib/schemas";
import type { Item, Asset, Run } from "@/lib/db/repo";

export type OrchestrationEvent =
  | { type: "agent_update"; activity: AgentActivity }
  | { type: "text_chunk"; text: string }
  | { type: "deliverable"; deliverable: Deliverable }
  | { type: "completed"; summary: DeliverableSummary | null; campaignId?: string }
  | { type: "error"; error: string };

export interface OrchestrationInput {
  instruction: string;
  brand: BrandProfile;
  conversationId: string;
  attachments?: Array<{ name: string; type: string; contentPreview?: string }>;
  onEvent: (event: OrchestrationEvent) => void | Promise<void>;
  signal?: AbortSignal;
}

const CONCURRENCY = 6;
/** Per-stage soft budget for live LLM paths — keeps total wall clock bounded. */
const STAGE_TIMEOUT_MS = Number(process.env.ADVOS_STAGE_TIMEOUT_MS ?? 150_000);
/** Critical path (plan/strategy) gets a slightly higher budget before fallback. */
const CRITICAL_TIMEOUT_MS = Number(process.env.ADVOS_CRITICAL_TIMEOUT_MS ?? 120_000);

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      const item = items[i];
      if (item === undefined) continue;
      results[i] = await fn(item, i);
    }
  });
  await Promise.all(workers);
  return results;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function runAgencyOrchestration({
  instruction,
  brand,
  conversationId,
  attachments = [],
  onEvent,
  signal,
}: OrchestrationInput) {
  const guard = () => {
    if (signal?.aborted) {
      const err = new Error("Run cancelled");
      err.name = "AbortError";
      throw err;
    }
  };
  const repo = await getRepo();
  const startTime = Date.now();
  const attachmentText = attachments.map((a) => `${a.name} (${a.type}): ${a.contentPreview || ""}`).join("\n");

  const notifyAgent = (
    agent: AgentRole,
    displayName: string,
    avatar: string,
    status: AgentActivity["status"],
    currentTask?: string,
    latencyMs?: number,
    costUsd?: number,
    criticScore?: number,
    notes?: string,
    taskId?: string,
    inputSummary?: string,
    outputRef?: string,
    verificationResult?: "passed" | "revision_needed" | "pending"
  ) => {
    const orgMember = (AGENCY_ORG_CHART as Record<string, typeof AGENCY_ORG_CHART["ceo"]>)[agent];
    const reports_to = orgMember?.reports_to || (agent === "manager" ? "ceo" : undefined);
    const reviewerMember = reports_to ? (AGENCY_ORG_CHART as Record<string, typeof AGENCY_ORG_CHART["ceo"]>)[reports_to] : undefined;
    const reviewedBy = reviewerMember?.displayName || (agent !== "ceo" && agent !== "manager" ? "Digital Marketing Manager" : undefined);

    onEvent({
      type: "agent_update",
      activity: {
        agent,
        displayName,
        avatar,
        status,
        currentTask,
        startedAt: status === "in_progress" ? new Date().toISOString() : undefined,
        completedAt: status === "completed" ? new Date().toISOString() : undefined,
        latencyMs,
        costUsd,
        criticScore,
        notes,
        taskId,
        inputSummary,
        outputRef,
        verificationResult,
        reports_to,
        reviewedBy,
        managerRubric: orgMember?.rubric,
      },
    });
  };

  const runs: Run[] = [];
  const selectedAgents = new Set<string>();
  const executedAgents = new Set<string>();
  const verifiedAgents = new Set<string>();
  const failedAgentStages: string[] = [];

  const track = <T extends { run: { agent: string; costUsd: number; latencyMs: number; status: string; model: string; tokens: { input: number; output: number }; provider?: string; fallback?: boolean; error?: string } }>(r: T): T => {
    runs.push({
      agent: r.run.agent,
      costUsd: r.run.costUsd,
      latencyMs: r.run.latencyMs,
      status: r.run.status as Run["status"],
      model: r.run.model,
      provider: r.run.provider || "gemini",
      fallback: r.run.fallback ?? (r.run.status === "fallback"),
      error: r.run.error,
      inputTokens: r.run.tokens.input,
      outputTokens: r.run.tokens.output,
      created_at: new Date().toISOString(),
    });
    executedAgents.add(r.run.agent);
    if (r.run.status === "ok") verifiedAgents.add(r.run.agent);
    return r;
  };

  const totalCost = () => Number(runs.reduce((s, r) => s + r.costUsd, 0).toFixed(6));

  try {
    // ── Phase 0: Task Context & Continuity Check ─────────────────────────────
    guard();
    const existingTask = conversationId ? ChatStore.getTask(conversationId) : null;
    const isGreetingOnly =
      /^(hello|hi|hey|kya haal|namaste|good\s*(morning|afternoon|evening))\b/i.test(instruction.trim()) &&
      Object.keys(extractFacts(instruction).facts).length === 0;

    let activeTask: ActiveTask;
    let isContinuation = false;

    if (existingTask && (existingTask.status === "COLLECTING_FACTS" || existingTask.status === "TASK_CREATED") && !isGreetingOnly) {
      isContinuation = true;
      notifyAgent("manager", "AI Agency Manager", "👔", "in_progress", "Integrating client details into active task...", undefined, undefined, undefined, "Task Continuity Active", existingTask.id);
      activeTask = updateTaskWithUserInput(existingTask, instruction);
    } else {
      notifyAgent("manager", "AI Agency Manager", "👔", "thinking", "Analyzing objective and architecting agency workflow...");
      const tClassify = Date.now();

      // Instant heuristic path first for fast ack; LLM classify runs with timeout.
      let intentResult: { intent: RequestIntent; source: "llm" | "heuristic" };
      try {
        intentResult = await withTimeout(
          classifyIntent(instruction, brand, attachmentText),
          Number(process.env.ADVOS_INTENT_TIMEOUT_MS ?? 12_000),
          "classifyIntent"
        );
      } catch {
        const { heuristicIntent } = await import("@/lib/agents/intent");
        intentResult = { intent: heuristicIntent(instruction), source: "heuristic" };
      }
      const { intent } = intentResult;

      if (intent.kind === "general_chat") {
        await onEvent({
          type: "text_chunk",
          text:
            `Hello! Main AdvertiseOS ka **AI Agency Manager** hoon.\n\n` +
            `Meri agency team me 7 specialists active hain:\n` +
            `1. **AI Strategist**: Campaign roadmaps, positioning & 30-day content calendar\n` +
            `2. **Market Researcher**: Competitor benchmarking, audience personas & trends\n` +
            `3. **Brand Voice**: Tone fidelity, messaging pillars & guideline compliance\n` +
            `4. **Performance Marketing**: Paid ad funnels, Meta/Google ads & budget allocation\n` +
            `5. **SEO/SEM**: Keyword clusters, search intent & technical checklists\n` +
            `6. **Creative Agent**: Social copy, 9:16 reel scripts & visual design briefs\n` +
            `7. **Critic / QA**: Strict rubric evaluation & automatic revisions\n\n` +
            `Aap kya banana chahte hain? Example:\n` +
            `* *"30-day Instagram strategy with 12 posts and 4 Reels for your brand"*\n` +
            `* *"Analyze my top 5 competitors with source citations"*\n` +
            `* *"Build an SEO strategy with keyword clusters"*`,
        });
        notifyAgent("manager", "AI Agency Manager", "👔", "completed", "Answered general query", Date.now() - tClassify, 0);
        onEvent({ type: "completed", summary: null });
        return;
      }

      activeTask = createActiveTask(conversationId, instruction, intent);
      activeTask.industryKey = detectIndustry([instruction], brand, intent).key;
    }

    const industry: IndustryProfile = detectIndustry(
      [activeTask.originalRequest, instruction],
      brand,
      activeTask.intent
    );
    activeTask.industryKey = industry.key;

    // ── Phase 1: Fact Verification & Readiness Gate ──────────────────────────
    const { ready, missingRequired } = isTaskReadyToExecute(activeTask);

    if (!ready) {
      activeTask.status = "COLLECTING_FACTS";
      const missingFactsObj = missingRequired.map((f) => ({
        fact: f,
        question:
          f === "location"
            ? "Business / project ki exact location (city / area / address) kya hai?"
            : f === "price_range"
              ? "Verified price range ya starting price kya hai (unit ke saath)?"
              : f === "budget"
                ? "Is campaign ka marketing / advertising budget kitna hai (jaise ₹10,000/month)?"
                : `Verified details required for ${f}`,
        blocking: true,
      }));
      activeTask.missingQuestions = missingFactsObj;
      ChatStore.saveTask(activeTask);

      const clarifications: DeliverableClarifications = {
        kind: "clarifications",
        questions: missingFactsObj,
        canProceedWithDraft: true,
        proceedNote: "Fictional/demo data specify karne par system DEMO MODE me turant complete campaign generate karega.",
        optionalFollowUps: optionalFollowUps(),
      };
      onEvent({ type: "deliverable", deliverable: clarifications });

      await onEvent({
        type: "text_chunk",
        text:
          `Main campaign plan kar raha hoon, lekin accurate campaign-specific copy aur ad strategy ke liye verified details chahiye:\n\n` +
          missingFactsObj.map((q, i) => `${i + 1}. **${q.question}**`).join("\n") +
          `\n\n*(Note: Agar aap test kar rahe hain, toh aap 'fictional demo data' bol sakte hain — agency demo mode me complete 30-day package produce karegi).*`,
      });

      notifyAgent(
        "manager",
        "AI Agency Manager",
        "👔",
        "completed",
        `Awaiting ${missingRequired.length} detail(s)`,
        Date.now() - startTime,
        0,
        undefined,
        "Fact Collection Mode",
        activeTask.id,
        "Collecting business facts",
        "Clarifications Required"
      );
      onEvent({ type: "completed", summary: null });
      return;
    }

    // ── Transition to Execution ──────────────────────────────────────────────
    activeTask.status = "READY_TO_EXECUTE";
    ChatStore.saveTask(activeTask);

    if (isContinuation) {
      await onEvent({
        type: "text_chunk",
        text: `All required details collected${activeTask.isDemoMode ? " (Demo Mode active: Fictional Data)" : ""}. Starting your ${activeTask.deliverableRequirements.durationDays}-day campaign workflow...\n\n`,
      });
    }

    // ── Prepare Campaign Context (brand-scoped only) ─────────────────────────
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const displayMonth = now.toLocaleString("en-US", { month: "long", year: "numeric" });
    const catalog = await repo.listCatalog(brand.id);
    const activeCatalog = catalog.filter((c) => c.status === "active").slice(0, 5);
    // Trends are brand-scoped when possible — never inject another client's trends blindly.
    let trends: Awaited<ReturnType<typeof repo.listTrends>> = [];
    try {
      trends = await repo.listTrends(8);
    } catch {
      trends = [];
    }
    // Live multi-source market intel starts in parallel — never blocks first draft.
    // Disabled in tests (LLM_PROVIDER=fake) so offline suites don't hang on network.
    const marketIntelEnabled =
      process.env.LLM_PROVIDER !== "fake" &&
      process.env.ADVOS_DISABLE_MARKET_INTEL !== "1";
    const marketIntelPromise: Promise<{
      liveTrends: MarketTrendItem[];
      trendSourceNames: string[];
    }> = (async () => {
      if (!marketIntelEnabled) {
        return { liveTrends: [] as MarketTrendItem[], trendSourceNames: [] as string[] };
      }
      try {
        const marketQueries = buildMarketQueries(
          brand,
          industry.key,
          activeCatalog.flatMap((c) => c.tags).slice(0, 3)
        );
        const collected = await Promise.race([
          collectMarketTrends({ queries: marketQueries, maxItems: 24 }),
          new Promise<{ items: MarketTrendItem[]; errors: string[]; sources: string[] }>((resolve) =>
            setTimeout(() => resolve({ items: [], errors: ["market-intel timeout"], sources: [] }), 5000)
          ),
        ]);
        return { liveTrends: collected.items, trendSourceNames: collected.sources };
      } catch {
        return { liveTrends: [] as MarketTrendItem[], trendSourceNames: [] as string[] };
      }
    })();
    // Stored trends available immediately for first context build.
    const storedTrendFeed = trends.map((t) => ({
      title: t.title,
      url: t.url,
      source: t.source,
      publishedAt: t.publishedAt,
    }));
    const upcomingEvents = eventsForMonth(month);
    const industryBenchmarks = benchmarksForIndustry(industry.key);
    const campaignId = activeTask.campaignId || `cmp-agency-${Date.now()}`;
    activeTask.campaignId = campaignId;
    const budgetRaw = activeTask.deliverableRequirements.budget;
    // Never invent a media budget — if the client didn't state one, surface that honestly.
    const budget = budgetRaw && budgetRaw > 0 ? budgetRaw : null;
    const budgetLabel = budget ? `₹${budget.toLocaleString("en-IN")}` : "not stated";
    const platforms = activeTask.deliverableRequirements.platforms?.length
      ? activeTask.deliverableRequirements.platforms
      : ["instagram"];
    const requiredPosts = activeTask.deliverableRequirements.postsCount;
    const requiredReels = activeTask.deliverableRequirements.reelsCount;
    const requiredBriefs = activeTask.deliverableRequirements.visualBriefCount ?? 0;

    // Context isolation: never mark Sample Brand data as this client's packages.
    const isSampleBrand = brand.id === "sample-brand" || /sample data/i.test(brand.name);
    const taskContextText = formatTaskContextPrompt(activeTask);
    const context = buildCampaignContext({
      campaignId,
      brand: isSampleBrand
        ? {
            ...brand,
            name: `${brand.name} [DEMO ONLY — do not treat catalog prices as this client's pricing]`,
          }
        : brand,
      brief: {
        goal: activeTask.originalRequest,
        month,
        budget: budget ?? undefined,
        // Offers: only a verified price_range fact qualifies — never let a corrupted
        // fragment (e.g. "s/claims" from "prices/claims") become the offer line.
        offers:
          (activeTask.collectedFacts.price_range?.value &&
            activeTask.collectedFacts.price_range.dataClassification !== "demo" &&
            activeTask.collectedFacts.price_range.value.length <= 60
            ? activeTask.collectedFacts.price_range.value
            : "") || (isSampleBrand ? "" : brand.usp) || "",
        festivals: upcomingEvents.map((e) => `${e.date} ${e.name}`).join("; "),
        notes: `${attachmentText}\n\n${taskContextText}`,
      },
      catalog: isSampleBrand ? [] : activeCatalog,
      trends: storedTrendFeed,
      constraints: {
        channels: platforms,
        formats: activeTask.deliverableRequirements.formats,
        minPosts: Math.min(requiredPosts, 12),
        maxPosts: requiredPosts,
      },
    });
    const marketIntelBlock = marketIntelligencePromptBlock({
      industryKey: industry.key,
      month,
      trends: storedTrendFeed.map((t) => ({
        title: t.title,
        source: t.source,
        sourceKind: "stored",
      })),
    });
    let fullContextPrompt = `${contextToPrompt(context)}\n${marketIntelBlock}\n${taskContextText}`;
    // Live trends + sources captured for research card once market intel resolves.
    let trendFeed: Array<{ title: string; url: string; source: string; publishedAt: string }> = [...storedTrendFeed];
    let trendSourceNames: string[] = ["Google News (stored)"];

    // ── Emit Overview Deliverable Card Immediately (industry-aware) ──────────
    // Project name priority: extracted business/brand name > brand profile name.
    // A client brief that names the business ("We run X") must never render the
    // workspace's generic Sample Brand name or a corrupted fact fragment.
    const extractedName =
      activeTask.collectedFacts.business_name?.value ||
      activeTask.collectedFacts.brand_name?.value ||
      "";
    const projectName = extractedName || brand.name.replace(/\s*\(Sample data\)\s*$/i, "").trim() || "Campaign";
    const locationValue = activeTask.collectedFacts.location?.value;
    const overviewDeliverable: DeliverableOverview = {
      kind: "overview",
      brandName: brand.name,
      projectName,
      location: locationValue || (industry.requiresLocation ? "Location pending" : "N/A (not required for this vertical)"),
      priceRange: activeTask.collectedFacts.price_range?.value || (industry.requiresPriceRange ? "Price range pending" : "Not applicable"),
      budget: budget ? `₹${budget.toLocaleString("en-IN")}/month` : "Not stated by client",
      isDemoMode: activeTask.isDemoMode,
      objectives: industry.objectiveDefaults,
      targetAudience: industry.audienceDefaults,
      deliverablesSummary: {
        postsCount: requiredPosts,
        reelsCount: requiredReels,
        calendarDays: activeTask.deliverableRequirements.durationDays,
        adBudget: budget ? `₹${budget.toLocaleString("en-IN")}` : "Not stated",
      },
      additionalDeliverables: [
        `${requiredPosts} unique posts with hooks, captions, CTAs and hashtags`,
        `${requiredReels} complete 9:16 reel scripts with scene breakdowns`,
        `${requiredBriefs} individual visual design briefs`,
        `${activeTask.deliverableRequirements.durationDays}-day content calendar on ${(platforms || ["instagram"]).join(", ")}`,
        "Audience personas and strategic positioning",
        "Critic QA with hard mandatory acceptance rules",
      ],
    };
    if (
      activeTask.intent.kind === "full_campaign" ||
      activeTask.intent.kind === "content_calendar" ||
      activeTask.intent.kind === "strategy_only"
    ) {
      onEvent({ type: "deliverable", deliverable: overviewDeliverable });
    }

    // ── Ack + First useful text immediately ──────────────────────────────────
    await onEvent({
      type: "text_chunk",
      text:
        `### 🚀 Agency workflow started\n\n` +
        `**Industry:** ${industry.label} · **Platforms:** ${(platforms || ["instagram"]).join(", ")} · **Targets:** ${requiredPosts} posts · ${requiredReels} reels · ${requiredBriefs} design briefs\n\n` +
        `Strategy and calendar stream first; posts, reels and briefs follow in parallel.\n`,
    });

    // ── Specialist Roster Registration ───────────────────────────────────────
    activeTask.status = "PLANNING";
    ChatStore.saveTask(activeTask);

    notifyAgent("manager", "AI Agency Manager", "👔", "in_progress", "Dispatching tasks across selected agency specialists", undefined, undefined, undefined, "DAG Pipeline Active", activeTask.id, "Campaign brief & business facts", "Coordinating specialists");

    const needsResearch = activeTask.intent.needs_research || activeTask.intent.kind === "research_only";
    const needsBrandVoice = activeTask.intent.needs_brand_voice || activeTask.intent.kind === "brand_voice_only";
    const needsSeo = activeTask.intent.needs_seo || activeTask.intent.kind === "seo_only";
    const needsPerformance =
      activeTask.intent.needs_performance || activeTask.intent.kind === "performance_only";
    const needsCrm = activeTask.intent.needs_crm || activeTask.intent.kind === "crm_only";
    const needsStrategy =
      activeTask.intent.kind === "full_campaign" ||
      activeTask.intent.kind === "strategy_only" ||
      activeTask.intent.needs_strategy;
    const needsCalendar =
      activeTask.intent.kind === "full_campaign" ||
      activeTask.intent.kind === "content_calendar" ||
      activeTask.intent.needs_calendar;
    const needsContent =
      activeTask.intent.kind === "full_campaign" ||
      activeTask.intent.kind === "content_calendar" ||
      activeTask.intent.kind === "single_content" ||
      activeTask.intent.needs_content;
    const needsCreatives = requiredBriefs > 0 || activeTask.intent.kind === "creative_only";
    const needsVideos = requiredReels > 0 || activeTask.intent.kind === "video_only";

    if (needsResearch) selectedAgents.add("researcher");
    if (needsBrandVoice) selectedAgents.add("brand_voice");
    if (needsStrategy || needsCalendar) selectedAgents.add("strategist");
    if (needsContent || needsCreatives || needsVideos) selectedAgents.add("creative");
    if (needsSeo) selectedAgents.add("seo");
    if (needsPerformance) selectedAgents.add("performance");
    if (needsCrm) selectedAgents.add("crm");
    selectedAgents.add("ceo");
    selectedAgents.add("critic");

    // ── STAGE 1: Parallel Intelligence (Researcher & Brand Voice) ───────────
    guard();
    let researchDeliverable: DeliverableResearch | null = null;
    let brandVoiceDeliverable: DeliverableBrandVoice | null = null;
    const intelTasks: Promise<void>[] = [];

    if (needsResearch) {
      intelTasks.push(
        (async () => {
          notifyAgent("researcher", "Market Researcher", "🔍", "in_progress", "Benchmarking competitors & audience personas", undefined, undefined, undefined, undefined, activeTask.id, "Auditing competitors & personas");
          const tStart = Date.now();
          try {
            const res = track(await withTimeout(researcherRun(brand, fullContextPrompt, activeTask.originalRequest), STAGE_TIMEOUT_MS, "researcher"));
            const rData = res.data;
            researchDeliverable = {
              kind: "research",
              brandName: brand.name,
              industry: rData.industry || industry.label,
              researchDate: rData.research_date || new Date().toISOString().slice(0, 10),
              competitors: (rData.competitors || []).map((c) => ({
                name: c.name || "Competitor",
                url: c.url,
                strengths: c.strengths || [],
                weaknesses: c.weaknesses || [],
                marketGap: c.market_gap || "",
                sourceUrl: c.source_url,
              })),
              targetPersonas: (rData.target_personas || []).map((p) => ({
                name: p.name || "Target Persona",
                painPoints: p.pain_points || [],
                motivations: p.motivations || [],
                preferredChannels: p.preferred_channels || [],
              })),
              marketOpportunities: rData.market_opportunities || [],
              sources: rData.sources || [],
              trends: trendFeed.slice(0, 8).map((t) => ({
                title: t.title,
                url: t.url,
                source: t.source,
                publishedAt: t.publishedAt,
              })),
              seasonalEvents: upcomingEvents.slice(0, 6).map((e) => ({
                date: e.date,
                name: e.name,
                angle: e.angle,
                market: e.market,
              })),
              benchmarks: industryBenchmarks,
              dataSources: [
                ...trendSourceNames,
                "Google Search grounding",
                "2026 seasonal calendar",
                "industry planning benchmarks",
              ].filter(Boolean),
            };
            onEvent({ type: "deliverable", deliverable: researchDeliverable });
            notifyAgent("researcher", "Market Researcher", "🔍", "completed", `Benchmarked ${(rData.competitors || []).length} competitors`, Date.now() - tStart, res.run.costUsd, undefined, undefined, activeTask.id, "Competitor audit", "Deliverable: Market Research", "passed");
          } catch (e) {
            failedAgentStages.push("researcher");
            notifyAgent("researcher", "Market Researcher", "🔍", "error", `Research failed: ${e instanceof Error ? e.message : String(e)}`, Date.now() - tStart, 0, undefined, undefined, activeTask.id, "Competitor audit", "No research deliverable", "revision_needed");
          }
        })()
      );
    }

    if (needsBrandVoice) {
      intelTasks.push(
        (async () => {
          notifyAgent("brand_voice", "Brand Voice Agent", "🎙️", "in_progress", "Synthesizing tone guidelines & compliance guardrails", undefined, undefined, undefined, undefined, activeTask.id, "Tone guidelines & rules");
          const tStart = Date.now();
          try {
            const res = track(await withTimeout(brandVoiceRun(brand, fullContextPrompt), STAGE_TIMEOUT_MS, "brand_voice"));
            const bv = res.data;
            brandVoiceDeliverable = {
              kind: "brand_voice",
              brandName: brand.name,
              toneDescriptors: bv.tone_descriptors || [brand.tone || "Professional", "Direct", "Transparent"],
              coreMessagingPillars: bv.core_messaging_pillars || industry.contentPillars.slice(0, 3),
              vocabularyDos: bv.vocabulary_dos || ["Clear CTA", "Honest claims", "Customer-first"],
              vocabularyDonts: bv.vocabulary_donts || ["Fake awards", "Invented stats", "Guarantees"],
              complianceRules: bv.compliance_rules || ["No invented prices or testimonials", "Only user-provided or verified facts"],
              sampleVoiceComparison: {
                inCharacter: bv.sample_voice_comparison?.in_character || `Welcome to ${projectName} — crafted for real customers.`,
                outOfCharacter: bv.sample_voice_comparison?.out_of_character || "Get rich quick with cheap offers today!",
              },
            };
            onEvent({ type: "deliverable", deliverable: brandVoiceDeliverable });
            notifyAgent("brand_voice", "Brand Voice Agent", "🎙️", "completed", `Locked ${(bv.tone_descriptors || []).join(", ") || "tone"} guidelines`, Date.now() - tStart, res.run.costUsd, undefined, undefined, activeTask.id, "Brand guidelines", "Deliverable: Brand Voice", "passed");
          } catch (e) {
            failedAgentStages.push("brand_voice");
            notifyAgent("brand_voice", "Brand Voice Agent", "🎙️", "error", `Brand voice failed: ${e instanceof Error ? e.message : String(e)}`, Date.now() - tStart, 0, undefined, undefined, activeTask.id, "Brand guidelines", "No brand voice deliverable", "revision_needed");
          }
        })()
      );
    }

    // Intelligence runs in background — strategy/content must NOT wait on research.
    const intelPromise = Promise.allSettled(intelTasks);

    // Merge live market intel into strategy prompt (bounded wait — first draft already emitted).
    try {
      const live = await Promise.race([
        marketIntelPromise,
        new Promise<{ liveTrends: MarketTrendItem[]; trendSourceNames: string[] }>((resolve) =>
          setTimeout(
            () => resolve({ liveTrends: [], trendSourceNames: [] }),
            4000
          )
        ),
      ]);
      if (live.liveTrends.length) {
        trendFeed = [
          ...live.liveTrends.map((t) => ({ title: t.title, url: t.url, source: t.source, publishedAt: t.publishedAt })),
          ...storedTrendFeed,
        ].slice(0, 10);
        trendSourceNames = live.trendSourceNames.length ? live.trendSourceNames : trendSourceNames;
        const liveBlock = marketIntelligencePromptBlock({
          industryKey: industry.key,
          month,
          trends: trendFeed.map((t) => ({ title: t.title, source: t.source, sourceKind: "live" })),
        });
        // Replace stored market block with live-enriched version for strategy/content.
        fullContextPrompt = `${contextToPrompt(context)}\n${liveBlock}\n${taskContextText}`;
      }
    } catch {
      /* keep stored intel */
    }

    // ── STAGE 2: Strategy Roadmap & Calendar (parallel plan + strategy) ─────
    guard();
    notifyAgent("strategist", "AI Strategist", "🎯", "in_progress", "Architecting campaign positioning, plan & calendar", undefined, undefined, undefined, undefined, activeTask.id, "Full campaign context & brief");
    const tStrat = Date.now();
    const planFallback = ceoPlanFallbackSafe(activeTask.originalRequest);
    const strategyFallback = strategistFallbackSafe(brand, industry, platforms);
    const [planRes, strategyRes] = await Promise.all([
      withTimeout(ceoPlan(brand, fullContextPrompt), CRITICAL_TIMEOUT_MS, "ceoPlan")
        .then(track)
        .catch((e) => {
          failedAgentStages.push("ceoPlan");
          console.warn("ceoPlan failed/timeout — using structural fallback:", e);
          return {
            data: planFallback,
            run: {
              agent: "ceo" as const,
              input: "",
              output: planFallback,
              tokens: { input: 0, output: 0 },
              costUsd: 0,
              latencyMs: Date.now() - tStrat,
              status: "fallback" as const,
              model: "fallback",
            },
          };
        }),
      withTimeout(strategistRun(brand, fullContextPrompt, month), CRITICAL_TIMEOUT_MS, "strategist")
        .then(track)
        .catch((e) => {
          failedAgentStages.push("strategist");
          console.warn("strategist failed/timeout — using structural fallback:", e);
          return {
            data: strategyFallback,
            run: {
              agent: "strategist" as const,
              input: "",
              output: strategyFallback,
              tokens: { input: 0, output: 0 },
              costUsd: 0,
              latencyMs: Date.now() - tStrat,
              status: "fallback" as const,
              model: "fallback",
            },
          };
        }),
    ]);

    // ── Hierarchy: CEO Issues Directives to 3 Managers ──────────────────────
    const managerDirectives = buildManagerDirectives(
      planRes.data.objectives,
      planRes.data.kpis,
      industry.label
    );

    notifyAgent(
      "marketing_manager",
      "Digital Marketing Manager",
      "🎯",
      "in_progress",
      managerDirectives.marketing,
      Date.now() - tStrat,
      0,
      undefined,
      "Directive received from CEO",
      activeTask.id,
      "CEO Objectives & KPIs"
    );
    notifyAgent(
      "content_manager",
      "Content Manager",
      "✍️",
      "in_progress",
      managerDirectives.content,
      Date.now() - tStrat,
      0,
      undefined,
      "Directive received from CEO",
      activeTask.id,
      "CEO Objectives & KPIs"
    );
    notifyAgent(
      "performance_manager",
      "Performance Manager",
      "📈",
      "in_progress",
      managerDirectives.performance,
      Date.now() - tStrat,
      0,
      undefined,
      "Directive received from CEO",
      activeTask.id,
      "CEO Objectives & KPIs"
    );

    const strategyDeliverable: DeliverableStrategy = {
      kind: "strategy",
      month: displayMonth,
      objectives: planRes.data.objectives,
      kpis: planRes.data.kpis,
      pillars: strategyRes.data.content_pillars?.length ? strategyRes.data.content_pillars : industry.contentPillars,
      audienceInsights: strategyRes.data.audience_insights?.length
        ? strategyRes.data.audience_insights
        : industry.audienceDefaults,
      tactics: planRes.data.tasks.map((t) => `${t.agent.toUpperCase()}: ${t.description}`),
      positioning:
        strategyRes.data.positioning ||
        `${projectName} is positioned for ${industry.audienceDefaults[0]} via ${platforms.join(", ")}.`,
      planB: strategyRes.data.plan_b || "If primary channels underperform, double down on the best-performing format and tighten the offer CTA.",
      recommendedChannels: recommendedChannelsFor(platforms, industry.key),
      budgetAssumptions: budget
        ? `Monthly media allocation: ₹${budget.toLocaleString("en-IN")}. 50% ToFU, 30% MoFU, 20% BoFU.`
        : `Media budget not stated by client — allocation is percentage-based (50% ToFU / 30% MoFU / 20% BoFU) until a ₹ figure is confirmed.`,
      risks: planRes.data.risks?.length
        ? planRes.data.risks
        : ["Missing brand facts — flag instead of inventing claims."],
      executiveSummary:
        strategyRes.data.executive_summary ||
        `A ${activeTask.deliverableRequirements.durationDays}-day ${platforms.join("/")} plan for ${projectName} focused on ${industry.objectiveDefaults[0]}.`,
      audienceSegments: strategyRes.data.audience_segments,
      funnelStages: strategyRes.data.funnel_stages,
    };

    if (needsStrategy) {
      onEvent({ type: "deliverable", deliverable: strategyDeliverable });
    }

    // Calendar — respect requested platforms only
    const allowedPlatformSet = new Set(platforms.map((p) => p.toLowerCase()));
    let calendarItems =
      strategyRes.data.calendar && strategyRes.data.calendar.length > 0
        ? strategyRes.data.calendar.map((c) => ({
            ...c,
            platform: (allowedPlatformSet.has(String(c.platform).toLowerCase())
              ? c.platform
              : platforms[0] || "instagram") as CalendarItemPlatform,
          }))
        : [];

    if (calendarItems.length === 0) {
      const topicSeeds = [
        ...industry.contentPillars,
        `${projectName} customer story angle`,
        `How to choose ${brand.products.split(",")[0] || "the right product"} with confidence`,
        `Behind the scenes at ${projectName}`,
        `Weekend special for ${(industry.audienceDefaults[0] ?? "customers").slice(0, 40)}...`,
        `FAQ: Everything about ${brand.products.split(",")[0] || "our offer"}`,
        `Social proof (only if verified — else educational tip)`,
        `Seasonal / local moment relevant to ${industry.label}`,
        `Product or service deep-dive`,
        `Myth vs fact in ${industry.label}`,
        `Store / team / kitchen highlight`,
        `Clear CTA post: WhatsApp, visit or order`,
      ];
      calendarItems = Array.from({ length: Math.max(requiredPosts, 12) }, (_, i) => {
        const platform = platforms[i % platforms.length] || "instagram";
        const format = (i % 4 === 0 ? "reel" : i % 4 === 1 ? "carousel" : i % 4 === 2 ? "post" : "carousel") as CalendarItemFormat;
        return {
          date: (() => {
            const d = new Date(now.getFullYear(), now.getMonth(), Math.min(30, i + 1));
            return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          })(),
          platform: platform as CalendarItemPlatform,
          format,
          topic: topicSeeds[i % topicSeeds.length] as string,
          goal: industry.contentPillars[i % industry.contentPillars.length] as string,
          hook: `${topicSeeds[i % topicSeeds.length]} — short, specific hook for day ${i + 1}.`,
          pillar: industry.contentPillars[i % industry.contentPillars.length] as string,
        };
      });
    }

    // Enforce exact post count + platform filter
    calendarItems = calendarItems
      .filter((c) => allowedPlatformSet.has(String(c.platform).toLowerCase()) || platforms.length <= 1)
      .map((c) => ({
        ...c,
        platform: (allowedPlatformSet.has(String(c.platform).toLowerCase())
          ? c.platform
          : platforms[0] || "instagram") as CalendarItemPlatform,
      }));
    while (calendarItems.length < requiredPosts) {
      const i = calendarItems.length;
      const platform = platforms[i % platforms.length] || "instagram";
      calendarItems.push({
        date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(Math.min(30, i + 1)).padStart(2, "0")}`,
        platform: platform as CalendarItemPlatform,
        format: "post" as CalendarItemFormat,
        topic: `${industry.contentPillars[i % industry.contentPillars.length]} — angle ${i + 1}`,
        goal: industry.contentPillars[i % industry.contentPillars.length] as string,
        hook: `Unique day ${i + 1} hook for ${projectName}.`,
        pillar: industry.contentPillars[i % industry.contentPillars.length] as string,
      });
    }
    calendarItems = calendarItems.slice(0, requiredPosts);

    if (needsCalendar) {
      onEvent({
        type: "deliverable",
        deliverable: {
          kind: "calendar",
          month: displayMonth,
          items: calendarItems,
        },
      });
    }

    notifyAgent(
      "strategist",
      "AI Strategist",
      "🎯",
      "completed",
      `Strategy ready with ${calendarItems.length}-slot content calendar`,
      Date.now() - tStrat,
      (planRes?.run.costUsd ?? 0) + strategyRes.run.costUsd,
      undefined,
      undefined,
      activeTask.id,
      "Positioning & Calendar",
      "Deliverable: Strategy & Calendar",
      "passed"
    );

    // ── STAGE 3: Parallel Production ────────────────────────────────────────
    guard();
    activeTask.status = "AGENT_EXECUTION";
    ChatStore.saveTask(activeTask);

    const calendarSlice = calendarItems.slice(0, requiredPosts);
    let contentResults: Array<Awaited<ReturnType<typeof contentRun>> | null> = [];
    const creativeDeliverables: DeliverableCreatives["items"] = [];
    const videoDeliverables: DeliverableVideos["plans"] = [];
    const campaignAssets: Asset[] = [];
    const productionTasks: Promise<void>[] = [];

    // 1. Creative Agent: posts + visual briefs + reels
    if (needsContent || needsCreatives || needsVideos) {
      productionTasks.push(
        (async () => {
          notifyAgent(
            "creative",
            "Creative Production",
            "🎨",
            "in_progress",
            `Crafting ${requiredPosts} posts, ${requiredBriefs} design briefs & ${requiredReels} reel scripts`,
            undefined,
            undefined,
            undefined,
            undefined,
            activeTask.id,
            `${requiredPosts} topics & design templates`
          );
          const tCreative = Date.now();

          // Posts with dedup-aware sequential batches (previous content injected)
          if (needsContent) {
            const existingContent: Array<{ topic: string; hook: string; caption: string }> = [];
            contentResults = await mapLimit(calendarSlice, CONCURRENCY, async (item, idx) => {
              guard();
              try {
                const res = track(
                  await withTimeout(
                    contentRun(brand, fullContextPrompt, item.topic, item.platform, item.format, {
                      audience: industry.audienceDefaults[idx % industry.audienceDefaults.length],
                      products: brand.products,
                      variantIndex: idx,
                    }),
                    STAGE_TIMEOUT_MS,
                    `content:${idx}`
                  )
                );
                const caption = res.data.caption_variants?.[0] ?? "";
                const hook = res.data.hook ?? item.hook;
                // Reject near-duplicates by regenerating once with explicit uniqueness note
                const dupes = checkDuplicatesForItem(hook, caption, existingContent);
                if (dupes.length > 0 && idx < 8) {
                  const retry = track(
                    await withTimeout(
                      contentRun(
                        brand,
                        `${fullContextPrompt}\n\nUNIQUENESS REQUIREMENT: Do not reuse hooks or captions already used. Existing:\n${existingContent
                          .map((e) => `- ${e.hook}`)
                          .join("\n")}`,
                        `${item.topic} — unique angle #${idx + 1}`,
                        item.platform,
                        item.format,
                        {
                          audience: industry.audienceDefaults[idx % industry.audienceDefaults.length],
                          products: brand.products,
                          variantIndex: idx + 1,
                        }
                      ),
                      STAGE_TIMEOUT_MS,
                      `content-retry:${idx}`
                    )
                  );
                  existingContent.push({
                    topic: item.topic,
                    hook: retry.data.hook ?? hook,
                    caption: retry.data.caption_variants?.[0] ?? caption,
                  });
                  return retry;
                }
                existingContent.push({ topic: item.topic, hook, caption });
                return res;
              } catch (e) {
                failedAgentStages.push(`content:${item.topic}`);
                return null;
              }
            });
          }

          // Visual design briefs — exact required count
          if (needsCreatives && requiredBriefs > 0) {
            const visualSource = calendarSlice.slice(0, requiredBriefs);
            const designed = await mapLimit(visualSource, 3, async (item, idx) => {
              guard();
              try {
                return track(
                  await withTimeout(
                    designerRun(brand, fullContextPrompt, item.topic, item.platform, item.format),
                    STAGE_TIMEOUT_MS,
                    `design:${idx}`
                  )
                );
              } catch {
                failedAgentStages.push(`design:${idx}`);
                return null;
              }
            });

            for (let idx = 0; idx < designed.length; idx++) {
              const d = designed[idx];
              const item = visualSource[idx];
              if (!d || !d.data || !item) continue;
              const headline = d.data.headline || item.topic.slice(0, 80);
              const subtext = d.data.subtext || `By ${brand.name}`;
              const templateId = d.data.template_id || "bold-center";
              const size = d.data.size || "1080x1080";

              let rendered;
              try {
                rendered = await renderCreative(
                  { headline, subtext, template_id: templateId, size, brandName: brand.name },
                  d.data.image_prompt
                );
              } catch {
                rendered = { url: "", width: 1080, height: 1080, provider: "template", svg: "" };
              }

              const assetId = uniqueId("asset");
              if (rendered.url) {
                campaignAssets.push({
                  id: assetId,
                  campaignId,
                  kind: "image",
                  url: rendered.url,
                  width: rendered.width,
                  height: rendered.height,
                  template_id: templateId,
                  headline,
                  topic: item.topic,
                  sample: false,
                });
              }
              creativeDeliverables.push({
                id: assetId,
                headline,
                subtext,
                topic: item.topic,
                format: item.format,
                platform: item.platform,
                imageUrl: rendered.url,
                svg: rendered.svg,
                templateId,
                provider: rendered.provider,
                design: {
                  layout: d.data.layout,
                  headline,
                  subtext,
                  color_usage: d.data.color_usage,
                  image_prompt: d.data.image_prompt,
                  template_id: templateId,
                  size,
                  text_overlays: d.data.text_overlays || [],
                },
              });
            }

            // Honest empty state if briefs missing — never claim delivery
            if (creativeDeliverables.length > 0) {
              onEvent({ type: "deliverable", deliverable: { kind: "creatives", items: creativeDeliverables } });
            }
          }

          // Reels — exact required count with industry-aware topics
          if (needsVideos && requiredReels > 0) {
            const baseTopics = industry.reelTopics(projectName);
            const reelTopics = Array.from({ length: requiredReels }, (_, i) => {
              if (i < baseTopics.length) return baseTopics[i] as string;
              return `${projectName} — ${industry.contentPillars[i % industry.contentPillars.length]} Reel #${i + 1}`;
            });

            const vids = await mapLimit(reelTopics, 2, async (t, idx) => {
              guard();
              try {
                return track(
                  await withTimeout(
                    videoRun(brand, fullContextPrompt, t, 30, {
                      industry: industry.label,
                      audience: industry.audienceDefaults[idx % industry.audienceDefaults.length],
                      variantIndex: idx,
                    }),
                    STAGE_TIMEOUT_MS,
                    `video:${idx}`
                  )
                );
              } catch {
                failedAgentStages.push(`video:${idx}`);
                return null;
              }
            });

            for (let vIdx = 0; vIdx < vids.length; vIdx++) {
              const vr = vids[vIdx];
              if (!vr) continue;
              videoDeliverables.push({
                topic: reelTopics[vIdx] || `${projectName} Reel`,
                duration: vr.data.duration_s || 30,
                aspect: "9:16",
                musicMood: vr.data.music_mood || "Brand-appropriate upbeat track",
                scenes: vr.data.scenes.map((s) => ({
                  n: s.n,
                  visual: s.visual,
                  shotType: s.shot_type,
                  duration_s: s.duration_s,
                  onScreenText: s.on_screen_text,
                  voiceover: s.voiceover,
                })),
              });
            }

            if (videoDeliverables.length > 0) {
              onEvent({ type: "deliverable", deliverable: { kind: "videos", plans: videoDeliverables } });
            }
          }

          const creativeOk =
            contentResults.filter(Boolean).length >= requiredPosts * 0.5 ||
            (!needsContent && true);
          notifyAgent(
            "creative",
            "Creative Production",
            "🎨",
            creativeOk || videoDeliverables.length > 0 || creativeDeliverables.length > 0 ? "completed" : "error",
            `Produced ${contentResults.filter(Boolean).length} posts, ${creativeDeliverables.length} visual briefs & ${videoDeliverables.length} reel scripts`,
            Date.now() - tCreative,
            0,
            undefined,
            undefined,
            activeTask.id,
            "Creative Suite",
            `Posts ${contentResults.filter(Boolean).length}/${requiredPosts} · Briefs ${creativeDeliverables.length}/${requiredBriefs} · Reels ${videoDeliverables.length}/${requiredReels}`,
            creativeOk && (videoDeliverables.length >= requiredReels || !needsVideos) && (creativeDeliverables.length >= requiredBriefs || !needsCreatives)
              ? "passed"
              : "revision_needed"
          );
        })()
      );
    }

    // 2. SEO/SEM Agent
    if (needsSeo) {
      productionTasks.push(
        (async () => {
          notifyAgent("seo_sem", "SEO/SEM Agent", "🚀", "in_progress", "Mining keyword clusters & search intent", undefined, undefined, undefined, undefined, activeTask.id, "Search intent");
          const tSeo = Date.now();
          try {
            const seoRes = track(
              await withTimeout(
                seoRun(brand, fullContextPrompt, `${projectName} ${industry.label} search strategy`),
                STAGE_TIMEOUT_MS,
                "seo"
              )
            );
            const sData = seoRes.data;
            const seoDeliverable: DeliverableSeo = {
              kind: "seo",
              brandName: brand.name,
              targetFocus: sData.target_focus || `${projectName} — ${industry.label} search discovery`,
              keywordClusters: (sData.keyword_clusters || []).map((c) => ({
                topic: c.topic,
                keywords: (c.keywords || []).map((k) => ({
                  keyword: k.keyword,
                  intent: (k.intent || "commercial") as "informational" | "commercial" | "transactional",
                  priority: (k.priority || "high") as "high" | "medium" | "low",
                })),
              })),
              onPageChecklist: sData.on_page_checklist || [
                "Primary keyword in H1 and first 100 words",
                "Mobile-fast pages with compressed images",
                "Descriptive alt text on all creatives",
              ],
              metaRecommendations: (sData.meta_recommendations || []).map((m: { page?: string; metaTitle?: string; meta_title?: string; metaDescription?: string; meta_description?: string }) => ({
                page: m.page || "Homepage",
                metaTitle: m.metaTitle || m.meta_title || `${projectName} | ${industry.label}`,
                metaDescription: m.metaDescription || m.meta_description || `Explore ${projectName} — clear info and next steps.`,
              })),
              contentGapOpportunities: sData.content_gap_opportunities || [
                `Beginner guide for ${industry.label} buyers/customers`,
                `FAQ cluster around ${brand.products.split(",")[0] || "core offer"}`,
              ],
            };
            onEvent({ type: "deliverable", deliverable: seoDeliverable });
            notifyAgent("seo_sem", "SEO/SEM Agent", "🚀", "completed", `Identified keyword clusters & checklist`, Date.now() - tSeo, seoRes.run.costUsd, undefined, undefined, activeTask.id, "Keyword analysis", "Deliverable: SEO Strategy", "passed");
          } catch (e) {
            failedAgentStages.push("seo");
            notifyAgent("seo_sem", "SEO/SEM Agent", "🚀", "error", `SEO failed: ${e instanceof Error ? e.message : String(e)}`, Date.now() - tSeo, 0, undefined, undefined, activeTask.id, "Keyword analysis", "No SEO deliverable", "revision_needed");
          }
        })()
      );
    }

    // 3. Performance Marketer — platform-scoped, no invented results
    if (needsPerformance) {
      productionTasks.push(
        (async () => {
          notifyAgent("performance", "Performance Marketer", "📊", "in_progress", `Structuring ads for ${platforms.join(", ")} · budget ${budgetLabel}`, undefined, undefined, undefined, undefined, activeTask.id, "Paid media budget plan");
          const tPerf = Date.now();
          try {
            const perfRes = track(
              await withTimeout(performanceStrategyRun(brand, fullContextPrompt, budget), STAGE_TIMEOUT_MS, "performance")
            );
            const pData = perfRes.data;
            const metaLike = platforms.filter((p) => ["instagram", "facebook"].includes(p));
            const perfDeliverable: DeliverablePerformance = {
              kind: "performance",
              brandName: brand.name,
              totalBudget: budget ?? undefined,
              campaignStructure: [
                {
                  stage: "Top of Funnel (Awareness)",
                  budgetSplitPct: 50,
                  recommendedChannels: (metaLike.length ? metaLike : platforms).map((p) => `${p.charAt(0).toUpperCase()}${p.slice(1)} Ads`),
                  audienceTargeting: industry.audienceDefaults.slice(0, 2),
                  adFormats: ["9:16 Video / Reel Ad", "1080x1080 Single Image"],
                  primaryKpi: "Reach, CPM and hook rate",
                },
                {
                  stage: "Middle of Funnel (Retargeting)",
                  budgetSplitPct: 30,
                  recommendedChannels: (metaLike.length ? metaLike : platforms).map((p) => `${p.charAt(0).toUpperCase()}${p.slice(1)} retargeting`),
                  audienceTargeting: ["30-day video viewers", "Profile engagers"],
                  adFormats: ["Carousel", "Story ad"],
                  primaryKpi: "CTR and landing/profile visits",
                },
                {
                  stage: "Bottom of Funnel (Conversion)",
                  budgetSplitPct: 20,
                  recommendedChannels: [
                    ...(platforms.includes("instagram") ? ["Instagram DM / WhatsApp click-to-chat"] : []),
                    ...platforms.filter((p) => !["instagram", "facebook"].includes(p)).map((p) => `${p} high-intent`),
                  ],
                  audienceTargeting: ["Warm leads and website/profile visitors"],
                  adFormats: ["Lead form or direct message ad"],
                  primaryKpi: "Cost per qualified enquiry (not invented results)",
                },
              ],
              biddingStrategy:
                pData.bidding_strategy ||
                "Start Lowest Cost for learning, then tighten to a target cost per enquiry once data matures.",
              abTestMatrix: pData.ab_test_matrix || [
                "Hook test: problem-led vs benefit-led opening",
                "Format test: vertical video vs static creative",
                "CTA test: visit/WhatsApp vs catalogue/order",
              ],
              notes: "Planning only. No live spend without human approval. No campaign results are claimed.",
            };
            onEvent({ type: "deliverable", deliverable: perfDeliverable });
            notifyAgent("performance", "Performance Marketer", "📊", "completed", `Funnel structured for ${(platforms || ["instagram"]).join(", ")} · ${budgetLabel}`, Date.now() - tPerf, perfRes.run.costUsd, undefined, undefined, activeTask.id, "Full funnel architecture", "Deliverable: Performance Marketing", "passed");
          } catch (e) {
            failedAgentStages.push("performance");
            notifyAgent("performance", "Performance Marketer", "📊", "error", `Performance failed: ${e instanceof Error ? e.message : String(e)}`, Date.now() - tPerf, 0, undefined, undefined, activeTask.id, "Paid media", "No performance deliverable", "revision_needed");
          }
        })()
      );
    }

    // 4. CRM — NEVER fabricate pipeline numbers
    if (needsCrm) {
      productionTasks.push(
        (async () => {
          const crmDeliverable: DeliverableCrmLeads = {
            kind: "crm_leads",
            brandName: brand.name,
            leadTargetAudience: industry.audienceDefaults[0] ?? "Target customers from the campaign brief",
            pipelineStages: [],
            recommendedFollowUps: [
              {
                leadName: "First enquiry response",
                channel: platforms.includes("instagram") ? "instagram_dm" : "whatsapp",
                trigger: "Immediately upon enquiry (< 5 mins)",
                suggestedMessage: `Hi! Thanks for reaching out to ${projectName}. How can we help you today? Share what you're looking for and we'll respond with clear next steps.`,
              },
              {
                leadName: "Day 2 follow-up",
                channel: "whatsapp",
                trigger: "48 hours without reply",
                suggestedMessage: `Just following up on your enquiry. If you still need help with ${brand.products.split(",")[0] || "our services"}, reply here and we'll assist.`,
              },
              {
                leadName: "Day 5 nurture",
                channel: "email",
                trigger: "Day 5 without response",
                suggestedMessage: `Subject: Quick help for your enquiry — ${projectName}. Here's a short overview so you can decide if we're the right fit.`,
              },
            ],
            hasLiveData: false,
            dataNote: "No live CRM metrics connected. Pipeline counts intentionally omitted — connect your CRM to see real stage volumes. Sequence templates only.",
          };
          onEvent({ type: "deliverable", deliverable: crmDeliverable });
        })()
      );
    }

    await Promise.all(productionTasks);

    // Collect background intelligence results before QA (non-blocking for drafts above).
    await intelPromise;

    // ── STAGE 4: Package Content Posts (industry-safe fallbacks only in demo/sample mode) ───────
    const strictMode = isStrictAiMode();
    const finalItems: Item[] = calendarSlice.map((cal, i) => {
      const c = contentResults[i]?.data;
      const isFallback = !c || contentResults[i]?.run?.status === "fallback";

      if (strictMode && !c?.caption_variants?.length) {
        throw new Error(
          `Content generation for post #${i + 1} ("${cal.topic}") failed AI execution. In strict mode, template fallback is blocked. Click Retry to run again.`
        );
      }

      const fallbackAudience = industry.audienceDefaults[i % industry.audienceDefaults.length];
      const fallbackCaption = [
        `${cal.topic} — for ${fallbackAudience}.`,
        `Here's a clear take on ${cal.topic} from ${projectName}. No fluff — just what matters for ${industry.label.toLowerCase()} customers.`,
        `Questions about ${cal.topic}? DM us and we'll help you decide. (${projectName})`,
      ];

      const initialCaptions = c?.caption_variants?.length ? c.caption_variants : fallbackCaption;
      const initialHook = c?.hook || cal.hook;
      const initialCta = c?.cta || `DM or WhatsApp ${projectName} for next steps.`;

      // Manager review with domain rubric (up to 2 revisions)
      let managerReview = reviewItemByContentManager({
        topic: cal.topic,
        hook: initialHook,
        captions: initialCaptions,
        cta: initialCta,
      });

      let reviewedCaptions = [...initialCaptions];
      let reviewedHook = initialHook;
      let reviewedCta = initialCta;

      if (!managerReview.passed) {
        reviewedHook = `${cal.topic}: The verified guide for ${fallbackAudience}`;
        reviewedCta = `Contact ${projectName} to discuss your requirements.`;
        managerReview = reviewItemByContentManager({
          topic: cal.topic,
          hook: reviewedHook,
          captions: reviewedCaptions,
          cta: reviewedCta,
        });
      }

      const itemProvenance: "ai" | "template" = isFallback ? "template" : "ai";

      return {
        id: uniqueId("item"),
        topic: cal.topic,
        platform: cal.platform,
        format: cal.format,
        scheduled_for: cal.date || new Date().toISOString().slice(0, 10),
        captions: reviewedCaptions,
        hashtags: c?.hashtags?.length ? c.hashtags : industry.hashtagSeed.slice(0, 8),
        cta: reviewedCta,
        ceo_score: 0,
        status: "pending_human",
        design: creativeDeliverables[i % Math.max(creativeDeliverables.length, 1)]?.design,
        image_url: creativeDeliverables[i % Math.max(creativeDeliverables.length, 1)]?.imageUrl,
        hook: reviewedHook,
        objective: c?.objective || cal.goal,
        audience: c?.audience || fallbackAudience,
        carousel_slides: c?.carousel_slides,
        reel_script: c?.reel_script,
        ad_copy: c?.ad_copy,
        provider: contentResults[i]?.run?.provider || (isFallback ? "template" : "gemini"),
        model: contentResults[i]?.run?.model || (isFallback ? "template-fallback" : "gemini-2.5-flash-lite"),
        latencyMs: contentResults[i]?.run?.latencyMs || 0,
        costUsd: contentResults[i]?.run?.costUsd || 0,
        fallback: isFallback,
        provenance: itemProvenance,
        why_now: (cal as { why_now?: string }).why_now || undefined,
        reports_to: "content_manager",
        reviewedBy: "Content Manager",
        manager_score: managerReview.score,
      } as Item;
    });

    onEvent({ type: "deliverable", deliverable: { kind: "content_posts", items: finalItems } });

    // ── STAGE 5: Mandatory QA Gate + Critic ─────────────────────────────────
    guard();
    activeTask.status = "QUALITY_REVIEW";
    ChatStore.saveTask(activeTask);

    notifyAgent("critic", "Critic / QA Agent", "🛡️", "in_progress", "Running hard mandatory acceptance rules on actual persisted deliverables", undefined, undefined, undefined, undefined, activeTask.id, "Actual posts, reels, briefs, platforms, industry");
    const tCritic = Date.now();

    const requirements = buildMandatoryRequirements({
      intent: activeTask.intent,
      industry: industry.key,
      postsCount: requiredPosts,
      reelsCount: requiredReels,
      visualBriefCount: requiredBriefs,
    });

    const actualDeliverables: ActualDeliverables = {
      posts: finalItems.map((p) => ({
        id: p.id,
        topic: p.topic,
        platform: p.platform,
        format: p.format,
        captions: p.captions ?? [],
        hook: p.hook,
        audience: p.audience,
      })),
      reels: videoDeliverables.map((r) => ({
        topic: r.topic,
        scenes: r.scenes,
        duration: r.duration,
        aspect: r.aspect,
      })),
      visualBriefs: creativeDeliverables.map((v) => ({
        topic: v.topic,
        headline: v.headline,
      })),
      strategyText: [
        strategyDeliverable.positioning,
        strategyDeliverable.executiveSummary,
        ...(strategyDeliverable.pillars ?? []),
        ...(strategyDeliverable.audienceInsights ?? []),
      ].join("\n"),
      sampleCaption: finalItems[0]?.captions?.[0] ?? "",
      allTextBlob: [
        ...finalItems.flatMap((p) => [...(p.captions ?? []), p.audience ?? "", p.topic]),
        ...videoDeliverables.map((r) => r.topic),
        ...creativeDeliverables.map((c) => `${c.headline} ${c.subtext}`),
      ].join("\n"),
    };

    const gate = evaluateMandatoryGate(requirements, actualDeliverables);

    // LLM critic is advisory — cannot override a failed mandatory gate.
    let criticRes: Awaited<ReturnType<typeof criticRun>> | null = null;
    const deliverablePackageText = `
Project: ${projectName}
Industry: ${industry.label}
Goal: ${activeTask.originalRequest}
Mode: ${activeTask.isDemoMode ? "DEMO MODE (Fictional Data)" : "VERIFIED PRODUCTION"}
MANDATORY GATE: ${gate.passed ? "PASSED" : "FAILED"}
Gate failures: ${formatGateFailures(gate.failures)}
Counts: posts ${gate.counts.actualPosts}/${gate.counts.requiredPosts}, reels ${gate.counts.actualReels}/${gate.counts.requiredReels}, briefs ${gate.counts.actualVisualBriefs}/${gate.counts.requiredVisualBriefs}
Sample Caption: ${finalItems[0]?.captions[0] || ""}
Budget: ${budgetLabel}
`.trim();

    try {
      criticRes = track(
        await withTimeout(criticRun(brand, fullContextPrompt, deliverablePackageText, 1), 30_000, "critic")
      );
    } catch {
      failedAgentStages.push("critic");
    }

    const criticScoreRaw = criticRes?.data.score ?? 0;
    const criticIssues = criticRes?.data.issues ?? [];
    const criticCriteria = criticRes?.data.criteria ?? [];

    // Combine: mandatory gate is authoritative for pass/fail.
    const finalPassed = gate.passed;
    const overallScore = finalPassed
      ? Math.max(gate.score, Math.min(criticScoreRaw || gate.score, 95))
      : Math.min(gate.score, criticScoreRaw || gate.score, 74);

    const contaminationHits = findContamination(
      actualDeliverables.allTextBlob ?? "",
      industry.key
    );

    const criticDeliverable: DeliverableCritic = {
      kind: "critic",
      overallScore,
      passed: finalPassed,
      revisionCycle: 1,
      criteria: [
        ...criticCriteria,
        {
          name: "Mandatory Deliverable Counts",
          score: finalPassed ? 100 : Math.max(0, 100 - gate.failures.length * 25),
          feedback: `Posts ${gate.counts.actualPosts}/${gate.counts.requiredPosts} · Reels ${gate.counts.actualReels}/${gate.counts.requiredReels} · Briefs ${gate.counts.actualVisualBriefs}/${gate.counts.requiredVisualBriefs}`,
        },
        {
          name: "Industry & Platform Isolation",
          score: contaminationHits.length === 0 ? 100 : 0,
          feedback:
            contaminationHits.length === 0
              ? `No foreign ${industry.label} contamination. Platforms locked to ${platforms.join(", ")}.`
              : `Contamination detected: ${[...new Set(contaminationHits)].slice(0, 6).join(", ")}`,
        },
      ],
      issues: [
        ...criticIssues,
        ...gate.failures.map((f) => ({
          severity: (f.severity === "critical" ? "high" : f.severity) as "low" | "medium" | "high",
          text: `${f.code}: ${f.message}`,
        })),
        ...(activeTask.isDemoMode
          ? [
              {
                severity: "low" as const,
                text: "Demo mode: fictional data used — confirm real facts before live spend.",
              },
            ]
          : []),
      ],
      verdict: finalPassed
        ? `QA Passed — ${gate.counts.actualPosts} posts, ${gate.counts.actualReels} reels, ${gate.counts.actualVisualBriefs} briefs verified. Ready for human sign-off.`
        : `QA FAILED — ${gate.failures.length} mandatory issue(s). Task INCOMPLETE. Missing/invalid deliverables must be regenerated before verification.`,
    };
    // Update items with critic scores and assign needs_rewrite status if below threshold
    finalItems.forEach((item) => {
      item.ceo_score = overallScore;
      if (!finalPassed || overallScore < 60) {
        item.status = "needs_rewrite";
        item.rewrite_reason = `QA score ${overallScore}/100 below mandatory threshold. ${gate.failures.length ? formatGateFailures(gate.failures) : "Revisions required."}`;
      }
    });

    onEvent({ type: "deliverable", deliverable: criticDeliverable });

    if (finalPassed) verifiedAgents.add("critic");

    notifyAgent(
      "critic",
      "Critic / QA Agent",
      "🛡️",
      finalPassed ? "completed" : "error",
      finalPassed
        ? `QA passed — ${overallScore}/100 with all mandatory gates green`
        : `QA FAILED — ${gate.failures.length} critical issues (score capped at ${overallScore})`,
      Date.now() - tCritic,
      criticRes?.run.costUsd ?? 0,
      overallScore,
      finalPassed ? undefined : formatGateFailures(gate.failures),
      activeTask.id,
      "Mandatory acceptance + rubric",
      "Deliverable: Critic QA Report",
      finalPassed ? "passed" : "revision_needed"
    );

    // CEO final package sign-off
    notifyAgent(
      "ceo",
      "AI Agency CEO",
      "👔",
      finalPassed ? "completed" : "review",
      finalPassed
        ? `CEO final sign-off: Full package verified (${overallScore}/100) — dispatched to approval inbox`
        : `CEO sign-off withheld: Revisions needed before publishing authorization`,
      Date.now() - startTime,
      totalCost(),
      overallScore,
      finalPassed ? "Signed off by CEO" : "Sign-off pending revision",
      activeTask.id,
      "Complete Agency Deliverable Package",
      "All deliverables verified",
      finalPassed ? "passed" : "revision_needed"
    );

    // ── STAGE 6: Campaign Persistence ───────────────────────────────────────
    await repo.saveCampaign({
      id: campaignId,
      brandId: brand.id,
      brief: {
        brandId: brand.id,
        month,
        goal: activeTask.originalRequest,
        budget: budget ?? undefined,
        offers: activeTask.collectedFacts.price_range?.value || (isSampleBrand ? "" : brand.usp),
      },
      plan: {
        objectives: planRes.data.objectives,
        kpis: planRes.data.kpis,
        tasks: planRes.data.tasks.map((t) => ({
          agent: t.agent,
          description: t.description,
          deadline_day: t.deadline_day,
          depends_on: t.depends_on || [],
        })),
        risks: planRes.data.risks || [],
      },
      calendar: calendarItems,
      items: finalItems,
      assets: campaignAssets,
      videoPlans: videoDeliverables.map((v, i) => ({
        itemId: finalItems[i]?.id || `item-${i}`,
        topic: v.topic,
        plan: {
          duration_s: v.duration,
          aspect: "9:16",
          music_mood: v.musicMood,
          scenes: v.scenes.map((s) => ({
            n: s.n,
            visual: s.visual,
            shot_type: s.shotType as "close-up",
            duration_s: s.duration_s,
            on_screen_text: s.onScreenText,
            voiceover: s.voiceover,
          })),
          captions_srt: "",
          thumbnail_idea: "",
        },
      })),
      costUsd: totalCost(),
      createdAt: new Date().toISOString(),
    });

    for (const r of runs) await repo.addRun(r);

    activeTask.status = finalPassed ? "COMPLETED" : "REVISION";
    ChatStore.saveTask(activeTask);

    // ── STAGE 7: Honest Summary & Execution Ledger ──────────────────────────
    const totalRuns = runs.length;
    const successfulRuns = runs.filter((r) => r.status === "ok").length;
    const fallbackRuns = runs.filter((r) => r.status === "fallback").length;
    const failedRuns = runs.filter((r) => r.status === "failed").length + failedAgentStages.length;
    const durationSec = (Date.now() - startTime) / 1000;

    const summaryBullets: string[] = [
      `Campaign Overview: ${projectName} · ${industry.label} · ${activeTask.deliverableRequirements.durationDays}-day ${platforms.join("/")} plan (${activeTask.isDemoMode ? "Demo Mode" : "Verified inputs"})`,
      `Content Calendar: ${calendarItems.length} scheduled slots on ${(platforms || ["instagram"]).join(", ")}`,
      `Posts: ${finalItems.length}/${requiredPosts} packaged with hooks, captions, CTAs, hashtags`,
      `Reels: ${videoDeliverables.length}/${requiredReels} vertical 9:16 scripts with scene breakdowns`,
      `Visual Briefs: ${creativeDeliverables.length}/${requiredBriefs} design briefs`,
      `Quality Assurance: ${finalPassed ? "PASSED" : "FAILED"} · Score ${overallScore}/100 · ${gate.failures.length} gate issue(s)`,
    ];

    if (needsStrategy) {
      summaryBullets.splice(1, 0, `Strategy: Positioning, pillars, objectives and KPIs`);
    }
    if (needsResearch) {
      summaryBullets.push(
        researchDeliverable && Array.isArray((researchDeliverable as { competitors?: unknown[] }).competitors)
          ? `Market Research: ${((researchDeliverable as { competitors?: unknown[] }).competitors ?? []).length} competitors reviewed`
          : `Market Research: FAILED or skipped — not included in package`
      );
    }
    if (needsBrandVoice) {
      summaryBullets.push(
        brandVoiceDeliverable
          ? `Brand Voice: Tone guidelines locked`
          : `Brand Voice: FAILED or skipped — not included`
      );
    }
    if (needsSeo) summaryBullets.push(`SEO/SEM: Keyword clusters delivered as separate card`);
    if (needsPerformance) summaryBullets.push(`Paid Media: Funnel structure for ${platforms.join(", ")} · ${budgetLabel}`);
    if (needsCrm) summaryBullets.push(`CRM: Follow-up templates only (no fabricated pipeline counts)`);

    const summary: DeliverableSummary = {
      kind: "summary",
      headline: finalPassed
        ? `${projectName} — ${activeTask.deliverableRequirements.durationDays}-Day Campaign Package Ready`
        : `${projectName} — Campaign INCOMPLETE (${gate.failures.length} mandatory QA failure(s))`,
      bulletPoints: summaryBullets,
      recommendedNextSteps: finalPassed
        ? [
            `Review cards: Overview, Strategy, Calendar, ${finalItems.length} Posts, ${videoDeliverables.length} Reels, ${creativeDeliverables.length} Briefs.`,
            "Items requiring publishing or paid spend are staged in Approvals for sign-off.",
            "Request copy revisions or platform tweaks in this chat.",
          ]
        : [
            `Fix mandatory failures:\n${formatGateFailures(gate.failures)}`,
            "Only failed deliverables will be regenerated — successful outputs are preserved.",
            "QA will not issue Verified status until all critical gates pass.",
          ],
      totalPosts: finalItems.length,
      totalCreatives: creativeDeliverables.length,
      totalReels: videoDeliverables.length,
      qualityScore: overallScore,
      verificationBadge: finalPassed ? "AI Verified" : "Critic Revision Required",
    };
    onEvent({ type: "deliverable", deliverable: summary });

    const ledgerLine =
      `**Agency Execution Ledger:** Selected ${selectedAgents.size} agents · Executed ${executedAgents.size} · ` +
      `Verified OK ${verifiedAgents.size} · Runs ${totalRuns} (ok ${successfulRuns}, fallback ${fallbackRuns}, failed ${failedRuns}) · ` +
      `AI Cost $${totalCost().toFixed(4)} · Duration ${durationSec.toFixed(1)}s · QA ${finalPassed ? "PASSED" : "FAILED"} (${overallScore}/100).`;

    await onEvent({
      type: "text_chunk",
      text:
        `\n\n---\n\n### 📦 ${finalPassed ? "Campaign Delivered" : "Campaign Package — QA Failed"}\n\n` +
        `**Project:** ${projectName} · **Industry:** ${industry.label} · **Mode:** ${activeTask.isDemoMode ? "Demo Mode (Fictional Data)" : "Verified inputs"} · **QA:** **${overallScore}/100** (${finalPassed ? "✅ Verified" : "❌ Failed mandatory gates"})\n\n` +
        summaryBullets.map((b) => `- ${b}`).join("\n") +
        (finalPassed ? "" : `\n\n**Gate failures:**\n${formatGateFailures(gate.failures)}\n`) +
        `\n\n🔒 **Human Approval Gate:** Nothing publishes or spends without your sign-off.\n\n` +
        ledgerLine,
    });

    notifyAgent(
      "manager",
      "AI Agency Manager",
      "👔",
      finalPassed ? "completed" : "error",
      finalPassed
        ? `Package complete — ${finalItems.length} posts, ${videoDeliverables.length} reels, ${creativeDeliverables.length} briefs QA-verified`
        : `Package incomplete — ${gate.failures.length} mandatory QA failures`,
      durationSec * 1000,
      totalCost(),
      overallScore,
      undefined,
      activeTask.id,
      "Agency package",
      `${finalItems.length + videoDeliverables.length + creativeDeliverables.length} deliverables (${finalPassed ? "verified" : "incomplete"})`,
      finalPassed ? "passed" : "revision_needed"
    );

    onEvent({ type: "completed", summary, campaignId });
  } catch (err) {
    console.error("ORCHESTRATOR EXECUTION ERROR:", err);
    const errorMsg = err instanceof Error ? err.message : String(err);
    notifyAgent("manager", "AI Agency Manager", "👔", "error", `Error: ${errorMsg}`);
    if (err instanceof Error && err.name === "AbortError") {
      onEvent({ type: "error", error: "Workflow execution stopped by user." });
      return;
    }
    onEvent({ type: "error", error: errorMsg });
  }
}

type CalendarItemPlatform = "instagram" | "facebook" | "linkedin" | "blog" | "email";
type CalendarItemFormat = "post" | "story" | "reel" | "carousel" | "ad" | "blog" | "email";

function ceoPlanFallbackSafe(goal: string) {
  const primary = (goal || "Execute marketing strategy").slice(0, 120);
  return {
    objectives: [primary, "Publish a consistent content calendar", "Collect human approvals before publishing"],
    kpis: ["Enquiry Conversion Rate", "CTR", "Follower Growth", "Reach"],
    tasks: [
      { agent: "strategist" as const, description: "Build calendar and pillars", depends_on: [] as string[], deadline_day: 2 },
      { agent: "content" as const, description: "Write captions, hooks + CTAs", depends_on: ["strategist"], deadline_day: 5 },
    ],
    risks: ["Missing brand facts — flag instead of inventing"],
  };
}

function strategistFallbackSafe(
  brand: BrandProfile,
  industry: IndustryProfile,
  platforms: string[]
) {
  const platform = platforms[0] || "instagram";
  return {
    content_pillars: industry.contentPillars,
    audience_insights: industry.audienceDefaults,
    // Industry-aware fallback calendar — never the generic agency topic bank.
    calendar: fallbackCalendar(new Date().toISOString().slice(0, 7), {
      platforms,
      pillars: industry.contentPillars,
      topics: industry.reelTopics(brand.name).flatMap((t) => [t, `${t} — angle 2`]),
    }) as never[],
    campaign_ideas: ["Educational carousel", "Behind-the-scenes reel", "Direct offer post"],
    festival_hooks: ["Seasonal local moment"],
    executive_summary: `${brand.name}: a focused ${platform} plan for ${industry.label} to drive enquiries and sales.`,
    positioning: `${brand.name} is positioned for ${industry.audienceDefaults[0]}.`,
    plan_b: "If reach plateaus, shift budget to best-performing format and tighten CTA.",
    audience_segments: industry.audienceDefaults.slice(0, 2).map((insight, i) => ({
      name: i === 0 ? "Primary" : "Secondary",
      insight,
      channel: platform,
    })),
    funnel_stages: [
      { stage: "Top of Funnel", goal: "Awareness", content: "Educational + lifestyle posts" },
      { stage: "Middle of Funnel", goal: "Consideration", content: "Proof, demos, FAQs" },
      { stage: "Bottom of Funnel", goal: "Conversion", content: "Direct CTA, visit/WhatsApp" },
    ],
  };
}
