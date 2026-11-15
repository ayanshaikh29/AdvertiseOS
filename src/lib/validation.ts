import { z } from "zod";
import type { ContentItem, CalendarItem, DesignBrief, VideoPlan, CeoReview } from "@/lib/schemas";
import type { CampaignContext } from "@/lib/campaignContext";

export interface ValidationResult {
  passed: boolean;
  issues: ValidationIssue[];
  score: number;
}

export interface ValidationIssue {
  severity: "low" | "medium" | "high" | "critical";
  code: string;
  message: string;
  field?: string;
  suggestion?: string;
}

export interface ContentValidationInput {
  content: ContentItem;
  calendarItem: CalendarItem;
  context: CampaignContext;
  existingContent: Array<{ topic: string; hook: string; caption: string }>;
}

export interface DesignValidationInput {
  design: DesignBrief;
  calendarItem: CalendarItem;
  content: ContentItem;
  context: CampaignContext;
}

export interface VideoValidationInput {
  video: VideoPlan;
  calendarItem: CalendarItem;
  context: CampaignContext;
}

export interface ReviewValidationInput {
  review: CeoReview;
  content: ContentItem;
  context: CampaignContext;
}

/** Check for placeholder/incomplete content */
function checkPlaceholders(text: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const placeholders = [
    { pattern: /reply to learn more/i, message: "Incomplete CTA placeholder detected" },
    { pattern: /practical tip/i, message: "Banned generic filler phrase: 'practical tip'" },
    { pattern: /unlock your potential/i, message: "Banned generic buzzword: 'unlock your potential'" },
    { pattern: /game changer/i, message: "Banned generic buzzword: 'game changer'" },
    { pattern: /in today's fast-paced world/i, message: "Banned clichéd intro: 'in today's fast-paced world'" },
    { pattern: /elevate your/i, message: "Banned marketing cliché: 'elevate your'" },
    { pattern: /learn more\.?$/i, message: "Caption ends with generic 'learn more'" },
    { pattern: /contact us for more/i, message: "Generic 'contact us' placeholder" },
    { pattern: /dm us/i, message: "Generic DM CTA without specific action" },
    { pattern: /save this for later/i, message: "Generic engagement bait" },
    { pattern: /what should we cover next/i, message: "Generic follow-up question" },
    { pattern: /\.\.\.$/, message: "Caption ends with ellipsis (incomplete)" },
    { pattern: /^[\s\S]{0,20}$/, message: "Caption too short (likely incomplete)" },
  ];

  for (const p of placeholders) {
    if (p.pattern.test(text)) {
      issues.push({
        severity: "high",
        code: "PLACEHOLDER_CONTENT",
        message: p.message,
        suggestion: "Replace with specific, actionable CTA tied to campaign objective",
      });
    }
  }
  return issues;
}

/** Check for invented claims not in context */
function checkInventedClaims(text: string, context: CampaignContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const knownFacts = [
    context.brand.products.toLowerCase(),
    context.brand.usp.toLowerCase(),
    context.brand.audience.toLowerCase(),
    context.brief.goal.toLowerCase(),
    context.brief.offers?.toLowerCase() ?? "",
    context.brief.festivals?.toLowerCase() ?? "",
    ...context.catalog?.map(c => c.name.toLowerCase()) ?? [],
    ...context.catalog?.map(c => c.description.toLowerCase()) ?? [],
  ].join(" ");

  // Check for specific numbers not in context
  const numericClaims = text.match(/\b\d+(\.\d+)?\s*(%|percent|x|crore|lakh|k|thousand|million|billion|clients?|customers?|leads?|sales?|revenue|roi|roas|cpl|cpa|ctr|cpc)\b/gi);
  if (numericClaims) {
    for (const claim of numericClaims) {
      const normalized = claim.toLowerCase();
      const firstWord = normalized.split(" ")[0] ?? "";
      if (firstWord && !knownFacts.includes(firstWord)) {
        issues.push({
          severity: "high",
          code: "UNVERIFIED_NUMERIC_CLAIM",
          message: `Unverified numeric claim: "${claim}"`,
          suggestion: "Remove or replace with verified data from brand profile/catalog",
        });
      }
    }
  }

  // Check for superlatives
  const superlatives = /#1|best in (india|world|city)|guaranteed|assured results|no\.?\s?1|top.?rated|award.?winning|industry.?leader/i;
  if (superlatives.test(text)) {
    issues.push({
      severity: "high",
      code: "UNSUPPORTED_SUPERLATIVE",
      message: "Superlative/guarantee detected without brand-profile support",
      suggestion: "Remove or cite specific brand-profile fact",
    });
  }

  // Check for invented social proof
  const socialProof = /testimonial|client (said|review)|customer (said|review)|"[^"]*"\s*[-—]\s*\w+/i;
  if (socialProof.test(text)) {
    issues.push({
      severity: "high",
      code: "INVENTED_SOCIAL_PROOF",
      message: "Possible invented testimonial/social proof",
      suggestion: "Remove or cite approved real source",
    });
  }

  return issues;
}

