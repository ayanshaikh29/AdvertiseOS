import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseConfigured, supabaseServer } from "@/lib/db/supabase";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/adminAuth";

export type Session = { userId: string; email: string; role: string; orgId: string; local: boolean };

/**
 * Session from Admin Session Cookie or Supabase Auth + members table.
 * Without Supabase env, local-dev mode acts as owner (labeled in UI).
 */
export async function getSession(): Promise<Session | null> {
  // 1. Check custom signed admin session token first
  try {
    const cookieStore = await cookies();
    const adminCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (adminCookie) {
      const adminSession = verifySessionToken(adminCookie);
      if (adminSession) {
        return {
          userId: adminSession.userId,
          email: adminSession.email || `${adminSession.username}@advertiseos.com`,
          role: adminSession.role || "owner",
          orgId: "org-default",
          local: !supabaseConfigured(),
        };
      }
    }
  } catch {
    // Ignore cookie read failures in edge contexts
  }

  // 2. Supabase check or local dev fallback
  if (!supabaseConfigured()) {
    return { userId: "local-owner", email: "owner@local", role: "owner", orgId: "org-default", local: true };
  }
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const { data: member } = await sb.from("members").select("role,org_id").eq("user_id", user.id).limit(1).maybeSingle();
  return {
    userId: user.id,
    email: user.email ?? "",
    role: (member?.role as string) ?? "viewer",
    orgId: (member?.org_id as string) ?? "",
    local: false,
  };
}

/** Pure role check (unit-tested). */
export function checkRole(role: string, allowed: string[]): boolean {
  return allowed.includes(role);
}

/** Gate for mutating routes. Returns the session, or a 403/401 response. */
export async function requireRole(allowed: string[]): Promise<Session | NextResponse> {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!checkRole(s.role, allowed)) {
    return NextResponse.json({ error: `Requires role: ${allowed.join(" or ")} (you are ${s.role})` }, { status: 403 });
  }
  return s;
}
