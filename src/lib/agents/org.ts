import type { ModelTier } from "@/lib/modelRouter";

export type OrgRole =
  | "ceo"
  | "marketing_manager"
  | "content_manager"
  | "performance_manager"
  | "hr_quality"
  | "strategist"
  | "researcher"
  | "brand_voice"
  | "seo_sem"
  | "creative"
  | "designer"
  | "video"
  | "performance"
  | "critic";

export interface OrgMember {
  id: OrgRole;
  title: string;
  displayName: string;
  department: "Executive" | "Marketing" | "Creative" | "Performance" | "Quality";
  reports_to: OrgRole | null;
  directReports?: OrgRole[];
  modelTier: ModelTier;
  avatar: string;
  rubric: string[];
  tools: string[];
  description: string;
}

export const AGENCY_ORG_CHART: Record<OrgRole, OrgMember> = {
  // ── Executive ─────────────────────────────────────────────────────────────
  ceo: {
    id: "ceo",
    title: "Chief Executive Officer & Orchestrator",
    displayName: "AI Agency CEO",
    department: "Executive",
    reports_to: null,
    directReports: ["marketing_manager", "content_manager", "performance_manager", "hr_quality"],
    modelTier: "strong",
    avatar: "👔",
    rubric: [
      "Executive alignment with brief goals and KPIs",
      "Fact-checking & zero fabricated claims",
      "Balanced resource and budget allocation",
      "Final campaign package sign-off",
    ],
    tools: ["brief_parser", "directive_generator", "package_signer"],
    description: "Sets company strategy, issues manager directives, and performs final sign-off before human review.",
  },

  // ── Management Layer ───────────────────────────────────────────────────────
  marketing_manager: {
    id: "marketing_manager",
    title: "Digital Marketing Manager",
    displayName: "Marketing Manager",
    department: "Marketing",
    reports_to: "ceo",
    directReports: ["strategist", "researcher", "brand_voice", "seo_sem"],
    modelTier: "strong",
    avatar: "🎯",
    rubric: [
      "Target audience fit and market positioning",
      "Pillar consistency across 30 days",
      "Local market context and competitor differentiation",
      "Search intent & SEO alignment",
    ],
    tools: ["calendar_review", "strategy_review", "competitor_evaluator"],
    description: "Oversees research, positioning, strategy, SEO, and 30-day calendar architecture.",
  },

  content_manager: {
    id: "content_manager",
    title: "Content & Creative Production Manager",
    displayName: "Content Manager",
    department: "Creative",
    reports_to: "ceo",
    directReports: ["creative", "designer", "video"],
    modelTier: "fast",
    avatar: "✍️",
    rubric: [
      "Hook strength and scroll-stopping power",
      "Tone fidelity and brand vocabulary adherence",
      "Visual hierarchy and headline readability",
      "Reel pacing and 9:16 storytelling structure",
    ],
    tools: ["copy_review", "design_review", "script_review", "revision_feeder"],
    description: "Directs copywriting, visual design cards, video reels, and manages creative revision loops.",
  },

  performance_manager: {
    id: "performance_manager",
    title: "Performance & Growth Ads Manager",
    displayName: "Performance Manager",
    department: "Performance",
    reports_to: "ceo",
    directReports: ["performance"],
    modelTier: "fast",
    avatar: "📈",
    rubric: [
      "Full-funnel budget split (ToFU/MoFU/BoFU)",
      "Channel efficiency and CPA/CPL realism",
      "Conversion tracking & lead form clarity",
      "Safe ad spending governance",
    ],
    tools: ["budget_allocator", "funnel_auditor", "ad_copy_evaluator"],
    description: "Structures paid ad funnels, Meta/Google campaign architectures, and lead generation pipelines.",
  },

  hr_quality: {
    id: "hr_quality",
    title: "HR, Quality Assurance & Compliance Gate",
    displayName: "Quality & Compliance Officer",
    department: "Quality",
    reports_to: "ceo",
    directReports: ["critic"],
    modelTier: "strong",
    avatar: "⚖️",
    rubric: [
      "Zero fabricated data / compliance guardrails",
      "Legal / RERA / price claim verification",
      "Agent output score calibration",
      "Human authorization gate compliance",
    ],
    tools: ["claim_verifier", "rubric_scoring", "flag_manager"],
    description: "Audits every deliverable for truthfulness, compliance, and strict quality criteria.",
  },

  // ── Team Specialists (Execution) ──────────────────────────────────────────
  strategist: {
    id: "strategist",
    title: "Campaign Strategist",
    displayName: "Lead Campaign Strategist",
    department: "Marketing",
    reports_to: "marketing_manager",
    modelTier: "strong",
    avatar: "🧭",
    rubric: ["Content pillar diversity", "Realistic KPI targets", "Actionable Plan B"],
    tools: ["strategy_engine", "calendar_matrix"],
    description: "Develops 30-day marketing roadmaps, strategic pillars, and timeline schedules.",
  },

  researcher: {
    id: "researcher",
    title: "Market & Competitor Researcher",
    displayName: "Market Intelligence Analyst",
    department: "Marketing",
    reports_to: "marketing_manager",
    modelTier: "strong",
    avatar: "🔍",
    rubric: ["Source credibility", "Local market accuracy", "Actionable market gaps"],
    tools: ["web_research", "competitor_matrix"],
    description: "Researches local competitors, demographic buyer personas, and industry trends.",
  },

  brand_voice: {
    id: "brand_voice",
    title: "Brand Voice & Identity Specialist",
    displayName: "Brand Voice Specialist",
    department: "Marketing",
    reports_to: "marketing_manager",
    modelTier: "fast",
    avatar: "🎙️",
    rubric: ["Vocabulary dos and donts", "Tone description", "Persona contrast examples"],
    tools: ["guidelines_engine", "voice_compliance"],
    description: "Extracts brand guidelines, tone rules, and compliance guardrails.",
  },

  seo_sem: {
    id: "seo_sem",
    title: "SEO & Search Engine Specialist",
    displayName: "SEO/SEM Specialist",
    department: "Marketing",
    reports_to: "marketing_manager",
    modelTier: "fast",
    avatar: "🚀",
    rubric: ["Keyword intent classification", "Local schema markup", "Meta tag precision"],
    tools: ["keyword_planner", "schema_builder"],
    description: "Identifies search intent keyword clusters, on-page checklists, and meta tags.",
  },

  creative: {
    id: "creative",
    title: "Creative Copywriter & Content Producer",
    displayName: "Content Copywriter",
    department: "Creative",
    reports_to: "content_manager",
    modelTier: "fast",
    avatar: "🎨",
    rubric: ["Hook engagement", "Value delivery", "Clear single CTA"],
    tools: ["copywriter_suite", "caption_generator"],
    description: "Drafts captions, carousel slides, hooks, and localized copy variations.",
  },

  designer: {
    id: "designer",
    title: "Visual Designer & Art Director",
    displayName: "Visual Art Director",
    department: "Creative",
    reports_to: "content_manager",
    modelTier: "fast",
    avatar: "🖼️",
    rubric: ["Design layout harmony", "Text contrast & no clipping", "Mobile readability"],
    tools: ["template_renderer", "svg_builder"],
    description: "Creates high-converting 1080x1080 design cards and visual briefs.",
  },

  video: {
    id: "video",
    title: "Video & 9:16 Reel Scriptwriter",
    displayName: "Reels & Video Specialist",
    department: "Creative",
    reports_to: "content_manager",
    modelTier: "fast",
    avatar: "🎬",
    rubric: ["3-second hook rate", "On-screen text max 80 chars", "Voiceover timing"],
    tools: ["reel_engine", "shot_planner"],
    description: "Writes scene-by-scene 9:16 vertical video scripts and voiceover cues.",
  },

  performance: {
    id: "performance",
    title: "Paid Media & Ad Funnel Specialist",
    displayName: "Paid Acquisition Specialist",
    department: "Performance",
    reports_to: "performance_manager",
    modelTier: "fast",
    avatar: "📊",
    rubric: ["Budget percentage consistency", "Ad format variety", "A/B test hypothesis"],
    tools: ["funnel_builder", "ab_matrix"],
    description: "Designs Meta and Google ad campaign structures, bidding rules, and A/B test matrices.",
  },

  critic: {
    id: "critic",
    title: "Critic & QA Evaluator",
    displayName: "Critic QA Evaluator",
    department: "Quality",
    reports_to: "hr_quality",
    modelTier: "strong",
    avatar: "🧐",
    rubric: ["Hallucination detection", "Score accuracy", "Specific constructive feedback"],
    tools: ["qa_rubric", "revision_evaluator"],
    description: "Scores deliverables on 5 dimensions and requests revisions if below threshold.",
  },
};

