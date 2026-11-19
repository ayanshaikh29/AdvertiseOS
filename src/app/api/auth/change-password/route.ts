import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
  findAdminUser,
  verifyPassword,
  updateAdminPassword,
  createSessionToken,
  logAdminAudit,
} from "@/lib/auth/adminAuth";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized session." }, { status: 401 });
  }

  const session = verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "unknown";

  try {
    const { currentPassword, newPassword } = await req.json();

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    if (newPassword.toLowerCase() === "admin") {
      return NextResponse.json(
        { error: "Password cannot remain the default 'admin'. Please choose a secure password." },
        { status: 400 }
      );
    }

    // Verify current password
    const user = await findAdminUser(session.username);
    if (!user) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    if (currentPassword) {
      const validCurrent = verifyPassword(currentPassword, user.passwordHash, user.salt);
      if (!validCurrent) {
        await logAdminAudit({
          userId: user.id,
          username: user.username,
          action: "PASSWORD_CHANGE_FAILED_CURRENT_MISMATCH",
          ipAddress: ip,
          userAgent,
          success: false,
        });
        return NextResponse.json(
          { error: "Current password does not match." },
          { status: 400 }
        );
      }
    }

    // Update password
    await updateAdminPassword(user.id, newPassword);

    await logAdminAudit({
      userId: user.id,
      username: user.username,
      action: "PASSWORD_CHANGED_SUCCESSFULLY",
      ipAddress: ip,
      userAgent,
      success: true,
    });

    // Re-issue session with mustChangePassword = false
    const updatedUser = { ...user, mustChangePassword: false };
    const newToken = createSessionToken(updatedUser, true);

    const response = NextResponse.json({
      ok: true,
      message: "Password changed successfully. Your account is secured.",
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: newToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ error: "Failed to update password." }, { status: 500 });
  }
}
