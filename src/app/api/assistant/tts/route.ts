import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getLLM } from "@/lib/llm";
import { pcmToWav } from "@/lib/assistant/wav";

const bodySchema = z.object({ text: z.string().min(1).max(500), voice: z.string().max(40).optional() });

/** POST /api/assistant/tts — Gemini TTS (verified live on free tier) as playable WAV.
 * Falls back to 503 with the reason so the UI can use browser speech instead. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const llm = getLLM();
  if (!llm.tts) return NextResponse.json({ unsupported: true, reason: "Provider has no TTS" }, { status: 503 });
  try {
    const out = await llm.tts({ text: parsed.data.text, voice: parsed.data.voice, language: "Hinglish" });
    if (out.unsupported) return NextResponse.json({ unsupported: true, reason: out.reason }, { status: 503 });
    const wav = pcmToWav(Buffer.from(out.base64, "base64"));
    return new NextResponse(new Uint8Array(wav), {
      headers: { "Content-Type": "audio/wav", "Content-Length": String(wav.length), "X-LLM-Model": out.model },
    });
  } catch (e) {
    return NextResponse.json({ unsupported: true, reason: e instanceof Error ? e.message : "TTS failed" }, { status: 503 });
  }
}
