import { NextResponse } from "next/server";
import { computeTotals, parseCsv } from "@/lib/metrics";
import { audit, getRepo } from "@/lib/db/fileRepo";

/** Accepts raw CSV (Content-Type: text/csv) from Meta/Google Ads exports. */
export async function POST(req: Request) {
  const text = await req.text();
  if (!text.trim()) return NextResponse.json({ error: "Empty CSV body" }, { status: 400 });
  const { rows, errors } = parseCsv(text);
  if (rows.length === 0) return NextResponse.json({ error: errors.join("; ") || "No valid rows" }, { status: 400 });
  const repo = await getRepo();
  const added = await repo.addMetrics(rows);
  await audit("metrics.imported", "metrics", `${added}-rows`, { count: added, source: "csv", errors: errors.length });
  return NextResponse.json({ added, skipped: errors.length, errors: errors.slice(0, 5), totals: computeTotals(await repo.listMetrics()) });
}
