export type BrandProfile = {
  id: string;
  name: string;
  tone: string;
  languages: string[];
  audience: string;
  products: string;
  usp: string;
  dos: string[];
  donts: string[];
  compliance_notes: string;
};

export const SAMPLE_BRAND: BrandProfile = {
  id: "sample-brand",
  name: "Sample Brand (Sample data)",
  tone: "confident, helpful, premium",
  languages: ["English", "Hinglish"],
  audience: "Small business owners in India looking for digital marketing help",
  products: "SEO, social media, performance ads, web development",
  usp: "Senior team, transparent reporting",
  dos: ["Use clear CTAs", "Mention city/service explicitly"],
  donts: ["No fake awards", "No invented statistics", "No guaranteed results"],
  compliance_notes: "Never invent client names, awards, testimonials, or numbers.",
};

/** Flags numeric claims, superlatives, and guarantees unless present in brand profile. */
export function hallucinationGuard(copy: string, brand: BrandProfile): string[] {
  const flags: string[] = [];
  const brandFacts = `${brand.products} ${brand.usp} ${brand.audience}`.toLowerCase();

  const numericClaim = /\d+\s?(%|percent|x|clients|awards|years)/i;
  if (numericClaim.test(copy)) {
    const m = copy.match(numericClaim)?.[0]?.toLowerCase() ?? "";
    if (m && !brandFacts.includes(m)) flags.push(`Numeric claim needs verification: "${m}"`);
  }
  // Prices/packages not present in brand facts are unverified.
  const priceClaim = /₹\s?\d[\d,]*|\binr\s?\d[\d,]*|\b\d[\d,]*\s?(k|thousand|lakh|crore)\b/i;
  if (priceClaim.test(copy)) {
    const m = copy.match(priceClaim)?.[0] ?? "";
    if (m && !brandFacts.includes(m.toLowerCase())) {
      flags.push(`Price/package claim needs verification: "${m}"`);
    }
  }
  if (/#1|best in (india|world)|guaranteed|assured results|no\.?\s?1/i.test(copy)) {
    flags.push("Superlative/guarantee detected — requires brand-profile fact or human review");
  }
  if (/award|testimonial|client (said|review)/i.test(copy)) {
    flags.push("Possible invented social proof — must cite a real, approved source");
  }
  if (/\b(100%|zero risk|risk-free|tested 3-step|senior team guarantee)\b/i.test(copy)) {
    flags.push("Unsupported guarantee/proof language detected");
  }
  return flags;
}

/** Deterministic offline fallback: builds a calendar without an LLM call.
 * Platforms respect the requested channels — never cycles Facebook/LinkedIn into an Instagram-only task. */
export function fallbackCalendar(
  month: string,
  options?: {
    platforms?: string[];
    topics?: string[];
    hooks?: string[];
    pillars?: string[];
    formats?: string[];
  }
): import("./schemas").CalendarItem[] {
  const [y, m] = month.split("-").map(Number);
  const year = y ?? 2026;
  const mon = m ?? 10;

  const topicBank: Record<string, string[]> = {
    Education: [
      "How to pick the right option for your needs",
      "3 questions to ask before you spend",
      "What to prepare before you commit",
    ],
    Proof: [
      "How a typical order/project runs, start to finish",
      "What you actually get in the first week",
      "A look at our process, step by step",
    ],
    Offer: [
      "This month's offer, explained simply",
      "What's included and what it costs",
      "Limited monthly slots — details inside",
    ],
    "Behind-the-scenes": [
      "How we plan a week of content",
      "Inside our creative review",
      "Meet the workflow behind your posts",
    ],
  };

  const pillars = options?.pillars?.length
    ? options.pillars
    : ["Education", "Proof", "Offer", "Behind-the-scenes"];
  const platforms = options?.platforms?.length ? options.platforms : ["instagram"];
  const formats = options?.formats?.length ? options.formats : ["post", "carousel", "reel"];
  const customTopics = options?.topics ?? [];
  const customHooks = options?.hooks ?? [];

  const daysInMonth = new Date(year, mon, 0).getDate();
  const items = [];
  const targetDays = Math.min(30, daysInMonth);

  for (let d = 1; d <= targetDays; d++) {
    const date = `${month}-${String(d).padStart(2, "0")}`;
    const pillar = pillars[(d - 1) % pillars.length] as string;
    const platform = platforms[(d - 1) % platforms.length] as string;
    const format = formats[(d - 1) % formats.length] as string;

    let topic: string;
    if (customTopics.length > 0) {
      topic = customTopics[(d - 1) % customTopics.length] as string;
    } else {
      const bank = topicBank[pillar] ?? topicBank.Education!;
      topic = bank[(d - 1) % bank.length] as string;
    }

    const hook =
      customHooks.length > 0
        ? (customHooks[(d - 1) % customHooks.length] as string)
        : `Day ${d}: Essential insight for ${pillars[(d - 1) % pillars.length]}`;

    items.push({
      date,
      platform: platform as "instagram",
      format: format as "post",
      topic: `${topic}${customTopics.length ? ` (Day ${d})` : ""}`,
      goal: pillar,
      hook,
      pillar,
      why_now: d === 1 ? "Beginning of monthly campaign cycle" : d === 15 ? "Mid-month decision checkpoint" : "Evergreen authority pillar",
    });
  }
  return items as unknown as import("./schemas").CalendarItem[];
}
