"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Plus, ArrowRight, ShieldCheck, Megaphone, Users, Trash2, Edit3 } from "lucide-react";
import type { Brand } from "@/lib/db/repo";
import { toast } from "@/components/ui/toast";

export default function ClientsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState<string>("");

  useEffect(() => {
    fetch("/api/brands")
      .then((r) => r.json())
      .then((d) => {
        setBrands(d.brands || []);
        const saved = localStorage.getItem("advos-brand") || d.brands?.[0]?.id || "";
        setSelectedBrand(saved);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const switchActiveClient = (id: string, name: string) => {
    setSelectedBrand(id);
    localStorage.setItem("advos-brand", id);
    toast(`Active workspace switched to "${name}"`);
  };

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-center justify-between gap-4 p-6 sm:p-8">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <Building2 size={14} className="text-[#2563EB]" /> Client Workspaces
          </p>
          <h1 className="font-display mt-2 text-3xl font-bold">
            Isolated <em className="text-[#2563EB]">Client Accounts</em>
          </h1>
          <p className="mt-1 text-sm text-muted">
            Each client holds isolated brand guidelines, catalog products, campaigns, approvals, and AI chat context.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/brand" className="btn-primary">
            <Plus size={16} /> New Client Workspace
          </Link>
        </div>
      </div>

      {/* Grid of Client Workspaces */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {brands.map((b) => {
          const isActive = selectedBrand === b.id;
          return (
            <div
              key={b.id}
              className={`rounded-2xl border p-5 transition-all ${
                isActive
                  ? "border-[#2563EB] bg-brand-soft shadow-xl shadow-blue-100 ring-1 ring-[#2563EB]/30"
                  : "border-border bg-white hover:border-[#bfdbfe]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-[#2563EB] font-bold">
                  {b.name.charAt(0)}
                </div>
                {isActive ? (
                  <span className="flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-[#2563EB] border border-[#bfdbfe]">
                    <ShieldCheck size={12} /> Active Workspace
                  </span>
                ) : (
                  <button
                    onClick={() => switchActiveClient(b.id, b.name)}
                    className="rounded-lg border border-border bg-white px-2.5 py-1 text-xs text-[#475569] hover:bg-surface-hover"
                  >
                    Set Active
                  </button>
                )}
              </div>

              <h3 className="mt-3 font-display text-lg font-bold text-ink">{b.name}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-muted">
                {b.usp || "Dedicated digital marketing campaign strategy workspace."}
              </p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-gray-300 font-medium">
                  Tone: {b.tone}
                </span>
                <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-gray-300 font-medium">
                  {b.languages?.join(", ") || "English"}
                </span>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-border-subtle pt-3">
                <Link
                  href="/dashboard"
                  onClick={() => switchActiveClient(b.id, b.name)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:text-blue-300"
                >
                  <span>Open AI Chat</span>
                  <ArrowRight size={13} />
                </Link>
                <Link
                  href="/brand"
                  className="text-xs text-muted hover:text-ink"
                >
                  Edit Guidelines
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
