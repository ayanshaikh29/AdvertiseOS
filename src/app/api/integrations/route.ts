import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { computeCompleteness, fakeConnectorsEnabled, getConnector } from "@/lib/connectors/registry";
import { CONNECTOR_PROVIDERS, type ConnectorProviderId } from "@/lib/connectors/types";
import { getRepo } from "@/lib/db/fileRepo";

/** GET /api/integrations — Data Health: accounts, freshness, completeness score. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const repo = await getRepo();
  const stored = await repo.listChannelAccounts();
  const byProvider = new Map(stored.map((a) => [a.provider, a]));

  const accounts = CONNECTOR_PROVIDERS.map((provider) => {
    const connector = getConnector(provider);
    const row = byProvider.get(provider);
    const status = row?.status ?? (connector.sample ? "sample" : "unconfigured");
    return {
      provider,
      label: connector.label,
      capabilities: connector.capabilities,
      status,
      isSample: connector.sample,
      scopes: row?.scopes ?? [],
      lastTestAt: row?.last_test_at ?? null,
      lastTestOk: row?.last_test_ok ?? null,
      lastTestMessage: row?.last_test_message ?? null,
      lastSyncAt: row?.last_sync_at ?? null,
    };
  });

  const connected = new Set(
    accounts.filter((a) => a.status === "connected" || a.status === "sample").map((a) => a.provider as ConnectorProviderId)
  );
  const completeness = computeCompleteness(connected);

  return NextResponse.json({
    accounts,
    completeness,
    fakeConnectorsEnabled: fakeConnectorsEnabled(),
    note: fakeConnectorsEnabled()
      ? "Sample connectors are enabled (FEATURE_FAKE_CONNECTORS). Sample rows are labeled — they are not real account data."
      : "Real connectors only. Configure credentials per docs/INTEGRATIONS.md.",
  });
}
