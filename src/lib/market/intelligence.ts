import type { BrandProfile } from "@/lib/brand";

/**
 * Market intelligence layer: multi-source trend collection, 2026 seasonality,
 * and industry benchmark ranges used by research/strategy/content agents.
 * All static values are labeled as industry reference ranges — never presented
 * as measured client results.
 */

export type TrendSourceKind = "news" | "industry" | "social" | "search";

export interface MarketTrendItem {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceKind: TrendSourceKind;
  publishedAt: string;
  query: string;
  fetchedAt: string;
}

export interface SeasonalEvent {
  date: string;
  name: string;
  market: "india" | "global";
  angle: string;
  tags: string[];
}

export interface IndustryBenchmark {
  metric: string;
  rangeLabel: string;
  lowPct?: number;
  highPct?: number;
  note: string;
}

/** Multi-query set: brand + vertical + platform trends + India consumer news. */
export function buildMarketQueries(brand: BrandProfile, industryKey: string, catalogTags: string[] = []): string[] {
  const brandName = brand.name.split(" (")[0];
  const vertical = industryKey.replace(/_/g, " ");
  const queries = [
    `${vertical} marketing trends India`,
    `${brandName} OR ${vertical} consumer demand`,
    "social media marketing trends 2026",
  ];
  for (const t of catalogTags.slice(0, 2)) queries.push(`${t} India market`);
  if (brand.audience) queries.push(`${brand.audience.split(/[,.]/)[0]} buying trends`);
  // Dedupe + cap
  return [...new Set(queries)].slice(0, 6);
}

/** Google News RSS feed builder (India locale default, overridable). */
export function newsRssUrl(q: string, locale: { hl: string; gl: string; ceid: string } = { hl: "en-IN", gl: "IN", ceid: "IN:en" }): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${locale.hl}&gl=${locale.gl}&ceid=${locale.ceid}`;
}

/**
 * Static-ish extra RSS sources that need no API key — marketing trade press.
 * Failures are collected, never thrown.
 */
export const TRADE_FEEDS: Array<{ name: string; url: string; kind: TrendSourceKind }> = [
  { name: "Marketing Week", url: "https://www.marketingweek.com/feed/", kind: "industry" },
  { name: "Social Media Today", url: "https://www.socialmediatoday.com/rss/", kind: "social" },
  { name: "Search Engine Land", url: "https://searchengineland.com/feed", kind: "search" },
  { name: "HubSpot Blog", url: "https://blog.hubspot.com/marketing/rss.xml", kind: "industry" },
];

function unescapeXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .trim();
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? unescapeXml(m[1] ?? "") : "";
}

export function parseRssItems(
  xml: string,
  query: string,
  sourceKind: TrendSourceKind,
  defaultSource: string,
  fetchedAt = new Date().toISOString()
): MarketTrendItem[] {
  const items: MarketTrendItem[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = m[1] ?? "";
    const title = tag(block, "title");
    const url = tag(block, "link");
    if (!title || !url) continue;
    const sourceM = block.match(/<source(?:\s[^>]*)?>([\s\S]*?)<\/source>/);
    let source = sourceM ? unescapeXml(sourceM[1] ?? "") : defaultSource;
    try {
      if (!sourceM) source = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      /* keep default */
    }
    items.push({
      // Full URL hash prefix — short truncations collide on shared host prefixes.
      id: `trend-${Buffer.from(url).toString("base64url")}-${sourceKind}`,
      title,
      url,
      source,
      sourceKind,
      publishedAt: tag(block, "pubDate"),
      query,
      fetchedAt,
    });
  }
  return items;
}

export async function fetchMarketFeed(
  url: string,
  query: string,
  kind: TrendSourceKind,
  sourceName: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ items: MarketTrendItem[]; error?: string }> {
  try {
    const res = await fetchImpl(url, {
      headers: { "User-Agent": "AdvertiseOS/1.0 (+market-intel)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { items: parseRssItems(await res.text(), query, kind, sourceName) };
  } catch (e) {
    return { items: [], error: `${sourceName}: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/** Collect from Google News (multi-query) + trade RSS feeds in parallel. */
