import { describe, expect, it } from "vitest";
import { optimizeItemWithHermes, hermesOptimizationSchema } from "./hermesOptimizer";
import type { Item } from "@/lib/db/repo";
import type { BrandProfile } from "@/lib/brand";

const TEST_BRAND: BrandProfile = {
  id: "test-clothing",
  name: "Nashik Threads",
  tone: "youthful, confident, direct",
  languages: ["English", "Hinglish"],
  audience: "Men aged 18-35 in Nashik",
  products: "Shirts, jeans, trousers, and footwear",
  usp: "Trend-forward menswear with personal styling help",
  dos: ["Show outfits", "Mention store visit"],
  donts: ["No fake discounts", "No generic marketing jargon"],
  compliance_notes: "Never invent prices or testimonials",
};

const SAMPLE_ITEM: Item = {
  id: "item-101",
  topic: "Casual Summer Shirts Collection",
  platform: "instagram",
  format: "post",
  scheduled_for: "2026-06-01",
  captions: [
    "Check out our new collection of shirts. We have many options available. Visit us today to learn more.",
    "Looking for shirts? We have high quality shirts for men in Nashik.",
    "Summer is here. Upgrade your wardrobe with our clothes. DM for details.",
  ],
  hashtags: ["#fashion", "#menswear"],
  cta: "Click here to buy",
  ceo_score: 65,
  status: "pending_human",
};

describe("Hermes Autonomous Campaign Optimizer", () => {
  it("validates hermesOptimizationSchema structure correctly", () => {
    const validData = {
      original_topic: "Summer Shirts",
      audit: {
        hook_score: 85,
        retention_score: 82,
        conversion_score: 88,
        overall_score: 85,
        strengths: ["Clear topic focus", "Natural brand alignment"],
        weaknesses: ["Generic CTA in original draft"],
      },
      optimized_hook: "Stop scrolling: The 3 shirts every Nashik guy needs this summer.",
      optimized_captions: [
        "Hook-led PAS variant with clear pain agitation and brand solution.",
        "Relatable customer transformation story without hype.",
        "Direct irresistible offer with clear WhatsApp booking incentive.",
      ],
      optimized_cta: "WhatsApp us with 'SUMMER' or visit our store at MG Road.",
      improvement_summary: "Upgraded hook into active curiosity gap and made CTA frictionless.",
    };

    const parsed = hermesOptimizationSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
  });

  it("optimizes weak items with direct-response hooks and frictionless CTAs", async () => {
    const { success, result, updatedItem } = await optimizeItemWithHermes(
      SAMPLE_ITEM,
      TEST_BRAND,
      "Drive weekend store visits and WhatsApp catalog inquiries"
    );

    expect(success).toBe(true);
    expect(result.audit.overall_score).toBeGreaterThanOrEqual(70);
    expect(result.optimized_captions.length).toBe(3);
    expect(result.optimized_hook.length).toBeGreaterThan(10);
    expect(updatedItem.captions.length).toBe(3);
    expect(updatedItem.ceo_score).toBeGreaterThanOrEqual(SAMPLE_ITEM.ceo_score);
    expect(updatedItem.rewrite_reason).toContain("Hermes Optimized");
  });
});
