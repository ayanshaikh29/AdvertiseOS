import { z } from "zod";
import type { BrandProfile } from "@/lib/brand";
import type { CatalogItem } from "@/lib/db/repo";

export type TrendRef = {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
};

export const CampaignContextSchema = z.object({
  campaignId: z.string(),
  brandId: z.string(),
  brand: z.object({
    id: z.string(),
    name: z.string(),
    tone: z.string(),
    languages: z.array(z.string()),
    audience: z.string(),
    products: z.string(),
    usp: z.string(),
    dos: z.array(z.string()),
    donts: z.array(z.string()),
    compliance_notes: z.string(),
  }),
  brief: z.object({
    goal: z.string(),
    month: z.string(),
    budget: z.number().optional(),
    offers: z.string().optional(),
    festivals: z.string().optional(),
    notes: z.string().optional(),
  }),
  catalog: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    price: z.number().nullable(),
    currency: z.string(),
    tags: z.array(z.string()),
    features: z.array(z.string()),
    status: z.string(),
  })).optional(),
  trends: z.array(z.object({
    title: z.string(),
    url: z.string(),
    source: z.string(),
    publishedAt: z.string(),
  })).optional(),
  constraints: z.object({
    channels: z.array(z.string()).optional(),
    formats: z.array(z.string()).optional(),
    minPosts: z.number().optional(),
    maxPosts: z.number().optional(),
    language: z.string().optional(),
  }).optional(),
  previousContent: z.array(z.object({
    topic: z.string(),
    hook: z.string(),
    caption: z.string(),
    platform: z.string(),
    format: z.string(),
  })).optional(),
  brandMemory: z.array(z.object({
    example: z.string(),
    reason: z.string(),
  })).optional(),
});

export type CampaignContext = z.infer<typeof CampaignContextSchema>;

export function buildCampaignContext(params: {
  campaignId: string;
  brand: BrandProfile;
  brief: {
    goal: string;
    month: string;
    budget?: number;
    offers?: string;
    festivals?: string;
    notes?: string;
  };
  catalog?: CatalogItem[];
  trends?: TrendRef[];
  constraints?: CampaignContext["constraints"];
  previousContent?: CampaignContext["previousContent"];
  brandMemory?: Array<{ example: string; reason: string }>;
}): CampaignContext {
  return {
    campaignId: params.campaignId,
    brandId: params.brand.id,
    brand: {
      id: params.brand.id,
      name: params.brand.name,
      tone: params.brand.tone,
      languages: params.brand.languages,
      audience: params.brand.audience,
      products: params.brand.products,
      usp: params.brand.usp,
      dos: params.brand.dos,
      donts: params.brand.donts,
      compliance_notes: params.brand.compliance_notes,
    },
    brief: {
      goal: params.brief.goal,
      month: params.brief.month,
      budget: params.brief.budget,
      offers: params.brief.offers,
      festivals: params.brief.festivals,
      notes: params.brief.notes,
    },
    catalog: params.catalog?.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      price: c.price,
      currency: c.currency,
      tags: c.tags,
      features: c.features,
      status: c.status,
    })),
    trends: params.trends?.map(t => ({
      title: t.title,
      url: t.url,
      source: t.source,
      publishedAt: t.publishedAt,
    })),
    constraints: params.constraints,
    previousContent: params.previousContent,
    brandMemory: params.brandMemory,
  };
}

export function contextToPrompt(context: CampaignContext): string {
  const parts: string[] = [
    `CAMPAIGN CONTEXT (authoritative source of truth — all agents must use this):`,
    `Campaign ID: ${context.campaignId}`,
    `Brand: ${context.brand.name}`,
    `Tone: ${context.brand.tone}`,
    `Languages: ${context.brand.languages.join(", ")}`,
    `Target Audience: ${context.brand.audience}`,
    `Products/Services: ${context.brand.products}`,
    `USP: ${context.brand.usp}`,
    `DO: ${context.brand.dos.join("; ")}`,
    `DON'T: ${context.brand.donts.join("; ")}`,
    `Compliance: ${context.brand.compliance_notes}`,
    ``,
    `CAMPAIGN BRIEF:`,
    `Objective: ${context.brief.goal}`,
    `Month: ${context.brief.month}`,
    ...(context.brief.budget ? [`Budget: ${context.brief.budget}`] : []),
    ...(context.brief.offers ? [`Current Offers: ${context.brief.offers}`] : []),
    ...(context.brief.festivals ? [`Festivals/Events: ${context.brief.festivals}`] : []),
    ...(context.brief.notes ? [`Additional Notes: ${context.brief.notes}`] : []),
  ];

  if (context.catalog && context.catalog.length > 0) {
    parts.push(``, `CATALOG (real products/services you may reference — prices are fixed, never invent others):`);
    for (const item of context.catalog) {
      const priceStr = item.price != null ? ` (${item.currency} ${item.price})` : "";
      parts.push(`- ${item.name}${priceStr}: ${item.description}`);
      if (item.features.length) parts.push(`  Features: ${item.features.join(", ")}`);
    }
  }

  if (context.trends && context.trends.length > 0) {
    parts.push(``, `RECENT TRENDS (consider as angles ONLY if genuinely relevant; never invent facts):`);
    for (const trend of context.trends.slice(0, 5)) {
      parts.push(`- "${trend.title}" (${trend.source})`);
    }
  }

  if (context.previousContent && context.previousContent.length > 0) {
    parts.push(``, `PREVIOUSLY GENERATED CONTENT (avoid repetition — create substantively different messages):`);
    for (const pc of context.previousContent.slice(-10)) {
      parts.push(`- [${pc.platform}/${pc.format}] ${pc.topic}: "${pc.hook}" — ${pc.caption.slice(0, 100)}...`);
    }
  }

  if (context.constraints) {
    parts.push(``, `CONSTRAINTS:`);
    if (context.constraints.channels?.length) parts.push(`- Channels: ${context.constraints.channels.join(", ")}`);
    if (context.constraints.formats?.length) parts.push(`- Formats: ${context.constraints.formats.join(", ")}`);
    if (context.constraints.minPosts) parts.push(`- Minimum posts: ${context.constraints.minPosts}`);
    if (context.constraints.maxPosts) parts.push(`- Maximum posts: ${context.constraints.maxPosts}`);
    if (context.constraints.language) parts.push(`- Language: ${context.constraints.language}`);
  }

  if (context.brandMemory && context.brandMemory.length > 0) {
    parts.push(``, `BRAND MEMORY — REJECTED EXAMPLES (NEVER REPEAT THESE MISTAKES):`);
    for (const mem of context.brandMemory) {
      parts.push(`- Rejected copy: "${mem.example}"`);
      parts.push(`  Reason for rejection: ${mem.reason}`);
    }
  }

  parts.push(``, `CRITICAL RULES:`);
  parts.push(`- NEVER invent facts, statistics, client names, awards, testimonials, or results`);
  parts.push(`- If a fact is missing from this context, explicitly state it is missing`);
  parts.push(`- Every claim must be traceable to the brand profile, catalog, or brief above`);
  parts.push(`- All content must be specific to THIS campaign objective, not generic marketing advice`);

  return parts.join("\n");
}