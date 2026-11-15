import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { createHash, randomUUID, timingSafeEqual } from "crypto";
import type { ApiKey, Asset, AuditEntry, Brand, Campaign, CatalogItem, ChannelAccount, Item, Lead, Memory, Metric, PromptVersion, Proposal, Repo, Report, Run, SyncJob, Trend } from "@/lib/db/repo";
import type { MetricRow } from "@/lib/schemas";
import { SAMPLE_BRAND } from "@/lib/brand";

const IS_SERVERLESS = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  process.env.NODE_ENV === "production"
);

const DATA_DIR = IS_SERVERLESS ? tmpdir() : join(process.cwd(), "data");
const FILE = join(DATA_DIR, "advertiseos.json");

type DB = {
  campaigns: Record<string, Campaign>;
  metrics: Metric[];
  reports: Report[];
  runs: Run[];
  audit: AuditEntry[];
  proposals: Proposal[];
  promptVersions: PromptVersion[];
  brands: Record<string, Brand>;
  memory: Memory[];
  channelAccounts: ChannelAccount[];
  syncJobs: SyncJob[];
  catalog: Record<string, CatalogItem>;
  trends: Trend[];
  leads: Record<string, Lead>;
  apiKeys: Record<string, ApiKey>;
};

function blank(): DB {
  return {
    campaigns: {},
    metrics: [],
    reports: [],
    runs: [],
    audit: [],
    proposals: [],
    promptVersions: [],
    brands: {
      [SAMPLE_BRAND.id]: {
        ...SAMPLE_BRAND,
      },
    },
    memory: [],
    channelAccounts: [],
    syncJobs: [],
    catalog: {},
    trends: [],
    leads: {},
    apiKeys: {},
  };
}

let memDB: DB | null = null;

function load(): DB {
  if (memDB) {
    if (!memDB.brands || Object.keys(memDB.brands).length === 0) {
      memDB.brands = { [SAMPLE_BRAND.id]: { ...SAMPLE_BRAND } };
    }
    return memDB;
  }
  try {
    if (!existsSync(FILE)) {
      memDB = blank();
      return memDB;
    }
    const parsed = JSON.parse(readFileSync(FILE, "utf8"));
    const db: DB = { ...blank(), ...parsed };
    if (!db.brands || Object.keys(db.brands).length === 0) {
      db.brands = { [SAMPLE_BRAND.id]: { ...SAMPLE_BRAND } };
    }
    memDB = db;
    return memDB;
  } catch {
    memDB = blank();
    return memDB;
  }
}

function save(db: DB) {
  memDB = db;
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(FILE, JSON.stringify(db));
  } catch {
    // In serverless / read-only or concurrent execution, memDB guarantees state consistency
  }
}

/**
 * File-backed repo for local dev (survives restart; single-node only).
 * Production uses SupabaseRepo. Never commit data/advertiseos.json.
 */
class FileRepo implements Repo {
  private read(): DB {
    return load();
  }
  private write(db: DB) {
    save(db);
  }

