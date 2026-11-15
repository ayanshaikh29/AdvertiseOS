import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getRepo } from "@/lib/db/fileRepo";

/** GET /api/trends — stored Trend Radar headlines (real Google News RSS, source-linked). */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const items = await (await getRepo()).listTrends(30);
  const freshest = items[0]?.fetchedAt ?? null;
  const stale = !freshest || Date.now() - Date.parse(freshest) > 6 * 3600_000;
  return NextResponse.json({
    trends: items,
    stale,
    note: "Real headlines from Google News RSS with source + link. Used as angles, never as unsourced facts.",
  });
}
