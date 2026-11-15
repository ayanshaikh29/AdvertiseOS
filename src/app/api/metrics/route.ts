import { NextResponse } from "next/server";
import { z } from "zod";
import { metricRowSchema } from "@/lib/schemas";
import { computeTotals } from "@/lib/metrics";
import { audit, getRepo } from "@/lib/db/fileRepo";

export async function GET() {
  const rows = await (await getRepo()).listMetrics();
  return NextResponse.json({ rows, totals: computeTotals(rows), note: "Only uploaded/entered numbers — never invented" });
}

export async function POST(req: Request) {
  const parsed = z.object({ rows: z.array(metricRowSchema).min(1).max(500) }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const repo = await getRepo();
  const added = await repo.addMetrics(parsed.data.rows);
  await audit("metrics.added", "metrics", `${added}-rows`, { count: added, source: "manual" });
  return NextResponse.json({ added, totals: computeTotals(await repo.listMetrics()) });
}
