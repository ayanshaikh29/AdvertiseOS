import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ session: null }, { status: 401 });
  return NextResponse.json({ session: { email: s.email, role: s.role, local: s.local } });
}
