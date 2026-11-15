import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { getBrandProfile } from "@/lib/db/brands";
import { runCampaignPipeline } from "@/lib/agents/pipeline";
import { buildTrendQueries, fetchTrends } from "@/lib/trends/rss";
import { getRepo } from "@/lib/db/fileRepo";

const bodySchema = z.object({ brandId: z.string().min(1), days: z.number().int().min(3).max(14).default(7) });

/** POST /api/autopilot/run — generate a week of on-brand content from the catalog +
 * real trend headlines. Every item lands in the approval inbox (human gate). */
export async function POST(req: Request) {
  const session = await requireRole(["owner", "admin"]);
  if (session instanceof NextResponse) return session;
  if (process.env.FEATURE_AUTOPILOT === "false") {
    return NextResponse.json({ error: "Autopilot is disabled (FEATURE_AUTOPILOT=false)." }, { status: 403 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { brandId, days } = parsed.data;
  let brand;
  try {
    brand = await getBrandProfile(brandId);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Brand load failed" }, { status: 400 });
  }

  const repo = await getRepo();
  const catalog = await repo.listCatalog(brandId);
  const active = catalog.filter((c) => c.status === "active");
  const tags = [...new Set(catalog.flatMap((c) => c.tags))].slice(0, 4);
  const { items: trends } = await fetchTrends(buildTrendQueries(brand, tags));
  if (trends.length) await repo.saveTrends(trends);
  const stored = trends.length ? trends : await repo.listTrends(5);

  const now = new Date();
  const month = now.toISOString().slice(0, 7);
  const catalogLine = active.length
    ? `Catalog focus (real, sellable): ${active.slice(0, 5).map((c) => `${c.name}${c.price != null ? ` (${c.currency} ${c.price})` : ""}`).join("; ")}.`
    : "Catalog is empty — stick to brand profile products and say offers need catalog pricing.";
  const goal = `Autopilot: plan the next ${days} days of content (${month}). ${catalogLine} Prefer 3–5 posts over thin volume; every claim must come from the brand profile or catalog.`;

  try {
    const result = await runCampaignPipeline({ brand, brief: { brandId, month, goal, offers: "", festivals: "", notes: `autopilot ${days}d` }, trends: stored, source: "autopilot" });
    return NextResponse.json({
      ...result,
      trendsUsed: stored.slice(0, 3).map((t) => ({ title: t.title, source: t.source })),
      note: "All items are waiting in Approvals — nothing publishes without a human.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Autopilot run failed";
    return NextResponse.json({ error: msg }, { status: msg.includes("cost limit") ? 402 : 500 });
  }
}
