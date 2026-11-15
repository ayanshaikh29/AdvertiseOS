import { NextResponse } from "next/server";
import { catalogItemSchema } from "@/lib/catalog/types";
import { scoreCatalog, scoreCatalogItem } from "@/lib/catalog/health";
import { requireRole } from "@/lib/auth";
import { audit, getRepo } from "@/lib/db/fileRepo";

/** GET /api/catalog?brandId= — catalog items + data-health scores. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const brandId = url.searchParams.get("brandId") ?? undefined;
  const items = await (await getRepo()).listCatalog(brandId);
  return NextResponse.json({
    items,
    health: scoreCatalog(items),
    itemHealth: Object.fromEntries(items.map((i) => [i.id, scoreCatalogItem(i)])),
  });
}

/** POST /api/catalog — create a manual catalog item (owner/admin). */
export async function POST(req: Request) {
  const session = await requireRole(["owner", "admin"]);
  if (session instanceof NextResponse) return session;
  const parsed = catalogItemSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const now = new Date().toISOString();
  const item = {
    id: `cat-${Date.now()}`,
    ...parsed.data,
    source: "manual" as const,
    externalId: null,
    provider: null,
    sample: false,
    created_at: now,
    updated_at: now,
  };
  await (await getRepo()).saveCatalogItem(item);
  await audit("catalog.created", "catalog_item", item.id, { name: item.name, brandId: item.brandId });
  return NextResponse.json({ item });
}
