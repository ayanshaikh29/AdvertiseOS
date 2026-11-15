import type { CalendarItem, CeoPlan, ContentItem, DesignBrief, MetricRow, PerformanceReport, VideoPlan } from "@/lib/schemas";

/** Entity types (moved from the deleted in-memory store; shapes mirror Supabase tables 1:1). */

export type Asset = {
  id: string;
  campaignId: string;
  kind: "image";
  url: string;
  width: number;
  height: number;
  template_id: string;
  headline: string;
  topic: string;
  sample: boolean;
};

export type ValidationIssue = {
  severity: "low" | "medium" | "high" | "critical";
  code: string;
  message: string;
  field?: string;
  suggestion?: string;
};

export type Item = {
  id: string;
  topic: string;
  platform: string;
  format: string;
  scheduled_for: string;
  captions: string[];
  hashtags: string[];
  cta: string;
  ceo_score: number;
  status: "pending_human" | "approved" | "rejected" | "scheduled" | "published" | "needs_rewrite";
  design?: DesignBrief;
  image_url?: string;
  video_plan?: VideoPlan;
  validation_issues?: ValidationIssue[];
  /** Optional enriched copy fields (additive — older items simply lack them). */
  hook?: string;
  objective?: string;
  audience?: string;
  carousel_slides?: Array<{ heading: string; body: string }>;
  reel_script?: string;
  ad_copy?: { primary_text: string; headline: string; cta: string };
  /** Provenance and hierarchy metadata */
  provider?: string;
  model?: string;
  latencyMs?: number;
  costUsd?: number;
  fallback?: boolean;
  provenance?: "ai" | "template";
  why_now?: string;
  reports_to?: string;
  reviewedBy?: string;
  manager_score?: number;
  rewrite_reason?: string;
};

export type Brief = {
  brandId: string;
  month: string;
  goal: string;
  budget?: number;
  offers?: string;
  festivals?: string;
  notes?: string;
};

export type Campaign = {
  id: string;
  brandId: string;
  brief: Brief;
  /** CEO strategy plan (objectives, KPIs, tasks, risks) — shown on the campaign page. */
  plan?: CeoPlan;
  calendar: CalendarItem[];
  items: Item[];
  assets: Asset[];
  videoPlans: Array<{ itemId: string; topic: string; plan: VideoPlan }>;
  costUsd: number;
  createdAt: string;
};

export type Metric = MetricRow & { id: string };
export type Report = { id: string; created_at: string; report: PerformanceReport; totals: Record<string, number> };
export type Run = {
  agent: string;
  costUsd: number;
  latencyMs: number;
  status: string;
  created_at: string;
  model?: string;
  provider?: string;
  fallback?: boolean;
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
};
export type ChannelAccount = {
  id: string;
  provider: string;
  label: string;
  status: "connected" | "needs_attention" | "disconnected" | "unconfigured" | "sample";
  scopes: string[];
  is_sample: boolean;
  last_test_at: string | null;
  last_test_ok: boolean | null;
  last_test_message: string | null;
  last_sync_at: string | null;
  created_at?: string;
};
export type SyncJob = {
  id: string;
  channel_account_id: string | null;
  kind: string;
  status: "running" | "ok" | "failed";
  rows_synced: number;
  error: string | null;
  started_at: string;
  finished_at: string | null;
};
export type AuditEntry = { ts: string; action: string; entity: string; entity_id: string; diff: unknown };
export type Proposal = { id: string; agent: string; change: string; reason: string; status: "pending" | "accepted" | "rejected" };
export type PromptVersion = { agent: string; version: number; system: string; created_at: string };
export type Brand = {
  id: string;
  name: string;
  tone: string;
  languages: string[];
  audience: string;
  products: string;
  usp: string;
  dos: string[];
  donts: string[];
  compliance_notes: string;
};
export type Memory = { id: string; brand_id: string; kind: string; content: string; source_item_id?: string };
export type CatalogItem = {
  id: string;
  brandId: string;
  kind: "product" | "service";
  name: string;
  description: string;
  price: number | null;
  currency: string;
  tags: string[];
  features: string[];
  status: "active" | "draft" | "archived";
  source: "manual" | "connector";
  externalId: string | null;
  provider: string | null;
  created_at: string;
  updated_at: string;
};
export type Trend = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  query: string;
  fetchedAt: string;
};

