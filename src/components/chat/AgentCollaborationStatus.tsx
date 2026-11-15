import React from "react";
import type { AgentActivity } from "@/types/chat";
import { CheckCircle2, AlertCircle, Loader2, Bot, ChevronDown, ChevronUp, Clock, CircleDollarSign, Award } from "lucide-react";

interface AgentCollaborationStatusProps {
  activities: AgentActivity[];
  isOpen: boolean;
  onToggle: () => void;
}

export function AgentCollaborationStatus({ activities, isOpen, onToggle }: AgentCollaborationStatusProps) {
  if (!activities || activities.length === 0) return null;

  const isClarificationOnly =
    activities.length === 1 &&
    (activities[0]?.notes?.includes("Fact Collection Mode") ||
      activities[0]?.currentTask?.toLowerCase().includes("awaiting"));

  const runningCount = activities.filter((a) => a.status === "in_progress" || a.status === "thinking" || a.status === "review").length;
  const completedCount = activities.filter((a) => a.status === "completed").length;
  const totalCount = activities.length;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <button onClick={onToggle} className="flex w-full items-center justify-between px-3.5 py-2.5 text-left transition hover:bg-surface-hover" aria-expanded={isOpen}>
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            {runningCount > 0 ? (
              <>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2563EB] opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2563EB]" />
              </>
            ) : isClarificationOnly ? (
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#F59E0B]" />
            ) : (
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10B981]" />
            )}
          </span>
          <span className="text-xs font-bold text-ink">AI Agency Execution Ledger</span>
          {isClarificationOnly ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              Awaiting Details · Clarification Mode
            </span>
          ) : (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${runningCount > 0 ? "tint-info" : "tint-success"}`}>
              {runningCount > 0 ? `${runningCount} working` : `${completedCount}/${totalCount} specialists verified`}
            </span>
          )}
        </div>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          {isOpen ? "Hide step breakdown" : "View specialist tasks"}
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {isOpen && (
        <div className="grid gap-2 border-t border-border-subtle bg-[#fafbfc] p-3 sm:grid-cols-2 lg:grid-cols-3">
          {activities.map((act) => {
            const isDone = act.status === "completed";
            const isRunning = act.status === "in_progress" || act.status === "thinking" || act.status === "review";
            const isError = act.status === "error";

            return (
              <div
                key={act.agent}
                className={`flex items-start gap-2.5 rounded-lg border p-2.5 transition ${
                  isDone
                    ? "border-[#a7f3d0] bg-[#ecfdf5]"
                    : isRunning
                      ? "border-[#bfdbfe] bg-brand-soft"
                      : isError
                        ? "border-[#fecaca] bg-[#fef2f2]"
                        : "border-border bg-surface"
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isDone ? (
                    <CheckCircle2 size={14} className="text-[#10B981]" />
                  ) : isRunning ? (
                    <Loader2 size={14} className="animate-spin text-[#2563EB]" />
                  ) : isError ? (
                    <AlertCircle size={14} className="text-[#EF4444]" />
                  ) : (
                    <Bot size={14} className="text-[#94A3B8]" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <h5 className="truncate text-xs font-bold capitalize text-ink">
                      {act.displayName || act.agent.replace(/_/g, " ")}
                    </h5>
                    {typeof act.criticScore === "number" ? (
                      <span className="flex shrink-0 items-center gap-0.5 font-mono text-[9px] font-bold text-[#047857]">
                        <Award size={9} />
                        {act.criticScore}/100
                      </span>
                    ) : act.latencyMs ? (
                      <span className="flex shrink-0 items-center gap-0.5 font-mono text-[9px] text-muted">
                        <Clock size={9} />
                        {(act.latencyMs / 1000).toFixed(1)}s
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-[#475569]">
                    {act.currentTask || (isDone ? "Deliverable verified & passed" : "Active")}
                  </p>
                  {act.outputRef && (
                    <p className="mt-0.5 truncate text-[10px] font-medium text-[#2563EB]">
                      ↳ {act.outputRef}
                    </p>
                  )}
                  {act.taskId && (
                    <p className="mt-0.5 font-mono text-[9px] text-[#64748b] truncate">
                      ID: {act.taskId}
                    </p>
                  )}
                  {typeof act.costUsd === "number" && act.costUsd > 0 && (
                    <p className="mt-0.5 flex items-center gap-0.5 font-mono text-[9px] text-muted">
                      <CircleDollarSign size={9} />${act.costUsd.toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
