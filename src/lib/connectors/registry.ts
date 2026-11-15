import { FakeConnector, UnconfiguredConnector, connectorLabel } from "@/lib/connectors/fake";
import type { ChannelConnector, ConnectorProviderId } from "@/lib/connectors/types";
import { CONNECTOR_PROVIDERS } from "@/lib/connectors/types";

/** Feature flags that will gate the real connectors when they land in Phase 6B.
 * Read here so the flag surface exists and is testable today. */
export function fakeConnectorsEnabled(): boolean {
  return (process.env.FEATURE_FAKE_CONNECTORS ?? "true") !== "false";
}

export function realConnectorEnabled(provider: ConnectorProviderId): boolean {
  switch (provider) {
    case "meta":
    case "meta_ads":
      return process.env.FEATURE_META_CONNECTOR === "true" && !!process.env.META_APP_SECRET;
    case "whatsapp":
      return process.env.FEATURE_WHATSAPP_CONNECTOR === "true" && !!process.env.WHATSAPP_TOKEN;
    case "ga4":
    case "search_console":
    case "google_ads":
      return process.env.FEATURE_GOOGLE_CONNECTOR === "true" && !!process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    case "website":
      return process.env.FEATURE_WEBSITE_CONNECTOR === "true";
    default:
      return false;
  }
}

/** Resolve the connector for a provider. Real connectors land in 6B; until a real
 * one exists for the provider, realConnectorEnabled gates are honored but fall back
 * to the clearly-labeled sample connector (or the unconfigured stub). */
export function getConnector(provider: ConnectorProviderId): ChannelConnector {
  if (realConnectorEnabled(provider)) {
    // Phase 6B swaps in the real implementation here. Until then fall through.
    return fakeConnectorsEnabled() ? new FakeConnector(provider) : new UnconfiguredConnector(provider);
  }
  if (fakeConnectorsEnabled()) return new FakeConnector(provider);
  return new UnconfiguredConnector(provider);
}

export function listConnectors(): ChannelConnector[] {
  return CONNECTOR_PROVIDERS.map((p) => getConnector(p));
}

/** Data completeness: how much of the Business Brain is wired up, and what each gap costs. */
export type CompletenessSource = { provider: ConnectorProviderId; weight: number; unlocks: string };

export const COMPLETENESS_SOURCES: CompletenessSource[] = [
  { provider: "website", weight: 20, unlocks: "form leads + on-site behaviour for planning" },
  { provider: "meta", weight: 25, unlocks: "real post history, best times, audience demographics" },
  { provider: "ga4", weight: 20, unlocks: "traffic-based planning and source attribution" },
  { provider: "search_console", weight: 10, unlocks: "query-driven topic ideas" },
  { provider: "whatsapp", weight: 10, unlocks: "inbox leads and approved template messaging" },
  { provider: "meta_ads", weight: 10, unlocks: "ad performance readouts (read-only)" },
  { provider: "google_ads", weight: 5, unlocks: "Google Ads performance readouts (read-only)" },
];

export function computeCompleteness(connected: Set<ConnectorProviderId>): { score: number; missing: Array<{ provider: ConnectorProviderId; unlocks: string }> } {
  let score = 0;
  const missing: Array<{ provider: ConnectorProviderId; unlocks: string }> = [];
  for (const s of COMPLETENESS_SOURCES) {
    if (connected.has(s.provider)) score += s.weight;
    else missing.push({ provider: s.provider, unlocks: s.unlocks });
  }
  return { score: Math.min(100, score), missing };
}

export { connectorLabel };
