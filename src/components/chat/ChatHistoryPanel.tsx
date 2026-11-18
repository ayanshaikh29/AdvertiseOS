"use client";

import React, { useState, useMemo } from "react";
import type { Conversation, AgentActivity } from "@/types/chat";
import {
  Search,
  Plus,
  Trash2,
  Edit3,
  Clock,
  Sparkles,
  Bot,
  Layers,
  ChevronRight,
  Flame,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/cn";

interface ChatHistoryPanelProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  activities?: AgentActivity[];
  activeTab?: "history" | "ledger";
  onTabChange?: (tab: "history" | "ledger") => void;
  className?: string;
}

export function ChatHistoryPanel({
  conversations,
  activeId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  activities = [],
  activeTab = "history",
  onTabChange,
  className,
}: ChatHistoryPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const startRename = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const saveRename = (id: string) => {
    if (editTitle.trim()) onRenameConversation(id, editTitle.trim());
    setEditingId(null);
  };

  const filteredConversations = useMemo(() => {
    const seenTitles = new Set<string>();
    const list: Conversation[] = [];

    for (const c of conversations) {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.title.toLowerCase().includes(q) ||
        (c.lastMessage && c.lastMessage.toLowerCase().includes(q));
      if (!matchesSearch) continue;

      const dedupeKey = `${c.title.trim().toLowerCase()}-${c.createdAt.slice(0, 10)}`;
      if (seenTitles.has(dedupeKey)) continue;
      seenTitles.add(dedupeKey);
      list.push(c);
    }
    return list;
  }, [conversations, searchQuery]);

  const activeSpecialists = activities.filter((a) => a.status === "in_progress").length;

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col rounded-3xl border border-black/[0.06] bg-white/90 p-4 shadow-sm backdrop-blur-xl",
        className
      )}
    >
      {/* Top Header / Tabs */}
      <div className="flex items-center justify-between pb-3 border-b border-black/[0.05]">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#F5F2EF]">
          <button
            onClick={() => onTabChange?.("history")}
            className={cn(
              "rounded-xl px-3 py-1.5 text-xs font-bold transition-all",
              activeTab === "history"
                ? "bg-white text-[#18181B] shadow-sm"
                : "text-[#71717A] hover:text-[#18181B]"
            )}
          >
            Chat history
          </button>
          <button
            onClick={() => onTabChange?.("ledger")}
            className={cn(
              "relative rounded-xl px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5",
              activeTab === "ledger"
                ? "bg-white text-[#18181B] shadow-sm"
                : "text-[#71717A] hover:text-[#18181B]"
            )}
          >
            <span>Live Ledger</span>
            {activeSpecialists > 0 && (
              <span className="flex h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
            )}
          </button>
        </div>

        <span className="text-[11px] font-semibold text-[#A1A1AA]">
          {filteredConversations.length} chats
        </span>
      </div>

      {/* Search Input (Matching Image 1) */}
      <div className="pt-3 pb-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-3 text-[#A1A1AA]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-2xl border border-black/[0.06] bg-[#FAF8F5] py-2 pl-9 pr-3 text-xs text-[#18181B] placeholder:text-[#A1A1AA] focus:border-[#18181B] focus:bg-white focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1 smooth-scroll">
        {filteredConversations.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#A1A1AA]">
            {searchQuery ? "No matching chats" : "No chats yet. Start a new task below!"}
          </div>
        ) : (
          filteredConversations.map((conv, idx) => {
            const isActive = conv.id === activeId;
            const isEditing = editingId === conv.id;

            // Generate clean relative time
            const dateStr = conv.updatedAt
              ? new Date(conv.updatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : "Recent";

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={cn(
                  "group relative flex flex-col gap-1 rounded-2xl p-3 text-left transition-all duration-200 cursor-pointer border",
                  isActive
                    ? "border-black/[0.1] bg-[#FAF8F5] shadow-sm ring-1 ring-black/[0.04]"
                    : "border-transparent hover:border-black/[0.04] hover:bg-black/[0.02]"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-transform group-hover:scale-105",
                        idx % 3 === 0
                          ? "bg-amber-100/70 text-amber-700"
                          : idx % 3 === 1
                          ? "bg-purple-100/70 text-purple-700"
                          : "bg-emerald-100/70 text-emerald-700"
                      )}
                    >
                      <Sparkles size={13} />
                    </span>

                    {isEditing ? (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveRename(conv.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="w-full rounded-lg border border-black bg-white px-2 py-0.5 text-xs font-semibold focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <h4
                        className={cn(
                          "truncate text-xs font-bold leading-tight",
                          isActive ? "text-[#18181B]" : "text-[#27272A]"
                        )}
                      >
                        {conv.title}
                      </h4>
                    )}
                  </div>

                  <span className="shrink-0 text-[10px] font-medium text-[#A1A1AA]">
                    {dateStr}
                  </span>
                </div>

                {conv.lastMessage && (
                  <p className="line-clamp-2 pl-9 text-[11px] leading-relaxed text-[#71717A]">
                    {conv.lastMessage}
                  </p>
                )}

                {/* Hover Action Buttons */}
                <div className="absolute right-2.5 bottom-2.5 hidden items-center gap-1 group-hover:flex">
                  <button
                    onClick={(e) => startRename(conv, e)}
                    title="Rename"
                    className="rounded-lg p-1 text-[#A1A1AA] hover:bg-white hover:text-[#18181B]"
                  >
                    <Edit3 size={11} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conv.id);
                    }}
                    title="Delete"
                    className="rounded-lg p-1 text-[#A1A1AA] hover:bg-white hover:text-red-600"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Button: "+ Create new chat" (Matching Image 1) */}
      <div className="pt-3 border-t border-black/[0.05]">
        <button
          onClick={onNewConversation}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#18181B] py-3 text-xs font-bold text-white shadow-[0_4px_14px_-2px_rgba(24,24,27,0.35)] transition-all hover:bg-black hover:shadow-lg active:scale-98"
        >
          <Plus size={15} />
          <span>Create new chat</span>
        </button>
      </div>
    </div>
  );
}
