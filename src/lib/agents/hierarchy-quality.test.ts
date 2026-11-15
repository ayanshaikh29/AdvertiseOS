import { describe, expect, it } from "vitest";
import { AGENCY_ORG_CHART, reviewItemByContentManager, buildManagerDirectives } from "@/lib/agents/org";
import { buildCampaignContext, contextToPrompt } from "@/lib/campaignContext";
import { SAMPLE_BRAND } from "@/lib/brand";

describe("Step 3 & 5: Agency Hierarchy, Domain Rubrics & Brand Memory", () => {
  it("enforces CEO -> 3 Managers -> Specialists hierarchy structure", () => {
    expect(AGENCY_ORG_CHART.ceo.directReports).toContain("marketing_manager");
    expect(AGENCY_ORG_CHART.ceo.directReports).toContain("content_manager");
    expect(AGENCY_ORG_CHART.ceo.directReports).toContain("performance_manager");
    expect(AGENCY_ORG_CHART.ceo.directReports).toContain("hr_quality");

    expect(AGENCY_ORG_CHART.content_manager.directReports).toEqual(
      expect.arrayContaining(["creative", "designer", "video"])
    );
    expect(AGENCY_ORG_CHART.marketing_manager.directReports).toEqual(
      expect.arrayContaining(["strategist", "researcher", "brand_voice", "seo_sem"])
    );

    // Fast vs Strong model tiers
    expect(AGENCY_ORG_CHART.creative.modelTier).toBe("fast");
    expect(AGENCY_ORG_CHART.video.modelTier).toBe("fast");
    expect(AGENCY_ORG_CHART.ceo.modelTier).toBe("strong");
    expect(AGENCY_ORG_CHART.critic.modelTier).toBe("strong");
  });

  it("builds domain directives from CEO objectives & KPIs", () => {
    const directives = buildManagerDirectives(
      ["Reach 50,000 Nashik homebuyers", "Generate 200 site visit requests"],
      ["Cost per qualified lead under ₹350"],
      "Real Estate"
    );
    expect(directives.marketing).toContain("Real Estate");
    expect(directives.marketing).toContain("Nashik homebuyers");
    expect(directives.content).toContain("scroll-stopping hooks");
    expect(directives.performance).toContain("ToFU/MoFU/BoFU");
  });

  it("Content Manager domain rubric scores deliberately bad content below 60", () => {
    const badItem = {
      topic: "Apartments",
      hook: "practical tip", // Banned phrase + too short
      captions: ["practical tip for today! unlock your potential. reply to learn more."],
      cta: "click here", // Generic banned CTA
    };
    const result = reviewItemByContentManager(badItem);
    expect(result.passed).toBe(false);
    expect(result.score).toBeLessThan(60);
    expect(result.feedback).toContain("banned");
  });

  it("Content Manager domain rubric scores high-quality content above 80", () => {
    const goodItem = {
      topic: "2 BHK Carpet Area Transparency",
      hook: "Stop guessing: Here is exactly what 740 sq.ft carpet area looks like in Nashik.",
      captions: [
        "Before booking an apartment at Pathardi Phata, check the carpet area certificate. Here are 3 measurements every Nashik family should verify before putting down a deposit.",
      ],
      cta: "Schedule a guided site inspection at Pathardi Phata this Saturday.",
    };
    const result = reviewItemByContentManager(goodItem);
    expect(result.passed).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it("proves brand memory rejection reason appears in subsequent prompt context", () => {
    const rejectionExample = "Super luxury flats! Best in Maharashtra! Guaranteed 50% appreciation!";
    const rejectionReason = "Contains unverified superlative claims and illegal return guarantees.";

    const context = buildCampaignContext({
      campaignId: "test-campaign",
      brand: SAMPLE_BRAND,
      brief: {
        goal: "Drive verified inquiries",
        month: "2026-11",
      },
      brandMemory: [
        {
          example: rejectionExample,
          reason: rejectionReason,
        },
      ],
    });

    const prompt = contextToPrompt(context);
    expect(prompt).toContain("BRAND MEMORY — REJECTED EXAMPLES");
    expect(prompt).toContain(rejectionExample);
    expect(prompt).toContain(rejectionReason);
  });
});
