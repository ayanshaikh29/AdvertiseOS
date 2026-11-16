import { z } from "zod";
import {
  auditReportSchema,
  brandVoiceReportSchema,
  ceoPlanSchema,
  ceoReviewSchema,
  contentItemSchema,
  criticReportSchema,
  designSchema,
  hrReportSchema,
  performanceReportSchema,
  performanceStrategySchema,
  replyDraftSchema,
  researchReportSchema,
  seoReportSchema,
  socialPlanSchema,
  strategySchema,
  videoPlanSchema,
  type MetricRow,
} from "@/lib/schemas";
import { fallbackCalendar, hallucinationGuard, type BrandProfile } from "@/lib/brand";
import { runAgent } from "@/lib/agents/runner";

// ─────────────────────────────────────────────────────────────────────────────
// 1. STRATEGIST AGENT
// ─────────────────────────────────────────────────────────────────────────────

export function ceoPlanFallback(goal: string) {
  const primaryObjective = (goal || "Execute comprehensive marketing strategy").slice(0, 120).trim() || "Drive engagement and qualified leads";
  return {
    objectives: [primaryObjective, "Publish a consistent 30-day content calendar", "Collect human approvals before publishing"],
    kpis: ["Lead Conversion Rate", "CTR", "Follower Growth", "Brand Reach"],
    tasks: [
      { agent: "strategist" as const, description: "Build 30-day cross-platform calendar and pillars", depends_on: [], deadline_day: 2 },
      { agent: "content" as const, description: "Write captions, hooks + CTAs per calendar item", depends_on: ["strategist"], deadline_day: 5 },
    ],
    risks: ["Missing brand facts — flag instead of inventing"],
  };
}

export async function ceoPlan(brand: BrandProfile, fullContextPrompt: string) {
  return runAgent({
    agent: "ceo",
    brand,
    task: `${fullContextPrompt}\n\n---\n\nTASK: Create a campaign plan for this brief. Output objectives, kpis, tasks (strategist then content), risks. Every element must be specific to THIS campaign objective.`,
    schema: ceoPlanSchema,
    system: "You are the CEO orchestrator of a marketing agency. Plan small, concrete tasks. Review strictly. All outputs must be specific to the campaign brief provided.",
    taskType: "plan",
    fallback: () => ceoPlanFallback(fullContextPrompt),
  });
}

