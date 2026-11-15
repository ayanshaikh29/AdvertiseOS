import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { parseIntent } from "@/lib/assistant/intent";
import { executeIntent } from "@/lib/assistant/execute";
import { getRepo } from "@/lib/db/fileRepo";

const bodySchema = z.object({ text: z.string().min(1).max(300) });

/** POST /api/assistant — classify a (voice) command and answer read-only.
 * The assistant never mutates data or triggers spend. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { intent, source } = await parseIntent(parsed.data.text);
  const { reply, data } = await executeIntent(intent, await getRepo());
  return NextResponse.json({ reply, intent, source, data });
}
