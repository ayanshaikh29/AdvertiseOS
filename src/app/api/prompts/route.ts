import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { PROMPT_DEFAULTS, PROMPT_KEYS } from "@/lib/prompts";
import { audit, getRepo } from "@/lib/db/fileRepo";

export async function GET() {
  return NextResponse.json({
    defaults: PROMPT_DEFAULTS,
    versions: await (await getRepo()).listPromptVersions(),
    note: "Overrides apply only after human approval (admin, versioned).",
  });
}

const putSchema = z.object({ agent: z.enum(PROMPT_KEYS as unknown as [string, ...string[]]), system: z.string().min(20).max(4000) });

/** Owner/admin-only: save a new prompt version (never auto-applied by agents). */
export async function PUT(req: Request) {
  const session = await requireRole(["owner", "admin"]);
  if (session instanceof NextResponse) return session;
  const parsed = putSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { agent, system } = parsed.data;
  const repo = await getRepo();
  const version = (await repo.listPromptVersions()).filter((v) => v.agent === agent).length + 1;
  const entry = { agent, version, system, created_at: new Date().toISOString() };
  await repo.addPromptVersion(entry);
  await audit("prompt.updated", "prompt", `${agent}-v${version}`, { agent, version, by: session.userId });
  return NextResponse.json({ ok: true, entry });
}
