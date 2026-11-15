/**
 * Live verification: final client prompt against AdvertiseOS orchestration.
 * Run: npx tsx scripts/verify-final-campaign.ts
 * Requires GEMINI_API_KEY in .env (loaded via dotenv-free process env from shell).
 */
import { existsSync, readFileSync } from "fs";

if (existsSync(".env")) {
  const content = readFileSync(".env", "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

process.env.LLM_PROVIDER = process.env.LLM_PROVIDER || "gemini";
process.env.ADVOS_INTENT_TIMEOUT_MS = process.env.ADVOS_INTENT_TIMEOUT_MS || "20000";
process.env.ADVOS_STAGE_TIMEOUT_MS = process.env.ADVOS_STAGE_TIMEOUT_MS || "120000";

import { runAgencyOrchestration, type OrchestrationEvent } from "../src/lib/agents/orchestrator";
import { findContamination } from "../src/lib/agents/industry";
import type { BrandProfile } from "../src/lib/brand";
import type { Deliverable } from "../src/types/chat";

const BRAND: BrandProfile = {
  id: "verify-clothing-nashik",
  name: "Nashik Threads",
  tone: "confident, youthful, helpful",
  languages: ["English", "Hinglish"],
  audience: "Men aged 18-35 in Nashik looking for shirts, jeans, trousers, T-shirts and footwear",
  products: "Men's clothing store selling shirts, jeans, trousers, T-shirts and footwear",
  usp: "Trend-forward menswear with personal fitting help in Nashik",
  dos: ["Show outfits", "Mention store visit", "Use Hinglish where natural"],
  donts: ["No fake discounts", "No invented testimonials", "No guaranteed results"],
  compliance_notes: "Do not invent prices, sale claims, testimonials or product performance claims.",
};

const FINAL_PROMPT = `Create a complete 30-day Instagram marketing campaign for a men's fashion and clothing brand based in Nashik.

Business: Men's clothing store selling shirts, jeans, trousers, T-shirts and footwear.

Target audience: Men aged 18–35 in Nashik.

Campaign objective: Increase store visits, WhatsApp enquiries and product sales.

Budget: ₹10,000 per month.

Deliver exactly:
- 12 unique Instagram posts.
- 4 complete Reel scripts.
- 12 individual visual design briefs.
- 30-day content calendar.
- 5 Meta ad copy variations.
- Monthly budget allocation.
- Audience targeting strategy.
- WhatsApp lead follow-up sequence.
- Weekly performance KPIs.
Use natural Hinglish and English copy.

Do not invent discounts, prices, testimonials or product claims.

Keep every deliverable specific to men's fashion.

Do not generate real estate, digital marketing agency or unrelated content.

Show the first useful campaign draft as quickly as possible and continue optional deeper work in the background.`;

async function main() {
  console.log("Starting live verification...", { provider: process.env.LLM_PROVIDER, key: Boolean(process.env.GEMINI_API_KEY) });
  const events: OrchestrationEvent[] = [];
  let firstUsefulAtMs: number | null = null;
  const t0 = Date.now();

  const markFirst = (kind: string) => {
    if (firstUsefulAtMs === null && ["overview", "strategy", "calendar", "content_posts", "clarifications"].includes(kind)) {
      firstUsefulAtMs = Date.now() - t0;
      console.log(`[first-useful] ${kind} at ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    }
  };

  await runAgencyOrchestration({
    instruction: FINAL_PROMPT,
    brand: BRAND,
    conversationId: `verify-${Date.now()}`,
    onEvent: (ev) => {
      events.push(ev);
      if (ev.type === "deliverable") {
        console.log(`[deliverable] ${ev.deliverable.kind} @ ${((Date.now() - t0) / 1000).toFixed(1)}s`);
        markFirst(ev.deliverable.kind);
      }
      if (ev.type === "agent_update") {
        console.log(
          `[agent] ${ev.activity.agent} ${ev.activity.status}: ${ev.activity.currentTask ?? ""} | ${ev.activity.outputRef ?? ""}`
        );
      }
      if (ev.type === "error") {
        console.error("[error]", ev.error);
      }
    },
  });

  const totalMs = Date.now() - t0;
  const deliverables = events
    .filter((e): e is Extract<OrchestrationEvent, { type: "deliverable" }> => e.type === "deliverable")
    .map((e) => e.deliverable);

  const posts = deliverables.find((d) => d.kind === "content_posts") as Extract<Deliverable, { kind: "content_posts" }> | undefined;
  const videos = deliverables.find((d) => d.kind === "videos") as Extract<Deliverable, { kind: "videos" }> | undefined;
  const creatives = deliverables.find((d) => d.kind === "creatives") as Extract<Deliverable, { kind: "creatives" }> | undefined;
  const calendar = deliverables.find((d) => d.kind === "calendar") as Extract<Deliverable, { kind: "calendar" }> | undefined;
  const critic = deliverables.find((d) => d.kind === "critic") as Extract<Deliverable, { kind: "critic" }> | undefined;
  const summary = deliverables.find((d) => d.kind === "summary") as Extract<Deliverable, { kind: "summary" }> | undefined;
  const performance = deliverables.find((d) => d.kind === "performance") as Extract<Deliverable, { kind: "performance" }> | undefined;
  const crm = deliverables.find((d) => d.kind === "crm_leads") as Extract<Deliverable, { kind: "crm_leads" }> | undefined;

  const textBlob = [
    ...events.filter((e): e is Extract<OrchestrationEvent, { type: "text_chunk" }> => e.type === "text_chunk").map((e) => e.text),
    ...(posts?.items ?? []).flatMap((p) => [...(p.captions ?? []), p.topic, p.audience ?? "", p.cta ?? ""]),
    ...(videos?.plans ?? []).map((v) => v.topic),
    ...(creatives?.items ?? []).map((c) => `${c.headline} ${c.subtext}`),
    critic?.verdict ?? "",
    ...(summary?.bulletPoints ?? []),
  ].join("\n");

  const contamination = findContamination(textBlob, "clothing");
  const platformSet = new Set((posts?.items ?? []).map((p) => p.platform));
  const uniqueTopics = new Set((posts?.items ?? []).map((p) => p.topic.toLowerCase())).size;
  const uniqueCaptions = new Set((posts?.items ?? []).map((p) => (p.captions?.[0] ?? "").toLowerCase().slice(0, 100))).size;

  const packageLeak = textBlob.match(/₹\s?(18,000|40,000|75,000)|Social Media Starter|homebuyer|VIP Site Visit|2BHK|RERA|Pathardi/i);

  const report = {
    durationSec: Number((totalMs / 1000).toFixed(1)),
    firstUsefulDraftSec: firstUsefulAtMs != null ? Number((firstUsefulAtMs / 1000).toFixed(1)) : null,
    counts: {
      posts: posts?.items.length ?? 0,
      reels: videos?.plans.length ?? 0,
      visualBriefs: creatives?.items.length ?? 0,
      calendarItems: calendar?.items.length ?? 0,
      performanceCard: Boolean(performance),
      crmCard: Boolean(crm),
    },
    reelScenes: (videos?.plans ?? []).map((v) => ({ topic: v.topic.slice(0, 60), scenes: v.scenes.length })),
    platforms: [...platformSet],
    uniqueTopics,
    uniqueCaptionFirstLines: uniqueCaptions,
    contaminationHits: contamination,
    packageOrRealEstateLeak: packageLeak ? packageLeak[0] : null,
    qa: critic
      ? { passed: critic.passed, score: critic.overallScore, verdict: critic.verdict }
      : null,
    summaryBadge: summary?.verificationBadge ?? null,
    summaryTotals: summary
      ? { posts: summary.totalPosts, reels: summary.totalReels, briefs: summary.totalCreatives, score: summary.qualityScore }
      : null,
    performanceBudget: performance?.totalBudget ?? null,
  };

  console.log("\n========== FINAL VERIFICATION REPORT ==========");
  console.log(JSON.stringify(report, null, 2));
  console.log("================================================\n");

  const pass =
    report.counts.posts === 12 &&
    report.counts.reels === 4 &&
    report.counts.visualBriefs === 12 &&
    report.counts.calendarItems >= 12 &&
    report.contaminationHits.length === 0 &&
    report.packageOrRealEstateLeak === null &&
    platformSet.size === 1 &&
    platformSet.has("instagram") &&
    report.qa?.passed === true &&
    report.firstUsefulDraftSec !== null &&
    report.firstUsefulDraftSec < 60 &&
    report.durationSec < 629 &&
    report.uniqueTopics === 12 &&
    report.performanceBudget === 10000;

  console.log(
    `\nTiming: first useful draft ${report.firstUsefulDraftSec}s (target <60s) · total ${report.durationSec}s (baseline was 629.5s)`
  );
  console.log(`Budget extracted: ₹${report.performanceBudget ?? "null"} (expected 10000)`);
  console.log(pass ? "OVERALL: PASS" : "OVERALL: FAIL");
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
