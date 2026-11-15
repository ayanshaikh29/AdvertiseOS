"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatMessageItem } from "@/components/chat/ChatMessageItem";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { TeamPanel } from "@/components/chat/TeamPanel";
import type { Conversation, ChatMessage, ChatAttachment, AgentActivity } from "@/types/chat";
import { Sparkles, Layers, ShieldCheck, Zap, Bot, X, PanelRightOpen, ListTodo, Building2 } from "lucide-react";

export function AgencyChatWorkspace() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);
  const [activeBrand, setActiveBrand] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(true);
  const [mobileLedgerOpen, setMobileLedgerOpen] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }, 100);
  }, []);

  const selectConversation = useCallback(
    async (id: string) => {
      setActiveConversationId(id);
      setRailOpen(false);
      try {
        const res = await fetch(`/api/chat/conversations/${id}`);
        const data = await res.json();
        setMessages(data.messages || []);
        scrollToBottom();
      } catch {
        setMessages([]);
      }
    },
    [scrollToBottom]
  );

  // Background refresh of conversation list (does NOT touch active messages)
  const refreshConversationsList = useCallback(
    async (brandId?: string) => {
      try {
        const url = brandId ? `/api/chat/conversations?brandId=${brandId}` : "/api/chat/conversations";
        const res = await fetch(url);
        const data = await res.json();
        setConversations(data.conversations || []);
      } catch {
        // network error — keep current state
      }
    },
    []
  );

  // Initial load of conversations (selects first if none active)
  const loadConversations = useCallback(
    async (brandId?: string) => {
      try {
        const url = brandId ? `/api/chat/conversations?brandId=${brandId}` : "/api/chat/conversations";
        const res = await fetch(url);
        const data = await res.json();
        const list = data.conversations || [];
        setConversations(list);
        if (list.length > 0 && !activeConversationId) {
          await selectConversation(list[0].id);
        }
      } catch {
        // network error
      }
    },
    [activeConversationId, selectConversation]
  );

  // Load initial brands & conversations
  useEffect(() => {
    fetch("/api/brands")
      .then((r) => r.json())
      .then((d) => {
        const bList = d.brands || [];
        setBrands(bList);
        const savedBrand = localStorage.getItem("advos-brand") || bList[0]?.id || "";
        setActiveBrand(savedBrand);
        loadConversations(savedBrand);
      })
      .catch(() => {});

    const handleBrandSwitched = (e: Event) => {
      const brandId = (e as CustomEvent<{ brandId?: string }>).detail?.brandId;
      if (brandId) {
        setActiveBrand(brandId);
        setActiveConversationId(null);
        setMessages([]);
        loadConversations(brandId);
      }
    };
    window.addEventListener("brand-switched", handleBrandSwitched);
    return () => window.removeEventListener("brand-switched", handleBrandSwitched);
  }, [loadConversations]);

  // Stop any in-flight run when unmounting
  useEffect(() => () => abortRef.current?.abort(), []);

  const handleNewConversation = async () => {
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId: activeBrand, title: "New Agency Task" }),
      });
      const data = await res.json();
      if (data.conversation) {
        setConversations((prev) => [data.conversation, ...prev]);
        setActiveConversationId(data.conversation.id);
        setMessages([]);
        setRailOpen(false);
      }
    } catch {
      // ignore
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await fetch(`/api/chat/conversations/${id}`, { method: "DELETE" });
      setConversations((prev) => {
        const remaining = prev.filter((c) => c.id !== id);
        if (activeConversationId === id) {
          const first = remaining[0];
          if (first) selectConversation(first.id);
          else {
            setActiveConversationId(null);
            setMessages([]);
          }
        }
        return remaining;
      });
    } catch {
      // ignore
    }
  };

  const handleRenameConversation = async (id: string, newTitle: string) => {
    try {
      await fetch(`/api/chat/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c)));
    } catch {
      // ignore
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleSendMessage = async (text: string, attachments: ChatAttachment[], campaignId?: string) => {
    if ((!text.trim() && attachments.length === 0) || isLoading) return;
    setIsLoading(true);

    const userMsgId = `msg-user-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMsgId,
      conversationId: activeConversationId || "temp",
      role: "user",
      content: text,
      attachments,
      createdAt: new Date().toISOString(),
    };

    const assistantMsgId = `msg-assistant-${Date.now()}`;
    const assistantPlaceholder: ChatMessage = {
      id: assistantMsgId,
      conversationId: activeConversationId || "temp",
      role: "assistant",
      content: "",
      agentActivities: [],
      deliverables: [],
      status: "streaming",
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    scrollToBottom();

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversationId,
          instruction: text,
          brandId: activeBrand,
          attachments,
          campaignId: campaignId || undefined,
        }),
        signal: controller.signal,
      });

      if (!res.body) throw new Error("No response stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const lines = part.split("\n");
          let event = "message";
          let dataStr = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) event = line.slice(7).trim();
            if (line.startsWith("data: ")) dataStr = line.slice(6).trim();
          }

          if (!dataStr) continue;
          try {
            const data = JSON.parse(dataStr);

            if (event === "init" && data.conversationId) {
              setActiveConversationId(data.conversationId);
            }

            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== assistantMsgId) return m;

                if (event === "agent_update") {
                  const activity = data as AgentActivity;
                  const currentActs = m.agentActivities || [];
                  const existingIdx = currentActs.findIndex((a) => a.agent === activity.agent);
                  const updated = [...currentActs];
                  if (existingIdx >= 0) updated[existingIdx] = activity;
                  else updated.push(activity);
                  return { ...m, agentActivities: updated };
                }
                if (event === "text_chunk") return { ...m, content: (m.content || "") + data.text };
                if (event === "deliverable") {
                  const curDel = m.deliverables || [];
                  return { ...m, deliverables: [...curDel, data] };
                }
                if (event === "completed") return { ...m, campaignId: data.campaignId, status: "completed" };
                if (event === "error") return { ...m, error: data.error, status: "error" };
                return m;
              })
            );
            scrollToBottom();
          } catch {
            // partial SSE frame — wait for more bytes
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === assistantMsgId && m.status === "streaming" ? { ...m, status: "completed" } : m))
      );
    } catch (err: unknown) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                status: "error",
                error: aborted
                  ? "Generation stopped by user."
                  : (err as Error)?.message || "Failed to execute",
              }
            : m
        )
      );
    } finally {
      abortRef.current = null;
      setIsLoading(false);
      if (activeBrand) refreshConversationsList(activeBrand);
    }
  };

  const handleRetry = (failed: ChatMessage) => {
    const idx = messages.findIndex((m) => m.id === failed.id);
    if (idx < 0) return;
    const userMsg = [...messages.slice(0, idx)].reverse().find((m) => m.role === "user");
    if (!userMsg) return;
    setMessages((prev) => prev.filter((m) => m.id !== failed.id));
    handleSendMessage(userMsg.content, userMsg.attachments || []);
  };

  const currentBrandObj = brands.find((b) => b.id === activeBrand);
  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const teamActivities: AgentActivity[] =
    [...messages].reverse().find((m) => m.role === "assistant" && m.agentActivities?.length)?.agentActivities || [];
  const hasTeam = teamActivities.length > 0;

  const rail = (
    <ChatSidebar
      conversations={conversations}
      activeId={activeConversationId}
      onSelectConversation={selectConversation}
      onNewConversation={handleNewConversation}
      onDeleteConversation={handleDeleteConversation}
      onRenameConversation={handleRenameConversation}
    />
  );

  return (
    <div className="relative flex h-full w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_3px_rgba(16,24,40,0.04)]">
      {/* Left: Recent Tasks Sidebar */}
      <aside className="hidden w-[260px] shrink-0 lg:block">{rail}</aside>
      {railOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-[rgba(11,18,32,0.4)]" onClick={() => setRailOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[300px] max-w-[85vw] bg-surface shadow-2xl">
            <button
              onClick={() => setRailOpen(false)}
              aria-label="Close tasks"
              className="absolute right-2 top-2 z-10 rounded-lg p-2 text-muted hover:bg-surface-hover"
            >
              <X size={18} />
            </button>
            {rail}
          </div>
        </div>
      )}

      {/* Center: Main Workspace */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Workspace Task Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border-subtle bg-surface px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              onClick={() => setRailOpen(true)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-muted transition hover:bg-surface-hover lg:hidden"
              aria-label="Open task history"
            >
              <ListTodo size={16} />
            </button>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-[#2563EB]">
              <Bot size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-display truncate text-sm font-bold tracking-tight text-ink">
                  {activeConversation?.title || "AdvertiseOS Marketing Agency Workspace"}
                </h2>
                {currentBrandObj && (
                  <span className="hidden shrink-0 items-center gap-1 rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-[10px] font-semibold text-muted sm:inline-flex">
                    <Building2 size={10} />
                    {currentBrandObj.name}
                  </span>
                )}
              </div>
              <p className="truncate text-[11px] text-[#475569]">
                AI specialists work together · Quality-checked · You approve before anything goes live
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={handleNewConversation}
              className="hidden items-center gap-1.5 rounded-xl bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1D4ED8] sm:flex"
            >
              <Sparkles size={13} />
              New task
            </button>
            <button
              onClick={() => {
                if (typeof window !== "undefined" && window.innerWidth < 1280) {
                  setMobileLedgerOpen((v) => !v);
                } else {
                  setTeamOpen((v) => !v);
                }
              }}
              className="flex items-center gap-1.5 rounded-xl border border-border px-2.5 py-1.5 sm:px-3 text-xs font-semibold text-[#334155] transition hover:bg-surface-hover active:scale-95"
              aria-pressed={teamOpen || mobileLedgerOpen}
            >
              <PanelRightOpen size={14} className="text-[#2563EB]" />
              <span className="hidden xs:inline sm:inline">Agency Ledger</span>
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div ref={chatScrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
          {messages.length === 0 ? (
            <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center py-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-[#2563EB] shadow-[0_8px_24px_-12px_rgba(37,99,235,0.45)]">
                <Sparkles size={28} />
              </div>
              <h3 className="font-display mt-5 text-2xl font-extrabold tracking-tight text-ink">
                What should we create today?
              </h3>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#475569]">
                Describe your business and goal in plain language. Our AI team will research the market,
                plan a calendar, write posts and reels, and prepare designs — all for your approval.
              </p>

              <div className="mt-8 grid w-full grid-cols-1 gap-3 text-left sm:grid-cols-3">
                <div className="rounded-2xl border border-border bg-surface p-4 transition hover:border-[#bfdbfe] hover:shadow-sm">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-[#2563EB]">
                    <Layers size={17} />
                  </div>
                  <h4 className="mt-2.5 text-sm font-bold text-ink">Full campaign package</h4>
                  <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
                    Strategy, 30-day calendar, posts, reels & design briefs in one run
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-surface p-4 transition hover:border-[#a7f3d0] hover:shadow-sm">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Zap size={17} />
                  </div>
                  <h4 className="mt-2.5 text-sm font-bold text-ink">2026 market-aware</h4>
                  <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
                    Live trends, seasonal moments & industry benchmarks built into the plan
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-surface p-4 transition hover:border-[#c4b5fd] hover:shadow-sm">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                    <ShieldCheck size={17} />
                  </div>
                  <h4 className="mt-2.5 text-sm font-bold text-ink">You stay in control</h4>
                  <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
                    Nothing publishes or spends without your review and approval
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-muted">
                <span className="rounded-full border border-border bg-surface px-3 py-1.5">Try: “30-day Instagram plan for my clothing brand”</span>
                <span className="rounded-full border border-border bg-surface px-3 py-1.5">Or: “Analyze competitors in my city”</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <ChatMessageItem key={msg.id} message={msg} onRetry={handleRetry} />
              ))}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-border-subtle bg-surface px-2 pb-4 pt-3 sm:px-4">
          <ChatComposer
            onSendMessage={handleSendMessage}
            onStop={handleStop}
            isLoading={isLoading}
            disabled={!activeBrand && brands.length === 0}
          />
        </div>
      </div>

      {/* Right: Agency Live Ledger Panel (Desktop) */}
      {teamOpen && (
        <aside className="hidden w-[320px] shrink-0 xl:block">
          <TeamPanel activities={teamActivities} onClose={() => setTeamOpen(false)} />
        </aside>
      )}

      {/* Mobile/Tablet: Agency Live Ledger Drawer */}
      {mobileLedgerOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <div
            className="absolute inset-0 bg-[rgba(11,18,32,0.45)] backdrop-blur-sm transition-opacity"
            onClick={() => setMobileLedgerOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-[88%] max-w-[340px] flex-col bg-surface shadow-2xl pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
            <TeamPanel activities={teamActivities} onClose={() => setMobileLedgerOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
