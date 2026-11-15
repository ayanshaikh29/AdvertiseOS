import { z } from "zod";

export const briefSchema = z.object({
  brandId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Use YYYY-MM"),
  goal: z.string().min(10, "Goal must be at least 10 characters"),
  budget: z.number().nonnegative().optional(),
  offers: z.string().optional().default(""),
  festivals: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});
export type BriefInput = z.infer<typeof briefSchema>;

export const taskSchema = z.object({
  agent: z.enum(["strategist", "content", "designer", "video", "social", "performance"]),
  description: z.string(),
  depends_on: z.array(z.string()).default([]),
  deadline_day: z.number().int().min(1).max(31),
});
export type TaskPlan = z.infer<typeof taskSchema>;

export const ceoPlanSchema = z.object({
  objectives: z.array(z.string()).min(1).max(5),
  kpis: z.array(z.string()).min(1).max(8),
  tasks: z.array(taskSchema).min(1).max(20),
  risks: z.array(z.string()).default([]),
});
export type CeoPlan = z.infer<typeof ceoPlanSchema>;

export const calendarItemSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  platform: z.enum(["instagram", "facebook", "linkedin", "blog", "email"]),
  format: z.enum(["post", "story", "reel", "carousel", "ad", "blog", "email"]),
  topic: z.string().min(3),
  goal: z.string().min(3),
  hook: z.string().min(3),
  pillar: z.string().min(2),
  why_now: z.string().optional(),
});
export type CalendarItem = z.infer<typeof calendarItemSchema>;

export const strategySchema = z.object({
  content_pillars: z.array(z.string()).min(2).max(6),
  audience_insights: z.array(z.string()).min(1).max(8),
  calendar: z.array(calendarItemSchema).min(10).max(31),
  campaign_ideas: z.array(z.string()).default([]),
  festival_hooks: z.array(z.string()).default([]),
  executive_summary: z.string().optional(),
  positioning: z.string().optional(),
  plan_b: z.string().optional(),
  audience_segments: z
    .array(z.object({ name: z.string().min(1), insight: z.string().min(3), channel: z.string().min(2) }))
    .max(6)
    .optional(),
  funnel_stages: z
    .array(z.object({ stage: z.string().min(1), goal: z.string().min(3), content: z.string().min(3) }))
    .max(6)
    .optional(),
});
export type Strategy = z.infer<typeof strategySchema>;

export const competitorInsightSchema = z.object({
  name: z.string().min(1),
  url: z.string().optional(),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  market_gap: z.string().default(""),
  source_url: z.string().optional(),
});
export type CompetitorInsightSchema = z.infer<typeof competitorInsightSchema>;

export const researchReportSchema = z.object({
  industry: z.string().default(""),
  research_date: z.string().default(new Date().toISOString().slice(0, 10)),
  competitors: z.array(competitorInsightSchema).max(8).default([]),
  target_personas: z.array(
    z.object({
      name: z.string(),
      pain_points: z.array(z.string()).default([]),
      motivations: z.array(z.string()).default([]),
      preferred_channels: z.array(z.string()).default([]),
    })
  ).default([]),
  market_opportunities: z.array(z.string()).default([]),
  sources: z.array(z.object({ title: z.string(), url: z.string() })).default([]),
});
export type ResearchReport = z.infer<typeof researchReportSchema>;

export const brandVoiceReportSchema = z.object({
  tone_descriptors: z.array(z.string()).min(1).max(6),
  core_messaging_pillars: z.array(z.string()).min(1).max(5),
  vocabulary_dos: z.array(z.string()).default([]),
  vocabulary_donts: z.array(z.string()).default([]),
  compliance_rules: z.array(z.string()).default([]),
  sample_voice_comparison: z.object({
    in_character: z.string().default(""),
    out_of_character: z.string().default(""),
  }),
});
export type BrandVoiceReport = z.infer<typeof brandVoiceReportSchema>;

export const seoReportSchema = z.object({
  target_focus: z.string().default(""),
  keyword_clusters: z.array(
    z.object({
      topic: z.string(),
      keywords: z.array(
        z.object({
          keyword: z.string(),
          intent: z.enum(["informational", "commercial", "transactional"]).default("informational"),
          priority: z.enum(["high", "medium", "low"]).default("medium"),
        })
      ),
    })
  ).default([]),
  on_page_checklist: z.array(z.string()).default([]),
  meta_recommendations: z.array(
    z.object({
      page: z.string(),
      meta_title: z.string(),
      meta_description: z.string(),
    })
  ).default([]),
  content_gap_opportunities: z.array(z.string()).default([]),
});
export type SeoReport = z.infer<typeof seoReportSchema>;

