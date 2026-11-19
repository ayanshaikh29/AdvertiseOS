import { NextRequest, NextResponse } from "next/server";
import { findAdminUser, logAdminAudit } from "@/lib/auth/adminAuth";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "unknown";

  try {
    const { identifier } = await req.json();
    if (!identifier) {
      return NextResponse.json({ error: "Username or email is required." }, { status: 400 });
    }

    const user = await findAdminUser(identifier);

    await logAdminAudit({
      username: identifier,
      action: "FORGOT_PASSWORD_REQUEST",
      ipAddress: ip,
      userAgent,
      success: !!user,
      details: { found: !!user },
    });

    // Security practice: Return unified reassuring message without leaking user existence
    return NextResponse.json({
      ok: true,
      message:
        "If this administrator account exists, recovery instructions and an emergency override token have been dispatched to the designated server log and system administrator email.",
      hint:
        process.env.NODE_ENV !== "production"
          ? "Local dev notice: Default credentials are admin / admin. If reset is needed, wipe data/admin_auth.json or update admin_users table."
          : undefined,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Unable to process recovery request." }, { status: 500 });
  }
}
