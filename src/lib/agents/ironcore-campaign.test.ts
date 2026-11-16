import { describe, expect, it, vi, beforeEach } from "vitest";
import { runAgencyOrchestration, type OrchestrationEvent } from "@/lib/agents/orchestrator";
import { ChatStore } from "@/lib/db/chatStore";
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

const SAMPLE_BRAND: BrandProfile = {
  id: "brand-sample",
  name: "Sample Brand",
  tone: "bold and modern",
  languages: ["English"],
  audience: "young urban professionals",
  products: "premium lifestyle products",
  usp: "high quality at fair prices",
  dos: ["Keep it fresh"],
  donts: ["No spam"],
  compliance_notes: "Sample data only",
};

function byKind<T extends Deliverable["kind"]>(dels: Deliverable[], kind: T) {
  return dels.filter((d): d is Extract<Deliverable, { kind: T }> => d.kind === kind);
}

describe("IronCore Fitness Campaign - End-to-End Orchestration & Mandatory QA Gate", () => {
  beforeEach(() => {
    ChatStore.clearTask("conv-ironcore");
  });

  it("orchestrates IronCore Fitness campaign with 100/100 score and passes all mandatory QA gates without REPEATED_CAPTION_TEMPLATE", async () => {
    const instruction =
      'Create a 30-day lead generation campaign for "IronCore Fitness", a premium gym in Mumbai (Andheri & Bandra). ' +
      "Details: - Campaign: 30-Day Monsoon Shred Challenge with certified trainers and customized nutrition plan " +
      "- Target: Working professionals aged 24-45 looking for weight loss and functional strength " +
      "- Goal: Generate 100+ inquiries for a 2-day free trial pass " +
      "- Budget: ₹30,000 across Instagram & Facebook ads " +
      "- Tone: Motivational, authoritative, no fake guarantees " +
      "Required: 1. 12 Instagram feed posts with educational carousels " +
      "2. 4 viral Reels concepts with shot-by-shot visual breakdown " +
      "3. Full 30-day calendar " +
      "4. High-CTR Meta ad copies with audience targeting recommendations";

    const events: OrchestrationEvent[] = [];
    await runAgencyOrchestration({
      instruction,
      brand: SAMPLE_BRAND,
      conversationId: "conv-ironcore",
      onEvent: (ev) => {
        events.push(ev);
      },
    });

    const deliverables = events
      .filter((e): e is Extract<OrchestrationEvent, { type: "deliverable" }> => e.type === "deliverable")
      .map((e) => e.deliverable);

    const posts = byKind(deliverables, "content_posts");
    const videos = byKind(deliverables, "videos");
    const creatives = byKind(deliverables, "creatives");
    const calendar = byKind(deliverables, "calendar");
    const critic = byKind(deliverables, "critic");
    const summary = byKind(deliverables, "summary");

    // 1. Verify required counts
    expect(posts[0]).toBeDefined();
    expect(posts[0]!.items.length).toBe(12);
    expect(videos[0]).toBeDefined();
    expect(videos[0]!.plans.length).toBe(4);
    expect(creatives[0]).toBeDefined();
    expect(creatives[0]!.items.length).toBe(12);
    expect(calendar[0]).toBeDefined();
    expect(calendar[0]!.items.length).toBe(12);

    // 2. Verify all 12 posts have distinct hooks and captions
    const allHooks = posts[0]!.items.map((i) => i.hook);
    const uniqueHooks = new Set(allHooks);
    expect(uniqueHooks.size).toBe(12);

    // Check first 80 characters of caption 1 across all 12 posts for duplicates
    const captionStarts = posts[0]!.items.map((i) => i.captions[0]?.slice(0, 80).trim().toLowerCase());
    const uniqueStarts = new Set(captionStarts);
    expect(uniqueStarts.size).toBe(12);

    // 3. Verify Critic QA Gate passed with 100/100 and no critical failures
    expect(critic[0]).toBeDefined();
    expect(critic[0]!.passed).toBe(true);
    expect(critic[0]!.overallScore).toBe(100);

    const repeatedTemplateFail = critic[0]!.issues.find((f) => f.text.includes("REPEATED_CAPTION_TEMPLATE"));
    expect(repeatedTemplateFail).toBeUndefined();

    // 4. Verify Summary displays Verified status and correct brand name
    expect(summary[0]).toBeDefined();
    expect(summary[0]!.verificationBadge).toBe("AI Verified");
    expect(summary[0]!.headline).toContain("IronCore Fitness");
  });
});
