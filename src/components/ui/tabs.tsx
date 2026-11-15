"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export function Tabs({
  tabs,
  active,
  onChange,
  className,
  size = "md",
}: {
  tabs: Array<{ id: string; label: React.ReactNode; count?: number }>;
  active: string;
  onChange: (id: string) => void;
  className?: string;
  size?: "md" | "sm";
}) {
  return (
    <div role="tablist" className={cn("inline-flex items-center gap-1 rounded-xl border border-border bg-surface-2 p-1", className)}>
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={cn(
              "rounded-lg font-semibold transition-colors",
              size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
              isActive ? "bg-surface text-ink shadow-[0_1px_2px_rgba(16,24,40,0.08)]" : "text-[#64748B] hover:text-ink"
            )}
          >
            {t.label}
            {typeof t.count === "number" ? <span className={cn("ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]", isActive ? "bg-brand-soft text-[#1D4ED8]" : "bg-[#eef0f4] text-[#64748B]")}>{t.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
