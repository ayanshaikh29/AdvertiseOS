import { z } from "zod";
import type { CalendarItem, DesignBrief, VideoPlan } from "@/lib/schemas";
import type { Asset, Item } from "@/lib/db/repo";

export type AgentRole =
  | "manager"
  | "strategist"
  | "researcher"
  | "brand_voice"
  | "performance"
  | "seo_sem"
  | "creative"
  | "critic"
  // Hierarchy roles:
  | "ceo"
  | "marketing_manager"
  | "content_manager"
  | "performance_manager"
  | "hr_quality"
  // Legacy aliases for backward compatibility:
  | "content"
  | "designer"
  | "video"
  | "reviewer";

export type TaskWorkflowStatus =
  | "IDLE"
  | "TASK_CREATED"
  | "COLLECTING_FACTS"
  | "READY_TO_EXECUTE"
  | "PLANNING"
  | "AGENT_EXECUTION"
  | "QUALITY_REVIEW"
  | "REVISION"
  | "DELIVERABLE_READY"
  | "COMPLETED";

export type DataClassification = "verified" | "user_provided" | "demo" | "unknown";

export interface FactRecord {
  field: string;
  value: string;
  source: "user" | "brand" | "demo";
  verificationStatus: "verified" | "user_provided" | "demo" | "unknown";
  dataClassification: "verified" | "demo" | "unverified";
  timestamp: string;
  confidence: number;
}