/** Check campaign relevance */
function checkCampaignRelevance(text: string, context: CampaignContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const goalKeywords = context.brief.goal.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const productKeywords = context.brand.products.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const allKeywords = [...new Set([...goalKeywords, ...productKeywords])];

  // Check if content mentions at least one relevant keyword
  const hasRelevantKeyword = allKeywords.some(kw => text.toLowerCase().includes(kw));
  if (!hasRelevantKeyword && allKeywords.length > 0) {
    issues.push({
      severity: "medium",
      code: "LOW_CAMPAIGN_RELEVANCE",
      message: "Content doesn't reference campaign objective or products",
      suggestion: `Include keywords related to: ${allKeywords.slice(0, 5).join(", ")}`,
    });
  }

  // Check for generic marketing agency content when campaign is different
  const genericAgency = /digital marketing|seo|social media management|web development|ppc management|content marketing|email marketing|lead generation|branding agency|marketing agency|digital agency/i;
  if (genericAgency.test(text) && !context.brand.products.toLowerCase().includes("digital marketing")) {
    issues.push({
      severity: "high",
      code: "WRONG_INDUSTRY_CONTENT",
      message: "Content describes digital marketing agency services instead of campaign product",
      suggestion: "Rewrite to focus on the actual campaign product/service",
    });
  }

  return issues;
}

