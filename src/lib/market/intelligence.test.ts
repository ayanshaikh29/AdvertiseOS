import { describe, expect, it } from "vitest";
import {
  buildMarketQueries,
  newsRssUrl,
  parseRssItems,
  collectMarketTrends,
  eventsForMonth,
  benchmarksForIndustry,
  marketIntelligencePromptBlock,
  SEASONAL_EVENTS_2026,
  TRADE_FEEDS,
} from "@/lib/market/intelligence";
import type { BrandProfile } from "@/lib/brand";

const RSS_FIXTURE = `<?xml version="1.0"?>
<rss><channel>
<item><title>Festive fashion demand up &amp; steady</title><link>https://example.com/a1</link><pubDate>Mon, 12 Oct 2026 09:00:00 GMT</pubDate><source url="https://example.com">Retail Wire</source></item>
<item><title>Reels hook best practices 2026</title><link>https://example.com/a2</link><pubDate>Sun, 11 Oct 2026 09:00:00 GMT</pubDate></item>
<item><title>Drop me — no link</title><pubDate>Sat, 10 Oct 2026 09:00:00 GMT</pubDate></item>
</channel></rss>`;

describe("market intelligence", () => {
  const brand = {
    name: "Nashik Threads (clothing)",
    audience: "Urban millennials in Nashik",
    products: "Ethnic wear",
  } as BrandProfile;

  it("builds multi-source market queries capped at 6", () => {
    const q = buildMarketQueries(brand, "clothing", ["sarees", "kurtis", "jeans"]);
    expect(q.length).toBeGreaterThan(1);
    expect(q.length).toBeLessThanOrEqual(6);
    expect(q.some((x) => x.includes("clothing marketing trends"))).toBe(true);
    expect(new Set(q).size).toBe(q.length);
  });

  it("builds India-localized Google News RSS URLs", () => {
    const url = newsRssUrl("diwali retail");
    expect(url).toContain("news.google.com/rss/search");
    expect(url).toContain(encodeURIComponent("diwali retail"));
    expect(url).toContain("hl=en-IN");
    expect(url).toContain("gl=IN");
  });

  it("parses RSS items, drops entries without links, unescapes entities", () => {
    const items = parseRssItems(RSS_FIXTURE, "q", "news", "Google News", "2026-10-15T00:00:00.000Z");
    expect(items).toHaveLength(2);
    expect(items[0]?.title).toContain("fashion demand");
    expect(items[0]?.title).not.toContain("&amp;");
    expect(items[0]?.source).toBe("Retail Wire");
    expect(items[1]?.source).toBe("example.com");
    expect(new Set(items.map((i) => i.id)).size).toBe(2);
  });

  it("collectMarketTrends dedupes by url, reports errors, never throws", async () => {
    const fakeFetch = async (input: RequestInfo | URL) => {
      const u = String(input);
      if (u.includes("news.google.com")) {
        return { ok: true, text: async () => RSS_FIXTURE } as Response;
      }
      return { ok: false, status: 503, text: async () => "" } as Response;
    };
    const { items, errors, sources } = await collectMarketTrends({
      queries: ["clothing trends"],
      includeTradeFeeds: true,
      fetchImpl: fakeFetch,
    });
    expect(items.length).toBeGreaterThan(0);
    expect(errors.length).toBe(TRADE_FEEDS.length);
    expect(sources.length).toBeGreaterThan(0);
    expect(items[0]?.sourceKind).toBe("news");
  });

  it("returns seasonal events for the right 2026 month window", () => {
    const nov = eventsForMonth("2026-11");
    expect(nov.length).toBeGreaterThan(0);
    expect(nov.some((e) => e.name.includes("Diwali"))).toBe(true);
    const may = eventsForMonth("2026-05");
    expect(may.some((e) => e.name.includes("Mother"))).toBe(true);
    expect(eventsForMonth("not-a-month")).toEqual([]);
    // All events are dated in 2026
    for (const e of SEASONAL_EVENTS_2026) {
      expect(e.date.startsWith("2026-")).toBe(true);
    }
  });

  it("returns industry-aware benchmarks with other fallback", () => {
    const clothing = benchmarksForIndustry("clothing");
    expect(clothing.length).toBeGreaterThanOrEqual(3);
    expect(clothing.some((b) => b.metric.includes("engagement"))).toBe(true);
    const fallback = benchmarksForIndustry("unknown_industry");
    expect(fallback.length).toBeGreaterThan(0);
    // Real-estate must not leak into clothing benchmarks
    expect(clothing.some((b) => b.metric.includes("site-visit"))).toBe(false);
  });

  it("prompt block labels benchmarks as planning inputs, not results", () => {
    const block = marketIntelligencePromptBlock({
      industryKey: "clothing",
      month: "2026-11",
      trends: [{ title: "Diwali ad spend spikes", source: "Marketing Week", sourceKind: "live" }],
    });
    expect(block).toContain("planning inputs");
    expect(block).toContain("not measured client results");
    expect(block).toContain("never claim these as YOUR results");
    expect(block).toContain("Diwali");
    expect(block).toContain("Marketing Week");
    expect(block).toContain("Do not present benchmark ranges as achieved client performance");
  });
});
