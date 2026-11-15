import { describe, it, expect } from "vitest";
import { ChatStore } from "@/lib/db/chatStore";

describe("Conversational Agency ChatStore", () => {
  it("creates and retrieves a conversation", () => {
    const conv = ChatStore.createConversation("brand-test-1", "Instagram Audit & 30-Day Strategy");
    expect(conv.id).toBeDefined();
    expect(conv.brandId).toBe("brand-test-1");
    expect(conv.title).toBe("Instagram Audit & 30-Day Strategy");

    const fetched = ChatStore.getConversation(conv.id);
    expect(fetched?.id).toBe(conv.id);
  });

  it("adds and updates messages in conversation", () => {
    const conv = ChatStore.createConversation("brand-test-2", "Test Conversation");
    
    // Add user message
    const userMsg = ChatStore.addMessage(conv.id, {
      role: "user",
      content: "Audit our brand and create 12 posts",
    });
    expect(userMsg.role).toBe("user");

    // Add assistant message
    const assistantMsg = ChatStore.addMessage(conv.id, {
      role: "assistant",
      content: "Agency team mobilized.",
      agentActivities: [
        {
          agent: "manager",
          displayName: "AI Project Manager",
          avatar: "👔",
          status: "completed",
        },
      ],
      deliverables: [],
    });
    expect(assistantMsg.role).toBe("assistant");

    const msgs = ChatStore.getMessages(conv.id);
    expect(msgs.length).toBe(2);

    // Update assistant message with content
    ChatStore.updateMessage(conv.id, assistantMsg.id, {
      content: "All deliverables completed and scored.",
      status: "completed",
    });

    const updated = ChatStore.getMessages(conv.id).find((m) => m.id === assistantMsg.id);
    expect(updated?.content).toBe("All deliverables completed and scored.");
    expect(updated?.status).toBe("completed");
  });

  it("lists conversations by brand", () => {
    const c1 = ChatStore.createConversation("client-a", "Client A Chat");
    const c2 = ChatStore.createConversation("client-b", "Client B Chat");

    const listA = ChatStore.listConversations("client-a");
    expect(listA.some((c) => c.id === c1.id)).toBe(true);
    expect(listA.some((c) => c.id === c2.id)).toBe(false);
  });
});