export async function collectMarketTrends(opts: {
  queries: string[];
  includeTradeFeeds?: boolean;
  fetchImpl?: typeof fetch;
  maxItems?: number;
}): Promise<{ items: MarketTrendItem[]; errors: string[]; sources: string[] }> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const maxItems = opts.maxItems ?? 36;
  const fetchedAt = new Date().toISOString();
  const jobs: Array<Promise<{ items: MarketTrendItem[]; error?: string; label: string }>> = [];

  for (const q of opts.queries) {
    jobs.push(
      fetchMarketFeed(newsRssUrl(q), q, "news", "Google News", fetchImpl).then((r) => ({
        ...r,
        label: `news:${q}`,
      }))
    );
  }

  if (opts.includeTradeFeeds !== false) {
    for (const feed of TRADE_FEEDS) {
      jobs.push(
        fetchMarketFeed(feed.url, feed.name, feed.kind, feed.name, fetchImpl).then((r) => ({
          ...r,
          label: feed.name,
        }))
      );
    }
  }

  const results = await Promise.all(jobs);
  const errors = results.filter((r) => r.error).map((r) => r.error!);
  const seen = new Set<string>();
  const items: MarketTrendItem[] = [];
  for (const r of results) {
    for (const item of r.items) {
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      items.push(item);
    }
  }
  // Prefer news first, then recency
  items.sort((a, b) => {
    const kindRank = (k: TrendSourceKind) => (k === "news" ? 0 : 1);
    if (kindRank(a.sourceKind) !== kindRank(b.sourceKind)) return kindRank(a.sourceKind) - kindRank(b.sourceKind);
    return (b.publishedAt || "").localeCompare(a.publishedAt || "");
  });

  const sources = [...new Set(results.map((r) => r.label.split(":")[0] ?? r.label))].slice(0, 12);
  return { items: items.slice(0, maxItems), errors, sources };
}

/** 2026 India + global marketing calendar (dates are fixed for 2026). */
export const SEASONAL_EVENTS_2026: SeasonalEvent[] = [
  { date: "2026-01-01", name: "New Year / Resolutions", market: "global", angle: "Fresh starts, goal-setting offers", tags: ["fitness", "fashion", "services"] },
  { date: "2026-01-14", name: "Makar Sankranti / Pongal", market: "india", angle: "Regional cultural campaigns, harvest themes", tags: ["food", "retail", "fashion"] },
  { date: "2026-01-26", name: "Republic Day (India)", market: "india", angle: "Patriotic / made-in-India angles, long-weekend sales", tags: ["retail", "ecommerce"] },
  { date: "2026-02-14", name: "Valentine's Day", market: "global", angle: "Couples, gifting, experiences", tags: ["fashion", "food", "jewellery"] },
  { date: "2026-02-17", name: "Maha Shivratri", market: "india", angle: "Spiritual / wellness / food", tags: ["food", "wellness"] },
  { date: "2026-03-03", name: "Holi", market: "india", angle: "Colour, fun, beverages, fashion", tags: ["fashion", "food", "beverage"] },
  { date: "2026-03-20", name: "Ramadan begins (approx)", market: "india", angle: "Iftar offers, evening commerce", tags: ["food", "fashion", "retail"] },
  { date: "2026-04-02", name: "Ramadan ends / Eid (approx)", market: "india", angle: "Gifting, festive apparel", tags: ["fashion", "retail"] },
  { date: "2026-04-14", name: "Ambedkar Jayanti", market: "india", angle: "Social awareness / community", tags: ["services"] },
  { date: "2026-04-22", name: "Earth Day", market: "global", angle: "Sustainability messaging", tags: ["ecommerce", "fashion"] },
  { date: "2026-05-01", name: "May Day", market: "global", angle: "Labor / workforce content", tags: ["services"] },
  { date: "2026-05-10", name: "Mother's Day", market: "global", angle: "Gifting for moms", tags: ["fashion", "food", "jewellery"] },
  { date: "2026-05-25", name: "Bank Holiday / Summer push", market: "india", angle: "Travel & summer retail", tags: ["travel", "fashion"] },
  { date: "2026-06-21", name: "International Yoga Day", market: "global", angle: "Wellness, fitness, lifestyle", tags: ["wellness", "fashion"] },
  { date: "2026-07-04", name: "Independence Day prep (India) season", market: "india", angle: "Tricolor themes start mid-Aug build-up", tags: ["retail"] },
  { date: "2026-08-15", name: "Independence Day (India)", market: "india", angle: "Patriotic campaigns, sales weekend", tags: ["retail", "ecommerce", "fashion"] },
  { date: "2026-08-27", name: "Ganesh Chaturthi (approx)", market: "india", angle: "Festive launch window for Q3", tags: ["food", "fashion", "retail"] },
  { date: "2026-09-06", name: "Janmashtami (approx)", market: "india", angle: "Festive food & apparel", tags: ["food", "fashion"] },
  { date: "2026-09-11", name: "Onam (approx)", market: "india", angle: "Kerala & south India retail spike", tags: ["fashion", "food"] },
  { date: "2026-10-02", name: "Gandhi Jayanti", market: "india", angle: "National holiday content", tags: ["services"] },
  { date: "2026-10-10", name: "Navratri begins (approx)", market: "india", angle: "Festive fashion launch", tags: ["fashion", "retail"] },
  { date: "2026-10-20", name: "Dussehra (approx)", market: "india", angle: "Peak festive demand start", tags: ["fashion", "retail", "electronics"] },
  { date: "2026-11-08", name: "Diwali (approx)", market: "india", angle: "Highest retail ad intensity of the year", tags: ["fashion", "food", "jewellery", "electronics"] },
  { date: "2026-11-13", name: "Bhai Dooj (approx)", market: "india", angle: "Gifting close to Diwali", tags: ["fashion", "jewellery"] },
  { date: "2026-11-27", name: "Black Friday", market: "global", angle: "Discount-heavy ecommerce", tags: ["ecommerce", "fashion"] },
  { date: "2026-11-30", name: "Cyber Monday", market: "global", angle: "Digital-first offers", tags: ["ecommerce", "electronics"] },
  { date: "2026-12-25", name: "Christmas", market: "global", angle: "Gifting, year-end sales", tags: ["fashion", "food", "retail"] },
  { date: "2026-12-31", name: "New Year's Eve", market: "global", angle: "Party, fashion, travel", tags: ["fashion", "travel", "food"] },
];

