import { cn } from "@/lib/cn";

export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-medium text-[#475569]", className)}>
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-2xl bg-[#eef0f4]", className)} />;
}

/** Truthful workflow states. Label + tint must always match real persisted status. */
export type WorkflowStatus =
  | "draft"
  | "running"
  | "pending_human"
  | "needs_changes"
  | "approved"
  | "rejected"
  | "scheduled"
  | "published"
  | "failed"
  | "sample";

const STATUS_MAP: Record<string, { label: string; tint: string }> = {
  draft: { label: "Draft", tint: "tint-neutral" },
  running: { label: "Running", tint: "tint-info" },
  pending_human: { label: "Ready for review", tint: "tint-warning" },
  needs_changes: { label: "Needs changes", tint: "tint-warning" },
  approved: { label: "Approved", tint: "tint-success" },
  rejected: { label: "Rejected", tint: "tint-danger" },
  scheduled: { label: "Scheduled", tint: "tint-info" },
  published: { label: "Published", tint: "tint-success" },
  failed: { label: "Failed", tint: "tint-danger" },
  sample: { label: "Sample data", tint: "tint-neutral" },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const cfg = STATUS_MAP[status] ?? { label: status, tint: "tint-neutral" };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", cfg.tint, className)}>
      {cfg.label}
    </span>
  );
}
