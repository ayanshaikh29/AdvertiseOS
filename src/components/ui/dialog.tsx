"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export function Dialog({ open, onOpenChange, children }: { open: boolean; onOpenChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </DialogPrimitive.Root>
  );
}

export function DialogContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(11,18,32,0.4)] backdrop-blur-[2px]" />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-2xl border border-border bg-surface p-6 shadow-[0_24px_64px_-24px_rgba(16,24,40,0.35)]",
          className
        )}
      >
        {children}
        <DialogPrimitive.Close aria-label="Close" className="absolute right-3 top-3 inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[#f1f3f7] hover:text-ink">
          <X size={18} />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogTitle({ children }: { children: React.ReactNode }) {
  return <DialogPrimitive.Title className="font-display text-lg font-bold text-ink">{children}</DialogPrimitive.Title>;
}
