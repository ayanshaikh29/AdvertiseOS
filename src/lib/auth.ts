import { NextResponse } from "next/server";
import { supabaseConfigured, supabaseServer } from "@/lib/db/supabase";

export type Session = { userId: string; email: string; role: string; orgId: string; local: boolean };

/**
 * Session from Supabase Auth + members table. Without Supabase env, local-dev
 * mode acts as owner (labeled in UI). The old x-role header trust is REMOVED.
 */
export async function getSession(): Promise<Session | null> {
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
