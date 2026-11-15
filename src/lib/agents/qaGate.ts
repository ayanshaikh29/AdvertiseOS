import type { RequestIntent } from "@/lib/schemas";
import type { IndustryKey } from "@/lib/agents/industry";
import { findContamination } from "@/lib/agents/industry";

export type QACheckSeverity = "critical" | "high" | "medium";

export interface QAFailure {
  code: string;
  message: string;
  severity: QACheckSeverity;
  required?: number;
  actual?: number;
}

export interface MandatoryRequirements {
  requiredPosts: number;
  requiredReels: number;
  requiredVisualBriefs: number;
  expectedIndustry: IndustryKey;
  expectedPlatforms: string[];
  requireUniquePosts: boolean;
  forbidForeignPlatforms: boolean;
}

export interface ActualDeliverables {
  posts: Array<{
    id?: string;
    topic: string;
    platform: string;
    format: string;
    captions: string[];
    hook?: string;
    audience?: string;
  }>;
  reels: Array<{ topic: string; scenes: unknown[]; duration?: number; aspect?: string }>;
  visualBriefs: Array<{ topic: string; headline?: string }>;
  strategyText?: string;
  sampleCaption?: string;
  allTextBlob?: string;
}

export interface QAGateResult {
  passed: boolean;
  failures: QAFailure[];
  score: number;
  counts: {
    requiredPosts: number;
    actualPosts: number;
    requiredReels: number;
    actualReels: number;
    requiredVisualBriefs: number;
    actualVisualBriefs: number;
  };
}

function uniqueTopicRatio(posts: ActualDeliverables["posts"]): number {
  if (posts.length === 0) return 0;
  const topics = posts.map((p) => p.topic.trim().toLowerCase());
  const hooks = posts.map((p) => (p.hook ?? "").trim().toLowerCase());
  const captions = posts.map((p) => (p.captions[0] ?? "").trim().toLowerCase().slice(0, 120));
  const keys = topics.map((t, i) => `${t}|${hooks[i]}|${captions[i]}`);
  return new Set(keys).size / posts.length;
}

function repeatedTemplateScore(posts: ActualDeliverables["posts"]): number {
  if (posts.length < 2) return 0;
  const starts = posts.map((p) => (p.captions[0] ?? "").trim().toLowerCase().slice(0, 80));
  const counts = new Map<string, number>();
  for (const s of starts) counts.set(s, (counts.get(s) ?? 0) + 1);
  let maxRepeat = 0;
  for (const c of counts.values()) maxRepeat = Math.max(maxRepeat, c);
  return maxRepeat;
}

export function buildMandatoryRequirements(params: {
  intent: RequestIntent;
  industry: IndustryKey;
  postsCount: number;
  reelsCount: number;
  visualBriefCount: number;
}): MandatoryRequirements {
  const { intent, industry, postsCount, reelsCount, visualBriefCount } = params;
  const platforms = intent.platforms?.length ? intent.platforms : ["instagram"];
  const wantsReels = reelsCount > 0 || intent.needs_video || intent.formats?.includes("reel");
  const wantsDesign =
    visualBriefCount > 0 ||
    intent.needs_design ||
    intent.kind === "creative_only" ||
    intent.kind === "full_campaign" ||
    intent.kind === "content_calendar";

  return {
    requiredPosts: postsCount,
    requiredReels: wantsReels ? Math.max(reelsCount, intent.reel_count || 0) : 0,
    requiredVisualBriefs: wantsDesign ? visualBriefCount : 0,
    expectedIndustry: industry,
    expectedPlatforms: platforms,
    requireUniquePosts: postsCount > 1,
    forbidForeignPlatforms: true,
  };
}

