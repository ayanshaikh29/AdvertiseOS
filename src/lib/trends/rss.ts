import { createHash } from "crypto";
import type { BrandProfile } from "@/lib/brand";
import type { Trend } from "@/lib/db/repo";

/** Trend Radar (Phase 6C): real headlines from Google News RSS — no API key,
 * no grounding quota. Items always keep source + link + fetch time so nothing
 * is presented as an unsourced fact. */

export type { Trend };

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

export function parseGoogleNewsRss(xml: string, query: string, fetchedAt = new Date().toISOString()): Trend[] {
  const items: Trend[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = m[1] ?? "";
    const title = tag(block, "title");
    const url = tag(block, "link");
    if (!title || !url) continue;
    const sourceM = block.match(/<source(?:\s[^>]*)?>([\s\S]*?)<\/source>/);
    items.push({
      // Full-content hash: truncated prefixes collide (all Google News URLs
      // share "https://news.goog..." — caused duplicate React keys).
      id: `trend-${createHash("sha256").update(url).digest("base64url")}`,
      title,
      url,
      source: sourceM ? unescapeXml(sourceM[1] ?? "") : new URL(url).hostname.replace("news.", ""),
      publishedAt: tag(block, "pubDate"),
      query,
      fetchedAt,
    });
  }
  return items;
}

/** Query set from the brand + its catalog tags — capped at 3 to stay cheap. */
export function buildTrendQueries(brand: BrandProfile, catalogTags: string[] = []): string[] {
  const queries = [`${brand.name.split(" (")[0]} marketing`];
  for (const t of catalogTags.slice(0, 2)) queries.push(`${t} India news`);
  if (queries.length < 3 && brand.audience) queries.push(`${brand.audience.split(/[,.]/)[0]} digital marketing`);
  return queries.slice(0, 3);
}

export const TREND_FEED = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`;

export async function fetchTrends(
  queries: string[],
  fetchImpl: typeof fetch = fetch
): Promise<{ items: Trend[]; errors: string[] }> {
  const fetchedAt = new Date().toISOString();
  const items: Trend[] = [];
  const errors: string[] = [];
  for (const q of queries) {
    try {
      const res = await fetchImpl(TREND_FEED(q), { headers: { "User-Agent": "AdvertiseOS/1.0" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      items.push(...parseGoogleNewsRss(await res.text(), q, fetchedAt));
    } catch (e) {
      errors.push(`${q}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  const seen = new Set<string>();
  const deduped = items.filter((t) => (seen.has(t.url) ? false : (seen.add(t.url), true))).slice(0, 24);
  return { items: deduped, errors };
}
