import { describe, expect, it } from "vitest";
import { extractFacts } from "@/lib/agents/factExtractor";
import { detectIndustry, findContamination } from "@/lib/agents/industry";
import { createActiveTask, formatTaskContextPrompt, isTaskReadyToExecute } from "@/lib/agents/taskState";
import { SAMPLE_BRAND } from "@/lib/brand";

const CHAI_BRIEF = `Client brief: We run "Chai Point Studio" — a premium chai + café chain in Pune with 3 outlets. We're launching a new monsoon special menu (kadak chai, bun maska, vada pav, brownie shake) from 15 July 2026.

Goal: Drive footfall + Swiggy/Zomato orders for 30 days.
Budget: ₹25,000 Meta ads for the month.
Platform: Instagram only.
Language: Hinglish (Pune crowd).

Deliverables required:
1. 12 Instagram posts (carousels + statics) — unique topics, no repeated hooks
2. 4 complete Reel scripts — 3 scenes each, 9:16, with on-screen text + CTA
3. 12 visual design briefs (one per post) for the designer
4. 30-day content calendar mapped to July monsoon moments
5. 5 Meta ad copies (primary text + headline + description)
6. Budget allocation split (₹25,000)
7. WhatsApp follow-up sequences for leads
8. Weekly KPI expectations (honest ranges, no fake numbers)

Rules: No invented prices/claims. No real-estate content. Use monsoon/tea seasonal angles. Everything must pass QA before I approve.`;

describe("Chai Point Studio brief — regression (real-estate misroute bug)", () => {
  it("extracts the business name from the brief, not the workspace sample brand", () => {
    const { facts } = extractFacts(CHAI_BRIEF);
    expect(facts.business_name?.value).toBe("Chai Point Studio");
    expect(facts.business_name?.dataClassification).toBe("verified");
  });

  it("does not let 'Budget allocation split (₹25,000)' leak a bogus location", () => {
    const { facts } = extractFacts(CHAI_BRIEF);
    // "allocation" contains "location" as a substring — must NOT match.
    expect(facts.location?.value).not.toMatch(/split|₹|25,000/);
    expect(facts.location?.value ?? "Pune").toBe("Pune");
  });

  it("parses the ₹25,000 campaign budget, not a price fragment", () => {
    const { facts } = extractFacts(CHAI_BRIEF);
    const b = Number(String(facts.budget?.value ?? "").replace(/[^\d]/g, ""));
    expect(b).toBe(25000);
  });

  it("never captures 'prices/claims' as the price range (offers corruption)", () => {
    const { facts } = extractFacts(CHAI_BRIEF);
    expect(facts.price_range?.value ?? "").not.toMatch(/claims|real-estate|approve/i);
    expect(facts.price_range?.value ?? "").not.toMatch(/^s\//);
  });

  it("classifies the brief as restaurant/food, not real estate or agency", () => {
    const industry = detectIndustry([CHAI_BRIEF], SAMPLE_BRAND, { kind: "full_campaign" } as never);
    expect(industry.key).toBe("restaurant");
  });

  it("task context names Chai Point Studio and isolates from Sample Brand", () => {
    const task = createActiveTask("conv-1", CHAI_BRIEF, {
      kind: "full_campaign",
      platforms: ["instagram"],
      post_count: 12,
      reel_count: 4,
    } as never);
    const ctx = formatTaskContextPrompt(task);
    expect(ctx).toContain("Chai Point Studio");
    expect(ctx).not.toContain("Sample Brand");
  });

  it("readiness gate passes for the chai brief (Pune + budget + menu items present)", () => {
    const task = createActiveTask("conv-2", CHAI_BRIEF, {
      kind: "full_campaign",
      platforms: ["instagram"],
      needs_performance: true,
    } as never);
    const { ready } = isTaskReadyToExecute(task);
    expect(ready).toBe(true);
  });

  it("restaurant industry finds no real-estate contamination in its own vocabulary", () => {
    expect(findContamination("kadak chai bun maska vada pav brownie shake monsoon menu", "restaurant")).toEqual([]);
  });
});
