import { NextResponse } from "next/server";
import { getRepo } from "@/lib/db/fileRepo";

/** Campaign list for the sidebar palette + Campaigns screens. */
export async function GET() {
  return NextResponse.json({ campaigns: await (await getRepo()).listCampaigns() });
}