export const performanceStrategySchema = z.object({
  total_budget: z.number().nullable().optional(),
  campaign_structure: z.array(
    z.object({
      stage: z.enum([
        "Top of Funnel (Awareness)",
        "Middle of Funnel (Retargeting)",
        "Bottom of Funnel (Conversion)",
      ]),
      budget_split_pct: z.number().min(0).max(100),
      recommended_channels: z.array(z.string()),
      audience_targeting: z.array(z.string()),
      ad_formats: z.array(z.string()),
      primary_kpi: z.string(),
    })
  ).default([]),
  bidding_strategy: z.string().default(""),
  ab_test_matrix: z.array(z.string()).default([]),
  execution_note: z.string().default("Ad planning only — no live advertising spend is executed without explicit human approval."),
});
export type PerformanceStrategy = z.infer<typeof performanceStrategySchema>;

export const criticReportSchema = z.object({
  score: z.number().min(0).max(100),
  passed: z.boolean(),
  revision_cycle: z.number().int().default(0),
  criteria: z.array(
    z.object({
      name: z.string(),
      score: z.number().min(0).max(100),
      feedback: z.string(),
    })
  ).default([]),
  issues: z.array(
    z.object({
      severity: z.enum(["low", "medium", "high"]),
      text: z.string(),
      fix_applied: z.string().optional(),
    })
  ).default([]),
  verdict: z.string().default(""),
});
export type CriticReport = z.infer<typeof criticReportSchema>;

export const carouselSlideSchema = z.object({
  heading: z.string().min(1),
  body: z.string(),
});

export const adCopySchema = z.object({
  primary_text: z.string().min(1),
  headline: z.string().min(1),
  cta: z.string().min(1),
});

export const contentItemSchema = z.object({
  calendar_date: z.string(),
  platform: z.string(),
  format: z.string(),
  topic: z.string(),
  caption_variants: z.array(z.string()).length(3),
  hashtags: z.array(z.string()).max(15),
  cta: z.string(),
  alt_text: z.string(),
  hook: z.string().optional(),
  objective: z.string().optional(),
  audience: z.string().optional(),
  carousel_slides: z.array(carouselSlideSchema).max(10).optional(),
  reel_script: z.string().optional(),
  ad_copy: adCopySchema.optional(),
});
export type ContentItem = z.infer<typeof contentItemSchema>;

export const ceoReviewSchema = z.object({
  score: z.number().min(0).max(100),
  passed: z.boolean(),
  issues: z.array(z.object({ severity: z.enum(["low", "medium", "high"]), text: z.string() })),
  feedback_for_agent: z.string(),
});
export type CeoReview = z.infer<typeof ceoReviewSchema>;

export const approvalActionSchema = z.object({
  itemId: z.string().min(1),
  action: z.enum(["approve", "reject", "edit"]),
  reason: z.string().optional(),
  editedCopy: z.string().optional(),
});
export type ApprovalAction = z.infer<typeof approvalActionSchema>;

export const designSchema = z.object({
  layout: z.string().min(3),
  headline: z.string().min(1).max(80),
  subtext: z.string().max(200).default(""),
  color_usage: z.string().min(3),
  image_prompt: z.string().min(10),
  template_id: z.enum(["bold-center", "split", "minimal", "festival"]),
  size: z.string().regex(/^\d+x\d+$/, "Use WxH, e.g. 1080x1080").default("1080x1080"),
  text_overlays: z.array(z.string()).default([]),
});
export type DesignBrief = z.infer<typeof designSchema>;

export const videoSceneSchema = z.object({
  n: z.number().int().min(1),
  visual: z.string().min(3),
  shot_type: z.string().min(2),
  duration_s: z.number().int().min(1).max(60),
  on_screen_text: z.string().max(80),
  voiceover: z.string().min(1),
});
export type VideoScene = z.infer<typeof videoSceneSchema>;

export const videoPlanSchema = z.object({
  duration_s: z.number().int().min(5).max(180),
  aspect: z.enum(["9:16", "1:1", "16:9"]),
  scenes: z.array(videoSceneSchema).min(1).max(12),
  music_mood: z.string().min(2),
  captions_srt: z.string().min(1),
  thumbnail_idea: z.string().min(3),
});
export type VideoPlan = z.infer<typeof videoPlanSchema>;

export const socialPlanSchema = z.object({
  best_times: z.array(z.string()).min(1).max(10),
  posting_plan: z.array(z.object({ date: z.string(), platform: z.string(), slot: z.string() })).max(31),
});
export type SocialPlan = z.infer<typeof socialPlanSchema>;

