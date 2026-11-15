import { getSession } from "@/lib/auth";
import { getRepo } from "@/lib/db/fileRepo";
import { ChatStore } from "@/lib/db/chatStore";
import { runAgencyOrchestration, type OrchestrationEvent } from "@/lib/agents/orchestrator";
import type { AgentActivity, Deliverable } from "@/types/chat";
import { SAMPLE_BRAND, type BrandProfile } from "@/lib/brand";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { conversationId, instruction, brandId, attachments, campaignId } = body;

  if (!instruction || typeof instruction !== "string") {
    return new Response(JSON.stringify({ error: "Instruction is required" }), { status: 400 });
  }

  const repo = await getRepo();
  const brands = await repo.listBrands();

  // Context isolation: find matching brand or fall back cleanly
  let currentBrand: BrandProfile;
  if (brandId && typeof brandId === "string") {
    const found = brands.find((b) => b.id === brandId);
    if (!found) {
      if (brandId === "sample-brand" || brandId === SAMPLE_BRAND.id) {
        currentBrand = SAMPLE_BRAND;
      } else if (brands.length > 0) {
        currentBrand = brands[0] as BrandProfile;
      } else {
        currentBrand = SAMPLE_BRAND;
      }
    } else {
      currentBrand = found;
    }
  } else if (brands.length >= 1) {
    currentBrand = (brands.find((b) => b.id === "sample-brand") || brands[0]) as BrandProfile;
  } else {
    currentBrand = SAMPLE_BRAND;
  }

  // Optional project binding from the composer: align outputs with an existing campaign.
  let projectNote = "";
  if (campaignId && typeof campaignId === "string") {
    try {
      const camps = await repo.listCampaigns();
      const camp = camps.find((c) => c.id === campaignId);
      if (camp) {
        const brief = (camp.brief ?? {}) as { goal?: string };
        projectNote = `\n\n[Project context: existing campaign ${camp.id}${brief.goal ? ` — goal: ${String(brief.goal).slice(0, 160)}` : ""}. Align all outputs with this project.]`;
      }
    } catch {
      // project context is best-effort
    }
  }

  // One conversation key for both the record and its messages (fixes the old
  // createConversation/actualConvId mismatch that orphaned messages).
  const actualConvId =
    conversationId || ChatStore.createConversation(currentBrand.id, instruction.slice(0, 45)).id;
  ChatStore.addMessage(actualConvId, {
    role: "user",
    content: instruction,
    attachments,
  });
  // addMessage may have recreated a placeholder with brandId "default" — stamp the real brand.
  ChatStore.updateConversation(actualConvId, { brandId: currentBrand.id });

  // 2. Prepare assistant placeholder
  const assistantMsg = ChatStore.addMessage(actualConvId, {
    role: "assistant",
    content: "",
    agentActivities: [],
    deliverables: [],
    status: "streaming",
  });

  // 3. Set up SSE stream
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const sendEvent = async (event: string, data: unknown) => {
    try {
      const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      await writer.write(encoder.encode(payload));
    } catch {
      // client disconnected
    }
  };

  // Run orchestration asynchronously while piping SSE
  (async () => {
    let accumulatedText = "";
    const agentActivitiesMap = new Map<string, AgentActivity>();
    const deliverablesList: Deliverable[] = [];

    try {
      await sendEvent("init", { conversationId: actualConvId, assistantMessageId: assistantMsg.id });

      await runAgencyOrchestration({
        instruction: instruction + projectNote,
        brand: currentBrand,
        conversationId: actualConvId,
        attachments,
        // Client Stop / disconnect aborts req.signal → orchestrator stops at stage boundaries.
        signal: req.signal,
        onEvent: async (ev: OrchestrationEvent) => {
          if (ev.type === "agent_update") {
            agentActivitiesMap.set(ev.activity.agent, ev.activity);
            await sendEvent("agent_update", ev.activity);
          } else if (ev.type === "text_chunk") {
            accumulatedText += ev.text;
            await sendEvent("text_chunk", { text: ev.text });
          } else if (ev.type === "deliverable") {
            deliverablesList.push(ev.deliverable);
            await sendEvent("deliverable", ev.deliverable);
          } else if (ev.type === "completed") {
            await sendEvent("completed", { summary: ev.summary, campaignId: ev.campaignId });
          } else if (ev.type === "error") {
            await sendEvent("error", { error: ev.error });
          }
        },
      });

      // Update message in database
      ChatStore.updateMessage(actualConvId, assistantMsg.id, {
        content: accumulatedText,
        agentActivities: Array.from(agentActivitiesMap.values()),
        deliverables: deliverablesList,
        status: "completed",
      });
    } catch (err: any) {
      const errorMsg = err?.message || "Execution failed";
      await sendEvent("error", { error: errorMsg });
      ChatStore.updateMessage(actualConvId, assistantMsg.id, {
        content: accumulatedText || "Execution encountered an error.",
        error: errorMsg,
        status: "error",
      });
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
