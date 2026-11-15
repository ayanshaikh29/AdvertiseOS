import { describe, expect, it } from "vitest";
import { SAMPLE_BRAND, fallbackCalendar, hallucinationGuard } from "@/lib/brand";

describe("hallucination guard", () => {
  it("flags invented percentages", () => {
    expect(hallucinationGuard("We deliver 540% growth guaranteed!", SAMPLE_BRAND).length).toBeGreaterThan(0);
  });

  it("flags superlatives and awards", () => {
    expect(hallucinationGuard("We are the #1 award-winning agency", SAMPLE_BRAND).length).toBeGreaterThan(0);
  });

  it("passes clean copy", () => {
    expect(hallucinationGuard("Practical SEO tips for small businesses. DM us to talk.", SAMPLE_BRAND)).toEqual([]);
  });
});

describe("fallback calendar", () => {
  it("produces 30 dated items", () => {
    const items = fallbackCalendar("2026-11");
    expect(items.length).toBe(30);
    expect(items[0]?.date).toBe("2026-11-01");
  });

  it("never leaks the goal string into topics (regression: '…(day 1)' titles)", () => {
    const items = fallbackCalendar("2026-11");
    for (const i of items) {
      expect(i.topic).not.toMatch(/\(day \d+\)/);
      expect(i.topic.length).toBeLessThanOrEqual(70);
      expect(i.topic.trim().length).toBeGreaterThan(5);
    }
  });
});