export interface ActiveTask {
  id: string;
  conversationId: string;
  status: TaskWorkflowStatus;
  originalRequest: string;
  intent: import("@/lib/schemas").RequestIntent;
  collectedFacts: Record<string, FactRecord>;
  missingQuestions: Array<{ fact: string; question: string; blocking: boolean }>;
  isDemoMode: boolean;
  campaignId?: string;
  industryKey?: string;
  deliverableRequirements: {
    postsCount: number;
    reelsCount: number;
    adCount: number;
    durationDays: number;
    budget?: number;
    platforms: string[];
    formats: string[];
    visualBriefCount?: number;
  };
  historySummary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentActivity {
  agent: AgentRole;
  displayName: string;
  avatar: string;
  status: "idle" | "thinking" | "in_progress" | "review" | "completed" | "error";
  currentTask?: string;
  startedAt?: string;
  completedAt?: string;
  latencyMs?: number;
  costUsd?: number;
  notes?: string;
  subtaskId?: string;
  criticScore?: number;
  revisionCount?: number;
  outputPreview?: string;
  taskId?: string;
  inputSummary?: string;
  outputRef?: string;
  verificationResult?: "passed" | "revision_needed" | "pending";
  errorDetails?: string;
  reports_to?: string;
  reviewedBy?: string;
  managerRubric?: string[];
}

export interface DeliverableAudit {
  kind: "audit";
  brandName: string;
  overview: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  score: number;
  dataSources?: string[];
  limitedData?: boolean;
}

export interface DeliverableClarifications {
  kind: "clarifications";
  questions: Array<{ fact: string; question: string; blocking: boolean }>;
  canProceedWithDraft: boolean;
  proceedNote: string;
  optionalFollowUps: string[];
}

export interface DeliverableStrategy {
  kind: "strategy";
  month: string;
  objectives: string[];
  kpis: string[];
  pillars: string[];
  audienceInsights: string[];
  tactics: string[];
  positioning?: string;
  planB?: string;
  recommendedChannels?: Array<{ channel: string; rationale: string }>;
  budgetAssumptions?: string;
  risks?: string[];
  executiveSummary?: string;
  audienceSegments?: Array<{ name: string; insight: string; channel: string }>;
  funnelStages?: Array<{ stage: string; goal: string; content: string }>;
}

export interface CompetitorInsight {
  name: string;
  url?: string;
  strengths: string[];
  weaknesses: string[];
  marketGap: string;
  sourceUrl?: string;
}

export interface MarketTrendRef {
  title: string;
  url: string;
  source: string;
  publishedAt?: string;
}

export interface SeasonalEventRef {
  date: string;
  name: string;
  angle: string;
  market?: string;
}

export interface IndustryBenchmarkRef {
  metric: string;
  rangeLabel: string;
  note: string;
}

export interface DeliverableResearch {
  kind: "research";
  brandName: string;
  industry: string;
  researchDate: string;
  competitors: CompetitorInsight[];
  targetPersonas: Array<{
    name: string;
    painPoints: string[];
    motivations: string[];
    preferredChannels: string[];
  }>;
  marketOpportunities: string[];
  sources: Array<{ title: string; url: string }>;
  /** Live 2026 market intelligence collected from multi-source feeds. */
  trends?: MarketTrendRef[];
  seasonalEvents?: SeasonalEventRef[];
  benchmarks?: IndustryBenchmarkRef[];
  dataSources?: string[];
}

export interface DeliverableBrandVoice {
  kind: "brand_voice";
  brandName: string;
  toneDescriptors: string[];
  coreMessagingPillars: string[];
  vocabularyDos: string[];
  vocabularyDonts: string[];
  complianceRules: string[];
  sampleVoiceComparison: {
    inCharacter: string;
    outOfCharacter: string;
  };
}

export interface DeliverableSeo {
  kind: "seo";
  brandName: string;
  targetFocus: string;
  keywordClusters: Array<{
    topic: string;
    keywords: Array<{ keyword: string; intent: "informational" | "commercial" | "transactional"; priority: "high" | "medium" | "low" }>;
  }>;
  onPageChecklist: string[];
  metaRecommendations: Array<{
    page: string;
    metaTitle: string;
    metaDescription: string;
  }>;
  contentGapOpportunities: string[];
}

export interface DeliverablePerformance {
  kind: "performance";
  brandName: string;
  totalBudget?: number;
  campaignStructure: Array<{
    stage: "Top of Funnel (Awareness)" | "Middle of Funnel (Retargeting)" | "Bottom of Funnel (Conversion)";
    budgetSplitPct: number;
    recommendedChannels: string[];
    audienceTargeting: string[];
    adFormats: string[];
    primaryKpi: string;
  }>;
  biddingStrategy: string;
  abTestMatrix: string[];
  notes: string;
}

export interface DeliverableCritic {
  kind: "critic";
  overallScore: number;
  passed: boolean;
  revisionCycle: number;
  criteria: Array<{
    name: string;
    score: number;
    feedback: string;
  }>;
  issues: Array<{ severity: "low" | "medium" | "high"; text: string; fixApplied?: string }>;
  verdict: string;
}

export interface DeliverableCalendar {
  kind: "calendar";
  month: string;
  items: CalendarItem[];
}

export interface DeliverableCreatives {
  kind: "creatives";
  items: Array<{
    id: string;
    headline: string;
    subtext: string;
    topic: string;
    format: string;
    platform: string;
    imageUrl?: string;
    svg?: string;
    templateId: string;
    design: DesignBrief;
    provider?: string;
  }>;
}

export interface DeliverableVideos {
  kind: "videos";
  plans: Array<{
    topic: string;
    duration: number;
    aspect: string;
    musicMood: string;
    scenes: Array<{
      n: number;
      visual: string;
      shotType: string;
      duration_s: number;
      onScreenText: string;
      voiceover: string;
    }>;
  }>;
}

export interface DeliverableContentPosts {
  kind: "content_posts";
  items: Item[];
}

export interface DeliverableSummary {
  kind: "summary";
  headline: string;
  bulletPoints: string[];
  recommendedNextSteps: string[];
  totalPosts: number;
  totalCreatives: number;
  totalReels: number;
  qualityScore: number;
  verificationBadge?: "AI Verified" | "Critic Revision Required" | "Draft";
}

export interface DeliverableCrmLeads {
  kind: "crm_leads";
  brandName: string;
  leadTargetAudience: string;
  pipelineStages: Array<{ name: string; count: number; valueUsd?: number }>;
  recommendedFollowUps: Array<{
    leadName: string;
    channel: "email" | "whatsapp" | "call" | "instagram_dm";
    trigger: string;
    suggestedMessage: string;
  }>;
  hasLiveData?: boolean;
  dataNote?: string;
}

export interface DeliverableOverview {
  kind: "overview";
  brandName: string;
  projectName: string;
  location: string;
  priceRange: string;
  budget: string;
  isDemoMode: boolean;
  objectives: string[];
  targetAudience: string[];
  deliverablesSummary: {
    postsCount: number;
    reelsCount: number;
    calendarDays: number;
    adBudget: string;
  };
  additionalDeliverables: string[];
}

export type Deliverable =
  | DeliverableOverview
  | DeliverableAudit
  | DeliverableClarifications
  | DeliverableStrategy
  | DeliverableResearch
  | DeliverableBrandVoice
  | DeliverableSeo
  | DeliverablePerformance
  | DeliverableCritic
  | DeliverableCalendar
  | DeliverableCreatives
  | DeliverableVideos
  | DeliverableContentPosts
  | DeliverableCrmLeads
  | DeliverableSummary;

export interface ChatAttachment {
  name: string;
  type: "file" | "image" | "brief";
  size?: number;
  url?: string;
  contentPreview?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  attachments?: ChatAttachment[];
  agentActivities?: AgentActivity[];
  deliverables?: Deliverable[];
  campaignId?: string;
  status?: "pending" | "streaming" | "completed" | "error";
  error?: string;
}

export interface Conversation {
  id: string;
  brandId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  summary?: string;
  lastMessage?: string;
  messageCount: number;
  status?: "active" | "completed" | "archived";
  tags?: string[];
}
