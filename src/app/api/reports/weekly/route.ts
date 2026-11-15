import { NextResponse } from "next/server";
import { performanceRun } from "@/lib/agents";
import { getBrandProfile } from "@/lib/db/brands";
import { computeTotals } from "@/lib/metrics";
import { audit, getRepo } from "@/lib/db/fileRepo";
import { notify } from "@/lib/notify";

export async function GET() {
  const latest = await (await getRepo()).latestReport();
  if (!latest) return NextResponse.json({ report: null, note: "No report yet — generate one." });
  return NextResponse.json(latest);
}

/** Generate the weekly Performance report from REAL uploaded metrics only. */
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const repo = await getRepo();
  const metrics = await repo.listMetrics();
  const totals = computeTotals(metrics);
  const brands = await repo.listBrands();
  const brandId = searchParams.get("brandId") ?? brands[0]?.id;
  if (!brandId) return NextResponse.json({ error: "Add a brand first (or load sample data)." }, { status: 400 });
  const brand = await getBrandProfile(brandId);
  const { data, run } = await performanceRun(brand, metrics, totals);
  const report = {
    summary: data.summary,
    what_worked: data.what_worked ?? [],
    what_didnt: data.what_didnt ?? [],
    budget_reallocation: data.budget_reallocation ?? [],
    ab_test_ideas: data.ab_test_ideas ?? [],
    next_actions: data.next_actions ?? [],
  };
  await repo.addRun({ agent: "performance", costUsd: run.costUsd, latencyMs: run.latencyMs, status: run.status, model: run.model, inputTokens: run.tokens.input, outputTokens: run.tokens.output, created_at: new Date().toISOString() });
  const entry = { id: `rep-${Date.now()}`, created_at: new Date().toISOString(), report, totals: { rows: totals.rows } };
  await repo.saveReport(entry);
  await audit("report.generated", "report", entry.id, { rows: totals.rows, costUsd: run.costUsd });
  await notify("AdvertiseOS weekly report ready", report.summary);
  return NextResponse.json(entry);
}