/** Get the manager responsible for reviewing a specific specialist's output */
export function getReviewerForAgent(agent: OrgRole): OrgRole {
  return AGENCY_ORG_CHART[agent]?.reports_to || "ceo";
}

/** Get all specialists reporting to a manager */
export function getTeamForManager(manager: OrgRole): OrgRole[] {
  return AGENCY_ORG_CHART[manager]?.directReports || [];
}

export interface ManagerDirectives {
  marketing: string;
  content: string;
  performance: string;
}

export function buildManagerDirectives(
  objectives: string[],
  kpis: string[],
  industryLabel: string
): ManagerDirectives {
  const primaryObj = objectives[0] || "Drive brand awareness and high-intent customer inquiries";
  const primaryKpi = kpis[0] || "Qualified lead volume and engagement rate";

  return {
    marketing: `Execute research, positioning, and 30-day calendar for ${industryLabel}. Primary objective: "${primaryObj}". Ensure zero cross-industry contamination.`,
    content: `Lead copywriting, visual design, and 9:16 reels. Focus on scroll-stopping hooks (<100 chars), high text contrast, and KPI-aligned CTAs for ${primaryKpi}.`,
    performance: `Architect full-funnel ad structure (ToFU/MoFU/BoFU). Realistic CPL/CPA metrics only — never invent unverified pipeline figures.`,
  };
}

