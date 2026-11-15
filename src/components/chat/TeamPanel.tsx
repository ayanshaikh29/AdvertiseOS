"use client";

import React, { useState } from "react";
import type { AgentActivity, AgentRole } from "@/types/chat";
import { CheckCircle2, AlertCircle, Loader2, Bot, X, CircleDollarSign, Clock, ShieldCheck, Award, Eye } from "lucide-react";

const AGENT_META: Record<
  string,
  { name: string; avatar: string; responsibility: string; tier: string }
> = {
  manager: { name: "AI Agency Manager", avatar: "👔", responsibility: "Orchestration, intent classification & workflow DAG", tier: "Project Head" },
  researcher: { name: "Market Researcher", avatar: "🔍", responsibility: "Competitor benchmarking, audience personas & trends", tier: "Specialist" },
  brand_voice: { name: "Brand Voice Agent", avatar: "🎙️", responsibility: "Tone fidelity, messaging pillars & guideline rules", tier: "Specialist" },
  strategist: { name: "AI Strategist", avatar: "🎯", responsibility: "Campaign roadmaps, positioning, Plan A/B & calendar", tier: "Specialist" },
  creative: { name: "Creative Production", avatar: "🎨", responsibility: "Social captions, 9:16 reel scripts & visual briefs", tier: "Specialist" },
  seo_sem: { name: "SEO/SEM Agent", avatar: "🚀", responsibility: "Keyword clustering, search intent & technical specs", tier: "Specialist" },
  performance: { name: "Performance Marketer", avatar: "📊", responsibility: "Paid ad funnels, Meta/Google ads & budget allocation", tier: "Specialist" },
  critic: { name: "Critic / QA Agent", avatar: "🛡️", responsibility: "Rubric evaluation, hallucination checks & revisions", tier: "Quality Gate" },
  // Legacy aliases
  content: { name: "Content Copywriter", avatar: "✍️", responsibility: "Social media captions & CTAs", tier: "Specialist" },
  designer: { name: "Art Director", avatar: "🎨", responsibility: "Social & ad visual templates", tier: "Specialist" },
  video: { name: "Reels Producer", avatar: "🎬", responsibility: "Vertical video scripts", tier: "Specialist" },
  reviewer: { name: "Quality Reviewer", avatar: "🛡️", responsibility: "Brand compliance check", tier: "Specialist" },
};

const ALL_ROSTER: AgentRole[] = [
  "manager",
  "researcher",
  "brand_voice",
  "strategist",
  "creative",
  "seo_sem",
  "performance",
  "critic",
];

