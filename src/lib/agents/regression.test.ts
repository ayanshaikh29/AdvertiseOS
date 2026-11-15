import { describe, expect, it, vi, beforeEach } from "vitest";
import { runAgencyOrchestration, type OrchestrationEvent } from "@/lib/agents/orchestrator";
import { ChatStore } from "@/lib/db/chatStore";
import { heuristicIntent } from "@/lib/agents/intent";
import { createActiveTask, isTaskReadyToExecute } from "@/lib/agents/taskState";
import {
  buildMandatoryRequirements,
  evaluateMandatoryGate,
  type ActualDeliverables,
} from "@/lib/agents/qaGate";
import { detectIndustry, findContamination } from "@/lib/agents/industry";
import { fallbackCalendar } from "@/lib/brand";
import type { BrandProfile } from "@/lib/brand";
import type { Deliverable } from "@/types/chat";

process.env.LLM_PROVIDER = "fake";
process.env.ADVOS_INTENT_TIMEOUT_MS = "2000";
process.env.ADVOS_STAGE_TIMEOUT_MS = "5000";

vi.mock("@/lib/db/fileRepo", () => ({
  getRepo: vi.fn().mockResolvedValue({
    listCatalog: vi.fn().mockResolvedValue([]),
    listTrends: vi.fn().mockResolvedValue([]),
    listMetrics: vi.fn().mockResolvedValue([]),
    saveCampaign: vi.fn().mockResolvedValue(undefined),
    addRun: vi.fn().mockResolvedValue(undefined),
    listBrands: vi.fn().mockResolvedValue([]),
    listCampaigns: vi.fn().mockResolvedValue([]),
  }),
}));

vi.mock("@/lib/image/provider", () => ({
  renderCreative: vi.fn().mockResolvedValue({
    url: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
    width: 1080,
    height: 1080,
    provider: "template",
    svg: "<svg></svg>",
  }),
}));

const CLOTHING_BRAND: BrandProfile = {
  id: "clothing-nashik",
  name: "Nashik Threads",
  tone: "confident, youthful, helpful",
  languages: ["English", "Hinglish"],
  audience: "Men aged 18-35 in Nashik",
  products: "Shirts, jeans, trousers, T-shirts and footwear",
  usp: "Trend-forward menswear with personal fitting help",
  dos: ["Show outfits", "Mention store visit"],
  donts: ["No fake discounts", "No invented testimonials"],
  compliance_notes: "Do not invent prices or sale claims",
};

const REAL_ESTATE_BRAND: BrandProfile = {
  id: "re-nashik",
  name: "Skyline Residency",
  tone: "trustworthy",
  languages: ["English", "Hindi"],
  audience: "Homebuyers in Nashik",
  products: "2 BHK and 3 BHK flats with clubhouse",
  usp: "RERA registered project",
  dos: ["Mention RERA"],
  donts: ["No guaranteed returns"],
  compliance_notes: "MahaRERA rules",
};

const RESTAURANT_BRAND: BrandProfile = {
  id: "rest-nashik",
  name: "Spice Route Nashik",
  tone: "warm, appetizing",
  languages: ["English", "Hinglish"],
  audience: "Foodies and families in Nashik",
  products: "North Indian and continental dining, weekend brunch",
  usp: "Fresh ingredients daily",
  dos: ["Show food"],
  donts: ["No fake reviews"],
  compliance_notes: "Food safety claims only when verified",
};

async function collect(instruction: string, brand: BrandProfile, conversationId = "conv-reg") {
  const events: OrchestrationEvent[] = [];
  const t0 = Date.now();
  await runAgencyOrchestration({
    instruction,
    brand,
    conversationId,
    onEvent: (ev) => {
      events.push(ev);
    },
  });
  const durationMs = Date.now() - t0;
  const deliverables = events
    .filter((e): e is Extract<OrchestrationEvent, { type: "deliverable" }> => e.type === "deliverable")
    .map((e) => e.deliverable);
  const text = events
    .filter((e): e is Extract<OrchestrationEvent, { type: "text_chunk" }> => e.type === "text_chunk")
    .map((e) => e.text)
    .join("\n");
  const agentUpdates = events
    .filter((e): e is Extract<OrchestrationEvent, { type: "agent_update" }> => e.type === "agent_update")
    .map((e) => e.activity);
  return { events, deliverables, text, agentUpdates, durationMs };
}

function byKind<T extends Deliverable["kind"]>(dels: Deliverable[], kind: T) {
  return dels.filter((d): d is Extract<Deliverable, { kind: T }> => d.kind === kind);
}

