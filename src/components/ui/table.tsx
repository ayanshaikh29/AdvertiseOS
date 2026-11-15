import * as React from "react";
import { cn } from "@/lib/cn";

export function Table({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("w-full overflow-x-auto rounded-2xl border border-border bg-surface", className)}>
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({ className, children }: { className?: string; children: React.ReactNode }) {
  return <th className={cn("border-b border-border bg-[#fafbfc] px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]", className)}>{children}</th>;
}

export function Td({ className, children }: { className?: string; children: React.ReactNode }) {
  return <td className={cn("border-b border-border-subtle px-4 py-3 align-middle text-[#334155] last:border-b-0", className)}>{children}</td>;
}

export function Tr({ className, children, onClick }: { className?: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <tr onClick={onClick} className={cn("transition-colors", onClick && "cursor-pointer hover:bg-[#f8fafc]", className)}>
      {children}
    </tr>
  );
}
