import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { getConnector } from "@/lib/connectors/registry";
import { CONNECTOR_PROVIDERS } from "@/lib/connectors/types";
import { audit, getRepo } from "@/lib/db/fileRepo";
import { secretsConfigured } from "@/lib/crypto";

const bodySchema = z.object({ provider: z.enum(CONNECTOR_PROVIDERS as [string, ...string[]]) });

/** POST /api/integrations/test — run a connector health check and persist the result. */
export async function POST(req: Request) {
  const session = await requireRole(["owner", "admin"]);
  if (session instanceof NextResponse) return session;

  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const provider = parsed.data.provider as (typeof CONNECTOR_PROVIDERS)[number];

  const connector = getConnector(provider);
  const result: import("@/lib/connectors/types").ConnectionTest = await connector
    .testConnection({ account: { id: `acct-${provider}`, label: connector.label, scopes: [] } })
    .catch((e: unknown) => ({
      ok: false,
      message: e instanceof Error ? e.message : String(e),
      details: undefined,
      sample: connector.sample,
      checkedAt: new Date().toISOString(),
    }));

  const repo = await getRepo();
  const existing = (await repo.listChannelAccounts()).find((a) => a.provider === provider);
  await repo.saveChannelAccount({
    id: existing?.id ?? `acct-${provider}`,
    provider,
    label: connector.label,
    status: result.ok ? (result.sample ? "sample" : "connected") : "needs_attention",
    scopes: existing?.scopes ?? [],
    is_sample: result.sample,
    last_test_at: result.checkedAt,
    last_test_ok: result.ok,
    last_test_message: result.message,
    last_sync_at: existing?.last_sync_at ?? null,
  });
  await audit("connector.test", "channel_account", provider, { ok: result.ok, sample: result.sample });

  return NextResponse.json({
    ok: result.ok,
    provider,
    message: result.message,
    sample: result.sample,
    details: result.details ?? {},
    checkedAt: result.checkedAt,
    secretsConfigured: secretsConfigured(),
  });
}
