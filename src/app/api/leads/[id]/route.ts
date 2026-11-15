import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { audit, getRepo } from "@/lib/db/fileRepo";

const patchSchema = z
  .object({
    name: z.string().min(1).optional(),
    company: z.string().optional(),
    channel: z.enum(["whatsapp", "instagram_dm", "call", "email", "other"]).optional(),
    status: z.enum(["new", "contacted", "qualified", "won", "lost"]).optional(),
    value: z.number().nonnegative().optional(),
    notes: z.string().optional(),
    followUpAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    brandId: z.string().optional(),
  })
  .strict();

async function findLead(id: string) {
  const leads = await (await getRepo()).listLeads();
  return leads.find((l) => l.id === id) ?? null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await findLead(id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ lead });
}

/** PATCH /api/leads/[id] — edit fields / status transitions (owner/admin). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole(["owner", "admin"]);
  if (session instanceof NextResponse) return session;
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const patch = { ...parsed.data } as Record<string, unknown>;
  if (patch.followUpAt === null) delete patch.followUpAt;
  const lead = await (await getRepo()).updateLead(id, patch as never);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  await audit("lead.updated", "lead", id, patch);
  return NextResponse.json({ lead });
}

/** DELETE /api/leads/[id] (owner/admin). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole(["owner", "admin"]);
  if (session instanceof NextResponse) return session;
  const { id } = await params;
  const lead = await findLead(id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  await (await getRepo()).deleteLead(id);
  await audit("lead.deleted", "lead", id, { name: lead.name });
  return NextResponse.json({ ok: true });
}