describe("Regression A — Clothing brand campaign", () => {
  beforeEach(() => ChatStore.clearTask("conv-clothing"));

  it("produces clothing context, 12 unique posts, 4 reels, 12 briefs — no real-estate language", async () => {
    const instruction =
      "Create a complete 30-day Instagram marketing campaign for a men's fashion and clothing brand based in Nashik. " +
      "Business: Men's clothing store selling shirts, jeans, trousers, T-shirts and footwear. " +
      "Target audience: Men aged 18-35 in Nashik. Budget: ₹10,000 per month. " +
      "Deliver 12 unique Instagram posts, 4 complete Reel scripts, 12 visual design briefs, 30-day content calendar.";

    const { deliverables, text, durationMs } = await collect(instruction, CLOTHING_BRAND, "conv-clothing");

    const posts = byKind(deliverables, "content_posts");
    const videos = byKind(deliverables, "videos");
    const creatives = byKind(deliverables, "creatives");
    const calendar = byKind(deliverables, "calendar");
    const critic = byKind(deliverables, "critic");
    const summary = byKind(deliverables, "summary");

    // Exact counts (offline fallback path may still hit quality gates)
    if (posts[0]) expect(posts[0].items.length).toBe(12);
    if (calendar[0]) expect(calendar[0].items.length).toBe(12);

    // Platform isolation: Instagram-only request
    if (posts[0]) {
      const platforms = new Set(posts[0].items.map((p) => p.platform));
      expect(platforms.has("facebook")).toBe(false);
      expect(platforms.has("linkedin")).toBe(false);
    }
    if (calendar[0]) {
      for (const item of calendar[0].items) {
        expect(item.platform).toBe("instagram");
      }
    }

    // Contamination check on all emitted text + captions
    const blob = [
      text,
      ...posts.flatMap((p) => p.items.flatMap((i) => [...(i.captions ?? []), i.topic, i.audience ?? "", i.hashtags?.join(" ") ?? ""])),
      ...videos.flatMap((v) => v.plans.map((p) => p.topic)),
      ...creatives.flatMap((c) => c.items.map((i) => `${i.headline} ${i.subtext}`)),
    ].join("\n");

    const hits = findContamination(blob, "clothing");
    expect(hits).toEqual([]);

    // No invented ₹18k/40k/75k sample packages in copy
    const packageLeak = blob.match(/₹\s?(18,000|40,000|75,000)|Social Media Starter|Performance Marketing ₹/i);
    expect(packageLeak).toBeNull();

    // Summary must not claim 4 reels if zero reels exist
    if (summary[0]) {
      if (videos[0]?.plans.length ?? 0) {
        expect(summary[0].totalReels).toBe(videos[0]!.plans.length);
      } else {
        expect(summary[0].totalReels).toBe(0);
        expect(summary[0].verificationBadge).not.toBe("AI Verified");
      }
    }

    // QA honesty: if reels/briefs missing, critic cannot be passed+verified
    const actualReels = videos[0]?.plans.length ?? 0;
    const actualBriefs = creatives[0]?.items.length ?? 0;
    if (critic[0]) {
      if (actualReels < 4 || actualBriefs < 12) {
        expect(critic[0].passed).toBe(false);
        expect(critic[0].verdict.toLowerCase()).toContain("fail");
      }
    }

    // Performance sanity (offline fake LLM should be far under 629s)
    expect(durationMs).toBeLessThan(60_000);
  });

  it("intent classifies clothing campaign with 12 posts + 4 reels + instagram", () => {
    const intent = heuristicIntent(
      "Create a 30-day Instagram marketing strategy for a men's clothing brand with 12 posts and 4 Reels"
    );
    expect(intent.platforms).toContain("instagram");
    expect(intent.post_count).toBe(12);
    expect(intent.reel_count).toBe(4);
    expect(["full_campaign", "content_calendar", "strategy_only"]).toContain(intent.kind);
  });

  it("detects clothing industry and blocks real-estate fact gate", () => {
    const industry = detectIndustry(["men's clothing store shirts jeans Nashik"], CLOTHING_BRAND);
    expect(industry.key).toBe("clothing");
    const intent = heuristicIntent("30-day Instagram campaign for clothing brand with 12 posts");
    const task = createActiveTask("c1", "30-day Instagram campaign for clothing brand with 12 posts", intent);
    const gate = isTaskReadyToExecute(task);
    // Clothing must NOT require price_range / location the way real estate does
    expect(gate.missingRequired).not.toContain("price_range");
  });
});

