import { describe, expect, it } from "vitest";
import { detectMissingFacts, buildClarifyingQuestions } from "@/lib/agents/missingFacts";
import { heuristicIntent } from "@/lib/agents/intent";
import type { BrandProfile } from "@/lib/brand";

const THIN_BRAND: BrandProfile = {
  id: "b-thin",
  name: "Nashik Premier Homes",
  tone: "professional",
  languages: ["English"],
  audience: "",
  products: "",
  usp: "",
  dos: [],
  donts: [],
  compliance_notes: "",
};

const RICH_BRAND: BrandProfile = {
  id: "b-rich",
  name: "Nashik Premier Homes",
  tone: "professional, trustworthy",
  languages: ["English", "Hindi"],
  audience: "Families and investors looking for residential apartments in Nashik",
  products: "3 BHK and 2 BHK residential apartments in Nashik with metro connectivity",
  usp: "RERA-registered, prime location, premium amenities",
  dos: ["Mention RERA"],
  donts: ["No guaranteed returns"],
  compliance_notes: "MahaRERA compliance required.",
};

describe("detectMissingFacts", () => {
  it("blocks a full campaign when location/price/config/amenities are absent", () => {
    const instruction = "30-day marketing strategy banao, 12 posts aur 4 reels ke saath. Goal: enquiries badhana.";
    const intent = heuristicIntent(instruction);
    const { blocking } = detectMissingFacts(instruction, intent, THIN_BRAND);
    const facts = blocking.map((b) => b.fact);
    expect(facts).toContain("location");
    expect(facts).toContain("price_range");
    expect(facts).toContain("configurations");
    expect(facts).toContain("amenities_or_features");
  });

  it("does not block when the facts are present in the instruction", () => {
    const instruction =
      "Nashik (Gangapur Road) project ke liye 30-day strategy banao. 2 BHK and 3 BHK flats, ₹75L–1.2Cr range, clubhouse gym garden amenities. Budget 50000. CTA: WhatsApp +91 98765 43210 par site visit book karo. 12 posts, 4 reels.";
    const intent = heuristicIntent(instruction);
    const { blocking } = detectMissingFacts(instruction, intent, THIN_BRAND);
    expect(blocking.length).toBe(0);
  });

  it("lets brand profile satisfy facts the instruction omits", () => {
    const instruction = "Full campaign banao — 12 posts, 4 reels. WhatsApp par DM lena hai.";
    const intent = heuristicIntent(instruction);
    const { blocking } = detectMissingFacts(instruction, intent, RICH_BRAND);
    const facts = blocking.map((b) => b.fact);
    expect(facts).not.toContain("configurations");
    expect(facts).not.toContain("amenities_or_features");
  });

  it("does not gate audit-only or general-chat requests", () => {
    const audit = "Instagram account audit karo";
    const auditIntent = heuristicIntent(audit);
    expect(detectMissingFacts(audit, auditIntent, THIN_BRAND).blocking.length).toBe(0);

    const chat = "Hello!";
    const chatIntent = heuristicIntent(chat);
    expect(detectMissingFacts(chat, chatIntent, THIN_BRAND).blocking.length).toBe(0);
  });

  it("builds a clarifying question per blocking fact", () => {
    const instruction = "Campaign banao 12 posts";
    const intent = heuristicIntent(instruction);
    const { blocking } = detectMissingFacts(instruction, intent, THIN_BRAND);
    const questions = buildClarifyingQuestions(blocking);
    expect(questions.length).toBe(blocking.length);
    expect(questions.every((q) => q.question.length > 5)).toBe(true);
  });
});