/** Check for duplicate/similar content */
export function checkDuplicates(
  hook: string,
  caption: string,
  existingContent: Array<{ topic: string; hook: string; caption: string }>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  for (const existing of existingContent) {
    // Check hook similarity (simple word overlap)
    const hookWords = new Set(hook.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const existingHookWords = new Set(existing.hook.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const hookOverlap = [...hookWords].filter(w => existingHookWords.has(w)).length;
    const hookSimilarity = hookOverlap / Math.max(hookWords.size, 1);
    
    if (hookSimilarity > 0.6) {
      issues.push({
        severity: "high",
        code: "DUPLICATE_HOOK",
        message: `Hook is ${Math.round(hookSimilarity * 100)}% similar to existing: "${existing.hook}"`,
        suggestion: "Create a substantively different angle/hook",
      });
    }

    // Check caption similarity
    const captionWords = new Set(caption.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const existingCaptionWords = new Set(existing.caption.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const captionOverlap = [...captionWords].filter(w => existingCaptionWords.has(w)).length;
    const captionSimilarity = captionOverlap / Math.max(captionWords.size, 1);
    
    if (captionSimilarity > 0.5) {
      issues.push({
        severity: "medium",
        code: "SIMILAR_CAPTION",
        message: `Caption is ${Math.round(captionSimilarity * 100)}% similar to existing content`,
        suggestion: "Ensure substantive difference in message, not just wording",
      });
    }
  }

  return issues;
}

/** Chat-path helper: duplicate check only (used by orchestrator uniqueness loop). */
export function checkDuplicatesForItem(
  hook: string,
  caption: string,
  existingContent: Array<{ topic: string; hook: string; caption: string }>
): ValidationIssue[] {
  return checkDuplicates(hook, caption, existingContent);
}

/** Validate content item */
export function validateContent(input: ContentValidationInput): ValidationResult {
  const issues: ValidationIssue[] = [];
  const { content, calendarItem, context, existingContent } = input;
  const captionVariants = Array.isArray(content?.caption_variants) ? content.caption_variants : [];

  // Check all caption variants
  for (let i = 0; i < captionVariants.length; i++) {
    const caption = captionVariants[i] as string;
    const variantIssues = [
      ...checkPlaceholders(caption),
      ...checkInventedClaims(caption, context),
      ...checkCampaignRelevance(caption, context),
      ...checkDuplicates(captionVariants[0] ?? "", caption, existingContent),
    ];
    issues.push(...variantIssues.map(issue => ({ ...issue, field: `caption_variants[${i}]` })));
  }

  // Check hook
  const hookStr = String(calendarItem?.hook || "");
  issues.push(...checkPlaceholders(hookStr));
  issues.push(...checkInventedClaims(hookStr, context));
  issues.push(...checkDuplicates(hookStr, captionVariants[0] ?? "", existingContent));

  // Check CTA
  if (!content?.cta || content.cta.length < 10) {
    issues.push({
      severity: "high",
      code: "WEAK_CTA",
      message: "CTA is missing or too generic",
      field: "cta",
      suggestion: "Create specific, actionable CTA tied to conversion goal",
    });
  }

  // Check hashtags relevance
  const hashtags = Array.isArray(content?.hashtags) ? content.hashtags : [];
  const irrelevantHashtags = hashtags.filter(tag => 
    /digitaladvertise|smallbusiness|marketingtips/i.test(tag) && 
    !context.brand.products.toLowerCase().includes("marketing")
  );
  if (irrelevantHashtags.length > 0) {
    issues.push({
      severity: "medium",
      code: "IRRELEVANT_HASHTAGS",
      message: `Hashtags don't match campaign industry: ${irrelevantHashtags.join(", ")}`,
      field: "hashtags",
      suggestion: "Use industry/location-specific hashtags",
    });
  }

  // Check completeness
  if (!content.alt_text || content.alt_text.length < 10) {
    issues.push({
      severity: "low",
      code: "MISSING_ALT_TEXT",
      message: "Alt text is missing or too short",
      field: "alt_text",
    });
  }

  // Calculate score
  const criticalCount = issues.filter(i => i.severity === "critical").length;
  const highCount = issues.filter(i => i.severity === "high").length;
  const mediumCount = issues.filter(i => i.severity === "medium").length;
  const lowCount = issues.filter(i => i.severity === "low").length;

  let score = 100;
  score -= criticalCount * 25;
  score -= highCount * 15;
  score -= mediumCount * 8;
  score -= lowCount * 3;
  score = Math.max(0, score);

  return {
    passed: criticalCount === 0 && highCount === 0,
    issues,
    score,
  };
}

/** Validate design brief */
export function validateDesign(input: DesignValidationInput): ValidationResult {
  const issues: ValidationIssue[] = [];
  const { design, calendarItem, content, context } = input;

  if (!design.headline || design.headline.length < 5) {
    issues.push({ severity: "high", code: "MISSING_HEADLINE", message: "Headline is missing or too short", field: "headline" });
  }

  if (design.headline && design.headline.length > 80) {
    issues.push({ severity: "medium", code: "HEADLINE_TOO_LONG", message: "Headline exceeds 80 characters", field: "headline" });
  }

  if (design.subtext && design.subtext.length > 200) {
    issues.push({ severity: "low", code: "SUBTEXT_TOO_LONG", message: "Subtext exceeds 200 characters", field: "subtext" });
  }

  // Check design relevance to campaign
  const designText = `${design.headline} ${design.subtext} ${design.image_prompt}`;
  issues.push(...checkInventedClaims(designText, context).map(i => ({ ...i, field: "design" })));
  issues.push(...checkCampaignRelevance(designText, context).map(i => ({ ...i, field: "design" })));

  // Check template validity
  const validTemplates = ["bold-center", "split", "minimal", "festival"];
  if (!validTemplates.includes(design.template_id)) {
    issues.push({ severity: "high", code: "INVALID_TEMPLATE", message: `Invalid template: ${design.template_id}`, field: "template_id" });
  }

  // Check size format
  if (!/^\d+x\d+$/.test(design.size)) {
    issues.push({ severity: "medium", code: "INVALID_SIZE", message: `Invalid size format: ${design.size}`, field: "size" });
  }

  const criticalCount = issues.filter(i => i.severity === "critical").length;
  const highCount = issues.filter(i => i.severity === "high").length;
  const mediumCount = issues.filter(i => i.severity === "medium").length;
  const lowCount = issues.filter(i => i.severity === "low").length;

  let score = 100;
  score -= criticalCount * 25;
  score -= highCount * 15;
  score -= mediumCount * 8;
  score -= lowCount * 3;
  score = Math.max(0, score);

  return { passed: criticalCount === 0 && highCount === 0, issues, score };
}

/** Validate video plan */
export function validateVideo(input: VideoValidationInput): ValidationResult {
  const issues: ValidationIssue[] = [];
  const { video, calendarItem, context } = input;

  if (!video.scenes || video.scenes.length === 0) {
    issues.push({ severity: "critical", code: "NO_SCENES", message: "Video plan has no scenes", field: "scenes" });
  } else {
    for (let i = 0; i < video.scenes.length; i++) {
      const scene = video.scenes[i];
      if (!scene) continue;
      if (!scene.visual || scene.visual.length < 5) {
        issues.push({ severity: "high", code: "WEAK_VISUAL", message: `Scene ${scene.n}: visual description too weak`, field: `scenes[${i}].visual` });
      }
      if (!scene.voiceover || scene.voiceover.length < 10) {
        issues.push({ severity: "high", code: "WEAK_VOICEOVER", message: `Scene ${scene.n}: voiceover too short`, field: `scenes[${i}].voiceover` });
      }
      if (scene.on_screen_text.length > 80) {
        issues.push({ severity: "medium", code: "TEXT_TOO_LONG", message: `Scene ${scene.n}: on-screen text exceeds 80 chars`, field: `scenes[${i}].on_screen_text` });
      }
    }
  }

  const totalDuration = (video.scenes ?? []).reduce((sum, s) => sum + (s?.duration_s ?? 0), 0);
  if (Math.abs(totalDuration - video.duration_s) > 5) {
    issues.push({ severity: "medium", code: "DURATION_MISMATCH", message: `Scene durations (${totalDuration}s) don't match total (${video.duration_s}s)`, field: "duration_s" });
  }

  if (!video.captions_srt || video.captions_srt.length < 20) {
    issues.push({ severity: "medium", code: "MISSING_SRT", message: "SRT captions missing or too short", field: "captions_srt" });
  }

  // Check for invented claims in video
  const videoText = (video.scenes ?? []).map(s => `${s?.visual ?? ""} ${s?.voiceover ?? ""} ${s?.on_screen_text ?? ""}`).join(" ");
  issues.push(...checkInventedClaims(videoText, context).map(i => ({ ...i, field: "video" })));
  issues.push(...checkCampaignRelevance(videoText, context).map(i => ({ ...i, field: "video" })));

  const criticalCount = issues.filter(i => i.severity === "critical").length;
  const highCount = issues.filter(i => i.severity === "high").length;
  const mediumCount = issues.filter(i => i.severity === "medium").length;
  const lowCount = issues.filter(i => i.severity === "low").length;

  let score = 100;
  score -= criticalCount * 25;
  score -= highCount * 15;
  score -= mediumCount * 8;
  score -= lowCount * 3;
  score = Math.max(0, score);

  return { passed: criticalCount === 0 && highCount === 0, issues, score };
}

/** Validate CEO review */
export function validateReview(input: ReviewValidationInput): ValidationResult {
  const issues: ValidationIssue[] = [];
  const { review, content, context } = input;

  if (review.score < 0 || review.score > 100) {
    issues.push({ severity: "critical", code: "INVALID_SCORE", message: `Score out of range: ${review.score}`, field: "score" });
  }

  if (review.passed && review.score < 75) {
    issues.push({ severity: "high", code: "SCORE_PASS_MISMATCH", message: "Passed=true but score < 75", field: "passed" });
  }

  if (!review.passed && review.score >= 75) {
    issues.push({ severity: "medium", code: "SCORE_FAIL_MISMATCH", message: "Passed=false but score >= 75", field: "passed" });
  }

  if (!review.feedback_for_agent || review.feedback_for_agent.length < 10) {
    issues.push({ severity: "medium", code: "WEAK_FEEDBACK", message: "Feedback for agent is too short", field: "feedback_for_agent" });
  }

  const criticalCount = issues.filter(i => i.severity === "critical").length;
  const highCount = issues.filter(i => i.severity === "high").length;
  const mediumCount = issues.filter(i => i.severity === "medium").length;
  const lowCount = issues.filter(i => i.severity === "low").length;

  let score = 100;
  score -= criticalCount * 25;
  score -= highCount * 15;
  score -= mediumCount * 8;
  score -= lowCount * 3;
  score = Math.max(0, score);

  return { passed: criticalCount === 0 && highCount === 0, issues, score };
}

/** Regenerate failed items with stricter prompt */
export function buildRegenerationPrompt(
  originalTask: string,
  validationIssues: ValidationIssue[],
  context: CampaignContext
): string {
  const issueMessages = validationIssues
    .filter(i => i.severity === "critical" || i.severity === "high")
    .map(i => `- ${i.code}: ${i.message}${i.suggestion ? ` (Fix: ${i.suggestion})` : ""}`)
    .join("\n");

  return `${originalTask}\n\n---\n\nPREVIOUS OUTPUT FAILED VALIDATION. YOU MUST FIX THESE ISSUES:\n${issueMessages}\n\nREQUIREMENTS:\n- Address every issue above\n- Do not repeat the same mistakes\n- Output must pass all validation checks\n- Be specific to the campaign context provided`;
}