import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { getConnector } from "@/lib/connectors/registry";
import { CONNECTOR_PROVIDERS } from "@/lib/connectors/types";
import type { CatalogItem } from "@/lib/db/repo";
import { audit, getRepo } from "@/lib/db/fileRepo";

const syncSchema = z.object({
  provider: z.enum(CONNECTOR_PROVIDERS as [string, ...string[]]),
  brandId: z.string().min(1),
});

/** POST /api/catalog/sync — pull products/services from a connector into the catalog.
 * Fake connectors return clearly-labeled sample items; real ones land with their Phase 6B implementations. */
export async function POST(req: Request) {
  const session = await requireRole(["owner", "admin"]);
  if (session instanceof NextResponse) return session;
  const parsed = syncSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { provider, brandId } = parsed.data;

  const connector = getConnector(provider as (typeof CONNECTOR_PROVIDERS)[number]);
  if (!connector.capabilities.pullCatalog || !connector.pullCatalog) {
    return NextResponse.json(
      { error: `${connector.label} does not support catalog sync yet.` },
      { status: 501 }
    );
  }

  const repo = await getRepo();
  const jobId = `sync-${Date.now()}`;
  const startedAt = new Date().toISOString();
  await repo.addSyncJob({ id: jobId, channel_account_id: provider, kind: "catalog", status: "running", rows_synced: 0, error: null, started_at: startedAt, finished_at: null });

  try {
    const pulled = await connector.pullCatalog({ account: { id: provider, label: connector.label, scopes: [] } });
    const existing = await repo.listCatalog(brandId);
    const byExternal = new Map(existing.filter((i) => i.externalId).map((i) => [i.externalId as string, i]));
    let synced = 0;
    for (const p of pulled) {
      const prev = byExternal.get(p.externalId);
      const item: CatalogItem = {
        id: prev?.id ?? `cat-${provider}-${p.externalId}`,
        brandId,
        kind: p.kind,
        name: p.name,
        description: p.description ?? "",
        price: p.price ?? null,
        currency: p.currency ?? "INR",
        tags: p.tags ?? [],
        features: p.features ?? [],
        status: prev?.status ?? "active",
        source: "connector",
        externalId: p.externalId,
        provider,
        created_at: prev?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await repo.saveCatalogItem(item);
      synced += 1;
    }
    const finishedAt = new Date().toISOString();
    await repo.addSyncJob({ id: jobId, channel_account_id: provider, kind: "catalog", status: "ok", rows_synced: synced, error: null, started_at: startedAt, finished_at: finishedAt });
    await audit("catalog.synced", "catalog", brandId, { provider, synced });
    return NextResponse.json({
      synced,
      note: connector.sample
        ? "Sample catalog synced — items are labeled. Not real client data."
        : `Synced from ${connector.label}.`,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await repo.addSyncJob({ id: jobId, channel_account_id: provider, kind: "catalog", status: "failed", rows_synced: 0, error: message, started_at: startedAt, finished_at: new Date().toISOString() });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
