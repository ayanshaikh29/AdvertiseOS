import { describe, expect, it } from "vitest";
import { approvalActionSchema, briefSchema, ceoPlanSchema, contentItemSchema, strategySchema } from "@/lib/schemas";

describe("schemas", () => {
  it("accepts a valid brief", () => {
    const r = briefSchema.safeParse({ brandId: "b1", month: "2026-11", goal: "Get 50 qualified leads" });
    expect(r.success).toBe(true);
  });

  it("rejects a bad month", () => {
    const r = briefSchema.safeParse({ brandId: "b1", month: "Nov 2026", goal: "Get 50 qualified leads" });
    expect(r.success).toBe(false);
  });

  it("requires 10+ calendar items", () => {
    const r = strategySchema.safeParse({
      content_pillars: ["A", "B"],
      audience_insights: ["x"],
      calendar: [],
    });
    expect(r.success).toBe(false);
  });

  it("requires exactly 3 caption variants", () => {
    const base = {
      calendar_date: "2026-11-01",
      platform: "instagram",
      format: "post",
      topic: "T",
      caption_variants: ["a", "b"],
      hashtags: [],
      cta: "DM us",
      alt_text: "alt",
    };
    expect(contentItemSchema.safeParse(base).success).toBe(false);
    expect(contentItemSchema.safeParse({ ...base, caption_variants: ["a", "b", "c"] }).success).toBe(true);
  });

  it("requires rejection reason at route level (schema allows optional, route enforces)", () => {
    const r = approvalActionSchema.safeParse({ itemId: "item-1", action: "reject" });
    expect(r.success).toBe(true);
  });

  it("ceo plan needs tasks", () => {
    expect(ceoPlanSchema.safeParse({ objectives: ["o"], kpis: ["k"], tasks: [] }).success).toBe(false);
  });
});
