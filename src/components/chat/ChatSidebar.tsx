"use client";

import React, { useState, useMemo } from "react";
import type { Conversation } from "@/types/chat";
import { MessageSquare, Plus, Trash2, Edit3, Check, X, Search, Clock, Calendar, CheckCircle2 } from "lucide-react";

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
}

export function ChatSidebar({
  conversations,
  activeId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
}: ChatSidebarProps) {
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

  // Deduplicate and filter conversations
  const filteredConversations = useMemo(() => {
    const seenTitles = new Set<string>();
    const list: Conversation[] = [];

    for (const c of conversations) {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || c.title.toLowerCase().includes(q) || (c.lastMessage && c.lastMessage.toLowerCase().includes(q));
      if (!matchesSearch) continue;

      // Deduplicate consecutive identical titles for clean list view
      const dedupeKey = `${c.title.trim().toLowerCase()}-${c.createdAt.slice(0, 10)}`;
      if (seenTitles.has(dedupeKey)) continue;
      seenTitles.add(dedupeKey);
      list.push(c);
    }
    return list;
  }, [conversations, searchQuery]);

  return (
    <div className="flex h-full w-full flex-col border-r border-border bg-surface">
      {/* Top action: New Task */}
      <div className="border-b border-border-subtle p-3 space-y-2">
        <button
          onClick={onNewConversation}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-3.5 py-2.5 text-xs font-semibold text-white shadow-[0_4px_12px_-4px_rgba(37,99,235,0.5)] transition hover:bg-[#1D4ED8]"
        >
          <Plus size={15} />
          <span>New Agency Task</span>
        </button>

        {/* Search input */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2.5 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recent tasks..."
            className="w-full rounded-lg border border-border bg-[#F8FAFC] py-1.5 pl-8 pr-2.5 text-xs text-ink placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:outline-none"
          />
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
          Recent Tasks ({filteredConversations.length})
        </p>

        {filteredConversations.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs leading-relaxed text-muted">
            {searchQuery ? "No matching tasks found." : "No tasks yet. Brief your AI agency team to start."}
          </div>
        ) : (
          <ul className="space-y-1">
            {filteredConversations.map((conv) => {
              const isActive = conv.id === activeId;
              const isEditing = editingId === conv.id;
              const dateStr = conv.updatedAt ? new Date(conv.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";

              return (
                <li
                  key={conv.id}
                  className={`group flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition ${
                    isActive
                      ? "bg-brand-soft font-semibold text-[#1D4ED8] ring-1 ring-[#2563EB]/25"
                      : "text-[#64748B] hover:bg-surface-hover hover:text-ink"
                  }`}
                >
                  {isEditing ? (
                    <div className="flex w-full items-center gap-1.5">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveRename(conv.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="w-full rounded-lg border border-[#2563EB] bg-white px-2 py-1 text-xs text-ink focus:outline-none"
                        autoFocus
                        aria-label="Task name"
                      />
                      <button onClick={() => saveRename(conv.id)} className="p-1 text-[#047857] hover:text-[#065F46]" aria-label="Save name">
                        <Check size={13} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1 text-muted hover:text-ink" aria-label="Cancel rename">
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => onSelectConversation(conv.id)}
                        className="flex min-w-0 flex-1 items-start gap-2 text-left"
                        aria-current={isActive ? "page" : undefined}
                      >
                        <MessageSquare size={14} className={isActive ? "mt-0.5 shrink-0 text-[#2563EB]" : "mt-0.5 shrink-0 text-[#94A3B8]"} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{conv.title || "Untitled Agency Task"}</p>
                          <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted">
                            <span className="flex items-center gap-0.5">
                              <Calendar size={9} /> {dateStr}
                            </span>
                            {conv.messageCount > 0 && <span>· {conv.messageCount} msg</span>}
                          </div>
                        </div>
                      </button>

                      <span className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <button
                          onClick={(e) => startRename(conv, e)}
                          className="rounded p-1 text-muted hover:bg-white hover:text-ink"
                          title="Rename task"
                          aria-label={`Rename ${conv.title}`}
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteConversation(conv.id);
                          }}
                          className="rounded p-1 text-[#94A3B8] hover:bg-white hover:text-[#DC2626]"
                          title="Delete task"
                          aria-label={`Delete ${conv.title}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </span>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer Info */}
      <div className="border-t border-border-subtle p-3">
        <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-[11px] text-muted">
          <CheckCircle2 size={13} className="shrink-0 text-[#10B981]" />
          <span>Strict Human Approvals before publishing.</span>
        </div>
      </div>
    </div>
  );
}
