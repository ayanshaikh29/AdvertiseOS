import { describe, expect, it, beforeEach } from "vitest";
import { heuristicIntent } from "@/lib/agents/intent";
import type { BrandProfile } from "@/lib/brand";

beforeEach(() => {
  // Force offline mode so classifyIntent never hits a live model in unit tests.
  process.env.LLM_PROVIDER = "fake";
});

const BRAND: BrandProfile = {
  id: "b1",
  name: "Test Brand",
  tone: "professional",
  languages: ["English"],
  audience: "Homebuyers",
  products: "Residential apartments",
  usp: "Prime location",
  dos: [],
  donts: [],
  compliance_notes: "",
};

describe("heuristicIntent", () => {
  it("scopes a full campaign with explicit counts", () => {
    const intent = heuristicIntent(
      "Mere client ke residential project ke liye 30-day marketing strategy banao. Instagram aur Facebook ke liye 12 posts, 4 Reels aur 3 ad concepts ready karo. Goal qualified enquiries aur site visits badhana hai."
    );
    expect(intent.kind).toBe("full_campaign");
    expect(intent.post_count).toBe(12);
    expect(intent.reel_count).toBe(4);
    expect(intent.ad_count).toBe(3);
    expect(intent.duration_days).toBe(30);
    expect(intent.platforms).toContain("instagram");
    expect(intent.platforms).toContain("facebook");
    expect(intent.needs_strategy).toBe(true);
    expect(intent.needs_calendar).toBe(true);
    expect(intent.needs_content).toBe(true);
  });

  it("scopes a single caption request without launching the whole team", () => {
    const intent = heuristicIntent("Ek Instagram caption likho hamare new offer ke liye");
    expect(intent.kind).toBe("single_content");
    expect(intent.needs_calendar).toBe(false);
    expect(intent.needs_strategy).toBe(false);
    expect(intent.needs_design).toBe(false);
    expect(intent.needs_video).toBe(false);
  });

  it("scopes audit-only requests", () => {
    const intent = heuristicIntent("Hamara Instagram account audit karo");
    expect(intent.kind).toBe("audit_only");
    expect(intent.needs_audit).toBe(true);
    expect(intent.needs_content).toBe(false);
  });

  it("scopes video-only storyboard requests", () => {
    const intent = heuristicIntent("Ek reel script aur storyboard banao product demo ke liye");
    expect(intent.kind).toBe("video_only");
    expect(intent.needs_video).toBe(true);
    expect(intent.needs_calendar).toBe(false);
  });

  it("extracts budget when stated and never invents one", () => {
    const withBudget = heuristicIntent("30-day campaign banao with budget 50000");
    expect(withBudget.budget).toBe(50000);
    const noBudget = heuristicIntent("30-day campaign strategy banao");
    expect(noBudget.budget).toBeNull();
  });

  it("treats greetings as general chat — no production run", () => {
    const intent = heuristicIntent("Hello, how are you?");
    expect(intent.kind).toBe("general_chat");
    expect(intent.needs_content).toBe(false);
    expect(intent.needs_design).toBe(false);
  });
});

describe("classifyIntent respects brand", () => {
  it("falls back to heuristics offline without throwing", async () => {
    const { classifyIntent } = await import("@/lib/agents/intent");
    const { intent, source } = await classifyIntent("12 posts aur 4 reels ka calendar banao", BRAND);
    expect(intent.kind).toBe("content_calendar");
    expect(["llm", "heuristic"]).toContain(source);
  });
});
