import type { BrandProfile } from "@/lib/brand";
import type { RequestIntent, MissingFact } from "@/lib/schemas";

/** Missing-facts gate: the manager must NOT invent location, price, amenities,
 * offers, photos or contact details. When a blocking fact is absent the run
 * stops and asks — exactly the behaviour the product spec requires.
 *
 * Detection is deterministic (regex + brand-profile checks) so it works offline
 * and never hallucinates a "found" fact. */

type FactRule = {
  fact: string;
  label: string;
  question: string;
  blockingFor: Array<RequestIntent["kind"]>;
  detect: RegExp;
  /** Brand-profile fields that already satisfy this fact. */
  brandFields?: Array<keyof BrandProfile>;
};

const RULES: FactRule[] = [
  {
    fact: "location",
    label: "Project / business location (city or address)",
    question: "Project ya business ki exact location (city / area / address) kya hai?",
    blockingFor: ["full_campaign", "content_calendar", "single_content", "creative_only", "video_only"],
    detect: /\b(nashik|mumbai|pune|delhi|bangalore|bengaluru|hyderabad|chennai|kolkata|ahmedabad|jaipur|surat|indore|thane|navi mumbai|ghaziabad|noida|gurgaon|gurugram|faridabad|lok[\s-]?tion|address|area|city|near [a-z]+|sector\s*\d|pincode|pin code|\d{6})\b/i,
  },
  {
    fact: "price_range",
    label: "Verified price / price range (with units)",
    question: "Verified price range ya starting price kya hai (unit ke saath, jaise ₹75L–1.2Cr)?",
    // Single captions can be written price-free (reviewer blocks invented numbers);
    // packages/assets that will show a price must have the real one.
    blockingFor: ["full_campaign", "content_calendar", "creative_only"],
    detect: /\b(₹|rs\.?|inr)\s*[\d,.]+\s*(l|lac|lakh|cr|crore|k|thousand|million)?|\b[\d,.]+\s*(lakh|lac|crore|cr)\b|\bprice\b\s*[:\-]|\bstarting\s*(at|from)\b/i,
  },
  {
    fact: "configurations",
    label: "Product / unit configurations (e.g. 2BHK, 3BHK, sizes)",
    question: "Configurations kya hain (jaise 2BHK / 3BHK, sq.ft ranges, SKUs, plan tiers)?",
    blockingFor: ["full_campaign", "content_calendar", "creative_only", "video_only"],
    detect: /\b\d\s*bhk\b|\b\d+bhk\b|\bsq\.?\s?ft\b|\bstudio\b|\b1rk\b|\b(?:tier|plan|sku|package)\s*[1-4]\b|\b(?:basic|standard|premium|pro|enterprise)\s+plan\b|\bvariant\b/i,
    brandFields: ["products"],
  },
  {
    fact: "amenities_or_features",
    label: "Verified amenities / features / offering list",
    question: "Verified amenities / features / actual offerings ki list de do (jinhe publish kar sakte hain)?",
    blockingFor: ["full_campaign", "content_calendar", "creative_only", "video_only"],
    detect: /\b(amenit\w+|features?|specifications?|facilities|clubhouse|swimming\s*pool|gym|garden|parking|lift|security|wifi|park)\b/i,
    brandFields: ["products", "usp"],
  },
  {
    fact: "budget",
    label: "Marketing / ad budget for the campaign",
    question: "Is campaign ka marketing / ads budget kitna hai?",
    blockingFor: ["full_campaign"],
    detect: /\b(budget|spend|₹\s*[\d,]+|rs\.?\s*[\d,]+|\d+k\s*(per\s*(day|month|week))?)\b/i,
  },
  {
    fact: "contact_or_cta",
    label: "Real CTA destination (phone / WhatsApp / form / address)",
    question: "Final CTA kis destination par jayega (phone number, WhatsApp, form link, ya office address)?",
    blockingFor: ["full_campaign", "content_calendar", "single_content", "creative_only", "video_only"],
    detect: /\b(\+?\d[\d\s-]{7,}|wa\.me|whatsapp|forms?\.gle|google\.com\/forms|book(ing)?\s*(a\s*)?site\s*visit|\bdm\b|call\s+us|contact\s+us|lit\.link|linktr\.ee|cal\.com|schedule)\b/i,
    brandFields: ["usp"],
  },
];

const OPTIONAL_FACTS: Array<{ fact: string; label: string; question: string }> = [
  { fact: "photos_assets", label: "Project photos / brand assets / logo files", question: "Project photos, logo aur brand assets hain toh attach kar do." },
  { fact: "offers", label: "Active offers / launches / deadlines", question: "Koi active offer, launch ya deadline hai jo highlight karna hai?" },
  { fact: "competitors", label: "Competitors or reference accounts", question: "Competitors ya reference accounts kaunse hain?" },
];

function brandSatisfies(rule: FactRule, brand: BrandProfile): boolean {
  if (!rule.brandFields) return false;
  return rule.brandFields.some((f) => {
    const v = brand[f];
    return typeof v === "string" && v.trim().length > 12;
  });
}

export function detectMissingFacts(
  instruction: string,
  intent: RequestIntent,
  brand: BrandProfile,
  attachmentText = "",
  collectedFacts: Record<string, import("@/types/chat").FactRecord> = {},
  isDemoMode = false
): { missing: MissingFact[]; blocking: MissingFact[] } {
  // Demo Mode: user explicitly specified fictional/demo data — do not block the run!
  if (isDemoMode) {
    return { missing: [], blocking: [] };
  }

  const collectedValues = Object.entries(collectedFacts)
    .map(([k, v]) => `${k}: ${v.value}`)
    .join("\n");
  const haystack = `${instruction}\n${collectedValues}\n${attachmentText}\n${brand.products}\n${brand.usp}\n${brand.audience}\n${brand.compliance_notes}`;
  const missing: MissingFact[] = [];

  // Only production intents need the gate. Chat / audit / performance / CRM do not.
  const productionKinds: Array<RequestIntent["kind"]> = ["full_campaign", "content_calendar", "single_content", "creative_only", "video_only"];
  if (!productionKinds.includes(intent.kind)) return { missing: [], blocking: [] };

  for (const rule of RULES) {
    if (!rule.blockingFor.includes(intent.kind)) continue;
    // Check if already collected in prior turns or current instruction
    const existingVal = collectedFacts[rule.fact]?.value;
    if (existingVal && existingVal.trim().length > 0) continue;
    if (rule.detect.test(haystack)) continue;
    if (brandSatisfies(rule, brand)) continue;
    // Budget only blocks when the request has paid-media intent (ads or full campaign).
    if (rule.fact === "budget" && intent.kind !== "full_campaign" && intent.ad_count === 0) continue;
    missing.push({ fact: rule.fact, why_needed: rule.label, blocking: true });
  }

  return { missing, blocking: missing.filter((m) => m.blocking) };
}

export function buildClarifyingQuestions(missing: MissingFact[]): Array<{ fact: string; question: string; blocking: boolean }> {
  return missing.map((m) => {
    const rule = RULES.find((r) => r.fact === m.fact);
    return { fact: m.fact, question: rule?.question ?? m.why_needed, blocking: m.blocking };
  });
}

export function optionalFollowUps(): string[] {
  return OPTIONAL_FACTS.map((f) => f.question);
}

/** True when the brand profile is too thin to write anything specific
 * (the orchestrator then labels output as draft-only). */
export function brandIsThin(brand: BrandProfile): boolean {
  const filled = [brand.products, brand.usp, brand.audience, brand.tone].filter((s) => s && s.trim().length > 8).length;
  return filled < 2;
}
