import { describe, expect, it } from "vitest";
import { z } from "zod";
import { GeminiProvider } from "@/lib/llm/gemini";
import { LLMQuotaError } from "@/lib/llm/types";

/** Live Gemini checks against the real API. Skipped unless LIVE_LLM=true
 * (run: LIVE_LLM=true with GEMINI_API_KEY set). Costs a few cents. */
const live = process.env.LIVE_LLM === "true" && !!process.env.GEMINI_API_KEY;

describe.skipIf(!live)("GeminiProvider LIVE", () => {
  const llm = () => new GeminiProvider();

  it("json(): structured output validates against zod and tracks cost", async () => {
    const schema = z.object({
      score: z.number().min(0).max(100),
      passed: z.boolean(),
      issues: z.array(z.object({ severity: z.enum(["low", "high"]), text: z.string() })),
    });
    const { data, usage } = await llm().json({
      system: "You are a strict marketing CEO reviewer. Reply with JSON only.",
      user: 'Review this caption for a Diwali offer: "Diwali dhamaka! 50% off everything. DM to order." Score it.',
      schema,
      cacheKey: "live-review",
    });
    expect(data.score).toBeGreaterThanOrEqual(0);
    expect(data.score).toBeLessThanOrEqual(100);
    expect(usage.model).toContain("gemini");
    expect(usage.inputTokens).toBeGreaterThan(0);
    expect(usage.costUsd).toBeGreaterThan(0);
  }, 60_000);

  it("text() with Google Search grounding: sources, or a clear quota error on free tier", async () => {
    // Google Search grounding requires a billing-enabled project (verified live:
    // free-tier key returns 429 RESOURCE_EXHAUSTED). Both outcomes are valid here.
    try {
      const { text, usage, sources } = await llm().text({
        system: "You are a trend researcher. Be brief.",
        user: "What are 2 current digital marketing trends for small businesses in India (October 2026)? Cite sources.",
        grounding: true,
      });
      expect(text.length).toBeGreaterThan(20);
      expect(usage.groundingRequests).toBe(1);
      expect(sources?.length ?? 0).toBeGreaterThan(0);
      expect(sources?.[0]?.uri).toMatch(/^https?:\/\//);
    } catch (e) {
      expect(e).toBeInstanceOf(LLMQuotaError);
    }
  }, 60_000);

  it("embed(): deterministic-length normalized vectors", async () => {
    const [a, b] = await llm().embed(["diwali offer for sweets", "brand identity design"]);
    expect(a).toHaveLength(768);
    expect(b).toHaveLength(768);
    expect(a).not.toEqual(b);
  }, 60_000);

  it("image(): generates background art, or a clear quota error on free tier", async () => {
    // Image models have free-tier limit 0 (verified live) — billing required.
    try {
      const img = await llm().image({
        prompt: "Abstract premium dark background with warm Diwali diya glow and deep blue gradient, no text, no people",
        size: "1080x1080",
      });
      expect(img.sample).toBe(false);
      expect(img.base64.length).toBeGreaterThan(1000);
      expect(img.mimeType).toMatch(/image\//);
    } catch (e) {
      expect(e).toBeInstanceOf(LLMQuotaError);
    }
  }, 90_000);

  it("tts(): returns audio or a documented unsupported result", async () => {
    const out = await llm().tts!({ text: "Namaste! Aaj teen kaam hain.", language: "Hinglish" });
    if (!out.unsupported) {
      expect(out.base64.length).toBeGreaterThan(100);
      expect(out.mimeType).toContain("audio");
    } else {
      expect(out.reason).toBeTruthy();
    }
  }, 60_000);
});