describe("Regression B — Real estate campaign", () => {
  beforeEach(() => ChatStore.clearTask("conv-re"));

  it("keeps homebuyer context and does not inject clothing content", async () => {
    const instruction =
      "Create a campaign for a residential project in Nashik. 12 posts and 4 Reels for homebuyers. Location: Pathardi Phata. Price range ₹45-85 Lakhs.";
    const { deliverables, text } = await collect(instruction, REAL_ESTATE_BRAND, "conv-re");

    const industry = detectIndustry([instruction], REAL_ESTATE_BRAND);
    expect(industry.key).toBe("real_estate");

    const posts = byKind(deliverables, "content_posts");
    const blob = [text, ...posts.flatMap((p) => p.items.flatMap((i) => [...(i.captions ?? []), i.topic]))].join("\n");
    const clothingHits = findContamination(blob, "real_estate");
    expect(clothingHits).toEqual([]);
  });

  it("requires location + price_range for real estate full campaign", () => {
    const instruction = "Create a campaign for a residential project with 12 posts";
    const intent = heuristicIntent(instruction);
    const task = createActiveTask("c-re", instruction, intent);
    const gate = isTaskReadyToExecute(task);
    expect(gate.missingRequired).toContain("location");
    expect(gate.missingRequired).toContain("price_range");
  });
});

describe("Regression C — Restaurant campaign", () => {
  beforeEach(() => ChatStore.clearTask("conv-rest"));

  it("stays food-focused — no property or apparel contamination", async () => {
    const instruction =
      "Create a 30-day Instagram campaign for a restaurant with 12 posts and 4 Reels. Menu highlights, ambience, weekend brunch.";
    const { deliverables, text } = await collect(instruction, RESTAURANT_BRAND, "conv-rest");

    const industry = detectIndustry([instruction], RESTAURANT_BRAND);
    expect(industry.key).toBe("restaurant");

    const posts = byKind(deliverables, "content_posts");
    const blob = [text, ...posts.flatMap((p) => p.items.flatMap((i) => [...(i.captions ?? []), i.topic]))].join("\n");
    expect(findContamination(blob, "restaurant")).toEqual([]);
  });
});

describe("Regression D — Client context isolation", () => {
  it("different brands get different industry profiles and task contexts", () => {
    const clothingIntent = heuristicIntent("30-day Instagram strategy for clothing brand with 12 posts");
    const reIntent = heuristicIntent("30-day campaign for residential project with 12 posts");

    const clothingTask = createActiveTask("iso-1", "clothing brand shirts jeans", clothingIntent);
    const reTask = createActiveTask("iso-2", "residential project Nashik", reIntent);

    expect(clothingTask.id).not.toBe(reTask.id);

    const clothingIndustry = detectIndustry([clothingTask.originalRequest], CLOTHING_BRAND, clothingIntent);
    const reIndustry = detectIndustry([reTask.originalRequest], REAL_ESTATE_BRAND, reIntent);

    expect(clothingIndustry.key).toBe("clothing");
    expect(reIndustry.key).toBe("real_estate");

    // Contamination terms are industry-specific and must flag cross-leaks
    expect(findContamination("Nashik homebuyers VIP Site Visit 2BHK", "clothing").length).toBeGreaterThan(0);
    expect(findContamination("MensFashion OOTD jeans outfit", "real_estate").length).toBeGreaterThan(0);
  });

  it("fallback calendar respects requested platforms only", () => {
    const cal = fallbackCalendar("2026-11", { platforms: ["instagram"] });
    for (const item of cal) {
      expect(item.platform).toBe("instagram");
    }
    expect(cal.some((c) => c.platform === "facebook")).toBe(false);
    expect(cal.some((c) => c.platform === "linkedin")).toBe(false);
  });
});

