import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash, randomUUID, timingSafeEqual } from "crypto";
import type { ApiKey, Asset, AuditEntry, Brand, Campaign, CatalogItem, ChannelAccount, Item, Lead, Memory, Metric, PromptVersion, Proposal, Repo, Report, Run, SyncJob, Trend } from "@/lib/db/repo";
import type { MetricRow } from "@/lib/schemas";

/**
 * Supabase-backed repo (production). Active when NEXT_PUBLIC_SUPABASE_URL +
 * SUPABASE_SERVICE_ROLE_KEY are set. Table shapes mirror migration 0001/0002.
 */
export class SupabaseRepo implements Repo {
  private sb: SupabaseClient;
  private orgId: string | null = null;

  constructor() {
    this.sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");
  }

  private async org(): Promise<string> {
    if (!this.orgId) {
      const { data } = await this.sb.from("orgs").select("id").limit(1).maybeSingle();
      if (data?.id) {
        this.orgId = data.id as string;
      } else {
        this.orgId = "org-default";
        await this.sb.from("orgs").upsert({ id: this.orgId, name: "Default workspace" });
      }
    }
    return this.orgId as string;
  }

  private async itemRows(campaignId: string): Promise<Item[]> {
    const { data } = await this.sb.from("content_items").select("*").eq("campaign_id", campaignId);
    return (data ?? []).map((r) => ({
      id: r.id as string,
      topic: (r.copy as { topic?: string })?.topic ?? "",
      platform: r.platform as string,
      format: (r.copy as { format?: string })?.format ?? (r.type as string),
      scheduled_for: (r.scheduled_for as string) ?? "",
      captions: (r.copy as { captions?: string[] })?.captions ?? [],
      hashtags: (r.copy as { hashtags?: string[] })?.hashtags ?? [],
      cta: (r.copy as { cta?: string })?.cta ?? "",
      ceo_score: (r.ceo_score as number) ?? 0,
      status: r.status as Item["status"],
      design: (r.copy as { design?: Item["design"] })?.design,
      image_url: (r.copy as { image_url?: string })?.image_url,
      video_plan: (r.video_plan as Item["video_plan"]) ?? undefined,
      sample: true as const,
    }));
  }

  private async assetRows(campaignId?: string): Promise<Asset[]> {
    let q = this.sb.from("assets").select("*");
    if (campaignId) q = q.eq("meta->>campaignId", campaignId);
    const { data } = await q;
    return (data ?? []).map((r) => {
      const meta = (r.meta ?? {}) as Record<string, string | number>;
      return {
        id: r.id as string,
        campaignId: String(meta.campaignId ?? ""),
        kind: "image" as const,
        url: r.url as string,
        width: Number(meta.width ?? 1080),
        height: Number(meta.height ?? 1080),
        template_id: String(meta.template_id ?? "bold-center"),
        headline: String(meta.headline ?? ""),
        topic: String(meta.topic ?? ""),
        sample: true as const,
      };
    });
  }

  async saveCampaign(c: Campaign) {
    const orgId = await this.org();
    await this.sb.from("brands").upsert({ id: c.brandId, org_id: orgId, name: c.brandId });
    const brief = (c.brief ?? {}) as Record<string, string | number>;
    await this.sb.from("briefs").upsert({
      id: `brief-${c.id}`,
      brand_id: c.brandId,
      month: String(brief.month ?? ""),
      goal: String(brief.goal ?? ""),
      budget: Number(brief.budget ?? 0),
      offers: String(brief.offers ?? ""),
      status: "done",
    });
    await this.sb.from("campaigns").upsert({
      id: c.id,
      brief_id: `brief-${c.id}`,
      status: "done",
      plan: { calendar: c.calendar, videoPlans: c.videoPlans, brief: c.brief, strategy: c.plan ?? null },
      cost_usd: c.costUsd,
    });
    for (const i of c.items) {
      await this.sb.from("content_items").upsert({
        id: `${c.id}__${i.id}`,
        campaign_id: c.id,
        type: i.format,
        platform: i.platform,
        scheduled_for: i.scheduled_for || null,
        copy: { topic: i.topic, format: i.format, captions: i.captions, hashtags: i.hashtags, cta: i.cta, design: i.design, image_url: i.image_url },
        video_plan: i.video_plan ?? null,
        ceo_score: i.ceo_score,
        status: i.status,
      });
    }
    for (const a of c.assets) {
      await this.sb.from("assets").upsert({
        id: a.id,
        brand_id: c.brandId,
        type: "image",
        url: a.url,
        meta: { campaignId: c.id, width: a.width, height: a.height, template_id: a.template_id, headline: a.headline, topic: a.topic },
      });
    }
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    const { data } = await this.sb.from("campaigns").select("*").eq("id", id).maybeSingle();
    if (!data) return undefined;
    const plan = (data.plan ?? {}) as { calendar?: Campaign["calendar"]; videoPlans?: Campaign["videoPlans"]; brief?: Campaign["brief"]; strategy?: Campaign["plan"] };
    const items = await this.itemRows(id);
    const assets = await this.assetRows(id);
    const { data: brief } = await this.sb.from("briefs").select("brand_id,goal,month,budget,offers,festivals,notes").eq("id", `brief-${id}`).maybeSingle();
    return {
      id: data.id as string,
      brandId: (brief?.brand_id as string) ?? "sample-brand",
      brief: plan.brief ?? { brandId: (brief?.brand_id as string) ?? "sample-brand", goal: "", month: "" },
      plan: plan.strategy ?? undefined,
      calendar: plan.calendar ?? [],
      items,
      assets,
      videoPlans: plan.videoPlans ?? [],
      costUsd: Number(data.cost_usd ?? 0),
      createdAt: (data.created_at as string) ?? new Date().toISOString(),
    };
  }

