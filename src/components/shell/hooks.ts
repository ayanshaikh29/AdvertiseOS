"use client";

import { useQuery } from "@tanstack/react-query";

export type BrandOption = { id: string; name: string };

/** Shared brand list (Topbar client selector + pages). */
export function useBrands() {
  return useQuery({
    queryKey: ["brands"],
    queryFn: async (): Promise<BrandOption[]> => {
      const r = await fetch("/api/brands");
      const d = await r.json().catch(() => ({}));
      return (d.brands ?? []) as BrandOption[];
    },
    staleTime: 60_000,
  });
}

/** Shared pending-approval count — single fetch used by bell + sidebar badge. */
export function usePendingApprovals() {
  return useQuery({
    queryKey: ["approvals", "pending"],
    queryFn: async (): Promise<number> => {
      const r = await fetch("/api/approvals");
      const d = await r.json().catch(() => ({}));
      return ((d.items ?? []) as Array<{ status: string }>).filter((i) => i.status === "pending_human").length;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

/** Real AI cost total from persisted agent runs (sidebar guardrail). */
export function useAiCost(limitUsd = 50) {
  const q = useQuery({
    queryKey: ["ai-cost"],
    queryFn: async (): Promise<number> => {
      const r = await fetch("/api/team/scores");
      const d = await r.json().catch(() => ({}));
      return ((d.agents ?? []) as Array<{ total_cost_usd: number }>).reduce((s, a) => s + (a.total_cost_usd || 0), 0);
    },
    staleTime: 120_000,
  });
  const cost = q.data ?? 0;
  return { cost, limit: limitUsd, pct: Math.min(1, cost / limitUsd), isLoading: q.isLoading };
}

/** Active client/workspace id, persisted in localStorage and broadcast on change. */
export function getActiveBrandId(brands: BrandOption[]): string {
  if (typeof window === "undefined") return brands[0]?.id || "";
  return localStorage.getItem("advos-brand") || brands[0]?.id || "";
}

export function setActiveBrandId(id: string) {
  localStorage.setItem("advos-brand", id);
  window.dispatchEvent(new CustomEvent("brand-switched", { detail: { brandId: id } }));
}
