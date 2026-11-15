import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireRole } from "@/lib/auth";
import { runPublishTick } from "@/lib/publish/tick";

/** POST /api/autopilot/tick — publish scheduled items whose time has come.
 * Auth: signed-in owner/admin, or an external cron with x-cron-secret = CRON_SECRET.
 * Only approved→scheduled items are eligible; approval itself stays human. */
export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const headerSecret = (await headers()).get("x-cron-secret");
  if (!(cronSecret && headerSecret === cronSecret)) {
    const session = await requireRole(["owner", "admin"]);
    if (session instanceof NextResponse) return session;
  }
  const result = await runPublishTick();
  return NextResponse.json({ ...result, note: "Scheduled+due items published via the configured adapter (manual export until Meta is approved)." });
}
