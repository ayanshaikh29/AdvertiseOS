import type {
  ChannelConnector,
  ConnectorCapabilities,
  ConnectorContext,
  ConnectorProviderId,
  ConnectionTest,
  PulledCatalogItem,
  PulledLead,
  PulledMetricRow,
  PulledPost,
} from "@/lib/connectors/types";

const SAMPLE_NOTE = "Sample data — not a real account. Connect real credentials (Phase 6B) for live data.";

const CAPABILITIES: Record<ConnectorProviderId, ConnectorCapabilities> = {
  website: { pullPosts: false, pullMetrics: true, pullAudience: false, pullLeads: true, pullCatalog: true, crawl: true, publish: true },
  meta: { pullPosts: true, pullMetrics: true, pullAudience: true, pullLeads: false, pullCatalog: true, crawl: false, publish: true },
  whatsapp: { pullPosts: false, pullMetrics: false, pullAudience: false, pullLeads: true, pullCatalog: false, crawl: false, publish: true },
  ga4: { pullPosts: false, pullMetrics: true, pullAudience: true, pullLeads: false, pullCatalog: false, crawl: false, publish: false },
  search_console: { pullPosts: false, pullMetrics: true, pullAudience: false, pullLeads: false, pullCatalog: false, crawl: false, publish: false },
  meta_ads: { pullPosts: false, pullMetrics: true, pullAudience: false, pullLeads: false, pullCatalog: false, crawl: false, publish: false },
  google_ads: { pullPosts: false, pullMetrics: true, pullAudience: false, pullLeads: false, pullCatalog: false, crawl: false, publish: false },
};

const LABELS: Record<ConnectorProviderId, string> = {
  website: "Website (digitaladvertise.in)",
  meta: "Instagram + Facebook (Meta)",
  whatsapp: "WhatsApp Business (Cloud API)",
  ga4: "Google Analytics 4",
  search_console: "Google Search Console",
  meta_ads: "Meta Ads",
  google_ads: "Google Ads",
};

function samplePosts(provider: ConnectorProviderId): PulledPost[] {
  const platform = provider === "meta" ? "instagram" : "website";
  return [
    {
      externalId: `sample-${provider}-1`,
      platform,
      publishedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      format: "reel",
      caption: "Sample reel about festive offers (sample data)",
      metrics: { reach: 1240, impressions: 1890, likes: 142, comments: 9 },
    },
    {
      externalId: `sample-${provider}-2`,
      platform,
      publishedAt: new Date(Date.now() - 86400000 * 8).toISOString(),
      format: "carousel",
      caption: "Sample carousel: 5 branding tips (sample data)",
      metrics: { reach: 860, impressions: 1120, likes: 77, comments: 4 },
    },
  ];
}

function sampleMetrics(provider: ConnectorProviderId): PulledMetricRow[] {
  const platform = provider === "meta" ? "instagram" : provider === "google_ads" ? "google_ads" : provider === "meta_ads" ? "meta_ads" : provider === "ga4" ? "website" : provider;
  return [3, 2, 1].map((daysAgo) => {
    const date = new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);
    return { date, platform, impressions: 5200 - daysAgo * 300, reach: 3100 - daysAgo * 200, clicks: 90 - daysAgo * 5, leads: 4, spend: 0, revenue: 0 };
  });
}

function sampleLeads(provider: ConnectorProviderId): PulledLead[] {
  return [
    {
      externalId: `sample-lead-${provider}-1`,
      channel: provider === "whatsapp" ? "whatsapp" : provider === "website" ? "website_form" : provider,
      name: "Sample Lead",
      contact: "+91-00000-00000",
      message: "Interested in your services (sample data)",
      receivedAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ];
}

function sampleCatalog(provider: ConnectorProviderId): PulledCatalogItem[] {
  return [
    {
      externalId: `sample-catalog-${provider}-brand-identity`,
      kind: "service",
      name: "Brand Identity Design (sample)",
      description: "Logo, color system, typography and a mini brand guide for growing businesses. Sample data.",
      price: 25000,
      currency: "INR",
      tags: ["branding", "small business"],
      features: ["Logo suite", "Color + type system", "One-page brand guide"],
    },
    {
      externalId: `sample-catalog-${provider}-performance`,
      kind: "service",
      name: "Performance Marketing (sample)",
      description: "Meta + Google ads managed end-to-end with weekly reporting. Sample data.",
      price: 40000,
      currency: "INR",
      tags: ["ads", "growth"],
      features: ["Campaign setup", "Weekly optimisation", "Monthly report"],
    },
    {
      externalId: `sample-catalog-${provider}-website`,
      kind: "product",
      name: "Website Launch Pack (sample)",
      description: "5-page marketing site with SEO basics and analytics wired in. Sample data.",
      price: 75000,
      currency: "INR",
      tags: ["web", "seo"],
      features: ["5 pages", "SEO setup", "GA4 wiring"],
    },
  ];
}

/** Deterministic fake connector for every provider. Labeled "Sample data" everywhere. */
export class FakeConnector implements ChannelConnector {
  readonly sample = true;
  readonly capabilities: ConnectorCapabilities;
  readonly label: string;

  constructor(readonly provider: ConnectorProviderId) {
    this.capabilities = CAPABILITIES[provider];
    this.label = LABELS[provider];
  }

  async testConnection(_ctx: ConnectorContext): Promise<ConnectionTest> {
    return {
      ok: true,
      message: `${this.label}: OK (sample). ${SAMPLE_NOTE}`,
      details: { provider: this.provider, mode: "fake", note: SAMPLE_NOTE },
      sample: true,
      checkedAt: new Date().toISOString(),
    };
  }

  async health(): Promise<{ fresh: boolean; lastSyncAt: string | null; message: string }> {
    return { fresh: false, lastSyncAt: null, message: `No real sync yet. ${SAMPLE_NOTE}` };
  }

  async pullPosts(): Promise<PulledPost[]> {
    return samplePosts(this.provider);
  }

  async pullMetrics(_ctx: ConnectorContext, _since: Date): Promise<PulledMetricRow[]> {
    return sampleMetrics(this.provider);
  }

  async pullLeads(): Promise<PulledLead[]> {
    return sampleLeads(this.provider);
  }

  async pullCatalog(): Promise<PulledCatalogItem[]> {
    return sampleCatalog(this.provider);
  }
}

/** Thrown-config stub returned when a provider has no credentials and fake connectors are disabled. */
export class UnconfiguredConnector implements ChannelConnector {
  readonly sample = false;
  readonly capabilities: ConnectorCapabilities = {
    pullPosts: false,
    pullMetrics: false,
    pullAudience: false,
    pullLeads: false,
    pullCatalog: false,
    crawl: false,
    publish: false,
  };
  readonly label: string;

  constructor(readonly provider: ConnectorProviderId) {
    this.label = LABELS[provider];
  }

  async testConnection(): Promise<ConnectionTest> {
    return {
      ok: false,
      message: `${this.label} is not configured. Set the ${this.provider.toUpperCase()}_* credentials and feature flag (see docs/INTEGRATIONS.md), or enable FEATURE_FAKE_CONNECTORS=true for labeled sample data.`,
      sample: false,
      checkedAt: new Date().toISOString(),
    };
  }

  async health(): Promise<{ fresh: boolean; lastSyncAt: string | null; message: string }> {
    return { fresh: false, lastSyncAt: null, message: "Not configured" };
  }
}

export function fakeCapabilities(provider: ConnectorProviderId): ConnectorCapabilities {
  return CAPABILITIES[provider];
}

export function connectorLabel(provider: ConnectorProviderId): string {
  return LABELS[provider];
}