  async listCampaigns() {
    const { data } = await this.sb.from("campaigns").select("id,cost_usd,created_at,plan").order("created_at", { ascending: false });
    return Promise.all(
      (data ?? []).map(async (c) => {
        const items = await this.itemRows(c.id as string);
        const { data: brief } = await this.sb.from("briefs").select("brand_id,goal,month,budget,offers,festivals,notes").eq("id", `brief-${c.id}`).maybeSingle();
        return {
          id: c.id as string,
          brandId: (brief?.brand_id as string) ?? "sample-brand",
          brief: (c.plan as { brief?: Campaign["brief"] })?.brief ?? { brandId: (brief?.brand_id as string) ?? "sample-brand", goal: "", month: "" },
          costUsd: Number(c.cost_usd ?? 0),
          createdAt: (c.created_at as string) ?? "",
          itemCount: items.length,
        };
      })
    );
  }

  async findItem(itemId: string) {
    const camps = await this.listCampaigns();
    for (const c of camps) {
      const items = await this.itemRows(c.id);
      const item = items.find((i) => i.id === itemId || i.id.endsWith(`__${itemId}`));
      if (item) return { campaignId: c.id, item: { ...item, id: itemId } };
    }
    return null;
  }

  async updateItem(itemId: string, patch: Partial<Item>) {
    const found = await this.findItem(itemId);
    if (!found) return null;
    const rowId = found.item.id.includes("__") ? found.item.id : `${found.campaignId}__${itemId}`;
    const merged = { ...found.item, ...patch };
    await this.sb.from("content_items").update({
      status: merged.status,
      ceo_score: merged.ceo_score,
      copy: { topic: merged.topic, format: merged.format, captions: merged.captions, hashtags: merged.hashtags, cta: merged.cta, design: merged.design, image_url: merged.image_url },
      video_plan: merged.video_plan ?? null,
    }).eq("id", rowId);
    return { ...merged, id: itemId };
  }

  async listItems(campaignId?: string) {
    if (campaignId) return this.itemRows(campaignId);
    const camps = await this.listCampaigns();
    const all: Item[] = [];
    for (const c of camps) all.push(...(await this.itemRows(c.id)));
    return all;
  }

  async listAssets(q?: string) {
    const all = await this.assetRows();
    const needle = (q ?? "").toLowerCase();
    return needle ? all.filter((a) => `${a.headline} ${a.topic} ${a.template_id}`.toLowerCase().includes(needle)) : all;
  }

  async addAsset(campaignId: string, a: Asset) {
    const camps = await this.listCampaigns();
    const brandId = camps.find((c) => c.id === campaignId)?.brandId ?? "sample-brand";
    await this.sb.from("assets").upsert({
      id: a.id,
      brand_id: brandId,
      type: "image",
      url: a.url,
      meta: { campaignId, width: a.width, height: a.height, template_id: a.template_id, headline: a.headline, topic: a.topic },
    });
  }