export type LeadStatus = "new" | "contacted" | "qualified" | "won" | "lost";
export type Lead = {
  id: string;
  brandId: string;
  name: string;
  company?: string;
  channel: string;
  status: LeadStatus;
  value?: number;
  notes: string;
  followUpAt?: string;
  source: string;
  created_at: string;
  updated_at: string;
};

export type ApiKey = {
  id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  scopes: ("read" | "write")[];
  role: "viewer" | "editor" | "admin";
  ip_allowlist?: string[];
  created_at: string;
  last_used_at?: string;
  revoked_at?: string;
};

/** Back-compat aliases for pages (types only — the in-memory store is deleted). */
export type DemoItem = Item;
export type DemoAsset = Asset;
export type DemoCampaign = Campaign;

export function toItems(
  calendar: CalendarItem[],
  contents: ContentItem[],
  scores: number[],
  extras?: Array<{ design?: DesignBrief; image_url?: string; video_plan?: VideoPlan }>
): Item[] {
  return calendar.slice(0, contents.length).map((c, i) => ({
    id: `item-${i + 1}`,
    topic: c.topic,
    platform: c.platform,
    format: c.format,
    scheduled_for: c.date,
    captions: contents[i]?.caption_variants ?? [],
    hashtags: contents[i]?.hashtags ?? [],
    cta: contents[i]?.cta ?? "",
    ceo_score: scores[i] ?? 80,
    status: "pending_human",
    design: extras?.[i]?.design,
    image_url: extras?.[i]?.image_url,
    video_plan: extras?.[i]?.video_plan,
  }));
}

export interface Repo {
  saveCampaign(c: Campaign): Promise<void>;
  getCampaign(id: string): Promise<Campaign | undefined>;
  listCampaigns(): Promise<Array<{ id: string; brandId: string; brief: unknown; costUsd: number; createdAt: string; itemCount: number }>>;
  findItem(itemId: string): Promise<{ campaignId: string; item: Item } | null>;
  updateItem(itemId: string, patch: Partial<Item>): Promise<Item | null>;
  listItems(campaignId?: string): Promise<Item[]>;
  listAssets(q?: string): Promise<Asset[]>;
  addAsset(campaignId: string, a: Asset): Promise<void>;
  listMetrics(): Promise<Metric[]>;
  addMetrics(rows: MetricRow[]): Promise<number>;
  latestReport(): Promise<Report | undefined>;
  saveReport(r: Report): Promise<void>;
  addRun(r: Run): Promise<void>;
  listRuns(): Promise<Run[]>;
  addAudit(a: AuditEntry): Promise<void>;
  listAudit(): Promise<AuditEntry[]>;
  listProposals(): Promise<Proposal[]>;
  saveProposals(p: Proposal[]): Promise<void>;
  updateProposal(id: string, status: Proposal["status"]): Promise<Proposal | null>;
  listPromptVersions(): Promise<PromptVersion[]>;
  addPromptVersion(v: PromptVersion): Promise<void>;
  listBrands(): Promise<Brand[]>;
  getBrand(id: string): Promise<Brand | undefined>;
  saveBrand(b: Brand): Promise<void>;
  listMemory(brandId: string, kind?: string): Promise<Memory[]>;
  addMemory(m: Memory): Promise<void>;
  listChannelAccounts(): Promise<ChannelAccount[]>;
  saveChannelAccount(a: ChannelAccount): Promise<void>;
  listSyncJobs(limit?: number): Promise<SyncJob[]>;
  addSyncJob(j: SyncJob): Promise<void>;
  listCatalog(brandId?: string): Promise<CatalogItem[]>;
  getCatalogItem(id: string): Promise<CatalogItem | undefined>;
  saveCatalogItem(c: CatalogItem): Promise<void>;
  deleteCatalogItem(id: string): Promise<void>;
  listTrends(limit?: number): Promise<Trend[]>;
  saveTrends(trends: Trend[]): Promise<void>;
  listLeads(brandId?: string): Promise<Lead[]>;
  saveLead(l: Lead): Promise<void>;
  updateLead(id: string, patch: Partial<Lead>): Promise<Lead | null>;
  deleteLead(id: string): Promise<void>;
  listApiKeys(): Promise<ApiKey[]>;
  createApiKey(key: Omit<ApiKey, "id" | "created_at">): Promise<ApiKey>;
  revokeApiKey(id: string): Promise<boolean>;
  verifyApiKey(rawKey: string): Promise<ApiKey | null>;
}
