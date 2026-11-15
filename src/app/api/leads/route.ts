import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { audit, getRepo } from "@/lib/db/fileRepo";

const leadSchema = z.object({
  brandId: z.string().min(1),
  name: z.string().min(1, "Lead name is required"),
  company: z.string().optional(),
  channel: z.enum(["whatsapp", "instagram_dm", "call", "email", "other"]).default("other"),
  status: z.enum(["new", "contacted", "qualified", "won", "lost"]).default("new"),
  value: z.number().nonnegative().optional(),
  notes: z.string().default(""),
  followUpAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Follow-up must be YYYY-MM-DD").optional(),
  source: z.string().default("manual"),
});

/** GET /api/leads?brandId= — persisted leads (brand-scoped). */
export async function GET(req: Request) {
  const brandId = new URL(req.url).searchParams.get("brandId") ?? undefined;
  const leads = await (await getRepo()).listLeads(brandId);
  return NextResponse.json({ leads });
}

/** POST /api/leads — create a lead (owner/admin). */
export async function POST(req: Request) {
  const session = await requireRole(["owner", "admin"]);
  if (session instanceof NextResponse) return session;
  const parsed = leadSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const now = new Date().toISOString();
  const lead = { id: `lead-${Date.now()}`, ...parsed.data, created_at: now, updated_at: now };
  await (await getRepo()).saveLead(lead);
  await audit("lead.created", "lead", lead.id, { name: lead.name, brandId: lead.brandId, status: lead.status });
  return NextResponse.json({ lead });
}