export const replyDraftSchema = z.object({
  comment_id: z.string(),
  reply: z.string().min(1).max(500),
  tone: z.string(),
  needs_human: z.boolean(),
  escalation_reason: z.string().optional(),
});
export type ReplyDraft = z.infer<typeof replyDraftSchema>;

export const metricRowSchema = z.object({
  platform: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  impressions: z.number().int().nonnegative().default(0),
  reach: z.number().int().nonnegative().default(0),
  clicks: z.number().int().nonnegative().default(0),
  leads: z.number().int().nonnegative().default(0),
  spend: z.number().nonnegative().default(0),
  revenue: z.number().nonnegative().default(0),
  content_item_id: z.string().optional(),
  source: z.enum(["manual", "csv", "api"]).default("manual"),
});
export type MetricRow = z.infer<typeof metricRowSchema>;

export const performanceReportSchema = z.object({
  summary: z.string().min(1),
  what_worked: z.array(z.string()).default([]),
  what_didnt: z.array(z.string()).default([]),
  budget_reallocation: z.array(z.string()).default([]),
  ab_test_ideas: z.array(z.string()).default([]),
  next_actions: z.array(z.string()).default([]),
});
export type PerformanceReport = z.infer<typeof performanceReportSchema>;

export const hrReportSchema = z.object({
  agent_scorecards: z.array(
    z.object({ agent: z.string(), runs: z.number().int(), avg_ceo_score: z.number().nullable(), total_cost_usd: z.number(), note: z.string() })
  ),
  recurring_issues: z.array(z.string()).default([]),
  proposed_prompt_changes: z.array(z.object({ agent: z.string(), change: z.string(), reason: z.string() })).default([]),
});
export type HrReport = z.infer<typeof hrReportSchema>;

/** Which specialist agents a single request actually needs — small requests must not
 * run the whole agency. */
export const intentKindSchema = z.enum([
  "full_campaign",
  "strategy_only",
  "research_only",
  "brand_voice_only",
  "seo_only",
  "content_calendar",
  "single_content",
  "creative_only",
  "video_only",
  "audit_only",
  "crm_only",
  "performance_only",
  "general_chat",
]);
export type IntentKind = z.infer<typeof intentKindSchema>;

export const requestIntentSchema = z.object({
  kind: intentKindSchema,
  goal: z.string().min(1).default(""),
  platforms: z.array(z.enum(["instagram", "facebook", "linkedin", "blog", "email"])).default(["instagram"]),
  formats: z.array(z.enum(["post", "story", "reel", "carousel", "ad", "blog", "email"])).default(["post"]),
  post_count: z.number().int().min(1).max(31).default(12),
  reel_count: z.number().int().min(0).max(12).default(0),
  ad_count: z.number().int().min(0).max(12).default(0),
  duration_days: z.number().int().min(1).max(31).default(30),
  budget: z.number().nonnegative().nullable().default(null),
  industry: z.string().default(""),
  topic: z.string().default(""),
  needs_strategy: z.boolean().default(false),
  needs_calendar: z.boolean().default(false),
  needs_content: z.boolean().default(false),
  needs_design: z.boolean().default(false),
  needs_video: z.boolean().default(false),
  needs_audit: z.boolean().default(false),
  needs_crm: z.boolean().default(false),
  needs_performance: z.boolean().default(false),
  needs_research: z.boolean().default(false),
  needs_brand_voice: z.boolean().default(false),
  needs_seo: z.boolean().default(false),
  needs_critic: z.boolean().default(true),
});
export type RequestIntent = z.infer<typeof requestIntentSchema>;

/** Facts the AI must NOT invent. If a blocking fact is missing the manager asks
 * instead of generating property/price/offer claims. */
export const missingFactSchema = z.object({
  fact: z.string(),
  why_needed: z.string(),
  blocking: z.boolean(),
});
export type MissingFact = z.infer<typeof missingFactSchema>;

export const clarificationPlanSchema = z.object({
  questions: z.array(z.object({ fact: z.string(), question: z.string(), blocking: z.boolean() })).min(1).max(8),
  can_proceed_with_draft: z.boolean(),
  proceed_note: z.string().default(""),
});
export type ClarificationPlan = z.infer<typeof clarificationPlanSchema>;

/** LLM-backed brand/channel audit — replaces the old Math.random() score. */
export const auditReportSchema = z.object({
  score: z.number().int().min(0).max(100),
  overview: z.string().min(10),
  strengths: z.array(z.string()).min(1).max(6),
  weaknesses: z.array(z.string()).min(1).max(6),
  recommendations: z.array(z.string()).min(1).max(8),
  data_sources: z.array(z.string()).default([]),
});
export type AuditReport = z.infer<typeof auditReportSchema>;
