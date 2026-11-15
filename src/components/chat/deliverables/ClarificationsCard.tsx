import React, { useState } from "react";
import type { DeliverableClarifications } from "@/types/chat";
import { HelpCircle, Copy, Check, ArrowRight, Info } from "lucide-react";

export function ClarificationsCard({ data }: { data: DeliverableClarifications }) {
  const [copied, setCopied] = useState(false);

  const copyAll = () => {
    const text =
      data.questions.map((q, i) => `${i + 1}. ${q.question}`).join("\n") +
      (data.optionalFollowUps.length ? `\n\nOptional:\n${data.optionalFollowUps.map((q) => `- ${q}`).join("\n")}` : "");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-[#fde68a] bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#fde68a] bg-[#fffbeb] px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fef3c7] text-[#B45309]">
            <HelpCircle size={20} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-sm font-bold text-ink">Verified details needed</h3>
              <span className="tint-warning rounded-full px-2 py-0.5 text-[10px] font-semibold">Facts first — nothing invented</span>
            </div>
            <p className="text-xs text-muted">
              {data.questions.filter((q) => q.blocking).length} blocking · answer these to unblock the team
            </p>
          </div>
        </div>

        <button onClick={copyAll} className="flex items-center gap-1.5 rounded-xl border border-[#fde68a] bg-white px-3 py-1.5 text-xs font-medium text-[#92400E] transition hover:bg-[#fffbeb]">
          {copied ? <Check size={13} className="text-[#10B981]" /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy questions"}
        </button>
      </div>

      <div className="space-y-2.5 p-5">
        {data.questions.map((q, i) => (
          <div
            key={i}
            className={`rounded-xl border p-3.5 transition ${q.blocking ? "border-[#fde68a] bg-[#fffbeb] hover:border-[#fcd34d]" : "border-border bg-[#fafbfc]"}`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  q.blocking ? "bg-[#fde68a] text-[#92400E]" : "bg-surface-2 text-muted"
                }`}
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-relaxed text-ink">{q.question}</p>
                <span className="mt-1 inline-block rounded bg-surface-2 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted">
                  {q.fact.replace(/_/g, " ")}
                  {q.blocking ? " · required" : " · optional"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {data.optionalFollowUps.length > 0 && (
        <div className="mx-5 mb-4 rounded-xl border border-border bg-[#fafbfc] p-3.5">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted">
            <Info size={13} /> Optional (improves quality)
          </div>
          <ul className="mt-2 space-y-1 text-xs text-[#475569]">
            {data.optionalFollowUps.map((q, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[#F59E0B]">·</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.canProceedWithDraft && (
        <div className="mx-5 mb-5 flex items-start gap-2.5 rounded-xl border border-[#bfdbfe] bg-brand-soft px-3.5 py-2.5 text-xs text-[#1E40AF]">
          <ArrowRight size={14} className="mt-0.5 shrink-0 text-[#2563EB]" />
          <p className="leading-relaxed">{data.proceedNote}</p>
        </div>
      )}
    </div>
  );
}
