import { createHash, randomBytes } from "crypto";
import type { ApiKey } from "@/lib/db/repo";
import type { EphemeralConfirmation, RateLimitState } from "./types";

const KEY_PREFIX = "advos_mcp_";
const CONFIRMATION_TTL_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_CAPACITY = 60; // 60 requests
const REFILL_RATE_PER_SECOND = 1; // 1 token / second

// In-memory state for rate limiting and ephemeral confirmation tokens
const rateLimitMap = new Map<string, RateLimitState>();
const confirmationMap = new Map<string, EphemeralConfirmation>();

export function generateRawKey(): string {
  const bytes = randomBytes(32).toString("hex");
  return `${KEY_PREFIX}${bytes}`;
}

export function hashKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export function getKeyPrefixDisplay(rawKey: string): string {
  const suffix = rawKey.slice(-4);
  return `${KEY_PREFIX}...${suffix}`;
}

export function createApiKeyRecord(params: {
  name: string;
  rawKey: string;
  scopes: ("read" | "write")[];
  role?: "viewer" | "editor" | "admin";
  ip_allowlist?: string[];
}): Omit<ApiKey, "id" | "created_at"> {
  const { name, rawKey, scopes, role = "viewer", ip_allowlist } = params;
  return {
    name,
    key_hash: hashKey(rawKey),
    key_prefix: getKeyPrefixDisplay(rawKey),
    scopes,
    role,
    ip_allowlist: ip_allowlist && ip_allowlist.length > 0 ? ip_allowlist : undefined,
  };
}

/**
 * Token bucket rate limiter: 60 requests per minute per API key.
 * Returns true if the request is allowed, false if rate limited.
 */
export function checkRateLimit(keyId: string): boolean {
  const now = Date.now();
  let state = rateLimitMap.get(keyId);

  if (!state) {
    state = { tokens: RATE_LIMIT_CAPACITY - 1, lastRefill: now };
    rateLimitMap.set(keyId, state);
    return true;
  }

  const elapsedSeconds = (now - state.lastRefill) / 1000;
  state.tokens = Math.min(RATE_LIMIT_CAPACITY, state.tokens + elapsedSeconds * REFILL_RATE_PER_SECOND);
  state.lastRefill = now;

  if (state.tokens >= 1) {
    state.tokens -= 1;
    return true;
  }

  return false;
}

/**
 * Issues an ephemeral confirmation token for two-step item approval (5-min TTL).
 */
export function issueConfirmationToken(keyId: string, itemId: string): string {
  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + CONFIRMATION_TTL_MS;

  confirmationMap.set(token, {
    token,
    itemId,
    keyId,
    expiresAt,
  });

  return token;
}

/**
 * Verifies and immediately consumes a confirmation token.
 * Returns true if valid, matching item and key, and unexpired.
 */
export function verifyAndConsumeConfirmationToken(keyId: string, itemId: string, token: string): { valid: boolean; reason?: string } {
  if (!token || typeof token !== "string") {
    return { valid: false, reason: "Missing confirmation token" };
  }

  const record = confirmationMap.get(token);
  if (!record) {
    return { valid: false, reason: "Invalid or already consumed confirmation token" };
  }

  // Token is single-use: delete immediately
  confirmationMap.delete(token);

  if (Date.now() > record.expiresAt) {
    return { valid: false, reason: "Confirmation token expired (5-minute TTL exceeded)" };
  }

  if (record.keyId !== keyId) {
    return { valid: false, reason: "Confirmation token was issued to a different API key" };
  }

  if (record.itemId !== itemId) {
    return { valid: false, reason: "Confirmation token does not match this item ID" };
  }

  return { valid: true };
}

// Helpers for testing
export function _resetRateLimits(): void {
  rateLimitMap.clear();
}

export function _resetConfirmationTokens(): void {
  confirmationMap.clear();
}
