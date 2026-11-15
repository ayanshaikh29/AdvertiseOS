"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, KeyRound, Gauge, ScrollText, Plus, Copy, Check, ShieldAlert, Bot } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/badge";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/motion";

type Status = {
  llm: { mode: string; provider: string; model: string };
  supabase: boolean;
  metaPublish: boolean;
  fakeConnectors: boolean;
  autopilot?: boolean;
  voice?: boolean;
  costLimitUsd?: number;
  catalogItems?: number;
  trendsFetchedAt?: string | null;
  secrets: { connectorTokens: boolean; cronSecret?: boolean };
};

type AuditEntry = { ts: string; action: string; entity: string; entity_id: string };

type ApiKeyItem = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: ("read" | "write")[];
  role: string;
  created_at: string;
  last_used_at?: string;
  revoked_at?: string;
};

export default function SettingsPage() {
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [cost, setCost] = useState(0);
  const [status, setStatus] = useState<Status | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New API key modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [readScope, setReadScope] = useState(true);
  const [writeScope, setWriteScope] = useState(false);
  const [keyRole, setKeyRole] = useState<"viewer" | "editor" | "admin">("viewer");
  const [creatingKey, setCreatingKey] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [auditRes, statusRes, scoresRes, keysRes] = await Promise.all([
        fetch("/api/audit"),
        fetch("/api/status"),
        fetch("/api/team/scores"),
        fetch("/api/keys"),
      ]);
      if (!statusRes.ok) throw new Error(`HTTP ${statusRes.status}`);
      const [auditData, statusData, scoresData, keysData] = await Promise.all([
        auditRes.ok ? auditRes.json() : { audit: [] },
        statusRes.json(),
        scoresRes.ok ? scoresRes.json() : { agents: [] },
        keysRes.ok ? keysRes.json() : { keys: [] },
      ]);
      setAudit(auditData.audit ?? []);
      setStatus(statusData);
      setCost((scoresData.agents ?? []).reduce((s: number, a: { total_cost_usd: number }) => s + a.total_cost_usd, 0));
      setApiKeys(keysData.keys ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;
    setCreatingKey(true);
    try {
      const scopes: ("read" | "write")[] = [];
      if (readScope) scopes.push("read");
      if (writeScope) scopes.push("write");

      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName.trim(), scopes, role: keyRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create key");

      setNewlyCreatedKey(data.rawKey);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error creating key");
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this API key? Applications using it will immediately lose access.")) {
      return;
    }
    try {
      const res = await fetch(`/api/keys?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke key");
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error revoking key");
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  /** Cost limit comes from the server (/api/status) — never a client env var. */
  const limit = status?.costLimitUsd ?? 50;
  const pct = limit > 0 ? Math.min(100, Math.round((cost / limit) * 100)) : 0;

  if (loading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-32" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <p className="font-medium text-[#B91C1C]">Couldn’t load settings: {error}</p>
        <button className="btn-primary mt-4" onClick={load}>
          <RefreshCw size={15} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <FadeIn>
        <div className="card p-6 sm:p-8">
          <PageHeader
            title="Settings & controls"
            description="Runtime flags, spend limits, Hermes Agent MCP integrations, and the audit trail — status only, secrets are never displayed."
          />
        </div>
      </FadeIn>

      <div className="grid gap-4 sm:grid-cols-2">
        <FadeIn delay={0.05}>
          <div className="card h-full p-6">
            <p className="eyebrow flex items-center gap-1.5">
              <Gauge size={13} /> Agent spend
            </p>
            <p className="font-display mt-2 text-2xl font-bold text-ink">
              ${cost.toFixed(4)} <span className="text-base font-semibold text-muted">/ ${limit}</span>
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div
                className={`h-full rounded-full transition-all ${pct >= 90 ? "bg-[#EF4444]" : "bg-[#2563EB]"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-muted">
              Hard monthly limit enforced server-side ({pct}% used); runs stop gracefully with a clear message.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.08}>
          <div className="card h-full p-6">
            <p className="eyebrow flex items-center gap-1.5">
              <KeyRound size={13} /> Runtime status
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-[#334155]">
              <li>LLM: {status ? `${status.llm.mode === "gemini" ? "Gemini" : "Sample data (offline)"} — ${status.llm.model}` : "…"}</li>
              <li>Supabase: {status ? (status.supabase ? "connected" : "not connected (file store)") : "…"}</li>
              <li>Meta publish: {status?.metaPublish ? "enabled" : "disabled behind feature flag"}</li>
              <li>Sample connectors: {status ? (status.fakeConnectors ? "enabled (labeled sample data)" : "disabled") : "…"}</li>
              <li>Autopilot: {status ? (status.autopilot === false ? "disabled (FEATURE_AUTOPILOT=false)" : "enabled — approvals stay human") : "…"}</li>
              <li>Voice assistant: {status?.voice === false ? "unavailable" : "available (/voice, read-only)"}</li>
              <li>Catalog items: {status ? String(status.catalogItems ?? 0) : "…"}</li>
              <li>Trend Radar: {status ? (status.trendsFetchedAt ? `last fetch ${new Date(status.trendsFetchedAt).toLocaleString()}` : "no fetch yet") : "…"}</li>
              <li>External cron: {status ? (status.secrets.cronSecret ? "CRON_SECRET set" : "not set") : "…"}</li>
              <li>Connector token encryption: {status ? (status.secrets.connectorTokens ? "key set" : "CONNECTOR_TOKEN_KEY not set") : "…"}</li>
            </ul>
          </div>
        </FadeIn>
      </div>

      {/* Hermes Agent & MCP Integration Card */}
      <FadeIn delay={0.09}>
        <div className="card p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow flex items-center gap-1.5 text-blue-600">
                <Bot size={13} /> Hermes Agent & MCP Integration
              </p>
              <h3 className="mt-1 text-lg font-semibold text-ink">API Keys & MCP Access</h3>
              <p className="mt-1 text-sm text-muted">
                Hermes Agent connects via Streamable HTTP at <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">/api/mcp</code>. API keys are hashed with SHA-256 and constant-time compared.
              </p>
            </div>
            <button
              onClick={() => {
                setShowCreateModal(true);
                setNewlyCreatedKey(null);
                setKeyName("");
                setReadScope(true);
                setWriteScope(false);
              }}
              className="btn-primary inline-flex items-center gap-1.5"
            >
              <Plus size={15} /> Generate API key
            </button>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Key Prefix</th>
                  <th className="py-2.5 px-3">Scopes</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Created</th>
                  <th className="py-2.5 px-3">Last Used</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {apiKeys.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-500">
                      No API keys generated yet. Create one to connect Hermes Agent.
                    </td>
                  </tr>
                ) : (
                  apiKeys.map((k) => (
                    <tr key={k.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-medium text-slate-900">{k.name}</td>
                      <td className="py-3 px-3 font-mono text-xs text-slate-600">{k.key_prefix}</td>
                      <td className="py-3 px-3">
                        <div className="flex gap-1">
                          {k.scopes.map((s) => (
                            <span
                              key={s}
                              className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                                s === "write" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 capitalize text-slate-600">{k.role}</td>
                      <td className="py-3 px-3 text-xs text-slate-500">{new Date(k.created_at).toLocaleDateString()}</td>
                      <td className="py-3 px-3 text-xs text-slate-500">
                        {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "Never"}
                      </td>
                      <td className="py-3 px-3">
                        {k.revoked_at ? (
                          <span className="inline-flex items-center rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            Revoked
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {!k.revoked_at && (
                          <button
                            onClick={() => handleRevokeKey(k.id)}
                            className="text-xs font-medium text-red-600 hover:text-red-700"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </FadeIn>

      {/* Create Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            {!newlyCreatedKey ? (
              <form onSubmit={handleCreateKey}>
                <h3 className="text-lg font-bold text-slate-900">Generate New API Key</h3>
                <p className="mt-1 text-xs text-slate-500">
                  This key allows Hermes Agent or external tools to communicate with AdvertiseOS via MCP.
                </p>

                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Key Name / Description
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Hermes Agent VPS, Telegram Bot"
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                      required
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Permissions (Scopes)
                    </label>
                    <div className="mt-2 space-y-2 text-sm">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={readScope}
                          onChange={(e) => setReadScope(e.target.checked)}
                          className="rounded text-blue-600"
                        />
                        <span><strong className="text-slate-800">read</strong> — plans, metrics, leads, pending approvals, integrations</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={writeScope}
                          onChange={(e) => setWriteScope(e.target.checked)}
                          className="rounded text-amber-600"
                        />
                        <span><strong className="text-slate-800">write</strong> — create drafts, two-step approvals, request changes</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Role Capability
                    </label>
                    <select
                      value={keyRole}
                      onChange={(e) => setKeyRole(e.target.value as "viewer" | "editor" | "admin")}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingKey || (!readScope && !writeScope)}
                    className="btn-primary"
                  >
                    {creatingKey ? "Generating…" : "Generate Key"}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div className="flex items-center gap-2 text-amber-600 font-semibold">
                  <ShieldAlert size={20} />
                  <span>Save Your Key Now</span>
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  This secret key will <strong>never be shown again</strong>. Please copy and paste it into your Hermes Agent configuration.
                </p>

                <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-900 p-3 text-slate-100 font-mono text-xs break-all">
                  <span>{newlyCreatedKey}</span>
                  <button
                    onClick={() => copyToClipboard(newlyCreatedKey)}
                    className="ml-auto flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
                  >
                    {copiedKey ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    {copiedKey ? "Copied" : "Copy"}
                  </button>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewlyCreatedKey(null);
                    }}
                    className="btn-primary"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <FadeIn delay={0.1}>
        <div className="card p-6 sm:p-8">
          <p className="eyebrow flex items-center gap-1.5">
            <ScrollText size={13} /> Audit log
          </p>
          {audit.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No audited actions yet.</p>
          ) : (
            <Stagger className="mt-3 grid gap-1 text-sm" stagger={0.02}>
              {audit
                .slice()
                .reverse()
                .slice(0, 40)
                .map((a, i) => (
                  <StaggerItem key={`${a.ts}-${i}`}>
                    <p className="flex flex-wrap gap-2 rounded-lg px-2 py-1.5 odd:bg-[#fafbfc]">
                      <span className="font-mono text-xs text-muted">{a.ts}</span>
                      <span className="font-medium text-ink">{a.action}</span>
                      <span className="text-muted">
                        {a.entity}/{a.entity_id}
                      </span>
                    </p>
                  </StaggerItem>
                ))}
            </Stagger>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
