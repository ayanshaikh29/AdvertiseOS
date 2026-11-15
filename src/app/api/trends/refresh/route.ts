import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { buildTrendQueries } from "@/lib/trends/rss";
import { buildMarketQueries, collectMarketTrends } from "@/lib/market/intelligence";
import { getBrandProfile } from "@/lib/db/brands";
import { audit, getRepo } from "@/lib/db/fileRepo";
import { detectIndustry } from "@/lib/agents/industry";

/** POST /api/trends/refresh — multi-source market headlines (Google News + trade RSS). */
export async function POST(req: Request) {
  const session = await requireRole(["owner", "admin"]);
  if (session instanceof NextResponse) return session;
  const { brandId } = await req.json().catch(() => ({}));
  if (typeof brandId !== "string" || !brandId) return NextResponse.json({ error: "brandId required" }, { status: 400 });
  let brand;
  try {
    brand = await getBrandProfile(brandId);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Brand load failed" }, { status: 400 });
  }
  const catalog = await (await getRepo()).listCatalog(brandId);
  const tags = [...new Set(catalog.flatMap((c) => c.tags))].slice(0, 4);
  const industry = detectIndustry([brand.name, brand.products, brand.audience], brand);
  const legacyQueries = buildTrendQueries(brand, tags);
  const marketQueries = buildMarketQueries(brand, industry.key, tags);
  const queries = [...new Set([...marketQueries, ...legacyQueries])].slice(0, 6);

  const { items, errors, sources } = await collectMarketTrends({ queries, maxItems: 36 });
  // Map to stored Trend shape (sourceKind folded into query meta for display).
  const stored = items.map((t) => ({
    id: t.id,
    title: t.title,
    url: t.url,
    source: t.source,
    publishedAt: t.publishedAt,
    query: `${t.sourceKind}:${t.query}`,
    fetchedAt: t.fetchedAt,
  }));
  if (stored.length) await (await getRepo()).saveTrends(stored);
  await audit("trends.refreshed", "trends", brandId, { queries, count: stored.length, errors: errors.length, sources });
  return NextResponse.json({
    trends: stored,
    queries,
    sources,
    errors,
    note: stored.length
      ? `Fetched ${stored.length} headlines from ${sources.length || "multiple"} sources.`
      : "No headlines fetched (network/quota). Stored trends still available.",
  });
}