/** Events relevant to a campaign month (YYYY-MM) within ±10 days window. */
export function eventsForMonth(month: string, market: "india" | "global" | "all" = "all"): SeasonalEvent[] {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return [];
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0)); // last day of month
  start.setUTCDate(start.getUTCDate() - 10);
  end.setUTCDate(end.getUTCDate() + 10);
  return SEASONAL_EVENTS_2026.filter((e) => {
    if (market !== "all" && e.market !== market) return false;
    const d = new Date(e.date + "T00:00:00Z");
    return d >= start && d <= end;
  });
}

/** Industry reference benchmarks (2026 planning ranges — not client measurements). */
const BENCHMARK_BANK: Record<string, IndustryBenchmark[]> = {
  clothing: [
    { metric: "Instagram engagement rate", rangeLabel: "1.2% – 3.5%", lowPct: 1.2, highPct: 3.5, note: "Fashion retail organic IG" },
    { metric: "Meta ads CTR (retail)", rangeLabel: "0.9% – 1.8%", lowPct: 0.9, highPct: 1.8, note: "Plan creative testing around this band" },
    { metric: "Reels watch-through hook target", rangeLabel: "30% – 45%", lowPct: 30, highPct: 45, note: "First 3 seconds must show product/outfit" },
    { metric: "Typical IG posting cadence", rangeLabel: "4–6 posts / week", note: "Plus 2–4 reels when video is primary" },
    { metric: "WhatsApp reply SLA for leads", rangeLabel: "< 15 minutes", note: "Best-converting local retail window" },
  ],
  real_estate: [
    { metric: "Lead-to-site-visit rate", rangeLabel: "2% – 6%", lowPct: 2, highPct: 6, note: "Varies by ticket size and city" },
    { metric: "Meta lead form CTR", rangeLabel: "1.0% – 2.2%", lowPct: 1.0, highPct: 2.2, note: "High-intent projects outperform" },
    { metric: "Creative refresh cadence", rangeLabel: "Every 10–14 days", note: "Fatigue hits faster on premium inventory" },
  ],
  restaurant: [
    { metric: "Instagram engagement rate", rangeLabel: "1.5% – 4.0%", lowPct: 1.5, highPct: 4.0, note: "Food content over-indexes" },
    { metric: "Order CTA click-through", rangeLabel: "1.2% – 2.5%", lowPct: 1.2, highPct: 2.5, note: "Menu + location in first frame help" },
    { metric: "Peak post times (IN)", rangeLabel: "11am–1pm, 7pm–9pm", note: "Meal decision windows" },
  ],
  ecommerce: [
    { metric: "Add-to-cart rate", rangeLabel: "4% – 8%", lowPct: 4, highPct: 8, note: "Catalog quality dependent" },
    { metric: "Meta prospecting ROAS (plan)", rangeLabel: "1.5x – 3.0x", lowPct: 1.5, highPct: 3.0, note: "Plan range only — not a guarantee" },
    { metric: "Retargeting ROAS (plan)", rangeLabel: "3.0x – 6.0x", lowPct: 3, highPct: 6, note: "Warm audiences" },
  ],
  services: [
    { metric: "Landing page conversion", rangeLabel: "2% – 5%", lowPct: 2, highPct: 5, note: "Form friction dependent" },
    { metric: "Cost per qualified lead (plan)", rangeLabel: "Highly local-variable", note: "Use competitor gap + offer clarity" },
    { metric: "Content cadence", rangeLabel: "3–5 posts / week", note: "Education-first for services" },
  ],
  agency: [
    { metric: "B2B LinkedIn engagement", rangeLabel: "0.5% – 1.5%", lowPct: 0.5, highPct: 1.5, note: "Thought-leadership heavy" },
    { metric: "Inbound lead response time", rangeLabel: "< 5 minutes", note: "Dramatically lifts close rates" },
    { metric: "Case-study content lift", rangeLabel: "Priority asset", note: "Proof beats claims in 2026" },
  ],
  other: [
    { metric: "Baseline engagement", rangeLabel: "1.0% – 2.5%", lowPct: 1, highPct: 2.5, note: "Generic planning band" },
    { metric: "Posting cadence", rangeLabel: "3–5 posts / week", note: "Consistency over volume" },
  ],
};

