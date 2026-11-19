import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  findAdminUser,
  verifyPassword,
  createSessionToken,
  logAdminAudit,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/adminAuth";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "unknown";

  // 1. Rate limiting check
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    await logAdminAudit({
      username: "unknown",
      action: "LOGIN_RATE_LIMITED",
      ipAddress: ip,
      userAgent,
      success: false,
      details: { retryAfterSec: rateLimit.retryAfterSec },
    });
    return NextResponse.json(
      {
        error: `Too many failed attempts. Access blocked for security. Please retry in ${rateLimit.retryAfterSec || 300} seconds.`,
      },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { identifier, password, rememberMe } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Username / email and password are required." },
        { status: 400 }
      );
    }

    // 2. Lookup admin user
    const user = await findAdminUser(identifier);
    if (!user) {
      recordFailedAttempt(ip);
      await logAdminAudit({
        username: identifier,
        action: "LOGIN_FAILED_USER_NOT_FOUND",
        ipAddress: ip,
        userAgent,
        success: false,
      });
      return NextResponse.json(
        { error: "Invalid administrator credentials. Access is restricted to authorized personnel." },
        { status: 401 }
      );
    }

    // 3. Verify password
    const valid = verifyPassword(password, user.passwordHash, user.salt);
    if (!valid) {
      recordFailedAttempt(ip);
      await logAdminAudit({
        userId: user.id,
        username: user.username,
        action: "LOGIN_FAILED_BAD_PASSWORD",
        ipAddress: ip,
        userAgent,
        success: false,
      });
      return NextResponse.json(
        { error: "Invalid administrator credentials. Access is restricted to authorized personnel." },
        { status: 401 }
      );
    }

    // 4. Success -> reset rate limit & create session
    resetRateLimit(ip);
    const token = createSessionToken(user, !!rememberMe);

    await logAdminAudit({
      userId: user.id,
      username: user.username,
      action: "LOGIN_SUCCESS",
      ipAddress: ip,
      userAgent,
      success: true,
      details: { rememberMe: !!rememberMe, mustChangePassword: user.mustChangePassword },
    });

    const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
      message: "Administrator session authorized.",
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });

    return response;
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "An unexpected server error occurred during authentication." },
      { status: 500 }
    );
  }
}
