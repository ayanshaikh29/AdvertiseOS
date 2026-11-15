import { briefSchema } from "@/lib/schemas";
import { getBrandProfile } from "@/lib/db/brands";
import { runCampaignPipeline } from "@/lib/agents/pipeline";

const encoder = new TextEncoder();

/** Streams live agent progress (SSE) so the UI can show what the AI team is
 * doing right now: `data: {"step","label"}` per stage, then `{"step":"done",
 * result}` or `{"step":"error",...}`. Falls back gracefully if the client
 * ignores the stream (it still contains one final JSON event). */
export async function POST(req: Request) {
  const parsed = briefSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  let brand;
  try {
    brand = await getBrandProfile(parsed.data.brandId);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Brand load failed" }, { status: 400 });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          // Client disconnected — keep the pipeline running to completion.
        }
      };
      try {
        const result = await runCampaignPipeline({ brand, brief: parsed.data, source: "brief", onProgress: send });
        try {
          const { inngest } = await import("@/inngest/client");
          await inngest.send({ name: "brief.created", data: { brief: parsed.data.goal, month: parsed.data.month, campaignId: result.campaignId } });
        } catch {
          // Offline-safe: inline run already completed.
        }
        send({ step: "done", result });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Pipeline failed";
        send({ step: "error", error: msg, status: msg.includes("cost limit") ? 402 : 500 });
      }
      try {
        controller.close();
      } catch {
        // Already closed by the client.
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
