import { afterEach, describe, expect, it } from "vitest";
import { estimateImageCost, estimateUsageCost, priceFor, resetPriceCache } from "@/lib/llm/pricing";

describe("LLM pricing table", () => {
  afterEach(() => {
    delete process.env.LLM_PRICES_JSON;
    resetPriceCache();
  });

  it("prices gemini-flash-latest from the configured table", () => {
    const { estimated } = priceFor("gemini-flash-latest");
    expect(estimated).toBe(false);
    const { costUsd } = estimateUsageCost("gemini-flash-latest", { input: 1_000_000, output: 1_000_000 });
    expect(costUsd).toBeCloseTo(0.75 + 3.75, 5);
  });

  it("discounts cached input tokens", () => {
    const full = estimateUsageCost("gemini-flash-latest", { input: 1_000_000, output: 0 });
    const cached = estimateUsageCost("gemini-flash-latest", { input: 1_000_000, output: 0, cached: 1_000_000 });
    expect(cached.costUsd).toBeLessThan(full.costUsd);
    expect(cached.costUsd).toBeCloseTo(0.075, 5);
  });

  it("flags unknown models as estimated", () => {
    const { estimated } = priceFor("some-new-model-9000");
    expect(estimated).toBe(true);
    expect(estimateImageCost("some-new-model-9000").costUsd).toBeGreaterThan(0);
  });

  it("honors LLM_PRICES_JSON override", () => {
    process.env.LLM_PRICES_JSON = JSON.stringify([
      { match: "my-model", price: { inputPerM: 10, outputPerM: 20, cachedInputPerM: 1, groundingPerRequest: 0.01, imagePerImage: 0 } },
    ]);
    resetPriceCache();
    const { costUsd, estimated } = estimateUsageCost("my-model", { input: 1_000_000, output: 1_000_000, groundingRequests: 10 });
    expect(estimated).toBe(false);
    expect(costUsd).toBeCloseTo(10 + 20 + 0.1, 5);
  });
});
