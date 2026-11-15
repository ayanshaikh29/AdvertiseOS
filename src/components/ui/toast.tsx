"use client";

import * as React from "react";
import { CheckCircle2 } from "lucide-react";

type Toast = { id: number; text: string };
const listeners = new Set<(t: Toast[]) => void>();
let toasts: Toast[] = [];
let nextId = 1;

export function toast(text: string) {
  toasts = [...toasts.slice(-2), { id: nextId++, text }];
  listeners.forEach((l) => l(toasts));
  setTimeout(() => {
    toasts = toasts.slice(1);
    listeners.forEach((l) => l(toasts));
  }, 3200);
}

export function Toaster() {
  const [items, setItems] = React.useState<Toast[]>([]);
  React.useEffect(() => {
    listeners.add(setItems);
    return () => {
      listeners.delete(setItems);
    };
  }, []);
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-20 left-1/2 z-[70] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 md:bottom-6">
      {items.map((t) => (
        <div key={t.id} className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-ink shadow-[0_16px_40px_-20px_rgba(16,24,40,0.4)]">
          <CheckCircle2 size={16} className="shrink-0 text-[#10B981]" aria-hidden /> {t.text}
        </div>
      ))}
    </div>
  );
}
