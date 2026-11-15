import { NextResponse } from "next/server";
import { catalogItemSchema } from "@/lib/catalog/types";
import { scoreCatalogItem } from "@/lib/catalog/health";
import { requireRole } from "@/lib/auth";
import { audit, getRepo } from "@/lib/db/fileRepo";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const item = await (await getRepo()).getCatalogItem(id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item, health: scoreCatalogItem(item) });
}

/** PUT /api/catalog/[id] — edit (owner/admin). */
export async function PUT(req: Request, { params }: Params) {
  const session = await requireRole(["owner", "admin"]);
  if (session instanceof NextResponse) return session;
  const { id } = await params;
  const repo = await getRepo();
  const existing = await repo.getCatalogItem(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = catalogItemSchema.partial({ brandId: true }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const item = { ...existing, ...parsed.data, updated_at: new Date().toISOString() };
  await repo.saveCatalogItem(item);
  await audit("catalog.updated", "catalog_item", id, { name: item.name });
  return NextResponse.json({ item });
}

/** DELETE /api/catalog/[id] (owner/admin). */
export async function DELETE(_req: Request, { params }: Params) {
  const session = await requireRole(["owner", "admin"]);
  if (session instanceof NextResponse) return session;
  const { id } = await params;
  await (await getRepo()).deleteCatalogItem(id);
  await audit("catalog.deleted", "catalog_item", id, {});
  return NextResponse.json({ ok: true });
}
