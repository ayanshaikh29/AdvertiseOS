import { NextResponse } from "next/server";
import { getRepo } from "@/lib/db/fileRepo";

export async function GET() {
  return NextResponse.json({ audit: await (await getRepo()).listAudit() });
}