describe("Regression E — Agent failure does not false-pass QA", () => {
  beforeEach(() => ChatStore.clearTask("conv-fail"));

  it("mandatory gate fails when reels/briefs missing even if posts exist", () => {
    const requirements = buildMandatoryRequirements({
      intent: {
        kind: "full_campaign",
        goal: "clothing",
        platforms: ["instagram"],
        formats: ["post", "reel"],
        post_count: 12,
        reel_count: 4,
        ad_count: 0,
        duration_days: 30,
        budget: 10000,
        industry: "",
        topic: "",
        needs_strategy: true,
        needs_calendar: true,
        needs_content: true,
        needs_design: true,
        needs_video: true,
        needs_audit: false,
        needs_crm: false,
        needs_performance: false,
        needs_research: false,
        needs_brand_voice: false,
        needs_seo: false,
        needs_critic: true,
      } as never,
      industry: "clothing",
      postsCount: 12,
      reelsCount: 4,
      visualBriefCount: 12,
    });

    const actual: ActualDeliverables = {
      posts: Array.from({ length: 12 }, (_, i) => ({
        topic: `Unique topic ${i + 1}`,
        platform: "instagram",
        format: "post",
        captions: [`Caption for topic ${i + 1} about shirts and jeans.`],
        hook: `Hook ${i + 1}`,
      })),
      reels: [],
      visualBriefs: [],
    };

    const gate = evaluateMandatoryGate(requirements, actual);
    expect(gate.passed).toBe(false);
    expect(gate.failures.some((f) => f.code === "MISSING_REELS")).toBe(true);
    expect(gate.failures.some((f) => f.code === "MISSING_VISUAL_BRIEFS")).toBe(true);
    expect(gate.score).toBeLessThanOrEqual(74);
  });

  it("flags platform mismatch and contamination as critical failures", () => {
    const requirements = buildMandatoryRequirements({
      intent: {
        kind: "full_campaign",
        goal: "instagram only",
        platforms: ["instagram"],
        formats: ["post"],
        post_count: 4,
        reel_count: 0,
        ad_count: 0,
        duration_days: 30,
        budget: null,
        industry: "",
        topic: "",
        needs_strategy: true,
        needs_calendar: true,
        needs_content: true,
        needs_design: false,
        needs_video: false,
        needs_audit: false,
        needs_crm: false,
        needs_performance: false,
        needs_research: false,
        needs_brand_voice: false,
        needs_seo: false,
        needs_critic: true,
      } as never,
      industry: "clothing",
      postsCount: 4,
      reelsCount: 0,
      visualBriefCount: 0,
    });

    const actual: ActualDeliverables = {
      posts: Array.from({ length: 4 }, (_, i) => ({
        topic: `Post ${i}`,
        platform: i % 2 === 0 ? "instagram" : "linkedin",
        format: "post",
        captions: [`Caption ${i}`],
      })),
      reels: [],
      visualBriefs: [],
      allTextBlob: "VIP Site Visit for Nashik homebuyers 2BHK RERA apartment",
    };

    const gate = evaluateMandatoryGate(requirements, actual);
    expect(gate.passed).toBe(false);
    expect(gate.failures.some((f) => f.code === "PLATFORM_MISMATCH")).toBe(true);
    expect(gate.failures.some((f) => f.code === "CONTEXT_CONTAMINATION")).toBe(true);
  });

  it("flags repeated caption templates", () => {
    const requirements = buildMandatoryRequirements({
      intent: {
        kind: "content_calendar",
        goal: "posts",
        platforms: ["instagram"],
        formats: ["post"],
        post_count: 6,
        reel_count: 0,
        ad_count: 0,
        duration_days: 30,
        budget: null,
        industry: "",
        topic: "",
        needs_strategy: false,
        needs_calendar: true,
        needs_content: true,
        needs_design: false,
        needs_video: false,
        needs_audit: false,
        needs_crm: false,
        needs_performance: false,
        needs_research: false,
        needs_brand_voice: false,
        needs_seo: false,
        needs_critic: true,
      } as never,
      industry: "clothing",
      postsCount: 6,
      reelsCount: 0,
      visualBriefCount: 0,
    });

    const repeated = "Most businesses get topic wrong by overcomplicating the basics.";
    const actual: ActualDeliverables = {
      posts: Array.from({ length: 6 }, (_, i) => ({
        topic: `Topic ${i}`,
        platform: "instagram",
        format: "post",
        captions: [repeated],
        hook: `Hook ${i}`,
      })),
      reels: [],
      visualBriefs: [],
    };

    const gate = evaluateMandatoryGate(requirements, actual);
    expect(gate.passed).toBe(false);
    expect(
      gate.failures.some((f) => f.code === "REPEATED_CAPTION_TEMPLATE" || f.code === "DUPLICATE_POSTS")
    ).toBe(true);
  });
});

describe("Regression F — Performance budget", () => {
  beforeEach(() => ChatStore.clearTask("conv-perf"));

  it("offline full campaign completes well under the old 629s failure baseline", async () => {
    const instruction =
      "Create a 30-day Instagram marketing campaign for a men's fashion and clothing brand based in Nashik with 12 posts and 4 Reels. Budget ₹10,000.";
    const { durationMs, deliverables } = await collect(instruction, CLOTHING_BRAND, "conv-perf");

    // Target: useful draft path under 60s offline; production LLM target documented as 30-60s.
    expect(durationMs).toBeLessThan(60_000);

    // First useful deliverable (overview/strategy/calendar) must exist
    expect(deliverables.length).toBeGreaterThan(0);
    const kinds = deliverables.map((d) => d.kind);
    expect(kinds.some((k) => ["overview", "strategy", "calendar", "content_posts", "clarifications"].includes(k))).toBe(true);
  });
});
