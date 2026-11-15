import type { ActiveTask, FactRecord, TaskWorkflowStatus } from "@/types/chat";
import type { RequestIntent } from "@/lib/schemas";
import { extractFacts } from "@/lib/agents/factExtractor";
import { detectIndustry, type IndustryProfile } from "@/lib/agents/industry";

export function createActiveTask(
  conversationId: string,
  originalRequest: string,
  intent: RequestIntent
): ActiveTask {
  const now = new Date().toISOString();
  const taskId = `task-agency-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const { facts, isDemoMode } = extractFacts(originalRequest);

  // Honest deliverable targets — never coerce 0 → default while gates stay closed.
  const wantsReels =
    (intent.reel_count ?? 0) > 0 ||
    intent.needs_video ||
    intent.formats?.includes("reel") ||
    intent.kind === "video_only" ||
    intent.kind === "full_campaign";

  const postsCount = intent.post_count || 12;
  const reelsCount = wantsReels ? intent.reel_count || (intent.kind === "video_only" ? 4 : 4) : 0;

  // Visual briefs: one per post for campaign/calendar requests (agency package standard).
  const wantsDesign =
    intent.needs_design ||
    intent.kind === "creative_only" ||
    intent.kind === "full_campaign" ||
    intent.kind === "content_calendar";

  // Prefer explicit intent budget, then fact-extracted budget — never invent.
  let budget = intent.budget && intent.budget > 0 ? intent.budget : undefined;
  if (!budget && facts.budget?.value) {
    const bMatch = facts.budget.value.match(/[\d,.]+/);
    if (bMatch) {
      const parsed = Number(bMatch[0].replace(/,/g, ""));
      if (parsed > 0) budget = parsed;
    }
  }

  return {
    id: taskId,
    conversationId,
    status: "TASK_CREATED",
    originalRequest,
    intent,
    collectedFacts: facts,
    missingQuestions: [],
    isDemoMode,
    deliverableRequirements: {
      postsCount,
      reelsCount,
      adCount: intent.ad_count || 3,
      durationDays: intent.duration_days || 30,
      budget,
      platforms: intent.platforms?.length ? intent.platforms : ["instagram"],
      formats: intent.formats?.length ? intent.formats : ["post", "reel", "carousel"],
      visualBriefCount: wantsDesign ? postsCount : 0,
    },
    createdAt: now,
    updatedAt: now,
  } as ActiveTask;
}

export function updateTaskWithUserInput(
  task: ActiveTask,
  newInput: string
): ActiveTask {
  const { facts, isDemoMode } = extractFacts(newInput, task.collectedFacts);
  const now = new Date().toISOString();

  let budget = task.deliverableRequirements.budget;
  if (facts.budget) {
    const bMatch = facts.budget.value.match(/[\d,.]+/);
    if (bMatch) {
      budget = Number(bMatch[0].replace(/,/g, ""));
    }
  }

  // Refresh industry profile if new input reveals a different vertical.
  const industry = detectIndustry([task.originalRequest, newInput], undefined, task.intent);

  return {
    ...task,
    collectedFacts: facts,
    isDemoMode: task.isDemoMode || isDemoMode,
    industryKey: industry.key,
    deliverableRequirements: {
      ...task.deliverableRequirements,
      budget,
    },
    updatedAt: now,
  };
}

export function isTaskReadyToExecute(task: ActiveTask): {
  ready: boolean;
  missingRequired: string[];
} {
  if (task.isDemoMode) {
    return { ready: true, missingRequired: [] };
  }

  const missing: string[] = [];
  const f = task.collectedFacts;
  const industry = detectIndustry([task.originalRequest], undefined, task.intent);
  const profile: IndustryProfile = industry;

  // Fact gates are industry-aware — a clothing brand must not be blocked on price_range
  // and a restaurant must not invent apartment pricing.
  if (
    profile.requiresLocation &&
    (task.intent.kind === "full_campaign" || task.intent.kind === "content_calendar")
  ) {
    if (!f.location?.value) missing.push("location");
  }

  if (
    profile.requiresPriceRange &&
    (task.intent.kind === "full_campaign" || task.intent.kind === "content_calendar")
  ) {
    if (!f.price_range?.value) missing.push("price_range");
  }

  if (task.intent.kind === "full_campaign" && task.intent.needs_performance) {
    if (!f.budget?.value && !task.deliverableRequirements.budget) missing.push("budget");
  }

  return {
    ready: missing.length === 0,
    missingRequired: missing,
  };
}

export function formatTaskContextPrompt(task: ActiveTask): string {
  const industry = detectIndustry([task.originalRequest], undefined, task.intent);
  const req = task.deliverableRequirements;
  const lines: string[] = [
    `=== ACTIVE AGENCY TASK ===`,
    `Task ID: ${task.id}`,
    `Industry: ${industry.label} (${industry.key})`,
    `Original Goal: ${task.originalRequest}`,
    `Workflow Mode: ${task.isDemoMode ? "DEMO MODE (Fictional Sample Data)" : "VERIFIED PRODUCTION"}`,
    `Duration: ${req.durationDays} days`,
    `Platforms (STRICT): ${(req.platforms || ["instagram"]).join(", ")}`,
    `Deliverable Targets: Exactly ${req.postsCount} Posts, ${req.reelsCount} Reel Scripts, ${req.visualBriefCount ?? 0} Visual Design Briefs`,
    `Content pillars: ${industry.contentPillars.join(" | ")}`,
    `Audience direction: ${industry.audienceDefaults[0]}`,
  ];

  if (req.budget) {
    lines.push(`Campaign Budget: ₹${req.budget.toLocaleString("en-IN")}`);
  }

  lines.push(`\n=== COLLECTED BUSINESS FACTS ===`);
  for (const [key, record] of Object.entries(task.collectedFacts)) {
    const classificationBadge = record.dataClassification === "demo" ? "[DEMO/FICTIONAL]" : "[VERIFIED]";
    lines.push(`- ${key.toUpperCase()}: ${record.value} ${classificationBadge}`);
  }

  lines.push(
    `\n=== CONTEXT ISOLATION RULES ===`,
    `- Use ONLY facts above. Do not reuse any other client, sample brand, or prior campaign data.`,
    `- Business category MUST stay: ${industry.label}.`,
    `- Platforms MUST stay: ${(req.platforms || ["instagram"]).join(", ")}. Do not add Facebook/LinkedIn/Google unless requested.`,
    `- Never invent prices, discounts, testimonials, guarantees, awards, or performance stats.`,
    `- Missing facts → mark as [MISSING] or [DEMO], never fabricate.`
  );

  if (task.isDemoMode) {
    lines.push(
      `\n[CRITICAL INSTRUCTION - DEMO MODE]: Fictional demo data is supplied. Generate complete, high-converting agency-quality deliverables with all calculations, scripts, and structures. Clearly append [DEMO] to all specific price/amenity claims so it is transparent that real claims must be confirmed prior to live media spend.`
    );
  }

  return lines.join("\n");
}
