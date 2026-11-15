import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { Conversation, ChatMessage, ActiveTask } from "@/types/chat";

const DATA_DIR = join(process.cwd(), "data");
const FILE = join(DATA_DIR, "chats.json");

interface ChatDB {
  conversations: Record<string, Conversation>;
  messages: Record<string, ChatMessage[]>;
  tasks: Record<string, ActiveTask>;
}

function blank(): ChatDB {
  return { conversations: {}, messages: {}, tasks: {} };
}

let memCache: ChatDB | null = null;

function load(): ChatDB {
  if (memCache) return memCache;
  try {
    if (!existsSync(FILE)) {
      memCache = blank();
      return memCache;
    }
    const raw = readFileSync(FILE, "utf8");
    memCache = { ...blank(), ...JSON.parse(raw) };
    return memCache!;
  } catch {
    memCache = blank();
    return memCache;
  }
}

function persistToDisk() {
  if (!memCache) return;
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(FILE, JSON.stringify(memCache, null, 2), "utf8");
  } catch {
    // If disk write is momentarily locked, memory cache remains active and consistent
  }
}

export class ChatStore {
  /** Resets in-memory cache if explicitly needed (e.g. testing) */
  static reload(): ChatDB {
    memCache = null;
    return load();
  }

  static listConversations(brandId?: string): Conversation[] {
    const db = load();
    let list = Object.values(db.conversations);
    if (brandId) {
      list = list.filter((c) => c.brandId === brandId);
    }
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  static getConversation(id: string): Conversation | undefined {
    return load().conversations[id];
  }

  static createConversation(brandId: string, title?: string): Conversation {
    const db = load();
    const id = `conv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const cleanTitle = (title || "New Strategy Brief").slice(0, 60).trim();
    const conv: Conversation = {
      id,
      brandId,
      title: cleanTitle,
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
      status: "active",
    };
    db.conversations[id] = conv;
    db.messages[id] = [];
    persistToDisk();
    return conv;
  }

  static updateConversation(id: string, patch: Partial<Conversation>): Conversation | null {
    const db = load();
    const conv = db.conversations[id];
    if (!conv) return null;
    Object.assign(conv, patch, { updatedAt: new Date().toISOString() });
    persistToDisk();
    return conv;
  }

  static deleteConversation(id: string): boolean {
    const db = load();
    if (!db.conversations[id]) return false;
    delete db.conversations[id];
    delete db.messages[id];
    persistToDisk();
    return true;
  }

  static getMessages(conversationId: string): ChatMessage[] {
    const db = load();
    return db.messages[conversationId] ?? [];
  }

  static addMessage(conversationId: string, message: Omit<ChatMessage, "id" | "createdAt" | "conversationId">): ChatMessage {
    const db = load();
    if (!db.conversations[conversationId]) {
      const cleanTitle = (message.content.slice(0, 45) || "Conversation").trim();
      db.conversations[conversationId] = {
        id: conversationId,
        brandId: "default",
        title: cleanTitle,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: 0,
        status: "active",
      };
    }

    if (!db.messages[conversationId]) {
      db.messages[conversationId] = [];
    }

    const fullMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      conversationId,
      createdAt: new Date().toISOString(),
      ...message,
    };

    db.messages[conversationId].push(fullMessage);

    const conv = db.conversations[conversationId];
    if (conv) {
      conv.updatedAt = fullMessage.createdAt;
      conv.messageCount = db.messages[conversationId].length;
      conv.lastMessage = message.content.slice(0, 80);
      if (conv.title === "New Strategy Brief" && message.role === "user") {
        conv.title = message.content.slice(0, 45).trim();
      }
    }

    persistToDisk();
    return fullMessage;
  }

  static updateMessage(conversationId: string, messageId: string, patch: Partial<ChatMessage>): ChatMessage | null {
    const db = load();
    const msgs = db.messages[conversationId];
    if (!msgs) return null;
    const msg = msgs.find((m) => m.id === messageId);
    if (!msg) return null;
    Object.assign(msg, patch);
    persistToDisk();
    return msg;
  }

  static getTask(conversationId: string): ActiveTask | null {
    const db = load();
    if (!db.tasks) db.tasks = {};
    return db.tasks[conversationId] ?? null;
  }

  static saveTask(task: ActiveTask): ActiveTask {
    const db = load();
    if (!db.tasks) db.tasks = {};
    db.tasks[task.conversationId] = { ...task, updatedAt: new Date().toISOString() };
    persistToDisk();
    return db.tasks[task.conversationId]!;
  }

  static clearTask(conversationId: string): boolean {
    const db = load();
    if (!db.tasks || !db.tasks[conversationId]) return false;
    delete db.tasks[conversationId];
    persistToDisk();
    return true;
  }
}
