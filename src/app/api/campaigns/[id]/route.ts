import { NextResponse } from "next/server";
import { getRepo } from "@/lib/db/fileRepo";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = await getRepo();
  const campaign = await repo.getCampaign(id);
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ campaign });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { itemId, ...patch } = body;
  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });
  const repo = await getRepo();
  const item = await repo.updateItem(itemId, patch);
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  return NextResponse.json({ item });
}