import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken, logAdminAudit } from "@/lib/auth/adminAuth";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "unknown";

  if (session) {
    await logAdminAudit({
      userId: session.userId,
      username: session.username,
      action: "LOGOUT",
      ipAddress: ip,
      userAgent,
      success: true,
    });
  }

  const res = NextResponse.json({ ok: true, message: "Logged out successfully." });
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return res;
}
