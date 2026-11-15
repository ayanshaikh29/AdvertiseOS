import { describe, expect, it } from "vitest";
import { buildTrendQueries, fetchTrends, parseGoogleNewsRss } from "@/lib/trends/rss";
import type { BrandProfile } from "@/lib/brand";

const FIXTURE = `<?xml version="1.0"?>
<rss><channel>
<item><title>Diwali ads surge 40% — Marketing Week</title><link>https://news.google.com/rss/articles/C1</link><pubDate>Wed, 15 Oct 2026 10:00:00 GMT</pubDate><source url="https://example.com">Marketing Week</source></item>
<item><title>Reels beat carousels for &amp; small brands</title><link>https://news.google.com/rss/articles/C2</link><pubDate>Tue, 14 Oct 2026 08:00:00 GMT</pubDate><source url="https://example.com">Social Daily</source></item>
<item><title>Missing link should be dropped</title><pubDate>Mon, 13 Oct 2026 08:00:00 GMT</pubDate></item>
</channel></rss>`;

describe("trend radar rss", () => {
  it("parses items with source + link, drops malformed entries, unescapes entities", () => {
    const items = parseGoogleNewsRss(FIXTURE, "diwali marketing", "2026-10-17T00:00:00.000Z");
    expect(items).toHaveLength(2);
    expect(items[0]?.source).toBe("Marketing Week");
    expect(items[0]?.url).toContain("C1");
    expect(items[0]?.fetchedAt).toBe("2026-10-17T00:00:00.000Z");
    expect(items[1]?.title).toContain("small brands");
    expect(items[1]?.title).not.toContain("&amp;");
    // Regression: shared "https://news.goog..." prefix must NOT collide.
    expect(new Set(items.map((i) => i.id)).size).toBe(2);
  });

  it("builds at most 3 brand+tier queries", () => {
    const brand = { name: "Digital Advertise", audience: "Small business owners in India.", products: "SEO" } as BrandProfile;
    const q = buildTrendQueries(brand, ["branding", "performance marketing", "web"]);
    expect(q.length).toBeLessThanOrEqual(3);
    expect(q[0]).toContain("Digital Advertise");
  });

  it("fetchTrends dedupes by url and reports errors without throwing", async () => {
    const dup = FIXTURE + FIXTURE;
    const fakeFetch = async () => ({ ok: true, text: async () => dup }) as Response;
    const { items, errors } = await fetchTrends(["q1"], fakeFetch);
    expect(items).toHaveLength(2); // deduped
    expect(errors).toHaveLength(0);

    const badFetch = async () => ({ ok: false, status: 503, text: async () => "" }) as Response;
    const res = await fetchTrends(["q1"], badFetch);
    expect(res.items).toHaveLength(0);
    expect(res.errors[0]).toContain("503");
  });
});
