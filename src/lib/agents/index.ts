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
    fallback: () => {
      const isClothing = /cloth|apparel|fashion|shirt|jeans|streetwear|t-shirt|sneaker/i.test(brand.products);
      const isGym = /gym|fitness|workout|crossfit|trainer|training|nutrition/i.test(brand.products);
      const isFood = /cafe|chai|restaurant|food|dining|snack/i.test(brand.products);

      const b = budget || 15000;
      const tofuAmt = Math.round(b * 0.5);
      const mofuAmt = Math.round(b * 0.3);
      const bofuAmt = Math.round(b * 0.2);

      const campaignStructure = isClothing
        ? [
            {
              stage: "Top of Funnel (Awareness)" as const,
              budget_split_pct: 50,
              recommended_channels: ["Instagram Reels Ads", "Story Lookbooks"],
              audience_targeting: ["Men aged 18-32 in target city", "Interests: Streetwear, Sneakerhead culture, Casual fashion"],
              ad_formats: ["High-energy Outfit Transition Reel (3s hook)", "3-Slide Carousel Lookbook"],
              primary_kpi: `Reach & Hook Rate (>35%) — Allocated ₹${tofuAmt.toLocaleString("en-IN")}`,
            },
            {
              stage: "Middle of Funnel (Retargeting)" as const,
              budget_split_pct: 30,
              recommended_channels: ["Instagram Feed", "Story Retargeting"],
              audience_targeting: ["Profile engagers (last 30 days)", "Reels video viewers (50%+)"],
              ad_formats: ["Fit & Fabric Quality Comparison", "Customer Try-on & Styling Carousel"],
              primary_kpi: `Click-Through Rate (CTR > 2.0%) — Allocated ₹${mofuAmt.toLocaleString("en-IN")}`,
            },
            {
              stage: "Bottom of Funnel (Conversion)" as const,
              budget_split_pct: 20,
              recommended_channels: ["WhatsApp Click-to-Chat Ads", "Instagram DM Ads"],
              audience_targeting: ["Cart abandoners & high-intent engagers"],
              ad_formats: ["Limited Drop Size Alert with WhatsApp Catalog CTA", "Weekend Store Visit Special Offer"],
              primary_kpi: `Cost per WhatsApp Lead (<₹45) — Allocated ₹${bofuAmt.toLocaleString("en-IN")}`,
            },
          ]
        : isGym
        ? [
            {
              stage: "Top of Funnel (Awareness)" as const,
              budget_split_pct: 50,
              recommended_channels: ["Meta Video Ads", "Instagram Reels"],
              audience_targeting: ["Working professionals aged 24-45", "Interests: Fitness, Weight loss, Strength training"],
              ad_formats: ["Monsoon Shred Challenge Announcement (3s hook)", "Facility & Trainer Walkthrough Reel"],
              primary_kpi: `Reach & Video Hook Rate (>30%) — Allocated ₹${tofuAmt.toLocaleString("en-IN")}`,
            },
            {
              stage: "Middle of Funnel (Retargeting)" as const,
              budget_split_pct: 30,
              recommended_channels: ["Instagram Feed Ads", "Facebook Lead Ads"],
              audience_targeting: ["30-day video viewers and profile visitors"],
              ad_formats: ["Trainer Guidance & Nutrition Plan Breakdown", "Real Transformation Stories"],
              primary_kpi: `CTR (>1.8%) & Landing Page Visits — Allocated ₹${mofuAmt.toLocaleString("en-IN")}`,
            },
            {
              stage: "Bottom of Funnel (Conversion)" as const,
              budget_split_pct: 20,
              recommended_channels: ["WhatsApp Click-to-Chat", "Meta Instant Lead Forms"],
              audience_targeting: ["High-intent engagers seeking gym trial pass"],
              ad_formats: ["Claim 2-Day Free Trial Pass (Limited Slots)", "Direct WhatsApp Trainer Consultation"],
              primary_kpi: `Cost per Trial Pass Inquiry (<₹90) — Allocated ₹${bofuAmt.toLocaleString("en-IN")}`,
            },
          ]
        : [
            {
              stage: "Top of Funnel (Awareness)" as const,
              budget_split_pct: 50,
              recommended_channels: ["Meta Ads (Instagram & Facebook)"],
              audience_targeting: ["Broad local demographics", "Relevant category interests"],
              ad_formats: ["Short-form Video Reels", "Carousel Value Decks"],
              primary_kpi: `Impressions & Hook Rate (>30%) — Allocated ₹${tofuAmt.toLocaleString("en-IN")}`,
            },
            {
              stage: "Middle of Funnel (Retargeting)" as const,
              budget_split_pct: 30,
              recommended_channels: ["Instagram Feed", "Facebook Retargeting"],
              audience_targeting: ["Website visitors (last 30 days)", "Page engagers"],
              ad_formats: ["Product Demonstration", "Verified Case Studies"],
              primary_kpi: `CTR (>1.8%) — Allocated ₹${mofuAmt.toLocaleString("en-IN")}`,
            },
            {
              stage: "Bottom of Funnel (Conversion)" as const,
              budget_split_pct: 20,
              recommended_channels: ["WhatsApp Click-to-Chat Ad", "Direct Offer Lead Ads"],
              audience_targeting: ["Engaged leads and repeat visitors"],
              ad_formats: ["Direct Special Offer", "Limited Period Discount CTA"],
              primary_kpi: `Cost per Conversion — Allocated ₹${bofuAmt.toLocaleString("en-IN")}`,
            },
          ];

      const abTestMatrix = isClothing
        ? [
            "Hook Test: 'Stop styling oversized tees wrong' vs. 'The 3-second drop-shoulder upgrade'",
            "Format Test: 1080x1080 3-Slide Lookbook vs. 9:16 Vertical Outfit Transformation Reel",
            "CTA Test: 'Send CATALOG on WhatsApp' vs. 'Visit Store for Weekend Exclusive'",
          ]
        : isGym
        ? [
            "Hook Test: 'Can you commit to 30 days?' vs. 'The monsoon shred workout breakdown'",
            "Format Test: Trainer Demo Reel vs. Free Pass Carousel Card",
            "CTA Test: 'Claim 2-Day Free Trial Pass' vs. 'WhatsApp for Personal Assessment'",
          ]
        : [
            "Hook Test: Problem-led opening vs. Direct benefit opening",
            "Format Test: 1080x1080 Static graphic vs. 9:16 Vertical Reel walkthrough",
            "CTA Test: 'Get WhatsApp Offer' vs. 'Visit Store / Order Online'",
          ];

      return {
        total_budget: budget || null,
        campaign_structure: campaignStructure,
        bidding_strategy: "Start with Lowest Cost (Auto-bid) for initial 50 conversion events to exit learning phase, then transition to Target CPA / Cost Cap.",
        ab_test_matrix: abTestMatrix,
        execution_note: "Planning blueprint only. No live campaigns will be launched or budget debited without explicit client confirmation.",
      };
    },
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
    fallback: () => {
      const prodWord = brand.products.split(",")[0]?.trim() || "products";
      const secondProd = brand.products.split(",")[1]?.trim() || "collection";
      const isClothing = /cloth|apparel|fashion|shirt|jeans|streetwear|t-shirt|sneaker/i.test(brand.products);
      const isGym = /gym|fitness|workout|crossfit|trainer|training|nutrition/i.test(brand.products);
      const isFood = /cafe|chai|restaurant|food|dining|snack/i.test(brand.products);

      const commercialKeywords = isClothing
        ? [
            { keyword: `${brand.name.toLowerCase()} store`, intent: "transactional" as const, priority: "high" as const },
            { keyword: `oversized t-shirts and streetwear near me`, intent: "commercial" as const, priority: "high" as const },
            { keyword: `best cargo pants and denim collection`, intent: "commercial" as const, priority: "medium" as const },
          ]
        : isGym
        ? [
            { keyword: `${brand.name.toLowerCase()} gym membership`, intent: "transactional" as const, priority: "high" as const },
            { keyword: `best gym and fitness training near me`, intent: "commercial" as const, priority: "high" as const },
            { keyword: `personal trainers and weight loss program`, intent: "commercial" as const, priority: "medium" as const },
          ]
        : isFood
        ? [
            { keyword: `${brand.name.toLowerCase()} menu`, intent: "transactional" as const, priority: "high" as const },
            { keyword: `best chai and cafe near me`, intent: "commercial" as const, priority: "high" as const },
            { keyword: `monsoon special snacks and cafe orders`, intent: "commercial" as const, priority: "medium" as const },
          ]
        : [
            { keyword: `${brand.name.toLowerCase()} ${prodWord}`, intent: "transactional" as const, priority: "high" as const },
            { keyword: `best ${prodWord} providers near me`, intent: "commercial" as const, priority: "high" as const },
            { keyword: `affordable ${secondProd} packages`, intent: "commercial" as const, priority: "medium" as const },
          ];

      const educationalKeywords = isClothing
        ? [
            { keyword: `how to style oversized t-shirts without looking baggy`, intent: "informational" as const, priority: "high" as const },
            { keyword: `best sneaker and cargo pant color combinations`, intent: "informational" as const, priority: "medium" as const },
          ]
        : isGym
        ? [
            { keyword: `how to start a 30-day weight loss shred challenge`, intent: "informational" as const, priority: "high" as const },
            { keyword: `beginner workout routine for functional strength`, intent: "informational" as const, priority: "medium" as const },
          ]
        : isFood
        ? [
            { keyword: `what makes authentic kadak chai so popular`, intent: "informational" as const, priority: "high" as const },
            { keyword: `best rainy day cafe food pairings`, intent: "informational" as const, priority: "medium" as const },
          ]
        : [
            { keyword: `how to choose the best ${prodWord}`, intent: "informational" as const, priority: "high" as const },
            { keyword: `top mistakes to avoid when buying ${secondProd}`, intent: "informational" as const, priority: "medium" as const },
          ];

      return {
        target_focus: `${brand.name} Search & Product Discovery`,
        keyword_clusters: [
          { topic: "Commercial & Local Search", keywords: commercialKeywords },
          { topic: "Style & Educational Search", keywords: educationalKeywords },
        ],
        on_page_checklist: [
          "Include primary business and product keywords in H1 tag and first 100 words.",
          "Ensure mobile page load is under 2.5 seconds with optimized WebP media.",
          "Implement LocalBusiness Schema.org with store address, hours, and WhatsApp link.",
          "Add descriptive alt text to all product/lookbook imagery.",
          "Clear CTA button above the fold linking to WhatsApp catalog or store visit map.",
        ],
        meta_recommendations: [
          {
            page: "Homepage",
            meta_title: `${brand.name} | Premium ${prodWord} & Local Store`,
            meta_description: `Explore ${brand.name} for latest ${prodWord} and ${secondProd}. Premium quality, best fits, and instant WhatsApp support. Visit us or order online.`,
          },
          {
            page: "Collection / Catalog Page",
            meta_title: `Shop Trending ${prodWord} | ${brand.name}`,
            meta_description: `Discover new arrivals at ${brand.name}. High-comfort fits, fresh drops, and quick size availability on WhatsApp.`,
          },
        ],
        content_gap_opportunities: [
          `Local styling and fit guide for ${brand.name} customers`,
          `Trending lookbook and fabric care breakdown`,
          `Customer fit check and sizing chart walkthrough`,
        ],
      };
    },
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
      const idx = opts?.variantIndex ?? 0;
      const shortTopic = topic.replace(/^Day\s*\d+[:\s-]*/i, "").trim();
      const audienceLine = audience || "your customers";

      const isClothing = /cloth|apparel|fashion|shirt|jeans|streetwear|t-shirt|sneaker/i.test(products);
      const isGym = /gym|fitness|workout|crossfit|trainer|training|nutrition/i.test(products);
      const isFood = /cafe|chai|restaurant|food|dining|snack/i.test(products);

      // Cycle through 12 completely distinct frameworks (0..11) so each post has unique copy and zero template repetition
      const slot = idx % 12;
      const cycle = Math.floor(idx / 12);
      const cyclePrefix = cycle > 0 ? `[Part ${cycle + 1}] ` : "";

      let hook = "";
      let variant1 = "";
      let variant2 = "";
      let variant3 = "";
      let cta = "";

      if (isGym) {
        const gymFrameworks = [
          {
            hook: `Stop compromising your form on ${shortTopic} — master this cue first.`,
            v1: `Biomechanical Precision:\n\nWhen training ${shortTopic}, small alignment flaws create chronic joint stress instead of muscle stimulation.\n\n3 Non-Negotiable Checks:\n1. Bar/Load Path: Keep the center of gravity stacked directly over mid-foot.\n2. Core Bracing: Draw air into your diaphragm and lock your ribcage down before initiation.\n3. Controlled Eccentric: Take 2-3 seconds on the lowering phase to maximize mechanical tension.\n\nSave this technique checklist for your next training session!`,
            v2: `Desk job causing tight hips and rounded shoulders? ${shortTopic} is your antidote.\n\nOur certified coaches focus on functional strength so you feel energized through 10-hour workdays instead of stiff and exhausted.\n\nTag your workout partner who needs to see this!`,
            v3: `Ready to experience coach-led training? We are reserving 15 complimentary 2-day trial passes for ${shortTopic} this week.\n\nIncludes complete movement screening, body composition analysis, and a structured workout with a certified trainer at ${brand.name}.\n\n📲 DM 'TRIAL' or WhatsApp us now to secure your pass!`,
            cta: `Claim your complimentary 2-day pass — DM 'TRIAL' or tap WhatsApp!`,
          },
          {
            hook: `The biggest nutrition lie about ${shortTopic} holding you back.`,
            v1: `Nutrition Truth Breakdown:\n\nCutting calories to 1200 or skipping carbs doesn't speed up fat loss — it crashes your metabolic rate and destroys muscle tissue.\n\nHere is what actually works for ${shortTopic}:\n1. Protein Priority: Aim for 1.6g–2.0g per kg of bodyweight to preserve lean mass.\n2. Strategic Carbohydrates: Fuel your intense training sessions around workout windows.\n3. Hydration & Electrolytes: Minimum 3.5 liters daily to maintain strength output and recovery.\n\nBookmark this before your next grocery run!`,
            v2: `No extreme chicken-and-rice misery. Sustainable fitness fits around dinners with friends and busy family schedules.\n\nAt ${brand.name}, our nutrition protocols are designed for real people living in Mumbai.\n\nDrop a 🔥 if you want our free monsoon nutrition guidelines!`,
            v3: `Struggling with what to eat for your goals? Book a 1-on-1 nutrition consult with our head coach.\n\nFree with our 30-Day Shred Challenge pass this month.\n\n📲 Send 'NUTRITION' on WhatsApp to get your custom macro target plan!`,
            cta: `Send 'NUTRITION' on WhatsApp to claim your custom meal framework!`,
          },
          {
            hook: `No time for the gym? Here is how to master ${shortTopic} in 45 minutes.`,
            v1: `Time-Optimized Training Protocol:\n\nYou don't need 2-hour marathon gym sessions to see transformative body recomposition.\n\nOur 45-Minute Framework for ${shortTopic}:\n1. 5-Minute Dynamic Warmup: Prime hip hinge and thoracic mobility.\n2. 25-Minute Heavy Compound Sets: Focus on maximum motor unit recruitment.\n3. 15-Minute Density Finisher: Functional conditioning that elevates metabolic burn for 24 hours.\n\nShare this with a busy colleague who thinks they don't have time!`,
            v2: `Early morning before the office, or evening after meetings — our Mumbai locations in Andheri & Bandra are built for seamless in-and-out training.\n\nValet parking, hot showers, and zero wait time for equipment.\n\nTell us in comments: are you team 6 AM or team 8 PM?`,
            v3: `Test our 45-minute shred routine this week. Claim one of 20 guest passes available for working professionals.\n\nNo pushy sales, no long contracts — just pure results.\n\n📲 Click the bio link or DM '45MIN' to book your trial slot.`,
            cta: `DM '45MIN' or WhatsApp us to experience our rapid 45-min workout!`,
          },
          {
            hook: `Why your progress stalled on ${shortTopic} (and the 2-week reset).`,
            v1: `Plateau Breaker Blueprint:\n\nIf you've been lifting the same dumbbell weight for 3 months, your body has adapted. Without overload, there is zero signal to grow.\n\n3 Ways to Force Adaptation on ${shortTopic}:\n1. Repetition Accumulation: Add 1-2 reps with clean form before bumping weight.\n2. Time Under Tension: Slow down the eccentric tempo to 4 seconds.\n3. Density Control: Shorten rest intervals by 15 seconds while maintaining load.\n\nSave this guide to reset your training logbook this week!`,
            v2: `Progressive overload requires tracking, not just sweating blindly.\n\nEvery member at ${brand.name} gets a digital progression log monitored weekly by their assigned coach.\n\nWhich lift are you currently trying to break through? Tell us below!`,
            v3: `Hit a stubborn plateau? Let our certified senior coaches assess your movement mechanics and adjust your program.\n\nComplimentary movement audit included with our 2-day trial pass.\n\n📲 WhatsApp us 'AUDIT' to schedule your session today!`,
            cta: `WhatsApp 'AUDIT' to get your free lifting mechanics review!`,
          },
          {
            hook: `You don't build muscle during ${shortTopic} — you build it while recovering.`,
            v1: `The Recovery Equation:\n\nTraining breaks down muscle fibers; sleep and recovery synthesize new tissue. Neglecting recovery spikes cortisol and halts fat loss.\n\n3 Pillars for Faster Recovery:\n1. Deep Sleep Window: 7-8 hours in a cool, dark room to optimize natural growth hormone release.\n2. Post-Session Micro-Nutrients: Magnesium, zinc, and sodium replenish central nervous system fatigue.\n3. Active Mobility Work: Light 15-minute walks or sauna sessions to flush metabolic waste.\n\nSave this reminder before you burn out!`,
            v2: `High corporate stress + extreme workouts = adrenal fatigue and zero fat loss.\n\nWe structure ${shortTopic} with smart deloads and recovery protocols tailored for corporate executives.\n\nHow many hours of sleep did you get last night? Be honest in the comments!`,
            v3: `Experience our recovery suite and functional training floor at ${brand.name}.\n\nClaim your 2-day all-access trial pass before the weekend.\n\n📲 DM 'RECOVER' or WhatsApp our team to register!`,
            cta: `DM 'RECOVER' on WhatsApp to claim your 2-day all-access pass!`,
          },
          {
            hook: `Motivation is a myth: here is the habit system for ${shortTopic}.`,
            v1: `The 3-Step Consistency System:\n\nRelying on motivation fails by Wednesday night. Real physique transformation relies on frictionless systems.\n\nHow to Lock in ${shortTopic}:\n1. Fixed Calendar Booking: Treat your workout like a client presentation that cannot be rescheduled.\n2. The 10-Minute Rule: On days you feel exhausted, just show up for 10 minutes — momentum does the rest.\n3. Community Accountability: Train alongside professionals who push your standards higher.\n\nSend this to someone who needs to hear this today!`,
            v2: `Walking into ${brand.name} feels different. No egos, no crowded chaos — just focused individuals putting in honest work.\n\nFrom Bandra creatives to BKC bankers, our community keeps you showing up.\n\nWhat is your biggest obstacle to consistency right now?`,
            v3: `Join our 30-Day Monsoon Shred Challenge cohort starting this Monday.\n\nGet daily trainer accountability, custom nutrition milestones, and guaranteed support.\n\n📲 DM 'CHALLENGE' or message us on WhatsApp to grab an enrollment slot!`,
            cta: `Message 'CHALLENGE' on WhatsApp to join our upcoming cohort!`,
          },
          {
            hook: `Never skip this 4-minute joint preparation before ${shortTopic}.`,
            v1: `Joint Longevity Protocol:\n\nCold tendons and tight joint capsules are the #1 cause of rotator cuff and lumbar injuries in lifting.\n\n4-Minute Pre-Hab Sequence:\n1. 90/90 Hip Swivels: 60 seconds to open hip capsules for deeper squats and lunges.\n2. Thoracic Cat-Cow Rotations: Mobilize the mid-back to protect the lumbar spine.\n3. Banded Pull-Aparts: Activate lower traps and rear delts to stabilize the shoulder girdle.\n\nBookmark this video/carousel so your warmup is always on point!`,
            v2: `Lifting heavy should make you feel resilient in everyday life, not wake up with a stiff lower back.\n\nOur coaches at ${brand.name} program longevity-first training protocols.\n\nHave you ever dealt with shoulder or knee twinges? Tell us below.`,
            v3: `Experiencing movement tightness? Come in for a free 15-minute functional movement screening with our sports rehabilitation specialists.\n\nComplimentary this week at both our Andheri and Bandra branches.\n\n📲 WhatsApp us 'SCREEN' to book your certified trainer assessment!`,
            cta: `WhatsApp 'SCREEN' to book your free functional movement test!`,
          },
          {
            hook: `Don't let the monsoon ruin your momentum with ${shortTopic}.`,
            v1: `Monsoon Shred Strategy:\n\nRainy weather often triggers comfort carb cravings and skipped evening gym trips. Here is how our athletes stay lean:\n\n3 Monsoon Adjustments:\n1. Shift to Morning Sessions: Beat the Mumbai evening traffic and train before your day starts.\n2. Immune Support Focus: Incorporate turmeric, ginger, and vitamin C to keep training uninterrupted.\n3. Thermogenic Spices: Use black pepper and cinnamon to aid digestion and steady blood sugar.\n\nSave these monsoon health rules right now!`,
            v2: `Rain pouring outside? Inside ${brand.name}, the music is pumping, the AC is crisp, and the energy is unmatched.\n\nTransform gloomy rainy days into your most productive training sessions.\n\nWho is crushing their workouts despite the rain? Tag them below!`,
            v3: `Our 30-Day Monsoon Shred Challenge is now open for enrollment with certified trainer guidance.\n\nTry our facility for 2 full days before committing.\n\n📲 DM 'MONSOON' or WhatsApp us to get your guest badge!`,
            cta: `DM 'MONSOON' or WhatsApp us to claim your 2-day guest badge!`,
          },
          {
            hook: `Why endless cardio is slowing down your results on ${shortTopic}.`,
            v1: `The Fat Loss Hierarchy:\n\nRunning on the treadmill for 60 minutes burns calories only while you run. Progressive strength training elevates resting metabolic rate for up to 36 hours post-workout.\n\nHow to Balance ${shortTopic} for Leanness:\n1. Strength First (3-4x weekly): Build and preserve metabolically active muscle tissue.\n2. Zone 2 Cardio (2x weekly): Improve mitochondrial density without raising systemic stress.\n3. Daily NEAT: Hit 8,000–10,000 steps through non-exercise daily movement.\n\nSave this breakdown to optimize your weekly training split!`,
            v2: `Stop punishing yourself with boring stairmaster hours. Lift weights with intention, look athletic, and feel empowered.\n\nOur members achieve dramatic body recomposition in just 3 structured sessions a week.\n\nWhat is your current split? Share in the comments!`,
            v3: `Find out your exact muscle-to-fat ratio with our advanced InBody body composition scan.\n\nFree with our 2-day trial pass this week at ${brand.name}.\n\n📲 WhatsApp 'SCAN' to reserve your scan and trainer consultation!`,
            cta: `WhatsApp 'SCAN' to schedule your free body composition assessment!`,
          },
          {
            hook: `The 15-minute high-protein meal prep routine for ${shortTopic}.`,
            v1: `Executive Nutrition Blueprint:\n\nEating clean when working 10+ hours in Mumbai corporate hubs doesn't require gourmet cooking skills.\n\nOur High-Protein Framework:\n1. Batch Protein Base: Prep 3 days of seasoned paneer, grilled chicken, or spiced tofu in 20 minutes.\n2. Smart Office Snacks: Roasted chana, Greek yogurt, or whey isolate to stave off 4 PM pastry cravings.\n3. Swaps for Swiggy: Choose tandoori grills, clear soups, and dal tadka with roti over creamy gravies.\n\nBookmark this meal guide for your Monday routine!`,
            v2: `Fitness should enhance your career and personal life, not add food anxiety to your daily schedule.\n\nWe build realistic, sustainable habits that fit corporate life in Mumbai.\n\nWhat is your go-to office lunch? Let us know below!`,
            v3: `Get a customized meal plan mapped to your exact schedule and dietary preferences.\n\nIncluded with our 30-Day Shred program at ${brand.name}.\n\n📲 WhatsApp 'MEALPLAN' to chat directly with our nutrition coach!`,
            cta: `WhatsApp 'MEALPLAN' to speak directly with our nutrition specialist!`,
          },
          {
            hook: `The truth about 30-day transformations with ${shortTopic}.`,
            v1: `Honest Transformation Standards:\n\nIgnore misleading ads promising 10kg weight loss in 10 days. Real, sustainable transformation looks like this:\n\nWhat You Can Achieve in 30 Days:\n1. 2-4 kg of pure fat loss while preserving lean athletic shape.\n2. Significant increases in core stability, posture, and daily energy levels.\n3. Automatic habits: knowing exactly how to lift, eat, and recover with confidence.\n\nSave this for an honest, evidence-based standard of fitness progress!`,
            v2: `No detox teas, no crash fasting, no fake supplements. Just science-backed programming and dedicated coaching.\n\nAt ${brand.name}, your results are verified on the scale and on the lifting platform.\n\nWhat is your #1 fitness goal for the next 30 days?`,
            v3: `Take the first step today with zero risk. Experience 2 days of personal-trainer-led workouts on us.\n\nAvailable for Andheri and Bandra residents this week only.\n\n📲 DM 'HONEST' or WhatsApp us to secure your 2-day pass!`,
            cta: `DM 'HONEST' or WhatsApp us to claim your 2-day trainer pass!`,
          },
          {
            hook: `Experience ${brand.name}: your 2-day complimentary pass is waiting.`,
            v1: `Your 2-Day Trial Experience:\n\nChoosing a gym shouldn't be a gamble. We invite you to experience the difference before you make any commitment.\n\nWhat Your 2-Day Pass Includes:\n1. Full access to our premium strength & conditioning floor and functional turf.\n2. 1-on-1 movement and posture assessment with a certified coach.\n3. Personalized nutrition & workout roadmap tailored for your body type.\n\nSave this post or share it with a friend who wants to train together!`,
            v2: `Imported biomechanical equipment, certified coaches on the floor, immaculate hygiene, and a community of high-performers.\n\nConveniently located in Andheri and Bandra with dedicated valet parking.\n\nHave you visited our space yet? Let us know!`,
            v3: `Only 15 complimentary trial passes remaining for this week's onboarding intake.\n\nClaim yours in 10 seconds before slots fill up.\n\n📲 Send 'PASS' on WhatsApp to reserve your 2-day complimentary trial now!`,
            cta: `Send 'PASS' on WhatsApp to claim your complimentary 2-day pass!`,
          },
        ];
        const f = gymFrameworks[slot]!;
        hook = `${cyclePrefix}${f.hook}`;
        variant1 = `${cyclePrefix}${f.v1}`;
        variant2 = `${cyclePrefix}${f.v2}`;
        variant3 = `${cyclePrefix}${f.v3}`;
        cta = f.cta;
      } else if (isClothing) {
        const clothingFrameworks = [
          {
            hook: `Stop styling ${shortTopic} wrong — here is the 2026 rule.`,
            v1: `Streetwear Silhouette Rule:\n\nIf you're wearing ${shortTopic}, remember the golden streetwear rule: proportion balance. Never pair baggy with sloppy.\n\n3 Essential Checkpoints:\n1. Silhouette: Keep the shoulders drop-cut and the hem clean.\n2. Fabric: Heavyweight 240+ GSM cotton holds structure all day.\n3. Palette: Earthy neutrals with crisp white sneakers.\n\nSave this post for your next weekend outfit check!`,
            v2: `From morning lectures to evening café scenes — ${shortTopic} is crafted for effortless all-day wear.\n\nNo stiff materials, no awkward cuts. Just breathable comfort and tailored proportions designed for ${audienceLine}.\n\nTag a friend who needs a wardrobe upgrade this season!`,
            v3: `Weekend Drop Spotlight: ${shortTopic} is now available in store & on our WhatsApp catalog.\n\nLimited pieces per size (S to XXL) — once a batch sells out, restocks take 3-4 weeks.\n\n📲 Send 'CATALOG' on WhatsApp to browse prices & size availability instantly!\n📍 Or visit ${brand.name} this weekend for an in-store trial and exclusive styling advice.`,
            cta: `Send 'CATALOG' on WhatsApp to check available sizes and styles.`,
          },
          {
            hook: `The 3-second fit check: how to wear ${shortTopic} effortlessly.`,
            v1: `Heavyweight Fabric Guide:\n\nCheap tees lose their shape after 2 washes. Here is why premium combed cotton makes all the difference for ${shortTopic}:\n\nFabric Longevity Pillars:\n1. 240+ GSM dense weave resists collar baconing and fabric curling.\n2. Pre-shrunk bio-wash ensures the fit you buy is the fit you keep.\n3. Deep reactive dye prevents fading under direct Indian sunlight.\n\nCheck your wardrobe against these standards today!`,
            v2: `Clean lines, heavyweight drape, zero brand logos screaming for attention.\n\nDesigned specifically for ${audienceLine} who appreciate quiet quality.\n\nDrop a comment: oversized fit or regular fit?`,
            v3: `New Colorways Dropped: 4 fresh seasonal shades of ${shortTopic} are now in stock at ${brand.name}.\n\nSend 'COLORS' to get high-res lookbook photos on WhatsApp.\n\n📲 WhatsApp us now to reserve your size before shelves clear out!`,
            cta: `WhatsApp 'COLORS' to view all new seasonal shades instantly!`,
          },
          {
            hook: `Why ${shortTopic} is dominating street style right now.`,
            v1: `Day-to-Night Transitional Styling:\n\nHow to take ${shortTopic} from an office-casual workday directly into late-night social plans:\n\nStyle Formula:\n1. Base: Clean neutral tee or shirt layered beneath an unstructured overshirt.\n2. Bottoms: Tailored relaxed-fit denim with a single turn-up cuff.\n3. Kicks: Minimal leather sneakers for day, retro runners for evening.\n\nBookmark this formula for effortless weekday morning styling!`,
            v2: `Built for humid afternoons and air-conditioned evenings alike.\n\nBreathable weaves that keep you comfortable through long commute hours.\n\nWhich color combination do you rock most often?`,
            v3: `Explore the full transitional collection online or via our WhatsApp concierge.\n\nEnjoy same-day dispatch and hassle-free size exchanges.\n\n📲 Send 'STYLE' to chat directly with our store team!`,
            cta: `Send 'STYLE' on WhatsApp for personal fit recommendations!`,
          },
          {
            hook: `Before you buy another piece: read this on ${shortTopic}.`,
            v1: `Sneaker & Denim Pairings:\n\nThe single biggest styling error with ${shortTopic} is choosing the wrong hem-to-shoe break.\n\n3 Pairing Rules:\n1. Chunky Retro Kicks: Pair with wide-leg relaxed denim that drapes cleanly over the tongue.\n2. Low-Profile Court Shoes: Pair with cropped or pin-rolled trousers showing clean ankle line.\n3. High-Tops: Keep the hem slightly stacked without swallowing the collar.\n\nSave this guide before choosing your weekend footwear!`,
            v2: `Good fashion is effortless when proportions work in your favor.\n\nVisit ${brand.name} to try different cuts in person with guidance from our stylists.\n\nWhat are your go-to daily sneakers right now?`,
            v3: `Pair your sneakers with the right cut: our denim collection for ${shortTopic} is fully stocked.\n\nWhatsApp 'DENIM' to check waist sizes 28 through 38.\n\n📲 Order on WhatsApp or visit our store this weekend!`,
            cta: `WhatsApp 'DENIM' to check current waist sizes in stock!`,
          },
          {
            hook: `The minimalist capsule: how to style ${shortTopic} 5 different ways.`,
            v1: `Monochrome & Earthy Neutrals:\n\nYou don't need a massive wardrobe to look impeccably put-together every day.\n\nCapsule Essentials for ${shortTopic}:\n1. Olive & Stone: The most versatile neutral combination for everyday wear.\n2. Slate Charcoal: A sharp alternative to plain black that looks elevated in natural daylight.\n3. Raw Ecru: Crisp without the harsh contrast of stark bleached white.\n\nSave this capsule guide to streamline your daily choices!`,
            v2: `Spend less time deciding what to wear, and more time feeling confident in the room.\n\nEvery piece at ${brand.name} is designed to be mixed and matched effortlessly.\n\nWhich neutral tone do you wear the most?`,
            v3: `Build your capsule wardrobe today with our bundle savings on ${shortTopic}.\n\nBuy any 2 core pieces and receive an exclusive WhatsApp styling voucher.\n\n📲 DM 'CAPSULE' to claim your voucher!`,
            cta: `DM 'CAPSULE' on WhatsApp for bundle styling options!`,
          },
          {
            hook: `How to care for ${shortTopic} so it looks brand new after 30 washes.`,
            v1: `Garment Longevity & Wash Care:\n\nHeavyweight cotton garments require proper care to prevent collar warping and fabric fatigue.\n\n3 Simple Wash Rules:\n1. Cold Water Wash: Always wash inside out on a gentle cycle to protect color vibrancy.\n2. Hang Dry in Shade: Direct hot sun breaks down cotton fibers and causes shrinking.\n3. Never Wring the Collar: Squeeze excess water gently and lay flat across a drying rack.\n\nBookmark this care routine to make your clothes last for years!`,
            v2: `We build garments that stand up to real everyday life, not delicate dry-clean-only pieces.\n\nQuality fabrics crafted to look even better as they age.\n\nDo you follow wash tags or wash everything together? Let us know below!`,
            v3: `Discover true durability: try our reinforced ${shortTopic} range at ${brand.name}.\n\nVisit our store or order via WhatsApp with free size exchange guarantee.\n\n📲 Send 'CARE' to receive our complete fabric warranty guide!`,
            cta: `Send 'CARE' on WhatsApp to explore our durable collection!`,
          },
          {
            hook: `The secret behind our relaxed cut on ${shortTopic}.`,
            v1: `Oversized Fit Check:\n\nThere is a massive difference between an intentional drop-shoulder cut and simply buying two sizes too big.\n\nWhat Makes Our Fit Different:\n1. Chest Room: Relaxed drape without excessive fabric pooling around the waist.\n2. Shoulder Drop: Exactly 2 inches below the natural acromion for a relaxed silhouette.\n3. Sleeve Length: Grazes just above the elbow joint for balanced proportions.\n\nSave this fit check so you know what genuine streetwear tailoring looks like!`,
            v2: `No awkward boxiness. Just natural comfort that moves with you wherever your day goes.\n\nDesigned by streetwear enthusiasts for ${audienceLine}.\n\nDrop your height and weight below and we will tell you your exact size!`,
            v3: `Find your perfect size today: check our interactive sizing chart on WhatsApp.\n\nSend 'SIZE' with your measurements for an instant size recommendation.\n\n📲 Message us now to grab your fit before popular sizes run out!`,
            cta: `Send 'SIZE' on WhatsApp for instant personalized sizing!`,
          },
          {
            hook: `Layering masterclass: how to wear ${shortTopic} in moderate weather.`,
            v1: `Layering Technique Guide:\n\nMastering lightweight layers is the easiest way to look stylish without overheating.\n\n3 Layering Formulas:\n1. Open Overshirt: Heavyweight tee beneath a textured cotton corduroy overshirt.\n2. French Tuck: Soft front-tuck to reveal your beltline while maintaining back volume.\n3. Contrast Textures: Pair smooth combed jersey with rough twill or waffle knit.\n\nSave this post for your next evening outing fit!`,
            v2: `Indian weather demands smart fabric choices that breathe easily.\n\nOur layers are woven from 100% natural fibers that stay light on the skin.\n\nWhat is your favorite layering piece? Tell us in the comments!`,
            v3: `The complete overshirt and layering drop is now live at ${brand.name}.\n\nLimited quantities available per design.\n\n📲 Send 'LAYERS' on WhatsApp to browse the lookbook and claim yours!`,
            cta: `WhatsApp 'LAYERS' to browse our full outerwear lookbook!`,
          },
          {
            hook: `Inside the workshop: inspecting the craftsmanship of ${shortTopic}.`,
            v1: `Craftsmanship Spotlight:\n\nTrue luxury lies in the details that most fast-fashion brands cut out to save costs.\n\nOur Quality Checklist:\n1. Twin-Needle Stitching: Reinforced seams along shoulders and side panels prevent blowout.\n2. 1x1 Ribbed Collar: High-density Lycra blend keeps neckline snug all day.\n3. Clean Blind Hems: Flat, irritation-free stitching against the skin.\n\nShare this with someone who appreciates genuine textile craftsmanship!`,
            v2: `Every single piece in ${brand.name} goes through strict quality control before it hits our racks.\n\nSupport conscious, locally crafted fashion designed to endure.\n\nWhich detail matters most to you when shopping for clothes?`,
            v3: `Experience the difference in hand: visit our store or order with a 7-day trial policy.\n\nSend 'CRAFT' on WhatsApp to view our behind-the-scenes production process.\n\n📲 WhatsApp our team today for exclusive brand lookbooks!`,
            cta: `Send 'CRAFT' on WhatsApp to inspect our manufacturing quality!`,
          },
          {
            hook: `Real fits from real customers: how our community styles ${shortTopic}.`,
            v1: `Community Style Lookbook:\n\nNothing beats seeing our pieces out in the wild on real bodies, styled in creative everyday ways.\n\n3 Featured Styling Angles:\n1. College Casual: Relaxed denim, clean white kicks, and effortless oversized drop.\n2. Evening Minimalist: Tailored black trousers, minimal accessories, and layered overshirt.\n3. Weekend Coffee Run: Shorts, crew socks, and retro running shoes.\n\nTag us in your outfit photos to be featured on our official page!`,
            v2: `Huge love to our growing community for making ${brand.name} a daily staple.\n\nSeeing you wear our designs with confidence is why we do what we do.\n\nWhich community fit is your favorite this week? Vote in the comments!`,
            v3: `Want to be featured? Grab your favorite ${shortTopic} today and tag our handle.\n\nSend 'COMMUNITY' on WhatsApp to get an exclusive 10% community member code!\n\n📲 Message us now to claim your code!`,
            cta: `Send 'COMMUNITY' on WhatsApp for exclusive perks & features!`,
          },
          {
            hook: `The weekend outfit inspiration you were looking for with ${shortTopic}.`,
            v1: `Weekend Outfit Inspiration:\n\nEffortless, head-turning style for your Saturday cafe dates and Sunday road trips.\n\nOutfit Breakdown:\n1. Top: Core neutral tee in earthy moss green or sand beige.\n2. Bottoms: Easy-fit relaxed cargo or relaxed selvedge denim.\n3. Accessories: Canvas tote, minimalist watch, and polarized sunglasses.\n\nSave this weekend look so you never have to ask "what should I wear?"!`,
            v2: `Weekends are made for stepping out and looking your absolute best without trying too hard.\n\nStop by ${brand.name} this Saturday for our weekend in-store fitting sessions.\n\nWhat are your plans this weekend? Tell us below!`,
            v3: `Ready to upgrade your weekend wardrobe? Our in-store stylists are ready to help.\n\nSend 'WEEKEND' on WhatsApp to get Google Maps store directions & catalog link!\n\n📍 Visit us today or order online with express delivery.`,
            cta: `Send 'WEEKEND' on WhatsApp for store location and direct catalog!`,
          },
          {
            hook: `VIP Drop Alert: limited stock remaining for ${shortTopic}.`,
            v1: `VIP Drop Spotlight:\n\nOur limited production runs ensure you won't see everyone else wearing the exact same outfit.\n\nDrop Highlights:\n1. Strictly limited units produced per colorway.\n2. Custom branded hardware and collectible hangtags on every piece.\n3. Available exclusively in store and through our direct WhatsApp channel.\n\nOnce a batch is sold out, we do not restock the same colorway!`,
            v2: `Thank you for the overwhelming response to our latest launch.\n\nSizes are moving fast across all branches.\n\nHave you grabbed your piece yet? Let us know in the comments!`,
            v3: `Final Call: Only a handful of pieces remain in sizes M, L, and XL for ${shortTopic}.\n\nSend 'VIP' on WhatsApp right now to reserve yours before it officially sells out.\n\n📲 Message us immediately to confirm availability!`,
            cta: `WhatsApp 'VIP' right now to reserve remaining sizes before sell-out!`,
          },
        ];
        const f = clothingFrameworks[slot]!;
        hook = `${cyclePrefix}${f.hook}`;
        variant1 = `${cyclePrefix}${f.v1}`;
        variant2 = `${cyclePrefix}${f.v2}`;
        variant3 = `${cyclePrefix}${f.v3}`;
        cta = f.cta;
      } else if (isFood) {
        const foodFrameworks = [
          {
            hook: `Why authentic ${shortTopic} hits differently this season.`,
            v1: `Signature Culinary Technique:\n\nThe secret to rich, aromatic ${shortTopic} lies in slow simmered timing and freshly roasted whole spices.\n\n3 Culinary Pillars:\n1. Spice Roasting: Whole cardamom, cloves, and cinnamon roasted to release essential oils.\n2. Fresh Dairy: Locally sourced farm-fresh milk simmered to silky perfection.\n3. Slow Infusion: Never rushed — steeped at low temperature for complex depth of flavor.\n\nSave this post for your next food craving!`,
            v2: `Nothing warms the soul like a piping hot cup or bowl shared with good friends.\n\nStep into ${brand.name} and let the aroma take over your senses.\n\nWho is joining you for a food break today? Tag them below!`,
            v3: `Fresh batch ready right now! Stop by ${brand.name} or order via WhatsApp.\n\nSend 'MENU' to get our complete fresh menu and specials delivered straight to your chat.\n\n📲 WhatsApp us now to place a quick pickup or delivery order!`,
            cta: `Send 'MENU' on WhatsApp to browse our live daily menu!`,
          },
          {
            hook: `The secret behind ${shortTopic} — what our kitchen does differently.`,
            v1: `Farm-to-Table Freshness:\n\nWe refuse to use pre-packaged pastes or artificial flavor enhancers in our ${shortTopic}.\n\nOur Kitchen Standards:\n1. 100% whole natural ingredients prepped fresh every morning by 7 AM.\n2. Zero artificial colors, zero synthetic preservatives.\n3. Strict temperature control for clean, unadulterated flavor notes.\n\nShare this with someone who appreciates honest food preparation!`,
            v2: `Pure taste, clean ingredients, and warmth in every single serving.\n\nAt ${brand.name}, cooking is our craft and your happiness is our standard.\n\nWhat is your all-time favorite comfort dish? Tell us in comments!`,
            v3: `Taste the authentic difference today: visit our cafe or order online.\n\nSend 'FRESH' on WhatsApp for 10% off your first direct takeaway order!\n\n📲 Message us to order fresh!`,
            cta: `WhatsApp 'FRESH' to claim your takeaway discount today!`,
          },
          {
            hook: `Your rainy day craving sorted: ${shortTopic} walkthrough.`,
            v1: `Comfort Food Pairing Guide:\n\nWhen the rain hits the windows, nothing matches the comfort of steaming hot ${shortTopic} paired with crunchy snacks.\n\nOur Signature Pairing:\n1. Piping hot brew infused with fresh grated ginger and lemongrass.\n2. Golden, crispy bites made fresh to order in cold-pressed oil.\n3. House-made tangy mint chutney prepared every two hours.\n\nBookmark this pairing for your next rainy afternoon!`,
            v2: `Rain outside, cozy corner table inside, and great conversation flowing.\n\nMake ${brand.name} your cozy sanctuary this rainy week.\n\nWho loves rainy day cafe sessions? Drop an umbrella emoji ☔!`,
            v3: `Rainy Day Special: Enjoy a complimentary house snack with every order of ${shortTopic} this week.\n\nSend 'RAIN' on WhatsApp to claim your special rainy day pass!\n\n📲 Visit us or order via WhatsApp for quick delivery.`,
            cta: `Send 'RAIN' on WhatsApp to unlock our rainy day special!`,
          },
          {
            hook: `Step inside our kitchen: how ${shortTopic} is freshly prepared.`,
            v1: `Behind the Counter Craft:\n\nWatch how our team prepares each portion of ${shortTopic} with meticulous care.\n\nPrep Steps:\n1. Freshly ground spices measured by weight for consistent flavor balance.\n2. Small-batch cooking to preserve vibrant aromas and texture.\n3. Plated and served immediately at optimal tasting temperature.\n\nSave this video/carousel to appreciate what goes into real culinary craft!`,
            v2: `We treat every guest like family walking into our home kitchen.\n\nExperience genuine hospitality at ${brand.name}.\n\nHave you visited our kitchen counter yet? Tell us your experience!`,
            v3: `Come taste what passion tastes like: reserve a table at ${brand.name} today.\n\nSend 'TABLE' on WhatsApp to reserve your seating without wait times.\n\n📲 WhatsApp us now to book!`,
            cta: `WhatsApp 'TABLE' to reserve your seating instantly!`,
          },
          {
            hook: `Beat the 3 PM workday slump with fresh ${shortTopic}.`,
            v1: `Workday Energy Ritual:\n\nSkip the sugary energy drinks that cause an inevitable crash. Choose clean, natural energy with ${shortTopic}.\n\nEnergy Benefits:\n1. Natural antioxidants that sharpen focus and reduce mental fatigue.\n2. Balanced caffeine release paired with natural digestive spices.\n3. Comforting warmth that resets your mood for an efficient afternoon.\n\nShare this with a colleague who needs a coffee/tea break right now!`,
            v2: `Take 15 minutes to step away from your laptop, breathe, and recharge.\n\nYour afternoon meetings will thank you later.\n\nWhat is your go-to beverage to power through the workday?`,
            v3: `Office Team Orders: We deliver fresh, piping-hot thermoses of ${shortTopic} to corporate offices in our neighborhood.\n\nSend 'OFFICE' on WhatsApp to set up a corporate refreshment account!\n\n📲 Message us to schedule team deliveries today!`,
            cta: `Send 'OFFICE' on WhatsApp for corporate team delivery discounts!`,
          },
          {
            hook: `The spice layering rule that makes ${shortTopic} unforgettable.`,
            v1: `Aromatic Spice Layering:\n\nWhy does our ${shortTopic} taste richer as you sip? It all comes down to the science of spice blooming.\n\n3 Layering Stages:\n1. Base Bloom: Tempering whole spices in clarified butter to extract fat-soluble notes.\n2. Mid-Simmer: Adding hand-ground cardamom for bright, floral top notes.\n3. Finish: A pinch of saffron and nutmeg for a velvety, lingering finish.\n\nSave this aromatic breakdown for culinary inspiration!`,
            v2: `Every single spice we use is sourced directly from ethical farmers in Southern India.\n\nReal flavor begins at the source.\n\nCan you detect all three spice layers in our signature brew?`,
            v3: `Discover the true flavor profile: visit ${brand.name} today.\n\nSend 'SPICE' on WhatsApp to view our complete beverage & dining menu!\n\n📲 Order online or visit our cafe today!`,
            cta: `WhatsApp 'SPICE' to explore our complete authentic menu!`,
          },
          {
            hook: `Weekend gathering spotlight: bring your friends together over ${shortTopic}.`,
            v1: `The Communal Table Tradition:\n\nFood tastes better when shared. Here is the perfect sharing feast for your weekend crew:\n\nFeast Highlights:\n1. Generous sharing platters with a variety of textures and dips.\n2. Endless refills of hot, fragrant ${shortTopic} brewed fresh.\n3. Artisanal baked desserts crafted to complement the rich savory notes.\n\nTag your weekend hangout squad right now!`,
            v2: `Laughter, loud stories, and empty plates — that is what weekend memories are made of.\n\nJoin our community table at ${brand.name} this Saturday and Sunday.\n\nWhere is your group heading this weekend? Tell us below!`,
            v3: `Weekend Table Reservations Open: Book for groups of 4+ and receive a complimentary chef's tasting snack.\n\nSend 'WEEKEND' on WhatsApp to reserve your group table now!\n\n📲 Message us to secure weekend spots!`,
            cta: `Send 'WEEKEND' on WhatsApp to reserve your table today!`,
          },
          {
            hook: `Baked fresh every single morning: the story behind our ${shortTopic}.`,
            v1: `Artisanal Morning Baking:\n\nOur ovens turn on at 5:30 AM every morning so you get ${shortTopic} fresh from the heat.\n\nBaking Standards:\n1. Slow fermented dough for easy digestion and complex crumb texture.\n2. 100% dairy butter — no hydrogenated vegetable oils or margarine.\n3. Hand-kneaded in small batches for cloud-like tenderness.\n\nSave this post for your breakfast inspiration!`,
            v2: `There is nothing quite like the smell of fresh baking mingling with freshly brewed coffee and tea.\n\nStart your morning on the right foot at ${brand.name}.\n\nWhat time is your first morning coffee/tea? Let us know below!`,
            v3: `Morning Breakfast Combos: Pair fresh ${shortTopic} with our signature morning brew at a special early-bird price until 11 AM.\n\nSend 'BREAKFAST' on WhatsApp to check today's morning bakes!\n\n📲 Message us or visit our counter early!`,
            cta: `WhatsApp 'BREAKFAST' to view today's freshly baked batches!`,
          },
          {
            hook: `The guest favorite that sells out before 6 PM: ${shortTopic}.`,
            v1: `Guest Favorite Spotlight:\n\nWhen we introduced ${shortTopic}, we never anticipated it would become our most requested order.\n\nWhy It's a Customer Obsession:\n1. Harmonious balance between savory depth and subtle sweetness.\n2. Light, non-greasy finish that leaves you energized rather than sluggish.\n3. Consistent flavor every single time — guaranteed by our head chef.\n\nHave you tried this crowd favorite yet? Tell us in the comments!`,
            v2: `Seeing our regular patrons smile after that first bite/sip makes every hour of prep worth it.\n\nThank you for making ${brand.name} your neighborhood destination.\n\nWhich menu item do you recommend to first-timers?`,
            v3: `Don't miss out on today's batch: reserve your portion of ${shortTopic} before it sells out.\n\nSend 'RESERVE' on WhatsApp to hold your order for evening pickup!\n\n📲 WhatsApp us now to secure yours!`,
            cta: `Send 'RESERVE' on WhatsApp to secure today's limited batch!`,
          },
          {
            hook: `Sweet or savory? How to pair ${shortTopic} for the ultimate balance.`,
            v1: `Flavor Contrast Pairing:\n\nBalancing contrasting flavors is the hallmark of sophisticated dining and snacking.\n\nHow to Pair ${shortTopic}:\n1. Contrast with Crisp Acidity: Pickled onions or mint chutney cut through rich creamy textures.\n2. Balance with Earthy Warmth: Roasted nuts and whole grains provide grounded crunch.\n3. Finish with Subtle Sweetness: Jaggery or raw honey highlights the natural spice notes.\n\nSave this pairing guide to elevate your home hosting and dining!`,
            v2: `Every element on our menu is designed to harmonize with the next.\n\nCome hungry, leave delighted at ${brand.name}.\n\nAre you a sweet tooth or do you prefer spicy savory treats?`,
            v3: `Try our curated pairing tasting board this week at ${brand.name}.\n\nSend 'TASTING' on WhatsApp to see available booking times!\n\n📲 WhatsApp us today to book!`,
            cta: `WhatsApp 'TASTING' to book our signature pairing board!`,
          },
          {
            hook: `A tribute to authentic heritage: why we cherish ${shortTopic}.`,
            v1: `Heritage Recipe Respect:\n\nIn a world of fast microwave meals, preserving the authentic traditional preparation of ${shortTopic} is our passion.\n\nHeritage Practices:\n1. Traditional brass and cast-iron vessels for even, gentle heat distribution.\n2. Time-tested family ratios refined over three generations of cooks.\n3. Honoring each ingredient with zero chemical shortcuts or artificial additives.\n\nShare this with someone who cherishes authentic home-style food traditions!`,
            v2: `Food is culture, memory, and connection to our roots.\n\nExperience authentic nostalgia with every visit to ${brand.name}.\n\nWhat traditional dish brings back your fondest childhood memories?`,
            v3: `Bring the tradition home: order family-sized portions of ${shortTopic} for your next family dinner.\n\nSend 'HERITAGE' on WhatsApp to view our catering and family feast options!\n\n📲 Message us to arrange your family order today!`,
            cta: `Send 'HERITAGE' on WhatsApp for authentic family dining options!`,
          },
          {
            hook: `Join our VIP foodie club: exclusive perks on ${shortTopic}.`,
            v1: `Foodie VIP Access:\n\nWe love treating our most loyal patrons with secret off-menu specials and first tastings.\n\nVIP Member Benefits:\n1. Priority seating on busy weekends with zero waiting list delays.\n2. Complimentary chef's test recipes before they appear on the public menu.\n3. Direct WhatsApp ordering channel with priority delivery routing.\n\nTag a fellow foodie who deserves VIP treatment!`,
            v2: `Being part of the ${brand.name} community means you are always treated like family.\n\nThank you for supporting our kitchen every single day.\n\nWhich new dish should we experiment with next? Share your ideas!`,
            v3: `Join our WhatsApp VIP club in 5 seconds — completely free!\n\nSend 'VIP' on WhatsApp to receive a welcome voucher for your next visit.\n\n📲 Message us now to unlock your foodie benefits!`,
            cta: `WhatsApp 'VIP' now to unlock complimentary dining perks!`,
          },
        ];
        const f = foodFrameworks[slot]!;
        hook = `${cyclePrefix}${f.hook}`;
        variant1 = `${cyclePrefix}${f.v1}`;
        variant2 = `${cyclePrefix}${f.v2}`;
        variant3 = `${cyclePrefix}${f.v3}`;
        cta = f.cta;
      } else {
        const generalFrameworks = [
          {
            hook: `${shortTopic} — the angle nobody talks about in our industry.`,
            v1: `Core Execution Blueprint:\n\nWhen tackling ${shortTopic}, focusing on high-leverage fundamentals yields 10x the results of surface-level trends.\n\n3 Essential Pillars:\n1. Clear Objective: Define the exact commercial outcome before starting.\n2. Transparent Execution: Measure inputs and progress with verifiable checkpoints.\n3. Continuous Refinement: Optimize workflows based on real performance data.\n\nSave this blueprint to keep your standards high!`,
            v2: `Every day at ${brand.name}, we work with ${audienceLine} who want simple, reliable solutions without the headache.\n\nNo fluff, no exaggerated promises — just honest execution and measurable care.\n\nWhich part of ${shortTopic} would you like us to explain next?`,
            v3: `Direct Action: If ${shortTopic} is on your priority list, ${brand.name} is ready to help.\n\nNo delays, no sales pressure — just a clear, honest conversation about your requirements.\n\n📲 Send a DM with 'DETAILS' or WhatsApp us today to get started!`,
            cta: `Send us a DM with 'DETAILS' or WhatsApp us to get started!`,
          },
          {
            hook: `Stop scrolling: the biggest misconception about ${shortTopic} explained.`,
            v1: `Myth vs Reality Breakdown:\n\nConventional advice around ${shortTopic} is often outdated or overcomplicated.\n\nHere is What You Need to Know:\n1. Complexity is the enemy of execution — streamlined systems always win.\n2. Real results require consistency, not one-time heroic efforts.\n3. Trustworthy partners show their methods openly without withholding critical details.\n\nShare this with someone who needs a reality check on their approach!`,
            v2: `We believe in radical transparency and setting realistic expectations from day one.\n\nThat is how long-term trust is built with ${audienceLine}.\n\nWhat has been your biggest frustration with this in the past?`,
            v3: `Looking for honest, professional guidance? Connect directly with our specialists.\n\nSend 'GUIDE' on WhatsApp to receive our free implementation checklist.\n\n📲 Message us today for direct support!`,
            cta: `WhatsApp 'GUIDE' to receive our free implementation checklist!`,
          },
          {
            hook: `How to avoid the costly mistakes most people make with ${shortTopic}.`,
            v1: `Risk Mitigation Checklist:\n\nRushing into ${shortTopic} without a proven framework leads to wasted time and unnecessary expense.\n\n3 Safeguards to Put in Place:\n1. Audit Existing Resources: Leverage what you already have before buying new tools.\n2. Establish Clear Benchmarks: Know what success looks like in concrete numbers.\n3. Verify Credentials: Work with certified, experienced teams who have a verified track record.\n\nBookmark this checklist before making your next investment!`,
            v2: `Avoid the common pitfalls that hold back ${audienceLine}.\n\nWe guide you through every step with proven, tested methodologies at ${brand.name}.\n\nHave you ever faced unexpected roadblocks with this? Tell us below.`,
            v3: `Get a free 15-minute diagnostic assessment of your current situation.\n\nNo obligations, just practical insights tailored for your needs.\n\n📲 DM 'AUDIT' or WhatsApp our team to schedule your review!`,
            cta: `DM 'AUDIT' on WhatsApp to book your complimentary diagnostic review!`,
          },
          {
            hook: `The 3-step workflow to streamline ${shortTopic} this month.`,
            v1: `Operational Efficiency Framework:\n\nStreamlining your approach to ${shortTopic} saves hours of wasted effort each week.\n\n3 Actionable Steps:\n1. Eliminate Redundancies: Cut out manual tasks that can be standardized.\n2. Prioritize High-Impact Tasks: Focus 80% of energy on the 20% that drives value.\n3. Review Weekly: Check progress against milestones and adjust course quickly.\n\nSave this workflow to optimize your team's routine!`,
            v2: `Designed for busy professionals who demand maximum return on their time.\n\nAt ${brand.name}, efficiency and precision are built into everything we deliver.\n\nHow do you currently manage your daily priority tasks?`,
            v3: `Ready to upgrade your workflow? Partner with ${brand.name} today.\n\nSend 'WORKFLOW' on WhatsApp to discover our full range of solutions.\n\n📲 Message our support line now!`,
            cta: `Send 'WORKFLOW' on WhatsApp to explore our verified solutions!`,
          },
          {
            hook: `Why quality matters more than speed when executing ${shortTopic}.`,
            v1: `Quality Standards Protocol:\n\nCutting corners to meet an artificial deadline always creates technical debt and customer dissatisfaction.\n\nOur Standard Operating Principles:\n1. Rigorous Verification: Every deliverable is reviewed against strict quality rubrics.\n2. Durable Solutions: We build systems designed to perform for years, not days.\n3. Client-Centric Communication: Keeping you informed with honest status updates at every stage.\n\nShare this post if you believe in doing things right the first time!`,
            v2: `We take pride in our craft and stand behind every single project we complete.\n\nThat is our promise to every customer at ${brand.name}.\n\nDo you prioritize speed or perfection in your own work? Let us know!`,
            v3: `Experience the difference that genuine quality makes: speak with our team today.\n\nSend 'QUALITY' on WhatsApp to receive a custom proposal for your needs.\n\n📲 WhatsApp us now!`,
            cta: `WhatsApp 'QUALITY' for a customized proposal tailored to you!`,
          },
          {
            hook: `Behind the scenes: how our team tackles ${shortTopic} daily.`,
            v1: `Process Transparency Walkthrough:\n\nTake a look behind the curtain at how ${brand.name} delivers consistent excellence.\n\nOur Daily Routine:\n1. Morning Alignment: Reviewing client goals, milestones, and priority deliverables.\n2. Deep Focused Work: Dedicated blocks for problem-solving and rigorous quality control.\n3. Evening Debrief: Auditing outputs and communicating clear progress to stakeholders.\n\nSave this peek into our operations for your own team inspiration!`,
            v2: `Great work is the result of dedicated people following disciplined routines.\n\nWe are honored to serve ${audienceLine} with pride every single day.\n\nWhat does your team's morning alignment routine look like?`,
            v3: `Want to see how we can assist your project? Let us give you a walkthrough.\n\nSend 'WALKTHROUGH' on WhatsApp to chat directly with our project lead.\n\n📲 Connect with our team today!`,
            cta: `Send 'WALKTHROUGH' on WhatsApp to schedule an introductory call!`,
          },
          {
            hook: `Real talk on ${shortTopic} before you make your next decision.`,
            v1: `Honest Industry Evaluation:\n\nBefore committing to any path for ${shortTopic}, ask these three critical questions:\n\nCritical Questions:\n1. Does this solution directly solve your core problem or just treat a symptom?\n2. What is the total cost of ownership including maintenance and upkeep?\n3. Is there verifiable proof and social proof from customers in your situation?\n\nBookmark this evaluation guide for your next strategic decision!`,
            v2: `No hard sell, no confusing jargon. We help you make confident, informed choices.\n\nThat is the ${brand.name} philosophy.\n\nWhat is the most important factor when choosing a service partner?`,
            v3: `Get clear answers to your toughest questions from our experienced team.\n\nSend 'ANSWERS' on WhatsApp for immediate, straightforward advice.\n\n📲 Message us now!`,
            cta: `WhatsApp 'ANSWERS' for direct, transparent advice with zero sales pressure!`,
          },
          {
            hook: `The framework we use to achieve consistent results with ${shortTopic}.`,
            v1: `Milestone-Driven Methodology:\n\nConsistent outcomes are not an accident — they are the predictable result of a proven methodology.\n\nOur 3-Phase Approach:\n1. Discovery & Diagnosis: Understanding the exact parameters and constraints.\n2. Structured Execution: Deploying battle-tested workflows with zero guesswork.\n3. Performance Review: Auditing results and refining for long-term compounding success.\n\nSave this methodology breakdown for your records!`,
            v2: `Systematic execution eliminates stress and guarantees dependable outcomes for ${audienceLine}.\n\nDiscover how ${brand.name} makes complex projects effortless.\n\nWhich phase do you find most challenging in your own work?`,
            v3: `Let us implement this framework for your brand: claim your priority onboarding slot.\n\nSend 'SYSTEM' on WhatsApp to check availability for this month.\n\n📲 Contact our onboarding team today!`,
            cta: `Send 'SYSTEM' on WhatsApp to secure your priority onboarding slot!`,
          },
          {
            hook: `What separates average execution from exceptional results in ${shortTopic}.`,
            v1: `The Excellence Differentiator:\n\nThe gap between mediocrity and industry leadership comes down to small, compounding details.\n\nKey Differentiators:\n1. Attention to the Edge Cases: Preparing for anomalies before they occur.\n2. Proactive Communication: Answering client questions before they need to ask.\n3. Relentless Follow-Through: Delivering on every promise made, without exceptions.\n\nShare this with someone committed to delivering excellence!`,
            v2: `Excellence is not an act, but a habit we practice every day at ${brand.name}.\n\nServing ${audienceLine} with integrity and high standards.\n\nWhat standard of excellence do you hold your team to?`,
            v3: `Partner with a team that holds itself to the highest standard.\n\nSend 'EXCELLENCE' on WhatsApp to discuss your upcoming project.\n\n📲 Message us now to connect!`,
            cta: `WhatsApp 'EXCELLENCE' to start a project consultation!`,
          },
          {
            hook: `A quick 2-minute audit for your approach to ${shortTopic}.`,
            v1: `Self-Assessment Audit:\n\nTake two minutes to rate your current process on a scale of 1 to 5 across these three dimensions:\n\nAudit Dimensions:\n1. Clarity: Is everyone on the same page regarding expectations and outcomes?\n2. Reliability: Does your system produce the same quality every single time?\n3. Scalability: Can this process handle 2x the volume without breaking down?\n\nSave this quick audit to evaluate your progress at the end of the month!`,
            v2: `Identifying gaps early is the fastest way to accelerate your progress.\n\nAt ${brand.name}, we help you diagnose weaknesses and build robust solutions.\n\nWhat score did you give your current process? Share below!`,
            v3: `Want our experts to run a comprehensive audit for your business?\n\nSend 'AUDIT2' on WhatsApp to receive a customized diagnostic checklist.\n\n📲 Message us to get started!`,
            cta: `Send 'AUDIT2' on WhatsApp to request a complimentary systems review!`,
          },
          {
            hook: `Frequently asked questions about ${shortTopic} answered honestly.`,
            v1: `Direct FAQ Clarification:\n\nWe gathered the top questions we hear from ${audienceLine} and answered them with complete candor.\n\nTop Questions Answered:\n1. "How long does it take to see tangible results?" Typically within 2-4 weeks of disciplined execution.\n2. "What are the common hidden costs?" With us, zero — all pricing is transparent and upfront.\n3. "How do we get started?" With a simple 10-minute discovery chat.\n\nBookmark this FAQ to reference whenever questions arise!`,
            v2: `Transparency builds enduring partnerships. We never hide behind ambiguous jargon.\n\nDiscover how ${brand.name} puts your needs first.\n\nDo you have a question we didn't cover? Ask us in the comments!`,
            v3: `Have a specific scenario you want to discuss? We are here to help.\n\nSend 'FAQ' on WhatsApp to get immediate answers from our team.\n\n📲 WhatsApp us now!`,
            cta: `WhatsApp 'FAQ' to have your questions answered directly!`,
          },
          {
            hook: `Your next step: taking decisive action on ${shortTopic} today.`,
            v1: `Action Orientation Roadmap:\n\nAnalysis paralysis is the single biggest obstacle to meaningful progress. Here is how to take action today:\n\nImmediate Action Steps:\n1. Commit to One Priority: Focus on the single highest-impact initiative this week.\n2. Secure Qualified Support: Don't waste weeks trying to solve solved problems on your own.\n3. Set a Concrete Deadline: Schedule the completion date and hold yourself accountable.\n\nSave this motivational roadmap and take your first step today!`,
            v2: `Progress begins the moment you decide to take the first step.\n\n${brand.name} is ready to partner with you every step of the way.\n\nWhat is one action you will commit to completing before this Friday?`,
            v3: `Take action now: schedule your strategic consultation with our senior team.\n\nSend 'ACTION' on WhatsApp to book your complimentary 20-minute strategy call.\n\n📲 Message us today to start!`,
            cta: `Send 'ACTION' on WhatsApp to schedule your 20-minute strategy session!`,
          },
        ];
        const f = generalFrameworks[slot]!;
        hook = `${cyclePrefix}${f.hook}`;
        variant1 = `${cyclePrefix}${f.v1}`;
        variant2 = `${cyclePrefix}${f.v2}`;
        variant3 = `${cyclePrefix}${f.v3}`;
        cta = f.cta;
      }

      return {
        calendar_date: new Date().toISOString().slice(0, 10),
        platform,
        format,
        topic,
        hook,
        objective: `Drive verified interest and WhatsApp catalog/trial inquiries for ${shortTopic} at ${brand.name}.`,
        caption_variants: [variant1, variant2, variant3],
        audience: audienceLine,
        hashtags: [
          ...(brand.products.toLowerCase().includes("fit") || brand.products.toLowerCase().includes("gym") || brand.products.toLowerCase().includes("wellness")
            ? ["#FitnessGoals", "#Transformation", "#GymLife", "#HealthIndia"]
            : brand.products.toLowerCase().includes("cloth") || brand.products.toLowerCase().includes("fashion") || brand.products.toLowerCase().includes("streetwear")
            ? ["#StreetStyleIndia", "#MensFashion", "#OOTDIndia", "#SneakerheadIndia", "#FashionDeals"]
            : brand.products.toLowerCase().includes("food") || brand.products.toLowerCase().includes("cafe") || brand.products.toLowerCase().includes("chai")
            ? ["#Foodie", "#CafeLife", "#GoodEats", "#PuneFoodie"]
            : ["#Business", "#Growth", "#Quality", "#Trusted"]),
          `#${brand.name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20) || "Brand"}`,
          "#Explore",
          "#Featured",
          "#Community",
        ].slice(0, 10),
        cta,
        alt_text: `Visual creative showcasing ${shortTopic} for ${brand.name}`,
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
            visual: `Pattern Interrupt (0-3s): Fast camera cut with immediate physical action showcasing ${topic}`,
            shot_type: "close-up",
            duration_s: 3,
            on_screen_text: hooks[angle] as string,
            voiceover: voHooks[angle] as string,
          },
          {
            n: 2,
            visual: `Dynamic Demonstration (3-23s): Fast-paced cuts showcasing real fit, styling combos, or program breakdown for ${audience}`,
            shot_type: "montage",
            duration_s: Math.max(15, duration - 10),
            on_screen_text: "The Real Difference",
            voiceover: `Here is exactly what makes ${topic} stand out at ${brand.name} — premium quality, tailored fit, zero fluff.`,
          },
          {
            n: 3,
            visual: `Conversion Close (23-30s): Clear visual card with WhatsApp catalog link and store location directions`,
            shot_type: "medium",
            duration_s: 7,
            on_screen_text: "DM 'CATALOG' or tap link in bio",
            voiceover: `Want this? DM us 'CATALOG' on WhatsApp or visit ${brand.name} this weekend before sizes sell out!`,
          },
        ],
        music_mood: angle === 0 ? "Confident modern beat" : angle === 1 ? "Upbeat lifestyle pop" : "Warm acoustic groove",
        captions_srt: `1\n00:00:00,000 --> 00:00:03,000\n${hooks[angle]}\n\n2\n00:00:03,000 --> 00:00:23,000\nWhat makes ${topic} stand out.\n\n3\n00:00:23,000 --> 00:00:30,000\nDM 'CATALOG' or visit us this weekend.`,
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