  async listMetrics(): Promise<Metric[]> {
    const { data } = await this.sb.from("metrics").select("*").order("date", { ascending: true });
    return (data ?? []).map((r) => ({
      id: r.id as string,
      platform: r.platform as string,
      date: r.date as string,
      impressions: Number(r.impressions ?? 0),
      reach: Number(r.reach ?? 0),
      clicks: Number(r.clicks ?? 0),
      leads: Number(r.leads ?? 0),
      spend: Number(r.spend ?? 0),
      revenue: Number(r.revenue ?? 0),
      content_item_id: (r.content_item_id as string) ?? undefined,
      source: (r.source as Metric["source"]) ?? "manual",
    }));
  }

  async addMetrics(rows: MetricRow[]) {
    let n = 0;
    for (const r of rows) {
      const id = `m-${Date.now()}-${n}-${Math.floor(Math.random() * 1e6)}`;
      await this.sb.from("metrics").insert({
        id,
        platform: r.platform,
        date: r.date,
        impressions: r.impressions,
        reach: r.reach,
        clicks: r.clicks,
        leads: r.leads,
        spend: r.spend,
        revenue: r.revenue,
        content_item_id: r.content_item_id ?? null,
        source: r.source,
      });
      n += 1;
    }
    return n;
  }

  async latestReport(): Promise<Report | undefined> {
    const { data } = await this.sb.from("reports").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!data) return undefined;
    return { id: data.id as string, created_at: (data.created_at as string) ?? "", report: (data.payload ?? {}) as Report["report"], totals: (data.totals ?? {}) as Record<string, number> };
  }

  async saveReport(r: Report) {
    await this.sb.from("reports").insert({ id: r.id, payload: r.report, totals: r.totals });
  }

  async addRun(r: Run) {
    await this.sb.from("agent_runs").insert({
      id: `run-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      agent: r.agent,
      model: r.model ?? null,
      input_tokens: r.inputTokens ?? null,
      output_tokens: r.outputTokens ?? null,
      cost_usd: r.costUsd,
      latency_ms: r.latencyMs,
      status: r.status,
    });
  }

  async listRuns(): Promise<Run[]> {
    const { data } = await this.sb.from("agent_runs").select("agent,model,input_tokens,output_tokens,cost_usd,latency_ms,status,created_at").order("created_at", { ascending: false }).limit(500);
    return (data ?? []).map((r) => ({
      agent: r.agent as string,
      model: (r.model as string) ?? undefined,
      inputTokens: r.input_tokens == null ? undefined : Number(r.input_tokens),
      outputTokens: r.output_tokens == null ? undefined : Number(r.output_tokens),
      costUsd: Number(r.cost_usd ?? 0),
      latencyMs: Number(r.latency_ms ?? 0),
      status: (r.status as string) ?? "ok",
      created_at: (r.created_at as string) ?? "",
    }));
  }

  async addAudit(a: AuditEntry) {
    await this.sb.from("audit_log").insert({
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      org_id: await this.org(),
      action: a.action,
      entity: a.entity,
      entity_id: a.entity_id,
      diff: a.diff ?? {},
    });
  }

  async listAudit(): Promise<AuditEntry[]> {
    const { data } = await this.sb.from("audit_log").select("action,entity,entity_id,diff,created_at").order("created_at", { ascending: false }).limit(50);
    return (data ?? []).map((r) => ({ ts: (r.created_at as string) ?? "", action: r.action as string, entity: r.entity as string, entity_id: r.entity_id as string, diff: r.diff ?? {} }));
  }

  async listProposals() {
    const { data } = await this.sb.from("hr_proposals").select("*").order("created_at", { ascending: false });
    return (data ?? []).map((r) => ({ id: r.id as string, agent: r.agent as string, change: r.change as string, reason: r.reason as string, status: (r.status as Proposal["status"]) ?? "pending" }));
  }

  async saveProposals(p: Proposal[]) {
    for (const x of p) await this.sb.from("hr_proposals").upsert({ id: x.id, agent: x.agent, change: x.change, reason: x.reason, status: x.status });
  }

  async updateProposal(id: string, status: Proposal["status"]) {
    await this.sb.from("hr_proposals").update({ status }).eq("id", id);
    const { data } = await this.sb.from("hr_proposals").select("*").eq("id", id).maybeSingle();
    if (!data) return null;
    return { id: data.id as string, agent: data.agent as string, change: data.change as string, reason: data.reason as string, status: data.status as Proposal["status"] };
  }

  async listPromptVersions(): Promise<PromptVersion[]> {
    const { data } = await this.sb.from("prompt_versions").select("agent,version,system,created_at").order("version", { ascending: true });
    return (data ?? []).map((r) => ({ agent: r.agent as string, version: Number(r.version), system: r.system as string, created_at: (r.created_at as string) ?? "" }));
  }

  async addPromptVersion(v: PromptVersion) {
    await this.sb.from("prompt_versions").insert({ id: `pv-${v.agent}-v${v.version}`, agent: v.agent, version: v.version, system: v.system });
  }

  async listBrands(): Promise<Brand[]> {
    const { data } = await this.sb.from("brands").select("*").order("created_at", { ascending: true });
    return (data ?? []).map((r) => ({
      id: r.id as string,
      name: r.name as string,
      tone: (r.tone as string) ?? "",
      languages: (r.languages as string[]) ?? ["English"],
      audience: (r.audience as string) ?? "",
      products: Array.isArray(r.products) ? (r.products as string[]).join(", ") : "",
      usp: (r.usp as string) ?? "",
      dos: (r.dos as string[]) ?? [],
      donts: (r.donts as string[]) ?? [],
      compliance_notes: (r.compliance_notes as string) ?? "",
      sample: Boolean(r.sample),
    }));
  }

  async getBrand(id: string) {
    const { data } = await this.sb.from("brands").select("*").eq("id", id).maybeSingle();
    if (!data) return undefined;
    return {
      id: data.id as string,
      name: data.name as string,
      tone: (data.tone as string) ?? "",
      languages: (data.languages as string[]) ?? ["English"],
      audience: (data.audience as string) ?? "",
      products: Array.isArray(data.products) ? (data.products as string[]).join(", ") : "",
      usp: (data.usp as string) ?? "",
      dos: (data.dos as string[]) ?? [],
      donts: (data.donts as string[]) ?? [],
      compliance_notes: (data.compliance_notes as string) ?? "",
      sample: Boolean(data.sample),
    };
  }

  async saveBrand(b: Brand) {
    const orgId = await this.org();
    await this.sb.from("brands").upsert({
      id: b.id,
      org_id: orgId,
      name: b.name,
      tone: b.tone,
      languages: b.languages,
      audience: b.audience,
      products: b.products ? [b.products] : [],
      usp: b.usp,
      dos: b.dos,
      donts: b.donts,
      compliance_notes: b.compliance_notes,
    });
  }

  async listMemory(brandId: string, kind?: string): Promise<Memory[]> {
    let q = this.sb.from("brand_memory").select("*").eq("brand_id", brandId).order("created_at", { ascending: false }).limit(20);
    if (kind) q = q.eq("kind", kind);
    const { data } = await q;
    return (data ?? []).map((r) => ({ id: r.id as string, brand_id: r.brand_id as string, kind: r.kind as string, content: r.content as string, source_item_id: (r.source_item_id as string) ?? undefined }));
  }

  async addMemory(m: Memory) {
    await this.sb.from("brand_memory").insert({ id: m.id, brand_id: m.brand_id, kind: m.kind, content: m.content, source_item_id: m.source_item_id ?? null });
  }

  async listChannelAccounts(): Promise<ChannelAccount[]> {
    const { data } = await this.sb.from("channel_accounts").select("*").order("created_at", { ascending: true });
    return (data ?? []).map((r) => ({
      id: r.id as string,
      provider: r.provider as string,
      label: r.label as string,
      status: (r.status as ChannelAccount["status"]) ?? "unconfigured",
      scopes: (r.scopes as string[]) ?? [],
      is_sample: Boolean(r.is_sample),
      last_test_at: (r.last_test_at as string) ?? null,
      last_test_ok: r.last_test_ok == null ? null : Boolean(r.last_test_ok),
      last_test_message: (r.last_test_message as string) ?? null,
      last_sync_at: (r.last_sync_at as string) ?? null,
      created_at: (r.created_at as string) ?? undefined,
    }));
  }

  async saveChannelAccount(a: ChannelAccount) {
    await this.sb.from("channel_accounts").upsert({
      id: a.id,
      org_id: await this.org(),
      provider: a.provider,
      label: a.label,
      status: a.status,
      scopes: a.scopes,
      is_sample: a.is_sample,
      last_test_at: a.last_test_at,
      last_test_ok: a.last_test_ok,
      last_test_message: a.last_test_message,
      last_sync_at: a.last_sync_at,
    });
  }

  async listSyncJobs(limit = 50): Promise<SyncJob[]> {
    const { data } = await this.sb.from("sync_jobs").select("*").order("started_at", { ascending: false }).limit(limit);
    return (data ?? []).map((r) => ({
      id: r.id as string,
      channel_account_id: (r.channel_account_id as string) ?? null,
      kind: r.kind as string,
      status: (r.status as SyncJob["status"]) ?? "ok",
      rows_synced: Number(r.rows_synced ?? 0),
      error: (r.error as string) ?? null,
      started_at: (r.started_at as string) ?? "",
      finished_at: (r.finished_at as string) ?? null,
    }));
  }

  async addSyncJob(j: SyncJob) {
    await this.sb.from("sync_jobs").upsert({
      id: j.id,
      org_id: await this.org(),
      channel_account_id: j.channel_account_id,
      kind: j.kind,
      status: j.status,
      rows_synced: j.rows_synced,
      error: j.error,
      started_at: j.started_at,
      finished_at: j.finished_at,
    });
  }

  private catalogRow(r: Record<string, unknown>): CatalogItem {
    return {
      id: r.id as string,
      brandId: r.brand_id as string,
      kind: (r.kind as CatalogItem["kind"]) ?? "product",
      name: r.name as string,
      description: (r.description as string) ?? "",
      price: r.price == null ? null : Number(r.price),
      currency: (r.currency as string) ?? "INR",
      tags: (r.tags as string[]) ?? [],
      features: (r.features as string[]) ?? [],
      status: (r.status as CatalogItem["status"]) ?? "active",
      source: (r.source as CatalogItem["source"]) ?? "manual",
      externalId: (r.external_id as string) ?? null,
      provider: (r.provider as string) ?? null,
      created_at: (r.created_at as string) ?? "",
      updated_at: (r.updated_at as string) ?? "",
    };
  }

  async listCatalog(brandId?: string): Promise<CatalogItem[]> {
    let q = this.sb.from("catalog_items").select("*").order("created_at", { ascending: false });
    if (brandId) q = q.eq("brand_id", brandId);
    const { data } = await q;
    return (data ?? []).map((r) => this.catalogRow(r as Record<string, unknown>));
  }

  async getCatalogItem(id: string): Promise<CatalogItem | undefined> {
    const { data } = await this.sb.from("catalog_items").select("*").eq("id", id).maybeSingle();
    return data ? this.catalogRow(data as Record<string, unknown>) : undefined;
  }

  async saveCatalogItem(c: CatalogItem) {
    const orgId = await this.org();
    await this.sb.from("brands").upsert({ id: c.brandId, org_id: orgId, name: c.brandId });
    await this.sb.from("catalog_items").upsert({
      id: c.id,
      org_id: orgId,
      brand_id: c.brandId,
      kind: c.kind,
      name: c.name,
      description: c.description,
      price: c.price,
      currency: c.currency,
      tags: c.tags,
      features: c.features,
      status: c.status,
      source: c.source,
      external_id: c.externalId,
      provider: c.provider,
      updated_at: new Date().toISOString(),
    });
  }

  async deleteCatalogItem(id: string) {
    await this.sb.from("catalog_items").delete().eq("id", id);
  }

  async listTrends(limit = 50): Promise<Trend[]> {
    const { data } = await this.sb.from("trends").select("*").order("fetched_at", { ascending: false }).limit(limit);
    return (data ?? []).map((r) => ({
      id: r.id as string,
      title: r.title as string,
      url: r.url as string,
      source: (r.source as string) ?? "",
      publishedAt: (r.published_at as string) ?? "",
      query: (r.query as string) ?? "",
      fetchedAt: (r.fetched_at as string) ?? "",
    }));
  }

  async saveTrends(trends: Trend[]) {
    for (const t of trends) {
      await this.sb.from("trends").upsert({
        id: t.id,
        org_id: await this.org(),
        title: t.title,
        url: t.url,
        source: t.source,
        published_at: t.publishedAt,
        query: t.query,
        fetched_at: t.fetchedAt,
      });
    }
  }

  private leadRow(r: Record<string, unknown>): Lead {
    return {
      id: r.id as string,
      brandId: (r.brand_id as string) ?? "",
      name: (r.name as string) ?? "",
      company: (r.company as string) ?? undefined,
      channel: (r.channel as string) ?? "other",
      status: (r.status as Lead["status"]) ?? "new",
      value: r.value == null ? undefined : Number(r.value),
      notes: (r.notes as string) ?? "",
      followUpAt: (r.follow_up_at as string) ?? undefined,
      source: (r.source as string) ?? "manual",
      created_at: (r.created_at as string) ?? "",
      updated_at: (r.updated_at as string) ?? (r.created_at as string) ?? "",
    };
  }

  async listLeads(brandId?: string): Promise<Lead[]> {
    let q = this.sb.from("leads").select("*").order("created_at", { ascending: false });
    if (brandId) q = q.eq("brand_id", brandId);
    const { data } = await q;
    return (data ?? []).map((r) => this.leadRow(r as Record<string, unknown>));
  }

  async saveLead(l: Lead) {
    await this.sb.from("leads").upsert({
      id: l.id,
      brand_id: l.brandId,
      name: l.name,
      company: l.company ?? null,
      channel: l.channel,
      status: l.status,
      value: l.value ?? null,
      notes: l.notes,
      follow_up_at: l.followUpAt ?? null,
      source: l.source,
      updated_at: new Date().toISOString(),
    });
  }

  async updateLead(id: string, patch: Partial<Lead>) {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.company !== undefined) row.company = patch.company;
    if (patch.channel !== undefined) row.channel = patch.channel;
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.value !== undefined) row.value = patch.value;
    if (patch.notes !== undefined) row.notes = patch.notes;
    if (patch.followUpAt !== undefined) row.follow_up_at = patch.followUpAt;
    if (patch.source !== undefined) row.source = patch.source;
    if (patch.brandId !== undefined) row.brand_id = patch.brandId;
    await this.sb.from("leads").update(row).eq("id", id);
    const { data } = await this.sb.from("leads").select("*").eq("id", id).maybeSingle();
    return data ? this.leadRow(data as Record<string, unknown>) : null;
  }

  async deleteLead(id: string) {
    await this.sb.from("leads").delete().eq("id", id);
  }

  async listApiKeys(): Promise<ApiKey[]> {
    const org = await this.org();
    const { data } = await this.sb.from("api_keys").select("*").eq("org_id", org).order("created_at", { ascending: false });
    return (data ?? []).map((r) => ({
      id: r.id as string,
      name: r.name as string,
      key_hash: r.key_hash as string,
      key_prefix: r.key_prefix as string,
      scopes: (r.scopes as ("read" | "write")[]) ?? ["read"],
      role: (r.role as "viewer" | "editor" | "admin") ?? "viewer",
      ip_allowlist: (r.ip_allowlist as string[]) ?? undefined,
      created_at: (r.created_at as string) ?? "",
      last_used_at: (r.last_used_at as string) ?? undefined,
      revoked_at: (r.revoked_at as string) ?? undefined,
    }));
  }

  async createApiKey(key: Omit<ApiKey, "id" | "created_at">): Promise<ApiKey> {
    const org = await this.org();
    const id = `key-${randomUUID()}`;
    const newKey: ApiKey = {
      ...key,
      id,
      created_at: new Date().toISOString(),
    };
    await this.sb.from("api_keys").insert({
      id: newKey.id,
      org_id: org,
      name: newKey.name,
      key_hash: newKey.key_hash,
      key_prefix: newKey.key_prefix,
      scopes: newKey.scopes,
      role: newKey.role,
      ip_allowlist: newKey.ip_allowlist ?? null,
      created_at: newKey.created_at,
    });
    return newKey;
  }

  async revokeApiKey(id: string): Promise<boolean> {
    const { error } = await this.sb.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    return !error;
  }

  async verifyApiKey(rawKey: string): Promise<ApiKey | null> {
    if (!rawKey || typeof rawKey !== "string") return null;
    const rawHash = createHash("sha256").update(rawKey).digest("hex");
    const rawBuffer = Buffer.from(rawHash, "hex");

    const { data } = await this.sb.from("api_keys").select("*").is("revoked_at", null);
    for (const r of data ?? []) {
      const storedHash = r.key_hash as string;
      if (!storedHash) continue;
      try {
        const storedBuffer = Buffer.from(storedHash, "hex");
        if (storedBuffer.length === rawBuffer.length && timingSafeEqual(storedBuffer, rawBuffer)) {
          const now = new Date().toISOString();
          await this.sb.from("api_keys").update({ last_used_at: now }).eq("id", r.id);
          return {
            id: r.id as string,
            name: r.name as string,
            key_hash: storedHash,
            key_prefix: r.key_prefix as string,
            scopes: (r.scopes as ("read" | "write")[]) ?? ["read"],
            role: (r.role as "viewer" | "editor" | "admin") ?? "viewer",
            ip_allowlist: (r.ip_allowlist as string[]) ?? undefined,
            created_at: r.created_at as string,
            last_used_at: now,
            revoked_at: undefined,
          };
        }
      } catch {
        continue;
      }
    }
    return null;
  }
}