export function TeamPanel({ activities, onClose }: { activities: AgentActivity[]; onClose: () => void }) {
  const [showAllTeam, setShowAllTeam] = useState(false);
  const running = activities.filter((a) => a.status === "in_progress" || a.status === "thinking" || a.status === "review").length;
  const done = activities.filter((a) => a.status === "completed").length;
  const totalCost = activities.reduce((s, a) => s + (a.costUsd || 0), 0);

  // Merge active with roster if showAllTeam is true
  const displayList: AgentActivity[] = showAllTeam
    ? ALL_ROSTER.map((role) => {
        const found = activities.find((a) => a.agent === role);
        if (found) return found;
        const meta = AGENT_META[role] || { name: role, avatar: "🤖", responsibility: "", tier: "" };
        return {
          agent: role,
          displayName: meta.name,
          avatar: meta.avatar,
          status: "idle" as const,
          currentTask: "On standby for relevant workflow tasks",
        };
      })
    : activities.length > 0
      ? activities
      : ALL_ROSTER.slice(0, 4).map((role) => {
          const meta = AGENT_META[role] || { name: role, avatar: "🤖", responsibility: "", tier: "" };
          return {
            agent: role,
            displayName: meta.name,
            avatar: meta.avatar,
            status: "idle" as const,
            currentTask: "Ready for task briefing",
          };
        });

  return (
    <div className="flex h-full flex-col border-l border-border bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2 shrink-0">
              {running > 0 ? (
                <>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2563EB] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2563EB]" />
                </>
              ) : (
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10B981]" />
              )}
            </span>
            <h3 className="font-display text-sm font-bold text-ink">Agency Live Ledger</h3>
          </div>
          <p className="mt-0.5 text-[11px] text-muted">
            {running > 0
              ? `${running} specialists active`
              : activities.length === 1 && activities[0]?.notes?.includes("Fact Collection Mode")
                ? "Awaiting client details"
                : `${done}/${activities.length || 7} specialists verified`}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowAllTeam(!showAllTeam)}
            title={showAllTeam ? "Show only active specialists" : "Show all 7 agency specialists"}
            className="rounded-lg p-1.5 text-xs text-muted hover:bg-surface-hover hover:text-ink font-semibold"
          >
            {showAllTeam ? "Active only" : "All 7"}
          </button>
          <button onClick={onClose} aria-label="Close team panel" className="rounded-lg p-1.5 text-[#94A3B8] transition hover:bg-surface-hover hover:text-ink">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Specialist Cards */}
      <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
        {displayList.map((act) => {
          const meta = AGENT_META[act.agent] || { name: act.displayName || act.agent, avatar: act.avatar || "🤖", responsibility: "", tier: "Specialist" };
          const isDone = act.status === "completed";
          const isWorking = act.status === "in_progress" || act.status === "thinking";
          const isReview = act.status === "review";
          const isError = act.status === "error";

          return (
            <div
              key={act.agent}
              className={`rounded-xl border p-3.5 transition ${
                isDone
                  ? "border-[#A7F3D0] bg-[#FAFFFD]"
                  : isWorking
                    ? "border-[#BFDBFE] bg-brand-soft/50 ring-1 ring-[#2563EB]/20"
                    : isReview
                      ? "border-[#FDE68A] bg-[#FFFDF5]"
                      : isError
                        ? "border-[#FECACA] bg-[#FEF2F2]"
                        : "border-border bg-surface"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-base shadow-sm">
                    {act.avatar || meta.avatar}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-xs font-bold text-ink">{act.displayName || meta.name}</p>
                      <span className="rounded bg-surface-2 px-1.5 py-0.2 text-[9px] font-semibold text-muted">
                        {meta.tier}
                      </span>
                    </div>
                    <p className="truncate text-[10px] text-muted">{meta.responsibility}</p>
                  </div>
                </div>

                {isDone ? (
                  <CheckCircle2 size={15} className="shrink-0 text-[#10B981]" />
                ) : isWorking ? (
                  <Loader2 size={15} className="shrink-0 animate-spin text-[#2563EB]" />
                ) : isReview ? (
                  <ShieldCheck size={15} className="shrink-0 text-[#D97706]" />
                ) : isError ? (
                  <AlertCircle size={15} className="shrink-0 text-[#EF4444]" />
                ) : (
                  <Bot size={14} className="shrink-0 text-[#94A3B8]" />
                )}
              </div>

              {/* Subtask execution info */}
              <div className="mt-2.5 rounded-lg border border-border/60 bg-white/70 p-2 text-[11px] leading-relaxed text-[#334155]">
                <span className="font-semibold text-ink">Task: </span>
                <span>{act.currentTask || (isDone ? "Deliverable verified & passed" : "Waiting for dependencies")}</span>
              </div>

              {/* Verification & Metrics */}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 pt-0.5 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 font-bold ${
                      isDone
                        ? "bg-[#DCFCE7] text-[#15803D]"
                        : isWorking
                          ? "bg-brand-soft text-[#1D4ED8]"
                          : isReview
                            ? "bg-[#FEF3C7] text-[#B45309]"
                            : isError
                              ? "bg-[#FEE2E2] text-[#B91C1C]"
                              : "bg-surface-2 text-muted"
                    }`}
                  >
                    {isDone ? "Done" : isWorking ? "Running" : isReview ? "Revising" : isError ? "Failed" : "Waiting"}
                  </span>
                  {typeof act.criticScore === "number" && (
                    <span className="inline-flex items-center gap-0.5 font-mono font-bold text-[#047857]">
                      <Award size={10} /> {act.criticScore}/100
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 font-mono text-muted">
                  {typeof act.latencyMs === "number" && act.latencyMs > 0 && (
                    <span className="inline-flex items-center gap-0.5">
                      <Clock size={10} />
                      {(act.latencyMs / 1000).toFixed(1)}s
                    </span>
                  )}
                  {typeof act.costUsd === "number" && act.costUsd > 0 && (
                    <span className="inline-flex items-center gap-0.5">
                      <CircleDollarSign size={10} />${act.costUsd.toFixed(4)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Stats */}
      <div className="border-t border-border-subtle bg-[#F8FAFC] px-4 py-3 text-[11px] text-muted">
        <div className="flex items-center justify-between">
          <span>Persisted AI Run Usage:</span>
          <span className="font-mono font-bold text-ink">${totalCost.toFixed(4)}</span>
        </div>
      </div>
    </div>
  );
}