export function benchmarksForIndustry(industryKey: string): IndustryBenchmark[] {
  return BENCHMARK_BANK[industryKey] ?? BENCHMARK_BANK.other!;
}

/** Compact prompt block injected into campaign context. */
export function marketIntelligencePromptBlock(opts: {
  industryKey: string;
  month: string;
  trends: Array<{ title: string; source: string; sourceKind?: string }>;
}): string {
  const events = eventsForMonth(opts.month);
  const benches = benchmarksForIndustry(opts.industryKey);
  const lines: string[] = [
    "",
    "=== 2026 MARKET INTELLIGENCE (planning inputs — not measured client results) ===",
    `Industry focus: ${opts.industryKey.replace(/_/g, " ")}`,
    "",
    "Reference benchmarks (industry planning ranges — never claim these as YOUR results):",
    ...benches.map((b) => `- ${b.metric}: ${b.rangeLabel} — ${b.note}`),
  ];
  if (events.length) {
    lines.push("", "Seasonal / cultural moments near this campaign month:");
    for (const e of events.slice(0, 6)) {
      lines.push(`- ${e.date} · ${e.name} (${e.market}) — ${e.angle}`);
    }
  }
  if (opts.trends.length) {
    lines.push("", "Live headlines (use as angles ONLY if genuinely relevant; never invent facts):");
    for (const t of opts.trends.slice(0, 8)) {
      lines.push(`- "${t.title}" (${t.source}${t.sourceKind ? `, ${t.sourceKind}` : ""})`);
    }
  }
  lines.push(
    "",
    "Rules for market intelligence:",
    "- Do not present benchmark ranges as achieved client performance",
    "- Trend headlines are inspiration for hooks — verify relevance to THIS brand",
    "- Prefer seasonal moments already in the calendar window",
    ""
  );
  return lines.join("\n");
}
