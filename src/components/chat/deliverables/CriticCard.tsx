"use client";

import React, { useState } from "react";
import type { DeliverableCritic } from "@/types/chat";
import { ShieldCheck, AlertTriangle, CheckCircle2, RefreshCw, Award, ChevronDown, ChevronUp } from "lucide-react";

export function CriticCard({ data }: { data: DeliverableCritic }) {
  const [expanded, setExpanded] = useState(false);
  const isPassing = data.passed && data.overallScore >= 80;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle bg-[#F8FAFC] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-xl ${
              isPassing ? "bg-[#10B981]/10 text-[#10B981]" : "bg-[#EF4444]/10 text-[#EF4444]"
            }`}
          >
            <ShieldCheck size={16} />
          </span>
          <div>
            <h4 className="font-display text-sm font-bold text-ink">Quality Assurance Certificate</h4>
            <p className="text-[11px] text-muted">
              Audited by Critic Agent · Cycle {data.revisionCycle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-bold ${
              isPassing
                ? "border border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]"
                : "border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]"
            }`}
          >
            <Award size={13} /> Score: {data.overallScore}/100 · {isPassing ? "Verified Quality" : "Needs Revision"}
          </span>
        </div>
      </div>

      <div className="p-5 text-xs space-y-3.5">
        {/* Verdict Callout */}
        <div
          className={`flex items-start gap-2.5 rounded-xl border p-3 ${
            isPassing ? "border-[#A7F3D0] bg-[#ECFDF5] text-[#065F46]" : "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]"
          }`}
        >
          {isPassing ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
          <div>
            <span className="font-bold">QA Verdict: </span>
            <span>{data.verdict}</span>
          </div>
        </div>

        {/* Criteria Breakdown Grid */}
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {data.criteria.map((crit, idx) => (
            <div key={idx} className="rounded-xl border border-border bg-[#FAFCFF] p-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink">{crit.name}</span>
                <span className="font-mono font-bold text-xs text-[#2563EB]">{crit.score}/100</span>
              </div>
              <p className="mt-1 text-[11px] text-muted leading-relaxed">{crit.feedback}</p>
            </div>
          ))}
        </div>

        {/* Issues List if any */}
        {data.issues.length > 0 && (
          <div className="rounded-xl border border-border bg-white p-3.5">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex w-full items-center justify-between text-left font-bold text-ink"
            >
              <span>Audit Findings & Automated Fixes ({data.issues.length})</span>
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {expanded && (
              <div className="mt-2.5 space-y-1.5 border-t border-border-subtle pt-2">
                {data.issues.map((issue, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                        issue.severity === "high" ? "bg-[#FEF2F2] text-[#B91C1C]" : "bg-surface-2 text-muted"
                      }`}
                    >
                      {issue.severity}
                    </span>
                    <span className="text-[#334155]">{issue.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

