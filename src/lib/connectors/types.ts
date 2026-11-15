/** Connector framework (Phase 5D/5E base, extended in Phase 6B).
 * Every external channel implements ChannelConnector. Real connectors run only
 * behind feature flags with real credentials; otherwise the registry returns a
 * clearly-labeled sample connector or an "unconfigured" stub. */

export type ConnectorProviderId =
  | "website"
  | "meta"
  | "whatsapp"
  | "ga4"
  | "search_console"
  | "meta_ads"
  | "google_ads";

export const CONNECTOR_PROVIDERS: ConnectorProviderId[] = [
  "website",
  "meta",
  "whatsapp",
  "ga4",
  "search_console",
  "meta_ads",
  "google_ads",
];

export type ConnectorCapabilities = {
  pullPosts: boolean;
  pullMetrics: boolean;
  pullAudience: boolean;
  pullLeads: boolean;
  pullCatalog: boolean;
  crawl: boolean;
  publish: boolean;
};

export type ConnectorAccountRef = { id: string; label: string; scopes: string[] };

export type ConnectorContext = {
  account: ConnectorAccountRef;
  /** Decrypted tokens (real connectors only). */
  tokens?: Record<string, string>;
  config?: Record<string, unknown>;
};

export type ConnectionTest = {
  ok: boolean;
  message: string;
  details?: Record<string, unknown>;
  /** True when this result came from a sample/fake connector, not a real account. */
  sample: boolean;
  checkedAt: string;
};

export type PulledPost = {
  externalId: string;
  platform: string;
  publishedAt: string;
  format: string;
  caption: string;
  metrics: Record<string, number>;
  url?: string;
};

export type PulledMetricRow = {
  date: string;
  platform: string;
  impressions: number;
  reach: number;
  clicks: number;
  leads: number;
  spend: number;
  revenue: number;
};

export type PulledLead = {
  externalId: string;
  channel: string;
  name?: string;
  contact?: string;
  message?: string;
  receivedAt: string;
};

export type PulledCatalogItem = {
  externalId: string;
  kind: "product" | "service";
  name: string;
  description?: string;
  price?: number | null;
  currency?: string;
  tags?: string[];
  features?: string[];
};

export interface ChannelConnector {
  readonly provider: ConnectorProviderId;
  readonly label: string;
  readonly capabilities: ConnectorCapabilities;
  /** True when this connector returns clearly-labeled sample data, not a real account. */
  readonly sample: boolean;
  testConnection(ctx: ConnectorContext): Promise<ConnectionTest>;
  health(ctx: ConnectorContext): Promise<{ fresh: boolean; lastSyncAt: string | null; message: string }>;
  pullPosts?(ctx: ConnectorContext, since: Date): Promise<PulledPost[]>;
  pullMetrics?(ctx: ConnectorContext, since: Date): Promise<PulledMetricRow[]>;
  pullLeads?(ctx: ConnectorContext): Promise<PulledLead[]>;
  pullCatalog?(ctx: ConnectorContext): Promise<PulledCatalogItem[]>;
  publish?(ctx: ConnectorContext, payload: { externalIdHint?: string; caption: string; mediaUrl?: string }): Promise<{ externalId: string; url?: string }>;
}

/** Thrown by stub connectors when a 6B method is called before the real implementation lands. */
export class ConnectorNotImplementedError extends Error {
  constructor(provider: string, method: string) {
    super(`${provider}.${method}() is not implemented yet — lands with the ${provider} connector in Phase 6B`);
    this.name = "ConnectorNotImplementedError";
  }
}