/** Hard mandatory acceptance rules. A high numeric score can NEVER override a failed mandatory check. */
export function evaluateMandatoryGate(
  req: MandatoryRequirements,
  actual: ActualDeliverables
): QAGateResult {
  const failures: QAFailure[] = [];

  if (actual.posts.length < req.requiredPosts) {
    failures.push({
      code: "MISSING_POSTS",
      message: `Required ${req.requiredPosts} posts, generated ${actual.posts.length}.`,
      severity: "critical",
      required: req.requiredPosts,
      actual: actual.posts.length,
    });
  }

  if (actual.reels.length < req.requiredReels) {
    failures.push({
      code: "MISSING_REELS",
      message: `Required ${req.requiredReels} complete reel scripts, generated ${actual.reels.length}.`,
      severity: "critical",
      required: req.requiredReels,
      actual: actual.reels.length,
    });
  }

  for (const reel of actual.reels) {
    const sceneCount = Array.isArray(reel.scenes) ? reel.scenes.length : 0;
    if (sceneCount < 3) {
      failures.push({
        code: "INCOMPLETE_REEL",
        message: `Reel "${reel.topic}" has ${sceneCount} scenes (minimum 3 required for a complete script).`,
        severity: "critical",
        actual: sceneCount,
        required: 3,
      });
    }
  }

  if (actual.visualBriefs.length < req.requiredVisualBriefs) {
    failures.push({
      code: "MISSING_VISUAL_BRIEFS",
      message: `Required ${req.requiredVisualBriefs} visual design briefs, generated ${actual.visualBriefs.length}.`,
      severity: "critical",
      required: req.requiredVisualBriefs,
      actual: actual.visualBriefs.length,
    });
  }

  if (req.requireUniquePosts && actual.posts.length > 1) {
    const ratio = uniqueTopicRatio(actual.posts);
    if (ratio < 0.8) {
      failures.push({
        code: "DUPLICATE_POSTS",
        message: `Posts are not unique enough (${Math.round(ratio * 100)}% unique). Each post needs a distinct topic/hook/caption angle.`,
        severity: "critical",
        actual: Math.round(ratio * 100),
        required: 80,
      });
    }
    const maxRepeat = repeatedTemplateScore(actual.posts);
    if (maxRepeat >= 3) {
      failures.push({
        code: "REPEATED_CAPTION_TEMPLATE",
        message: `Same caption template repeated ${maxRepeat} times. Generic copy-paste captions are not acceptable.`,
        severity: "critical",
        actual: maxRepeat,
        required: 2,
      });
    }
  }

  if (req.forbidForeignPlatforms && actual.posts.length > 0) {
    const allowed = new Set(req.expectedPlatforms.map((p) => p.toLowerCase()));
    const foreign = actual.posts.filter((p) => !allowed.has((p.platform || "").toLowerCase()));
    if (foreign.length > 0) {
      const platforms = [...new Set(foreign.map((p) => p.platform))].join(", ");
      failures.push({
        code: "PLATFORM_MISMATCH",
        message: `${foreign.length} post(s) target unrequested platform(s): ${platforms}. Allowed: ${req.expectedPlatforms.join(", ")}.`,
        severity: "critical",
        actual: foreign.length,
        required: 0,
      });
    }
  }

  const contaminationSources = [
    actual.strategyText ?? "",
    actual.sampleCaption ?? "",
    actual.allTextBlob ?? "",
    ...actual.posts.flatMap((p) => p.captions),
    ...actual.posts.map((p) => p.audience ?? ""),
    ...actual.reels.map((r) => r.topic),
    ...actual.visualBriefs.map((v) => `${v.topic} ${v.headline ?? ""}`),
  ].join("\n");

  const contamination = findContamination(contaminationSources, req.expectedIndustry);
  if (contamination.length > 0) {
    failures.push({
      code: "CONTEXT_CONTAMINATION",
      message: `Output contains foreign industry terms for ${req.expectedIndustry}: ${[...new Set(contamination)].slice(0, 8).join(", ")}.`,
      severity: "critical",
      actual: contamination.length,
      required: 0,
    });
  }

  const critical = failures.filter((f) => f.severity === "critical");
  const high = failures.filter((f) => f.severity === "high");
  const medium = failures.filter((f) => f.severity === "medium");

  let score = 100;
  score -= critical.length * 25;
  score -= high.length * 15;
  score -= medium.length * 8;
  score = Math.max(0, score);

  // Mandatory rule: any critical failure forces overall failed QA regardless of score.
  const passed = critical.length === 0 && high.length === 0;

  return {
    passed,
    failures,
    score: passed ? score : Math.min(score, 74),
    counts: {
      requiredPosts: req.requiredPosts,
      actualPosts: actual.posts.length,
      requiredReels: req.requiredReels,
      actualReels: actual.reels.length,
      requiredVisualBriefs: req.requiredVisualBriefs,
      actualVisualBriefs: actual.visualBriefs.length,
    },
  };
}

export function formatGateFailures(failures: QAFailure[]): string {
  if (!failures.length) return "All mandatory acceptance checks passed.";
  return failures.map((f) => `- [${f.severity.toUpperCase()}] ${f.code}: ${f.message}`).join("\n");
}
