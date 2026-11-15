import type { ApiKey } from "@/lib/db/repo";

export interface McpAuthContext {
  apiKey: ApiKey;
}

export interface EphemeralConfirmation {
  token: string;
  itemId: string;
  keyId: string;
  expiresAt: number; // unix timestamp ms
}

export interface RateLimitState {
  tokens: number;
  lastRefill: number; // unix timestamp ms
}
