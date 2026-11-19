import React, { useState } from "react";
import type { DeliverableAudit } from "@/types/chat";
import { ShieldCheck, TrendingUp, AlertTriangle, Lightbulb, Check, Award, Copy, ChevronDown, ChevronUp } from "lucide-react";

export function AuditCard({ data }: { data: DeliverableAudit }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const copyAuditSummary = () => {
    const text = `Brand Audit: ${data.brandName} (Score: ${data.score}/100)\n\nOverview:\n${data.overview}\n\nStrengths:\n${data.strengths.map((s) => `- ${s}`).join("\n")}\n\nBottlenecks:\n${data.weaknesses.map((w) => `- ${w}`).join("\n")}\n\nRecommendations:\n${data.recommendations.map((r) => `- ${r}`).join("\n")}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F5F2EF] text-[#18181B]">
            <ShieldCheck size={18} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-sm font-bold text-ink">Brand & account audit</h3>
              <span className="tint-info rounded-full px-2 py-0.5 text-[9px] font-bold uppercase">Audited</span>
              {data.limitedData && (
                <span className="tint-warning rounded-full px-2 py-0.5 text-[9px] font-bold uppercase">Profile readiness — no channel metrics</span>
              )}
            </div>
            <p className="text-[11px] text-muted">{data.brandName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-3 py-1 text-xs">
            <Award size={14} className="text-[#8B5CF6]" />
            <span className="font-mono text-sm font-bold text-ink">{data.score}</span>
            <span className="text-[10px] font-normal text-muted">/100</span>
          </div>
          <button onClick={copyAuditSummary} className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-[#475569] transition hover:bg-surface-hover">
            {copied ? <Check size={12} className="text-[#10B981]" /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button onClick={() => setExpanded(!expanded)} className="rounded-lg p-1 text-muted transition hover:text-ink" aria-expanded={expanded} aria-label="Toggle audit details">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-4 p-4">
          <p className="text-xs leading-relaxed text-[#334155]">{data.overview}</p>

          {data.dataSources && data.dataSources.length > 0 && (
            <p className="text-[10px] text-muted">Data sources: {data.dataSources.join(" · ")}</p>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-[#a7f3d0] bg-[#ecfdf5] p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#047857]">
                <TrendingUp size={13} />
                <span>Strengths</span>
              </div>
              <ul className="mt-2 space-y-1.5 text-xs text-[#065F46]">
                {data.strengths.map((s, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 leading-snug">
                    <span className="font-bold">✓</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-[#fde68a] bg-[#fffbeb] p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#B45309]">
                <AlertTriangle size={13} />
                <span>Bottlenecks</span>
              </div>
              <ul className="mt-2 space-y-1.5 text-xs text-[#92400E]">
                {data.weaknesses.map((w, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 leading-snug">
                    <span className="font-bold">!</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-black/[0.08] bg-[#F5F2EF] p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#18181B]">
                <Lightbulb size={13} className="text-[#F97316]" />
                <span>Recommended next</span>
              </div>
              <ul className="mt-2 space-y-1.5 text-xs text-[#18181B]">
                {data.recommendations.map((r, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 leading-snug">
                    <span className="font-bold">→</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