export interface ManagerItemReviewResult {
  passed: boolean;
  score: number;
  reviewer: string;
  feedback: string;
}

/** Evaluates an individual content item against the Content Manager domain rubric. */
export function reviewItemByContentManager(item: {
  topic: string;
  hook?: string;
  captions: string[];
  cta?: string;
}): ManagerItemReviewResult {
  const issues: string[] = [];
  let score = 90;

  const hook = item.hook || item.captions[0] || "";
  if (!hook || hook.length < 15) {
    issues.push("Hook is too short to stop scrolling");
    score -= 20;
  } else if (hook.length > 120) {
    issues.push("Hook exceeds recommended 100 character window");
    score -= 10;
  }

  const bannedPatterns = [/practical tip/i, /reply to learn more/i, /unlock your potential/i, /game changer/i];
  for (const pat of bannedPatterns) {
    if (pat.test(hook) || item.captions.some((c) => pat.test(c))) {
      issues.push(`Contains banned generic phrase matching ${pat}`);
      score -= 25;
    }
  }

  const cta = item.cta || "";
  if (!cta || cta.length < 5 || /click here/i.test(cta)) {
    issues.push("CTA lacks specific conversion action");
    score -= 15;
  }

  const passed = score >= 70;
  return {
    passed,
    score: Math.max(40, score),
    reviewer: AGENCY_ORG_CHART.content_manager.displayName,
    feedback: passed ? "Meets creative rubric standards" : issues.join("; "),
  };
}