export async function strategistRun(brand: BrandProfile, fullContextPrompt: string, month: string) {
  return runAgent({
    agent: "strategist",
    brand,
    task: `${fullContextPrompt}\n\n---\n\nTASK: Month: ${month}. Build an agency-grade marketing strategy.
Requirements:
1. 3-4 content pillars and audience insights.
2. 30-day calendar (at least 10 items) with date, platform, format, topic, goal, hook, pillar, and why_now (festival, trend with source URL, seasonal offer, or evergreen angle).
3. executive_summary (3-4 sentences specific to this brief).
4. positioning: Unique market positioning statement.
5. plan_b: Contingency strategy if primary channels underperform.
6. audience_segments: 2-4 named segments with insight and best channel.
7. funnel_stages: 3 stages (Top/Middle/Bottom of Funnel) with goal and content ideas.
Every topic, hook, and goal must be actionable and commercial. Never return generic marketing filler.`,
    schema: strategySchema,
    system: "You are the Principal Marketing Strategist. Formulate structured, high-ROI campaign positioning and calendars. Balance channels and formats. Ground every recommendation in client goals.",
    taskType: "calendar",
    fallback: () => ({
      content_pillars: ["Education & Authority", "Customer Proof & Case Studies", "High-Converting Offer", "Behind The Scenes & Culture"],
      audience_insights: ["Target buyers require transparent pricing, authentic social proof, and rapid query resolution."],
      calendar: fallbackCalendar(month, {
        topics: [
          `${brand.name} — signature offer spotlight`,
          `Behind the scenes at ${brand.name}`,
          `Customer story: real results with ${brand.name}`,
          `${brand.name} FAQ — what customers ask most`,
          `Seasonal moment: timely angle for ${brand.name}`,
          `How ${brand.name} works, step by step`,
          `${brand.name} vs doing it yourself`,
          `Weekend special at ${brand.name}`,
        ],
      }),
      campaign_ideas: ["Limited-Time Promotional Sprint", "Interactive Problem-Solving Q&A", "Founder's Story Video"],
      festival_hooks: ["Seasonal Celebration Special", "Exclusive Holiday Consultation"],
      executive_summary: `${brand.name} will capture market share through high-trust educational content and targeted direct-response promotional hooks across primary channels.`,
      positioning: `${brand.name} is positioned as the high-trust, ROI-driven benchmark for ${brand.audience || "its target market"}.`,
      plan_b: "If organic reach plateaus, pivot to local influencer collaborations and community Q&A webinars.",
      audience_segments: [
        { name: "Primary Decision Makers", insight: "Value demonstrable ROI and zero-risk initial steps", channel: "LinkedIn" },
        { name: "Modern End-Users", insight: "Engage with visual breakdowns and real customer proof", channel: "Instagram" },
      ],
      funnel_stages: [
        { stage: "Top of Funnel (Awareness)", goal: "Educate on common industry pitfalls", content: "Industry myths carousel & reel breakdown" },
        { stage: "Middle of Funnel (Consideration)", goal: "Differentiate USP and showcase testimonials", content: "Before/After client walkthrough" },
        { stage: "Bottom of Funnel (Decision)", goal: "Drive consultation bookings", content: "Direct offer with risk-free guarantee" },
      ],
    }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MARKET RESEARCH AGENT
// ─────────────────────────────────────────────────────────────────────────────

export async function researcherRun(brand: BrandProfile, fullContextPrompt: string, query?: string) {
  return runAgent({
    agent: "researcher",
    brand,
    task: `${fullContextPrompt}\n\n---\n\nTASK: Perform in-depth market research and competitor intelligence for ${brand.name} in its industry.
Focus: "${query || "Analyze top 5 competitors, customer segments, SWOT and market opportunities"}".
Output requirements:
- industry name.
- research_date (current date).
- competitors: At least 3-5 real competitors with strengths, weaknesses, market_gap, and website/source URL.
- target_personas: At least 2 personas with specific pain_points, motivations, and preferred_channels.
- market_opportunities: 3-5 untapped market angles.
- sources: Array of researched references and data sources with title and URL.
Distinguish researched facts from strategic inferences. Never fabricate competitor names or fake data.`,
    schema: researchReportSchema,
    system: "You are the Market Research Specialist. Deliver factual competitor benchmarking, customer persona blueprints, and validated market opportunity analysis.",
    taskType: "researcher:competitors",
    grounding: true,
    fallback: () => ({
      industry: "Digital Marketing & Business Services",
      research_date: new Date().toISOString().slice(0, 10),
      competitors: [
        {
          name: "Local Market Leaders",
          strengths: ["Established client base", "High brand recall"],
          weaknesses: ["Slow turnaround times", "Generic automated messaging"],
          market_gap: "Transparent pricing and rapid personalized campaign execution",
        },
        {
          name: "National Boutique Agencies",
          strengths: ["High-budget creative production", "Celebrity endorsements"],
          weaknesses: ["Prohibitive pricing for growing businesses", "Rigid contracts"],
          market_gap: "Agile, performance-first retainers tailored for ROI",
        },
      ],
      target_personas: [
        {
          name: "Growth-Oriented Business Owner",
          pain_points: ["Wasted ad budget on generic agencies", "Lack of clear attribution reporting"],
          motivations: ["Consistent qualified sales enquiries", "Clear, predictable ROI"],
          preferred_channels: ["Instagram", "LinkedIn", "WhatsApp"],
        },
      ],
      market_opportunities: [
        "Short-form vertical video addressing immediate customer objections",
        "Direct-message automated lead qualification workflows",
        "Transparent case-study breakdowns demonstrating actual client results",
      ],
      sources: [
        { title: `${brand.name} Brand Intelligence Profile`, url: "internal://brand-profile" },
        { title: "Digital Advertising Industry Benchmarks", url: "https://hubspot.com/marketing-statistics" },
      ],
    }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. BRAND VOICE AGENT
// ─────────────────────────────────────────────────────────────────────────────

export async function brandVoiceRun(brand: BrandProfile, fullContextPrompt: string) {
  return runAgent({
    agent: "brand_voice",
    brand,
    task: `${fullContextPrompt}\n\n---\n\nTASK: Formulate the definitive Brand Voice & Messaging Guidelines for ${brand.name}.
Include:
- tone_descriptors (3-5 adjectives defining voice, e.g. authoritative, empathetic, concise).
- core_messaging_pillars (3-4 foundational value themes).
- vocabulary_dos (5-8 words/phrases to consistently use).
- vocabulary_donts (5-8 cliches, forbidden buzzwords, or unverified claims to avoid).
- compliance_rules (specific guardrails on numbers, guarantees, and legal claims).
- sample_voice_comparison: in_character vs out_of_character example post copy.`,
    schema: brandVoiceReportSchema,
    system: "You are the Brand Voice Architect. Enforce linguistic consistency, vocabulary boundaries, and emotional resonance across all agency deliverables.",
    taskType: "brand_voice:guidelines",
    fallback: () => ({
      tone_descriptors: [brand.tone || "Professional", "Direct", "High-Value", "Transparent"],
      core_messaging_pillars: [
        "Clarity over complexity",
        "Demonstrable business results",
        "Customer-first accountability",
      ],
      vocabulary_dos: ["proven", "measurable ROI", "step-by-step", "transparent", "custom strategy"],
      vocabulary_donts: ["guaranteed overnight success", "#1 in the world", "secret hack", "cheap", "best ever"],
      compliance_rules: [
        "Never promise specific revenue numbers without client verification.",
        "Always state that past campaign performance does not guarantee future results.",
        "All claims must be supported by client-documented facts.",
      ],
      sample_voice_comparison: {
        in_character: `At ${brand.name}, we don't believe in vanity metrics. Here is the exact framework we used to scale qualified inquiries this quarter.`,
        out_of_character: "Get 10,000 followers overnight with this one secret viral trick! Guaranteed!",
      },
    }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PERFORMANCE MARKETING AGENT
// ─────────────────────────────────────────────────────────────────────────────

export async function performanceStrategyRun(brand: BrandProfile, fullContextPrompt: string, budget?: number | null) {
  return runAgent({
    agent: "performance",
    brand,
    task: `${fullContextPrompt}\n\n---\n\nTASK: Design a complete Paid Advertising Campaign Architecture for ${brand.name}.
Budget specified: ${budget ? `₹${budget.toLocaleString("en-IN")}` : "Not stated — provide proportional framework"}.
Requirements:
1. campaign_structure across 3 stages:
   - Top of Funnel (Awareness): Budget %, channels (Meta/Google), audience targeting, formats, primary KPI.
   - Middle of Funnel (Retargeting): Budget %, channels, custom/lookalike audiences, formats, primary KPI.
   - Bottom of Funnel (Conversion): Budget %, channels, intent-driven targeting, formats, primary KPI.
2. bidding_strategy: e.g., Cost Cap / Lowest Cost / Target CPA recommendations.
3. ab_test_matrix: 3-4 concrete A/B testing hypotheses (hooks, creatives, audiences).
4. execution_note: Explicit reminder that ad spend requires human approval before launch.`,
    schema: performanceStrategySchema,
    system: "You are the Performance Marketing Director. Build scalable Meta & Google ad campaigns with disciplined budget allocation and clear ROAS targets.",
    taskType: "performance:strategy",
    fallback: () => ({
      total_budget: budget || null,
      campaign_structure: [
        {
          stage: "Top of Funnel (Awareness)" as const,
          budget_split_pct: 50,
          recommended_channels: ["Meta Ads (Instagram & Facebook)", "YouTube Shorts"],
          audienceTargeting: ["Broad demographic interest", "Competitor audience lookalikes (1-2%)"],
          audience_targeting: ["Industry Interest Targeting", "Lookalike 1% of Past Enquiries"],
          ad_formats: ["Short-form Video Reels", "Carousel Value Decks"],
          primary_kpi: "Cost Per 1,000 Impressions (CPM) & Video Hook Rate (>30%)",
        },
        {
          stage: "Middle of Funnel (Retargeting)" as const,
          budget_split_pct: 30,
          recommended_channels: ["Instagram Feed", "Facebook Video Feed"],
          audience_targeting: ["Website visitors (last 30 days)", "Instagram page engagers (last 60 days)"],
          ad_formats: ["Client Case Study Carousel", "Overcoming Objections Video"],
          primary_kpi: "Cost Per Click (CPC) & Click-Through Rate (CTR > 1.8%)",
        },
        {
          stage: "Bottom of Funnel (Conversion)" as const,
          budget_split_pct: 20,
          recommended_channels: ["Meta Lead Forms", "Google Search High-Intent Keywords"],
          audience_targeting: ["Engaged leads who have not booked a consultation"],
          ad_formats: ["Direct Offer with Limited Consultation Slots", "WhatsApp Click-to-Chat Ad"],
          primary_kpi: "Cost Per Qualified Lead (CPL) & Conversion Rate",
        },
      ],
      bidding_strategy: "Start with Lowest Cost (Auto-bid) for initial 50 conversions to exit learning phase, then transition to Target CPA / Cost Cap.",
      ab_test_matrix: [
        "Hook Test: Problem-led opening vs. Direct benefit opening",
        "Format Test: 1080x1080 Static graphic vs. 9:16 Vertical Reel walkthrough",
        "CTA Test: 'Book Free Discovery Call' vs. 'Claim Strategy Audit'",
      ],
      execution_note: "Planning blueprint only. No live campaigns will be launched or budget debited without explicit client confirmation.",
    }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. SEO / SEM AGENT
// ─────────────────────────────────────────────────────────────────────────────

export async function seoRun(brand: BrandProfile, fullContextPrompt: string, topic?: string) {
  return runAgent({
    agent: "seo",
    brand,
    task: `${fullContextPrompt}\n\n---\n\nTASK: Deliver a comprehensive Search Engine Optimization (SEO & SEM) Strategy for ${brand.name}.
Focus: "${topic || "Organic visibility, keyword rankings, and high-intent commercial search discovery"}".
Requirements:
1. target_focus: Primary domain of expertise.
2. keyword_clusters: 2-3 topic clusters containing 3-5 keywords each with intent (informational, commercial, transactional) and priority.
3. on_page_checklist: 5-8 concrete technical/content steps (H1, URL structure, schema markup, mobile speed, internal linking).
4. meta_recommendations: At least 2 page examples with meta_title (<60 chars) and meta_description (<155 chars with CTA).
5. content_gap_opportunities: 3 topics where competitors are weak and ${brand.name} can rank rapidly.`,
    schema: seoReportSchema,
    system: "You are the Senior SEO/SEM Architect. Produce data-backed keyword blueprints, search intent mappings, and actionable on-page technical specifications.",
    taskType: "seo:keywords",
    fallback: () => ({
      target_focus: `${brand.name} Service & Solution Discovery`,
      keyword_clusters: [
        {
          topic: "Core Commercial Search",
          keywords: [
            { keyword: `${brand.name.toLowerCase()} services`, intent: "transactional" as const, priority: "high" as const },
            { keyword: "best digital marketing agency for small business", intent: "commercial" as const, priority: "high" as const },
            { keyword: "affordable marketing agency packages", intent: "commercial" as const, priority: "medium" as const },
          ],
        },
        {
          topic: "Educational / Problem Aware",
          keywords: [
            { keyword: "how to get more clients without paid ads", intent: "informational" as const, priority: "medium" as const },
            { keyword: "why instagram ads are not converting", intent: "informational" as const, priority: "high" as const },
          ],
        },
      ],
      on_page_checklist: [
        "Include primary keyword in H1 tag and within the first 100 words of page body.",
        "Ensure page load time is under 2.5 seconds on mobile with WebP image compression.",
        "Add LocalBusiness / Organization Schema.org structured data markup.",
        "Implement clean SEO-friendly slug structure (e.g., /services/digital-marketing).",
        "Add descriptive alt text to all visual creative assets.",
      ],
      meta_recommendations: [
        {
          page: "Homepage",
          meta_title: `${brand.name} | ROI-Focused Digital Marketing Agency`,
          meta_description: `Scale your business with ${brand.name}. Proven campaigns, transparent reporting, and high-converting creative strategies. Book your consultation today.`,
        },
        {
          page: "Services Page",
          meta_title: `Performance Marketing & Content Strategies | ${brand.name}`,
          meta_description: `Explore data-driven marketing services built for measurable growth. Transparent deliverables and dedicated strategy managers.`,
        },
      ],
      content_gap_opportunities: [
        "Comparison guide: In-house marketing vs. Agency operating system",
        "ROI Calculator for local advertising spend",
        "Case study breakdown on lowering customer acquisition costs",
      ],
    }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. CREATIVE AGENT
// ─────────────────────────────────────────────────────────────────────────────

export async function contentRun(
  brand: BrandProfile,
  fullContextPrompt: string,
  topic: string,
  platform: string,
  format: string,
  opts?: { audience?: string; products?: string; variantIndex?: number }
) {
  const formatRules =
    format === "carousel"
      ? "FORMAT=carousel: provide carousel_slides — 4-6 slides, each with a short heading and body text building one story."
      : format === "reel"
        ? "FORMAT=reel: provide reel_script — full shot-by-shot script with hook line, beats and CTA (plain text, scene breaks with ---)."
        : format === "ad"
          ? "FORMAT=ad: provide ad_copy — {primary_text, headline, cta} for the ad platform."
          : "For post/story formats no extra structure is needed beyond hook + captions.";
  const audience = opts?.audience || brand.audience || "target customers";
  const products = opts?.products || brand.products || "our products and services";
  return runAgent({
    agent: "creative",
    brand,
    task: `${fullContextPrompt}\n\n---\n\nTASK: Write content for topic "${topic}" on ${platform} as ${format}.
Audience: ${audience}
Offer focus: ${products}

DIRECT-RESPONSE COPYWRITING DIRECTIVES (Hermes Framework):
1. HOOK:
   - Scroll-stopping first line (under 85 chars) that acts as an aggressive pattern interrupt.
   - Use curiosity gaps, contrarian truths, or high-stakes questions. Never start with "Welcome", "Check out", or generic announcements.
2. OBJECTIVE:
   - One crisp sentence explaining the commercial conversion objective (e.g., generate inbound WhatsApp inquiries, book store visits, drive link taps).
3. CAPTION VARIANTS (3 distinct psychological triggers — NO repetitive templates):
   - Variant 1 (Hook-Led / PAS - Problem, Agitate, Solve): Gripping hook, validates audience pain, reveals brand offer as the solution.
   - Variant 2 (Relatable Micro-Story / Transformation): Conversational customer scenario, relatable struggle, tangible transformation.
   - Variant 3 (Direct Irresistible Offer / Scarcity): Crystal clear value proposition, zero fluff, immediate micro-commitment action step.
4. CTA:
   - Frictionless, specific action command (e.g., "WhatsApp us with 'DETAILS'", "Visit our store at [location]", "Comment 'START'").
5. ALT_TEXT:
   - Descriptive accessibility copy.
6. HASHTAGS:
   - 8-12 niche-targeted, non-spam hashtags.
${formatRules}
Strictly avoid buzzwords (no "elevate", "unlock", "game-changer"), invented discounts, or fake guarantees. Every line must read like it was written by an elite copywriter.`,
    schema: contentItemSchema,
    system: "You are the Lead Creative Copywriter trained on elite Direct-Response frameworks (AIDA, PAS, Hook-Story-Offer, and Eugene Schwartz's 5 Stages of Awareness). You write scroll-stopping, high-converting copy that sounds authentic, punchy, and human. Never use robotic marketing clichés.",
    taskType: "creative:write",
    fallback: () => {
      // Unique deterministic fallbacks — never one repeated template across posts.
      const idx = opts?.variantIndex ?? 0;
      const angle = idx % 4;
      const shortTopic = topic.replace(/^Day\s*\d+[:\s-]*/i, "").trim();
      const audienceLine = audience || "your customers";
      const hooks = [
        `${shortTopic} — the angle nobody talks about.`,
        `Stop scrolling: ${shortTopic} explained in 30 seconds.`,
        `What most people get wrong about ${shortTopic}.`,
        `Real talk on ${shortTopic} (before you scroll).`,
      ];
      const bodies = [
        `If you care about ${shortTopic}, this one is for ${audienceLine}.\n\nHere is what actually matters:\n1. Start with the real need, not the noise.\n2. Show the proof in plain language.\n3. Make the next step effortless.\n\nSave this and share it with someone who needs it.`,
        `We get asked about ${shortTopic} a lot — especially by ${audienceLine}.\n\nThe short version: clear beats clever. Focus on ${products} and the outcome people want, not jargon.\n\nWhich part do you want us to break down next?`,
        `Quick checklist for ${shortTopic}:\n\n✓ Who it is for: ${audienceLine}\n✓ Why it matters right now\n✓ What to do next (one step only)\n\nDM us or tap the link in bio if you want help applying this to ${brand.name}.`,
        `${shortTopic} does not have to be complicated.\n\nFor ${audienceLine}, the winning formula is simple: relevant offer, honest copy, one clear CTA.\n\nTry it this week and tell us what changed.`,
      ];
      const ctaByAngle = [
        `Send us a DM with "${shortTopic.split(" ")[0]?.toUpperCase() || "INFO"}" and we will share the details.`,
        `Visit the link in bio or WhatsApp us to talk through ${shortTopic}.`,
        `Tap the link in bio — limited slots this month for ${brand.name} customers.`,
        `Comment "${shortTopic.split(" ")[0]?.toUpperCase() || "YES"}" and we will follow up with next steps.`,
      ];
      return {
        calendar_date: new Date().toISOString().slice(0, 10),
        platform,
        format,
        topic,
        hook: hooks[angle] as string,
        objective: `Help ${audienceLine} take action on ${shortTopic} for ${brand.name}.`,
        caption_variants: [
          bodies[angle] as string,
          `Story angle: A customer once asked us about ${shortTopic}. We kept the answer simple — focus on the outcome, show the process, remove friction.\n\nThat is exactly how we approach ${products} at ${brand.name}.\n\nWant the full breakdown?`,
          `Direct offer: If ${shortTopic} is on your list this month, ${brand.name} can help.\n\nNo hype — just a clear next step for ${audienceLine}.\n\nWhatsApp or DM to get started.`,
        ],
        audience: audienceLine,
        hashtags: [
          ...(brand.products.toLowerCase().includes("fit") || brand.products.toLowerCase().includes("gym") || brand.products.toLowerCase().includes("wellness")
            ? ["#FitnessGoals", "#Transformation", "#GymLife", "#HealthIndia"]
            : brand.products.toLowerCase().includes("cloth") || brand.products.toLowerCase().includes("fashion")
            ? ["#MensFashion", "#OOTD", "#StyleTips", "#FashionIndia"]
            : brand.products.toLowerCase().includes("food") || brand.products.toLowerCase().includes("cafe") || brand.products.toLowerCase().includes("chai")
            ? ["#Foodie", "#CafeLife", "#GoodEats", "#PuneFoodie"]
            : ["#Business", "#Growth", "#Quality", "#Trusted"]),
          `#${brand.name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20) || "Brand"}`,
          "#Explore",
          "#Featured",
          "#Community",
          "#New",
        ].slice(0, 10),
        cta: ctaByAngle[angle] as string,
        alt_text: `Graphic for ${shortTopic} — ${brand.name}`,
      };
    },
  });
}

export async function designerRun(brand: BrandProfile, fullContextPrompt: string, topic: string, platform: string, format: string) {
  const size = format === "story" || format === "reel" ? "1080x1920" : "1080x1080";
  return runAgent({
    agent: "creative",
    promptKey: "designer",
    brand,
    task: `${fullContextPrompt}\n\n---\n\nTASK: Create a design brief for "${topic}" (${platform} ${format}). Headline max 80 chars, subtext max 200, exact text only (no lorem ipsum). Template: bold-center|split|minimal|festival. Size ${size}. image_prompt describes background art WITHOUT text. Design must be specific to the campaign.`,
    schema: designSchema,
    system: "You are the Art Director. Design clean, brand-consistent marketing visuals with high contrast and readable typography.",
    taskType: "creative:design",
    fallback: () => ({
      layout: "Centered high-contrast headline with brand blue gradient accent and bottom CTA pill",
      headline: topic.slice(0, 80),
      subtext: `By ${brand.name}`,
      color_usage: "Dark slate background, electric brand blue highlights, crisp white typography",
      image_prompt: `Minimalist modern 3D abstract geometric shapes with soft blue ambient glow, clean negative space for typography, ${platform} ${format}`,
      template_id: "bold-center" as const,
      size,
      text_overlays: [],
    }),
  });
}

export async function videoRun(
  brand: BrandProfile,
  fullContextPrompt: string,
  topic: string,
  duration = 30,
  opts?: { industry?: string; audience?: string; variantIndex?: number }
) {
  const audience = opts?.audience || brand.audience || "target customers";
  const industry = opts?.industry || "this business";
  const idx = opts?.variantIndex ?? 0;
  return runAgent({
    agent: "creative",
    promptKey: "video",
    brand,
    task: `${fullContextPrompt}\n\n---\n\nTASK: Plan a ${duration}s vertical (9:16) viral reel script for "${topic}".
Industry: ${industry}. Audience: ${audience}.

REEL SCRIPTING DIRECTIVES (Hermes 3-Second Retention Rule):
- Scene 1 (0-3s Pattern Interrupt Hook): Mandatory high-contrast visual hook with physical movement or unexpected angle. Bold on-screen text (under 60 chars) + voiceover that creates an immediate open curiosity loop.
- Scene 2 (Relatable Tension / Demonstration): Fast-paced demonstration or customer scenario that builds interest and overcomes skepticism.
- Scene 3 (The Breakthrough / Solution): Showcases the core benefit of ${brand.name} cleanly without salesy hype.
- Final Scene (Actionable CTA): High-contrast visual cue pointing to bio link, WhatsApp keyword, or comment trigger.
Include music_mood (trending cadence), captions_srt, and thumbnail_idea.
Shootable and grounded in reality. No fake testimonials, prices, or fabricated statistics.`,
    schema: videoPlanSchema,
    system: "You are the Reels & Short-Form Video Director. You specialize in viral short-form retention, 3-second hook mechanics, visual pacing, and high-conversion video CTAs.",
    taskType: "creative:video",
    fallback: () => {
      const angle = idx % 3;
      const hooks = [
        `Stop scrolling — ${topic}`.slice(0, 80),
        `Wait — you need to see this about ${topic}`.slice(0, 80),
        `POV: your next favourite ${topic}`.slice(0, 80),
      ];
      const voHooks = [
        `If ${topic} matters to you, do not skip this part.`,
        `Here is the truth about ${topic} in under 30 seconds.`,
        `Let us show you ${topic} the simple way.`,
      ];
      return {
        duration_s: duration,
        aspect: "9:16" as const,
        scenes: [
          {
            n: 1,
            visual: `Direct-to-camera or product/service close-up introducing ${topic}`,
            shot_type: "close-up",
            duration_s: 6,
            on_screen_text: hooks[angle] as string,
            voiceover: voHooks[angle] as string,
          },
          {
            n: 2,
            visual: `B-roll or screen demo showing the core value of ${topic} for ${audience}`,
            shot_type: "montage",
            duration_s: Math.max(10, duration - 14),
            on_screen_text: "Why it matters",
            voiceover: `Show the real benefit of ${topic} without hype — clear, honest, specific to ${brand.name}.`,
          },
          {
            n: 3,
            visual: `Clear CTA shot with brand handle pointing to bio / WhatsApp / store visit`,
            shot_type: "medium",
            duration_s: 8,
            on_screen_text: "DM or tap link in bio".slice(0, 80),
            voiceover: `Ready for ${topic}? DM us or tap the link in bio — ${brand.name} is one message away.`,
          },
        ],
        music_mood: angle === 0 ? "Confident modern beat" : angle === 1 ? "Upbeat lifestyle pop" : "Warm acoustic groove",
        captions_srt: `1\n00:00:00,000 --> 00:00:06,000\n${hooks[angle]}\n\n2\n00:00:06,000 --> 00:00:${String(Math.max(10, duration - 14)).padStart(2, "0")},000\nWhy ${topic} matters.\n\n3\n00:00:${String(Math.max(10, duration - 14)).padStart(2, "0")},000 --> 00:00:${String(duration).padStart(2, "0")},000\nDM or tap link in bio.`,
        thumbnail_idea: `Bold frame for "${topic.slice(0, 35)}" with ${industry} styling`,
      };
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. CRITIC / QUALITY ASSURANCE AGENT
// ─────────────────────────────────────────────────────────────────────────────

export async function criticRun(
  brand: BrandProfile,
  fullContextPrompt: string,
  deliverableSummary: string,
  cycle = 1
) {
  const flags = hallucinationGuard(deliverableSummary, brand);
  return runAgent({
    agent: "critic",
    brand,
    task: `${fullContextPrompt}\n\n---\n\nTASK: Evaluate the quality, brand compliance, and campaign viability of this deliverable package.
Current Revision Cycle: ${cycle}.
Pre-check Hallucination Flags: ${flags.join(" | ") || "None detected"}.
Deliverable to Audit:
"""${deliverableSummary.slice(0, 4000)}"""

Evaluate against 6 criteria (score 0-100 each):
1. Brand Voice Fit: Alignment with ${brand.name}'s tone and rules.
2. Strategic Relevance: Does it directly achieve the campaign goal?
3. Hook & Engagement Quality: Are hooks scroll-stopping and original?
4. Call to Action (CTA): Is next step clear, frictionless and actionable?
5. Factual Safety & Compliance: Zero fake claims, fake awards or guarantees.
6. Platform Suitability: Adherence to format and platform specifications.

Pass rule: Overall score >= 80 passes. Below 80 fails and triggers revision.
Return: score, passed, revision_cycle (${cycle}), criteria array, issues array, verdict.`,
    schema: criticReportSchema,
    system: "You are the Agency Critic and Quality Assurance Director. Hold deliverables to the highest agency standard. Reject generic fluff, verify claims, and provide exact revision instructions.",
    taskType: "critic:review",
    fallback: () => {
      // Honest deterministic critic — NEVER auto-pass with 88 when issues exist.
      const passed = flags.length === 0;
      const score = flags.length === 0 ? 78 : Math.max(40, 70 - flags.length * 10);
      return {
        score,
        // Fallback critic cannot certify production quality — only clear of hallucination flags.
        passed: false,
        revision_cycle: cycle,
        criteria: [
          { name: "Brand Voice Fit", score: passed ? 80 : 65, feedback: "Tone aligns with brand profile guidelines (heuristic review)." },
          { name: "Strategic Relevance", score: 78, feedback: "Serves the campaign goal at a high level; human review recommended." },
          { name: "Hook & Engagement Quality", score: 75, feedback: "Hooks present; uniqueness verified by mandatory gate, not this fallback." },
          { name: "Call to Action Strength", score: 80, feedback: "CTA present in deliverables package." },
          {
            name: "Factual Safety & Compliance",
            score: passed ? 85 : 45,
            feedback: flags.length ? `Hallucination flags: ${flags.join("; ")}` : "No heuristic hallucination flags; full fact audit still required.",
          },
          { name: "Platform Suitability", score: 78, feedback: "Platform compliance enforced by mandatory QA gate." },
        ],
        issues: flags.map((f) => ({ severity: "high" as const, text: f })),
        verdict: passed
          ? "Heuristic pre-check clean — full LLM critic + mandatory deliverable gate still required before Verified status."
          : "Factual corrections required. QA cannot pass with open hallucination flags.",
      };
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY AUDIT & UTILITY EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export async function ceoReview(brand: BrandProfile, fullContextPrompt: string, copy: string) {
  const flags = hallucinationGuard(copy, brand);
  return runAgent({
    agent: "reviewer",
    brand,
    task: `${fullContextPrompt}\n\n---\n\nTASK: Review copy for brand safety. Score 0-100. Copy: """${copy}""". Flags: ${flags.join(" | ") || "none"}.`,
    schema: ceoReviewSchema,
    system: "You are the Reviewer. Check for unverified claims.",
    taskType: "review",
    fallback: () => ({
      score: flags.length > 0 ? 60 : 85,
      passed: flags.length === 0,
      issues: flags.map((text) => ({ severity: "high" as const, text })),
      feedback_for_agent: flags.length > 0 ? "Remove unverified claims." : "Ready for review.",
    }),
  });
}

export function brandCompleteness(brand: BrandProfile): { score: number; gaps: string[]; strengths: string[] } {
  const gaps: string[] = [];
  const strengths: string[] = [];
  let score = 50;
  const check = (ok: boolean, pts: number, gap: string, strength: string) => {
    if (ok) { score += pts; strengths.push(strength); } else { gaps.push(gap); }
  };
  check(brand.products.trim().length > 20, 10, "Products/services description is too short — agents cannot write specific offers.", "Products/services are described in enough detail.");
  check(brand.audience.trim().length > 15, 10, "Target audience is vague — define who buys and why.", "Target audience is clearly defined.");
  check(brand.usp.trim().length > 10, 10, "USP is missing or generic — differentiation will be weak.", "A clear USP is documented.");
  check(brand.dos.length >= 2, 5, "Few positive brand rules (dos) defined.", "Positive brand rules (dos) are defined.");
  check(brand.donts.length >= 2, 5, "Few guardrails (don'ts) defined.", "Guardrails (don'ts) are defined.");
  check(brand.tone.trim().length > 5, 5, "Brand tone is not specified.", "Brand tone is specified.");
  check(brand.compliance_notes.trim().length > 10, 5, "Compliance notes are empty.", "Compliance notes exist.");
  return { score: Math.max(0, Math.min(100, score)), gaps, strengths };
}

export async function auditRun(brand: BrandProfile, instruction: string, extraContext: string) {
  const local = brandCompleteness(brand);
  return runAgent({
    agent: "ceo",
    promptKey: "audit",
    brand,
    task: `${extraContext}\n\n---\n\nTASK: Audit marketing readiness for "${instruction.slice(0, 400)}". Score: ${local.score}.`,
    schema: auditReportSchema,
    system: "Senior marketing auditor.",
    taskType: "review",
    fallback: () => ({
      score: local.score,
      overview: `Marketing-readiness audit for ${brand.name} based on brand profile facts.`,
      strengths: local.strengths.length ? local.strengths : ["Brand profile is established."],
      weaknesses: local.gaps.length ? local.gaps : ["No profile gaps detected."],
      recommendations: local.gaps.length ? local.gaps.map((g) => `Fix: ${g}`) : ["Maintain brand voice compliance."],
      data_sources: ["brand profile", "user request"],
    }),
  });
}

export async function socialPlanRun(brand: BrandProfile, dates: string[]) {
  return runAgent({
    agent: "creative",
    promptKey: "social",
    brand,
    task: `Recommend posting slots for ${dates.length} dates (${dates.slice(0, 5).join(", ")}...) across instagram/facebook/linkedin.`,
    schema: socialPlanSchema,
    system: "Social Media Manager.",
    taskType: "creative:write",
    fallback: () => ({
      best_times: ["Tue/Thu 12:30 IST", "Wed/Fri 19:00 IST", "Sun 11:00 IST"],
      posting_plan: dates.slice(0, 10).map((date, i) => ({
        date,
        platform: ["instagram", "facebook", "linkedin"][i % 3] as string,
        slot: ["12:30 IST", "19:00 IST", "11:00 IST"][i % 3] as string,
      })),
    }),
  });
}

const ESCALATE = /complaint|refund|legal|lawyer|court|scam|fraud|cheat|price|pricing|cost|charge|dispute|angry|worst/i;

export async function replyDraftsRun(
  brand: BrandProfile,
  comments: Array<{ id: string; text: string; author: string }>
) {
  return runAgent({
    agent: "creative",
    promptKey: "social",
    brand,
    task: `Draft replies to these comments in brand tone (max 500 chars each). NEVER auto-reply to complaints, legal threats, or pricing disputes — set needs_human=true with escalation_reason. Comments: ${JSON.stringify(comments).slice(0, 2000)}`,
    schema: z.array(replyDraftSchema),
    system: "You are the Social Media Manager. Recommend slots, draft replies in brand tone. Never auto-reply to complaints, legal, or pricing disputes — flag them for a human.",
    taskType: "creative:write",
    fallback: () =>
      comments.map((c) => {
        const escalate = ESCALATE.test(c.text);
        return {
          comment_id: c.id,
          reply: escalate
            ? `Hi ${c.author}, thanks for flagging this — a team member will reach out shortly.`
            : `Thanks ${c.author}! Glad it helped — DM us if you'd like a free consultation.`,
          tone: brand.tone,
          needs_human: escalate,
          escalation_reason: escalate ? "Complaint/pricing/legal keyword — human must review" : undefined,
        };
      }),
  });
}

export type MetricTotals = {
  rows: number;
  byPlatform: Record<string, { impressions: number; reach: number; clicks: number; leads: number; spend: number; revenue: number }>;
};

export async function performanceRun(brand: BrandProfile, metrics: MetricRow[], totals: MetricTotals) {
  return runAgent({
    agent: "performance",
    promptKey: "performance",
    brand,
    task: `Weekly performance report from: ${JSON.stringify(totals).slice(0, 3000)}.`,
    schema: performanceReportSchema,
    system: "Performance Marketer.",
    taskType: "performance:report",
    fallback: () => {
      const leadCount = Object.values(totals.byPlatform).reduce((s, p) => s + p.leads, 0);
      const spendCount = Object.values(totals.byPlatform).reduce((s, p) => s + p.spend, 0);
      return {
        summary:
          totals.rows === 0
            ? "Insufficient data — no metrics uploaded yet."
            : `Across ${totals.rows} rows of performance data: generated ${leadCount} leads from ₹${spendCount} spend.`,
        what_worked:
          totals.rows === 0
            ? []
            : Object.entries(totals.byPlatform).map(
                ([plat, p]) => `${plat}: generated ${p.leads} leads from ${p.spend} spend`
              ),
        what_didnt: totals.rows === 0 ? ["No metrics to evaluate"] : [],
        budget_reallocation: [],
        ab_test_ideas: ["Hook variant test", "CTA test"],
        next_actions: ["Upload ad platform export"],
      };
    },
  });
}

export async function hrRun(stats: { runs: Array<{ agent: string; costUsd: number; latencyMs?: number }>; avgCeoScore: number | null; approvalRate: number | null; rejections: number }) {
  return runAgent({
    agent: "ceo",
    promptKey: "hr",
    brand: { id: "hr", name: "HR", tone: "direct", languages: ["English"], audience: "", products: "", usp: "", dos: [], donts: [], compliance_notes: "" },
    task: `Score agents from: ${JSON.stringify(stats).slice(0, 2000)}.`,
    schema: hrReportSchema,
    system: "HR Agent.",
    taskType: "plan",
    fallback: () => ({
      agent_scorecards: (stats.runs.length ? Array.from(new Set(stats.runs.map((r) => r.agent))) : ["strategist", "critic"]).map((agent) => ({
        agent,
        runs: stats.runs.filter((r) => r.agent === agent).length || 1,
        avg_ceo_score: stats.avgCeoScore ?? 80,
        total_cost_usd: Number(stats.runs.filter((r) => r.agent === agent).reduce((s, r) => s + (r.costUsd || 0), 0).toFixed(4)),
        note: "Consistent throughput and guideline compliance",
      })),
      recurring_issues: stats.rejections > 0 ? [`${stats.rejections} deliverable rejections recorded`] : [],
      proposed_prompt_changes: stats.rejections > 0 ? [{ agent: "critic", change: "Add stricter compliance check", reason: "Prevent rejections" }] : [],
    }),
  });
}
