import crypto from "crypto";
import fs from "fs";
import path from "path";
import { supabaseConfigured, supabaseServer } from "@/lib/db/supabase";

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  salt: string;
  role: "owner" | "admin";
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAuditLog {
  id: string;
  userId?: string;
  username: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  details?: Record<string, unknown>;
  createdAt: string;
}

const SESSION_COOKIE_NAME = "advos_admin_session";
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "advertiseos-secure-admin-session-secret-2026";
const LOCAL_STORE_FILE = path.join(process.cwd(), "data", "admin_auth.json");

// In-memory rate limiting: IP -> { attempts: number, resetAt: number }
const loginAttempts = new Map<string, { attempts: number; resetAt: number }>();

function ensureLocalStore(): { users: AdminUser[]; logs: AdminAuditLog[] } {
  try {
    const dir = path.dirname(LOCAL_STORE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(LOCAL_STORE_FILE)) {
      // Seed default admin: admin / admin
      const salt = crypto.randomBytes(16).toString("hex");
      const passwordHash = hashPassword("admin", salt);
      const defaultAdmin: AdminUser = {
        id: "admin-master-001",
        username: "admin",
        email: "admin@advertiseos.com",
        passwordHash,
        salt,
        role: "owner",
        mustChangePassword: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const initial = { users: [defaultAdmin], logs: [] };
      fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(initial, null, 2), "utf8");
      return initial;
    }
    const raw = fs.readFileSync(LOCAL_STORE_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Local auth store error:", err);
    const salt = crypto.randomBytes(16).toString("hex");
    return {
      users: [
        {
          id: "admin-master-001",
          username: "admin",
          email: "admin@advertiseos.com",
          passwordHash: hashPassword("admin", salt),
          salt,
          role: "owner",
          mustChangePassword: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      logs: [],
    };
  }
}

function saveLocalStore(data: { users: AdminUser[]; logs: AdminAuditLog[] }) {
  try {
    const dir = path.dirname(LOCAL_STORE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to save local store:", err);
  }
}

export function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const computed = hashPassword(password, salt);
    return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}

/** Rate Limiting: 5 attempts per 5 minutes per IP */
export function checkRateLimit(ip: string): { allowed: boolean; remainingAttempts: number; retryAfterSec?: number } {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000;
  const maxAttempts = 5;

  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { attempts: 0, resetAt: now + windowMs });
    return { allowed: true, remainingAttempts: maxAttempts };
  }

  if (entry.attempts >= maxAttempts) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSec };
  }

  return { allowed: true, remainingAttempts: maxAttempts - entry.attempts };
}

export function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (entry && now <= entry.resetAt) {
    entry.attempts += 1;
  } else {
    loginAttempts.set(ip, { attempts: 1, resetAt: now + 5 * 60 * 1000 });
  }
}

export function resetRateLimit(ip: string) {
  loginAttempts.delete(ip);
}

/** Find admin user by username or email */
export async function findAdminUser(identifier: string): Promise<AdminUser | null> {
  const cleanId = identifier.trim().toLowerCase();

  // 1. If Supabase configured, attempt to query
  if (supabaseConfigured()) {
    try {
      const sb = await supabaseServer();
      const { data, error } = await sb
        .from("admin_users")
        .select("*")
        .or(`username.ilike.${cleanId},email.ilike.${cleanId}`)
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        return {
          id: data.id,
          username: data.username,
          email: data.email,
          passwordHash: data.password_hash,
          salt: data.salt,
          role: data.role || "admin",
          mustChangePassword: data.must_change_password ?? false,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
    } catch (err) {
      console.warn("Supabase admin query fallback to local store:", err);
    }
  }

  // 2. Query persistent local store
  const store = ensureLocalStore();
  const user = store.users.find(
    (u) => u.username.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId
  );
  return user || null;
}

/** Update admin password */
export async function updateAdminPassword(userId: string, newPassword: string): Promise<boolean> {
  const newSalt = crypto.randomBytes(16).toString("hex");
  const newHash = hashPassword(newPassword, newSalt);
  const now = new Date().toISOString();

  // 1. Update in local store
  const store = ensureLocalStore();
  const idx = store.users.findIndex((u) => u.id === userId);
  if (idx >= 0 && store.users[idx]) {
    store.users[idx] = {
      ...store.users[idx],
      passwordHash: newHash,
      salt: newSalt,
      mustChangePassword: false,
      updatedAt: now,
    };
    saveLocalStore(store);
  }

  // 2. Update in Supabase if configured
  if (supabaseConfigured()) {
    try {
      const sb = await supabaseServer();
      await sb
        .from("admin_users")
        .update({
          password_hash: newHash,
          salt: newSalt,
          must_change_password: false,
          updated_at: now,
        })
        .eq("id", userId);
    } catch (err) {
      console.error("Failed to update password in Supabase:", err);
    }
  }

  return true;
}

/** Audit Logging */
export async function logAdminAudit(params: {
  userId?: string;
  username: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  details?: Record<string, unknown>;
}) {
  const logEntry: AdminAuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    userId: params.userId,
    username: params.username,
    action: params.action,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    success: params.success,
    details: params.details,
    createdAt: new Date().toISOString(),
  };

  // Local store append
  try {
    const store = ensureLocalStore();
    store.logs.unshift(logEntry);
    if (store.logs.length > 500) store.logs = store.logs.slice(0, 500); // keep recent 500
    saveLocalStore(store);
  } catch (err) {
    console.warn("Failed to write local audit log:", err);
  }

  // Supabase audit log
  if (supabaseConfigured()) {
    try {
      const sb = await supabaseServer();
      await sb.from("admin_audit_logs").insert({
        id: logEntry.id,
        user_id: logEntry.userId,
        username: logEntry.username,
        action: logEntry.action,
        ip_address: logEntry.ipAddress,
        user_agent: logEntry.userAgent,
        success: logEntry.success,
        details: logEntry.details || {},
        created_at: logEntry.createdAt,
      });
    } catch {
      // ignore
    }
  }
}

/** Signed Admin Session Token */
export interface AdminSessionPayload {
  userId: string;
  username: string;
  email: string;
  role: "owner" | "admin";
  mustChangePassword: boolean;
  exp: number;
}

export function createSessionToken(user: AdminUser, rememberMe = false): string {
  const durationSec = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60; // 30 days vs 7 days
  const payload: AdminSessionPayload = {
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    exp: Math.floor(Date.now() / 1000) + durationSec,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string): AdminSessionPayload | null {
  if (!token || !token.includes(".")) return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  try {
    const expectedSignature = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(encodedPayload)
      .digest("base64url");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const payload: AdminSessionPayload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    );

    if (Date.now() / 1000 > payload.exp) {
      return null; // expired
    }

    return payload;
  } catch {
    return null;
  }
}

export { SESSION_COOKIE_NAME };
