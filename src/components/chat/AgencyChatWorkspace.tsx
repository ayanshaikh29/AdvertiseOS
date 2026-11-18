"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatMessageItem } from "@/components/chat/ChatMessageItem";
import { ChatHistoryPanel } from "@/components/chat/ChatHistoryPanel";
import { TeamPanel } from "@/components/chat/TeamPanel";
import type { Conversation, ChatMessage, ChatAttachment, AgentActivity } from "@/types/chat";
import {
  Sparkles,
  Bot,
  X,
  History,
  Activity,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Wand2,
  Palette,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

export function AgencyChatWorkspace() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);
  const [activeBrand, setActiveBrand] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState("Ayan");
  const [rightPanelTab, setRightPanelTab] = useState<"history" | "ledger">("history");
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [composerPreset, setComposerPreset] = useState("");

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
    }, 100);
  }, []);

  const selectConversation = useCallback(
    async (id: string) => {
      setActiveConversationId(id);
      setMobileDrawerOpen(false);
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

  const refreshConversationsList = useCallback(async (brandId?: string) => {
    try {
      const url = brandId ? `/api/chat/conversations?brandId=${brandId}` : "/api/chat/conversations";
      const res = await fetch(url);
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {
      // ignore network errors
    }
  }, []);

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

  useEffect(() => {
    // Fetch current user name
    fetch("/api/session")
      .then((r) => r.json())
      .then((d) => {
        if (d.session?.email) {
          const raw = d.session.email.split("@")[0] || "Ayan";
          setUserName(raw.charAt(0).toUpperCase() + raw.slice(1));
        }
      })
      .catch(() => {});

    fetch("/api/brands")
      .then((r) => r.json())
      .then((d) => {
        const bList = d.brands || [];
        setBrands(bList);
        const savedBrand = localStorage.getItem("advos-brand") || bList[0]?.id || "sample-brand";
        setActiveBrand(savedBrand);
        loadConversations(savedBrand);
      })
      .catch(() => {
        setActiveBrand("sample-brand");
      });

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
        setMobileDrawerOpen(false);
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
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
      );
    } catch {
      // ignore
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleSendMessage = async (
    text: string,
    attachments: ChatAttachment[],
    campaignId?: string
  ) => {
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

    // Auto-switch right panel to Live Ledger during active runs
    setRightPanelTab("ledger");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const targetBrandId = activeBrand || brands[0]?.id || "sample-brand";
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversationId,
          instruction: text,
          brandId: targetBrandId,
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
                if (event === "text_chunk")
                  return { ...m, content: (m.content || "") + data.text };
                if (event === "deliverable") {
                  const curDel = m.deliverables || [];
                  return { ...m, deliverables: [...curDel, data] };
                }
                if (event === "completed")
                  return { ...m, campaignId: data.campaignId, status: "completed" };
                if (event === "error")
                  return { ...m, error: data.error, status: "error" };
                return m;
              })
            );
            scrollToBottom();
          } catch {
            // partial SSE frame
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId && m.status === "streaming"
            ? { ...m, status: "completed" }
            : m
        )
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

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const teamActivities: AgentActivity[] =
    [...messages]
      .reverse()
      .find((m) => m.role === "assistant" && m.agentActivities?.length)?.agentActivities || [];

  return (
    <div className="relative flex h-full w-full gap-3 sm:gap-4 overflow-hidden">
      {/* ── Center Stage: AI Workspace Canvas (Matching Image 1) ───────────────── */}
      <div className="relative flex min-w-0 flex-1 flex-col rounded-3xl border border-black/[0.06] bg-white/80 p-3 sm:p-5 shadow-xs backdrop-blur-xl overflow-hidden">
        {/* Subtle Top Utility Bar */}
        <div className="flex items-center justify-between pb-2 sm:pb-3 border-b border-black/[0.04]">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#F5F2EF] text-[#8B5CF6]">
              <Sparkles size={14} />
            </span>
            <div className="flex items-center gap-2">
              <span className="font-display text-xs font-bold text-[#18181B] truncate max-w-[200px] sm:max-w-xs">
                {activeConversation?.title || "AdvertiseOS Marketing Studio"}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                <ShieldCheck size={11} /> Approval Gated
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile History / Ledger Button */}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="inline-flex xl:hidden items-center gap-1.5 rounded-full border border-black/[0.06] bg-white px-3 py-1.5 text-xs font-semibold text-[#18181B] shadow-2xs hover:bg-[#F5F2EF]"
            >
              <History size={13} />
              <span>History</span>
            </button>

            {/* Desktop Toggle Right Panel */}
            <button
              onClick={() => setRightPanelOpen((v) => !v)}
              className="hidden xl:inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-white px-3 py-1.5 text-xs font-semibold text-[#52525B] shadow-2xs hover:bg-[#F5F2EF] hover:text-[#18181B]"
            >
              <Activity size={13} className={teamActivities.length > 0 ? "text-emerald-600 animate-pulse" : ""} />
              <span>{rightPanelOpen ? "Collapse Panel" : "View History"}</span>
            </button>
          </div>
        </div>

        {/* Center Content Stream / Empty State */}
        <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-1 py-4 sm:px-4 smooth-scroll flex flex-col">
          {messages.length === 0 ? (
            <div className="mx-auto my-auto flex w-full max-w-2xl flex-col items-center justify-center py-6 sm:py-8 text-center select-none">
              {/* Floating Animated Crystal Star Emblem (Matching Image 1 & 3) */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative flex items-center justify-center"
              >
                {/* Gentle Pulsing Glow Backdrop */}
                <div className="absolute h-28 w-28 rounded-full bg-gradient-to-tr from-[#F97316]/20 via-[#EC4899]/20 to-[#8B5CF6]/25 blur-2xl animate-pulse" />

                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="relative z-10 flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-3xl"
                >
                  <Image
                    src="/logo-emblem-transparent.png"
                    alt="AdvertiseOS Glowing Star"
                    width={96}
                    height={96}
                    priority
                    className="object-contain drop-shadow-[0_8px_20px_rgba(249,115,22,0.35)]"
                  />
                </motion.div>
              </motion.div>

              {/* Title & Greeting (Matching Image 1) */}
              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                className="font-display mt-4 sm:mt-5 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#18181B]"
              >
                Welcome, {userName}!
              </motion.h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.5 }}
                className="mt-1.5 text-sm sm:text-base text-[#71717A]"
              >
                How can I help you today?
              </motion.p>

              {/* ── Centered Pill Prompt Bar (Always in Center on Home!) ───────── */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32, duration: 0.5 }}
                className="mt-6 sm:mt-7 w-full max-w-2xl px-1"
              >
                <ChatComposer
                  onSendMessage={handleSendMessage}
                  onStop={handleStop}
                  isLoading={isLoading}
                  disabled={false}
                  initialValue={composerPreset}
                />
              </motion.div>

              {/* 3 Quick Action Suggestion Cards (Image 1 Style) */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.42, duration: 0.5 }}
                className="mt-6 sm:mt-7 grid w-full grid-cols-1 gap-3 text-left sm:grid-cols-3"
              >
                {/* Card 1: Generate Visual / Campaign */}
                <button
                  type="button"
                  onClick={() =>
                    setComposerPreset(
                      "Create a 30-day Instagram marketing campaign for my business with 12 posts, 4 Reels, and calendar"
                    )
                  }
                  className="group relative flex flex-col justify-between rounded-3xl border border-black/[0.06] bg-gradient-to-b from-white to-[#FAF8F5] p-4 sm:p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-black/[0.12] hover:shadow-md text-left"
                >
                  <div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-100 to-orange-100 text-amber-700 shadow-2xs group-hover:scale-110 transition-transform">
                      <Sparkles size={18} />
                    </div>
                    <h3 className="mt-3.5 text-sm font-bold text-[#18181B]">Generate visual</h3>
                    <p className="mt-1 text-xs leading-relaxed text-[#71717A]">
                      Create multi-channel posts, reels & ad copy instantly
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-[11px] font-semibold text-[#8B5CF6] opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Use template</span>
                    <ArrowRight size={12} />
                  </div>
                </button>

                {/* Card 2: Improve Prompt / Brief */}
                <button
                  type="button"
                  onClick={() =>
                    setComposerPreset(
                      "Audit our current marketing strategy and suggest a high-converting 30-day roadmap"
                    )
                  }
                  className="group relative flex flex-col justify-between rounded-3xl border border-black/[0.06] bg-gradient-to-b from-white to-[#FAF8F5] p-4 sm:p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-black/[0.12] hover:shadow-md text-left"
                >
                  <div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-100 to-violet-100 text-purple-700 shadow-2xs group-hover:scale-110 transition-transform">
                      <Wand2 size={18} />
                    </div>
                    <h3 className="mt-3.5 text-sm font-bold text-[#18181B]">Improve prompt</h3>
                    <p className="mt-1 text-xs leading-relaxed text-[#71717A]">
                      Enhance your campaign brief automatically with target market data
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-[11px] font-semibold text-[#8B5CF6] opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Use template</span>
                    <ArrowRight size={12} />
                  </div>
                </button>

                {/* Card 3: Explore Styles / Strategy */}
                <button
                  type="button"
                  onClick={() =>
                    setComposerPreset(
                      "Generate 4 viral Reels concepts with shot-by-shot visual breakdown and hooks"
                    )
                  }
                  className="group relative flex flex-col justify-between rounded-3xl border border-black/[0.06] bg-gradient-to-b from-white to-[#FAF8F5] p-4 sm:p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-black/[0.12] hover:shadow-md text-left"
                >
                  <div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-100 to-rose-100 text-rose-700 shadow-2xs group-hover:scale-110 transition-transform">
                      <Palette size={18} />
                    </div>
                    <h3 className="mt-3.5 text-sm font-bold text-[#18181B]">Explore styles</h3>
                    <p className="mt-1 text-xs leading-relaxed text-[#71717A]">
                      Apply 2026 market trends, positioning & brand angles
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-[11px] font-semibold text-[#8B5CF6] opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Use template</span>
                    <ArrowRight size={12} />
                  </div>
                </button>
              </motion.div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {messages.map((msg) => (
                <ChatMessageItem key={msg.id} message={msg} onRetry={handleRetry} />
              ))}
            </div>
          )}
        </div>

        {/* Floating Composer at Bottom (When in Active Conversation) */}
        {messages.length > 0 && (
          <div className="pt-2">
            <ChatComposer
              onSendMessage={handleSendMessage}
              onStop={handleStop}
              isLoading={isLoading}
              disabled={false}
              initialValue={composerPreset}
            />
          </div>
        )}
      </div>

      {/* ── Right Column: Chat History & Live Ledger (Matching Image 1) ───────── */}
      {rightPanelOpen && (
        <aside className="hidden xl:flex w-[320px] shrink-0 flex-col overflow-hidden">
          {rightPanelTab === "history" ? (
            <ChatHistoryPanel
              conversations={conversations}
              activeId={activeConversationId}
              onSelectConversation={selectConversation}
              onNewConversation={handleNewConversation}
              onDeleteConversation={handleDeleteConversation}
              onRenameConversation={handleRenameConversation}
              activities={teamActivities}
              activeTab={rightPanelTab}
              onTabChange={setRightPanelTab}
            />
          ) : (
            <div className="flex h-full flex-col rounded-3xl border border-black/[0.06] bg-white/90 p-4 shadow-sm backdrop-blur-xl">
              <div className="flex items-center justify-between pb-3 border-b border-black/[0.05]">
                <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#F5F2EF]">
                  <button
                    onClick={() => setRightPanelTab("history")}
                    className="rounded-xl px-3 py-1.5 text-xs font-bold text-[#71717A] hover:text-[#18181B] transition-all"
                  >
                    Chat history
                  </button>
                  <button
                    onClick={() => setRightPanelTab("ledger")}
                    className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-[#18181B] shadow-sm transition-all"
                  >
                    Live Ledger
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto pt-3">
                <TeamPanel activities={teamActivities} onClose={() => setRightPanelTab("history")} />
              </div>
            </div>
          )}
        </aside>
      )}

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 xl:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
              onClick={() => setMobileDrawerOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="absolute inset-y-0 right-0 w-[88%] max-w-[340px] p-2 bg-[#F8F6F4]"
            >
              <div className="relative h-full w-full">
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="absolute right-3 top-3 z-10 rounded-full bg-white p-1.5 text-[#71717A] shadow-xs"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
                {rightPanelTab === "history" ? (
                  <ChatHistoryPanel
                    conversations={conversations}
                    activeId={activeConversationId}
                    onSelectConversation={selectConversation}
                    onNewConversation={handleNewConversation}
                    onDeleteConversation={handleDeleteConversation}
                    onRenameConversation={handleRenameConversation}
                    activities={teamActivities}
                    activeTab={rightPanelTab}
                    onTabChange={setRightPanelTab}
                  />
                ) : (
                  <div className="flex h-full flex-col rounded-3xl border border-black/[0.06] bg-white p-4 shadow-sm">
                    <TeamPanel activities={teamActivities} onClose={() => setRightPanelTab("history")} />
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