  async saveCampaign(c: Campaign) {
    const db = this.read();
    db.campaigns[c.id] = c;
    this.write(db);
  }
  async getCampaign(id: string) {
    return this.read().campaigns[id];
  }
  async listCampaigns() {
    return Object.values(this.read().campaigns).map((c) => ({
      id: c.id,
      brandId: c.brandId,
      brief: c.brief,
      costUsd: c.costUsd,
      createdAt: c.createdAt,
      itemCount: c.items.length,
    }));
  }
  async findItem(itemId: string) {
    for (const [campaignId, c] of Object.entries(this.read().campaigns)) {
      const item = c.items.find((i) => i.id === itemId);
      if (item) return { campaignId, item };
    }
    return null;
  }
  async updateItem(itemId: string, patch: Partial<Item>) {
    const db = this.read();
    for (const c of Object.values(db.campaigns)) {
      const item = c.items.find((i) => i.id === itemId);
      if (item) {
        Object.assign(item, patch);
        this.write(db);
        return item;
      }
    }
    return null;
  }
  async listItems(campaignId?: string) {
    const db = this.read();
    if (campaignId) return db.campaigns[campaignId]?.items ?? [];
    return Object.values(db.campaigns).flatMap((c) => c.items);
  }
  async listAssets(q?: string) {
    const all = Object.values(this.read().campaigns).flatMap((c) => c.assets);
    const needle = (q ?? "").toLowerCase();
    return needle ? all.filter((a) => `${a.headline} ${a.topic} ${a.template_id}`.toLowerCase().includes(needle)) : all;
  }
  async addAsset(campaignId: string, a: Asset) {
    const db = this.read();
    db.campaigns[campaignId]?.assets.push(a);
    this.write(db);
  }
  async listMetrics() {
    return this.read().metrics;
  }
  async addMetrics(rows: MetricRow[]) {
    const db = this.read();
    const added = rows.map((r) => ({ ...r, id: `m-${Date.now()}-${Math.floor(Math.random() * 1e6)}` }));
    db.metrics.push(...added);
    this.write(db);
    return added.length;
  }
  async latestReport() {
    const r = this.read().reports;
    return r[r.length - 1];
  }
  async saveReport(r: Report) {
    const db = this.read();
    db.reports.push(r);
    this.write(db);
  }
  async addRun(r: Run) {
    const db = this.read();
    db.runs.push(r);
    this.write(db);
  }
  async listRuns() {
    return this.read().runs;
  }
  async addAudit(a: AuditEntry) {
    const db = this.read();
    db.audit.unshift(a);
    db.audit.length = Math.min(db.audit.length, 200);
    this.write(db);
  }
  async listAudit() {
    return this.read().audit.slice(0, 50);
  }
  async listProposals() {
    return this.read().proposals;
  }
  async saveProposals(p: Proposal[]) {
    const db = this.read();
    db.proposals.push(...p);
    this.write(db);
  }
  async updateProposal(id: string, status: Proposal["status"]) {
    const db = this.read();
    const p = db.proposals.find((x) => x.id === id);
    if (!p) return null;
    p.status = status;
    this.write(db);
    return p;
  }
  async listPromptVersions() {
    return this.read().promptVersions;
  }
  async addPromptVersion(v: PromptVersion) {
    const db = this.read();
    db.promptVersions.push(v);
    this.write(db);
  }
  async listBrands() {
    const brands = Object.values(this.read().brands);
    if (brands.length === 0) {
      return [SAMPLE_BRAND as Brand];
    }
    return brands;
  }
  async getBrand(id: string) {
    const brand = this.read().brands[id];
    if (!brand && (id === SAMPLE_BRAND.id || id === "sample-brand")) {
      return SAMPLE_BRAND as Brand;
    }
    return brand;
  }
  async saveBrand(b: Brand) {
    const db = this.read();
    db.brands[b.id] = b;
    this.write(db);
  }
  async listMemory(brandId: string, kind?: string) {
    return this.read().memory.filter((m) => m.brand_id === brandId && (!kind || m.kind === kind)).slice(-20);
  }
  async addMemory(m: Memory) {
    const db = this.read();
    db.memory.push(m);
    this.write(db);
  }
  async listChannelAccounts(): Promise<ChannelAccount[]> {
    return this.read().channelAccounts;
  }
  async saveChannelAccount(a: ChannelAccount) {
    const db = this.read();
    const i = db.channelAccounts.findIndex((x) => x.id === a.id);
    if (i >= 0) db.channelAccounts[i] = a;
    else db.channelAccounts.push(a);
    this.write(db);
  }
  async listSyncJobs(limit = 50): Promise<SyncJob[]> {
    return this.read().syncJobs.slice(-limit).reverse();
  }
  async addSyncJob(j: SyncJob) {
    const db = this.read();
    db.syncJobs.push(j);
    if (db.syncJobs.length > 200) db.syncJobs = db.syncJobs.slice(-200);
    this.write(db);
  }
  async listCatalog(brandId?: string): Promise<CatalogItem[]> {
    const all = Object.values(this.read().catalog);
    return (brandId ? all.filter((c) => c.brandId === brandId) : all).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  async getCatalogItem(id: string): Promise<CatalogItem | undefined> {
    return this.read().catalog[id];
  }
  async saveCatalogItem(c: CatalogItem) {
    const db = this.read();
    db.catalog[c.id] = c;
    this.write(db);
  }
  async deleteCatalogItem(id: string) {
    const db = this.read();
    delete db.catalog[id];
    this.write(db);
  }
  async listTrends(limit = 50): Promise<Trend[]> {
    const byUrl = new Map<string, Trend>();
    for (const t of this.read().trends) byUrl.set(t.url, t);
    return [...byUrl.values()].slice(0, limit);
  }
  async saveTrends(trends: Trend[]) {
    const db = this.read();
    // Dedupe by url (canonical identity), not id â€” legacy rows may share ids.
    const byUrl = new Map<string, Trend>();
    for (const t of [...db.trends, ...trends]) byUrl.set(t.url, t);
    db.trends = [...byUrl.values()]
      .sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt))
      .slice(0, 100);
    this.write(db);
  }
  async listLeads(brandId?: string): Promise<Lead[]> {
    const all = Object.values(this.read().leads);
    return (brandId ? all.filter((l) => l.brandId === brandId) : all).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  async saveLead(l: Lead) {
    const db = this.read();
    db.leads[l.id] = l;
    this.write(db);
  }
  async updateLead(id: string, patch: Partial<Lead>) {
    const db = this.read();
    const existing = db.leads[id];
    if (!existing) return null;
    const merged = { ...existing, ...patch, id, updated_at: new Date().toISOString() };
    db.leads[id] = merged;
    this.write(db);
    return merged;
  }
  async deleteLead(id: string) {
    const db = this.read();
    delete db.leads[id];
    this.write(db);
  }

  async listApiKeys(): Promise<ApiKey[]> {
    return Object.values(this.read().apiKeys || {});
  }

  async createApiKey(key: Omit<ApiKey, "id" | "created_at">): Promise<ApiKey> {
    const db = this.read();
    if (!db.apiKeys) db.apiKeys = {};
    const id = `key-${randomUUID()}`;
    const newKey: ApiKey = {
      ...key,
      id,
      created_at: new Date().toISOString(),
    };
    db.apiKeys[id] = newKey;
    this.write(db);
    return newKey;
  }

  async revokeApiKey(id: string): Promise<boolean> {
    const db = this.read();
    if (!db.apiKeys || !db.apiKeys[id]) return false;
    db.apiKeys[id].revoked_at = new Date().toISOString();
    this.write(db);
    return true;
  }

  async verifyApiKey(rawKey: string): Promise<ApiKey | null> {
    if (!rawKey || typeof rawKey !== "string") return null;
    const db = this.read();
    const rawHash = createHash("sha256").update(rawKey).digest("hex");
    const rawBuffer = Buffer.from(rawHash, "hex");

    for (const key of Object.values(db.apiKeys || {})) {
      if (key.revoked_at) continue;
      if (!key.key_hash) continue;
      try {
        const storedBuffer = Buffer.from(key.key_hash, "hex");
        if (storedBuffer.length === rawBuffer.length && timingSafeEqual(storedBuffer, rawBuffer)) {
          key.last_used_at = new Date().toISOString();
          this.write(db);
          return key;
        }
      } catch {
        continue;
      }
    }
    return null;
  }
}

let fileRepo: FileRepo | null = null;

export async function getRepo(): Promise<Repo> {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { SupabaseRepo } = await import("@/lib/db/supabaseRepo");
      return new SupabaseRepo();
    } catch (err) {
      console.warn("[REPO] Falling back to FileRepo due to Supabase initialization issue:", err);
    }
  }
  if (!fileRepo) fileRepo = new FileRepo();
  return fileRepo;
}

/** Fire-and-forget audit that never breaks the request. */
export async function audit(action: string, entity: string, entity_id: string, diff: unknown = {}) {
  try {
    await (await getRepo()).addAudit({ ts: new Date().toISOString(), action, entity, entity_id, diff });
  } catch {
    /* audit must never fail the request */
  }
}
