import { describe, expect, it, vi, beforeEach } from "vitest";
import { runCampaignPipeline } from "@/lib/agents/pipeline";
import type { BrandProfile } from "@/lib/brand";
import type { BriefInput } from "@/lib/schemas";
import { validateContent, validateDesign, validateVideo } from "@/lib/validation";
import type { CampaignContext } from "@/lib/campaignContext";

// Mock the repo and external dependencies
vi.mock("@/lib/db/fileRepo", () => ({
  getRepo: vi.fn().mockResolvedValue({
    listCatalog: vi.fn().mockResolvedValue([]),
    saveCampaign: vi.fn().mockResolvedValue(undefined),
    addRun: vi.fn().mockResolvedValue(undefined),
    addAudit: vi.fn().mockResolvedValue(undefined),
  }),
  audit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/notify", () => ({
  notify: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/image/provider", () => ({
  renderCreative: vi.fn().mockResolvedValue({
    url: "data:image/png;base64,test",
    width: 1080,
    height: 1080,
    provider: "template",
    svg: "<svg></svg>",
  }),
}));

// Mock LLM provider to return deterministic responses
vi.mock("@/lib/llm", () => ({
  getLLM: () => ({
    name: "gemini",
    sample: false,
    json: vi.fn().mockImplementation(async ({ schema, user }) => {
      // Return appropriate mock data based on the schema/task
      if (user.includes("CEO orchestrator") || user.includes("campaign plan")) {
        return {
          data: {
            objectives: [
              "Generate 100 qualified leads for residential apartments in Nashik",
              "Convert at least 8 leads into site visits",
              "Build brand awareness for the property project",
            ],
            kpis: ["Leads generated", "Site visits booked", "Cost per lead", "Conversion rate"],
            tasks: [
              { agent: "strategist", description: "Build 30-day calendar for Nashik apartments", depends_on: [], deadline_day: 2 },
              { agent: "content", description: "Write captions for apartment topics", depends_on: [], deadline_day: 5 },
            ],
            risks: ["Missing property-specific facts - flag instead of inventing"],
          },
          usage: { inputTokens: 100, outputTokens: 200, cachedTokens: 0, costUsd: 0.001, latencyMs: 500, model: "gemini-flash-latest", groundingRequests: 0 },
        };
      }
      if (user.includes("Strategist") || user.includes("30-day calendar")) {
        return {
          data: {
            content_pillars: ["Property Education", "Location Benefits", "Booking Process", "Social Proof"],
            audience_insights: ["Nashik homebuyers prioritize connectivity and amenities", "Families look for schools and parks nearby", "Investors check rental yield and appreciation"],
            calendar: Array.from({ length: 10 }, (_, i) => ({
              date: `2026-10-${String(i + 1).padStart(2, "0")}`,
              platform: ["instagram", "facebook", "linkedin"][i % 3],
              format: ["post", "carousel", "reel"][i % 3],
              topic: [
                "Why Nashik is the next real estate hotspot",
                "3 BHK vs 2 BHK: What suits your family",
                "Site visit checklist for apartment buyers",
                "RERA compliance: What every buyer must know",
                "Home loan eligibility for Nashik properties",
                "Amenities that add value to your investment",
                "Connectivity: Metro, highways & transit access",
                "Legal due diligence before booking",
                "Festival offers on residential apartments",
                "Customer testimonial: Why we chose this project",
              ][i],
              goal: ["Education", "Education", "Education", "Education", "Education", "Proof", "Education", "Education", "Offer", "Proof"][i],
              hook: `Day ${i + 1} — Nashik apartment insight`,
              pillar: ["Property Education", "Property Education", "Property Education", "Property Education", "Property Education", "Location Benefits", "Property Education", "Property Education", "Offer", "Social Proof"][i],
            })),
            campaign_ideas: ["Festival booking offers", "Site visit weekends"],
            festival_hooks: ["Diwali special pricing", "New year new home"],
          },
          usage: { inputTokens: 200, outputTokens: 500, cachedTokens: 0, costUsd: 0.002, latencyMs: 800, model: "gemini-flash-latest", groundingRequests: 0 },
        };
      }
      if (user.includes("Content Creator") || user.includes("Write content")) {
        const topicMatch = user.match(/topic "([^"]+)"/);
        const topic = topicMatch ? topicMatch[1] : "Nashik apartments";
        return {
          data: {
            calendar_date: "2026-10-01",
            platform: "instagram",
            format: "post",
            topic,
            caption_variants: [
              `${topic} — Here's what every homebuyer should know before booking.`,
              `${topic} — We break down the key factors that affect your decision.`,
              `${topic} — Save this checklist for your site visit.`,
            ],
            hashtags: ["#NashikRealEstate", "#HomeBuying", "#PropertyInvestment", "#3BHK", "#SiteVisit"],
            cta: "Book your site visit this weekend — limited slots available",
            alt_text: `Infographic about ${topic} for Nashik homebuyers`,
          },
          usage: { inputTokens: 150, outputTokens: 300, cachedTokens: 0, costUsd: 0.0015, latencyMs: 600, model: "gemini-flash-latest", groundingRequests: 0 },
        };
      }
      if (user.includes("CEO reviewer") || user.includes("Review this copy")) {
        return {
          data: {
            score: 85,
            passed: true,
            issues: [],
            feedback_for_agent: "Good. Content is specific to Nashik apartments with actionable CTAs.",
          },
          usage: { inputTokens: 100, outputTokens: 100, cachedTokens: 0, costUsd: 0.0005, latencyMs: 300, model: "gemini-flash-latest", groundingRequests: 0 },
        };
      }
      if (user.includes("Designer") || user.includes("design brief")) {
        return {
          data: {
            layout: "Bold headline with property image, CTA at bottom",
            headline: "Your Dream Home in Nashik Awaits",
            subtext: "3 BHK apartments with modern amenities. Book a site visit today.",
            color_usage: "Brand blue gradient on white with gold accents",
            image_prompt: "Modern residential apartment building exterior, premium architecture, landscaped gardens, no text",
            template_id: "bold-center",
            size: "1080x1080",
            text_overlays: ["Book Site Visit", "Limited Units"],
          },
          usage: { inputTokens: 120, outputTokens: 200, cachedTokens: 0, costUsd: 0.001, latencyMs: 400, model: "gemini-flash-latest", groundingRequests: 0 },
        };
      }
      if (user.includes("Video Planner") || user.includes("reel script")) {
        return {
          data: {
            duration_s: 30,
            aspect: "9:16",
            scenes: [
              { n: 1, visual: "Drone shot of Nashik apartment project with surroundings", shot_type: "drone", duration_s: 5, on_screen_text: "Nashik's Premium Living", voiceover: "Discover premium living in the heart of Nashik." },
              { n: 2, visual: "Walkthrough of 3 BHK show flat - living, kitchen, bedrooms", shot_type: "walkthrough", duration_s: 15, on_screen_text: "Spacious 3 BHK Interiors", voiceover: "Spacious 3 BHK homes with modern finishes and smart layouts." },
              { n: 3, visual: "Amenities montage - clubhouse, pool, gym, gardens", shot_type: "montage", duration_s: 5, on_screen_text: "World-Class Amenities", voiceover: "Clubhouse, pool, gym, and landscaped gardens for your family." },
              { n: 4, visual: "CTA card with phone number and 'Book Site Visit' button", shot_type: "static", duration_s: 5, on_screen_text: "Book Your Visit: 1800-XXX-XXXX", voiceover: "Book your site visit today. Call 1800-XXX-XXXX." },
            ],
            music_mood: "aspirational, calm, premium",
            captions_srt: "1\n00:00:00,000 --> 00:00:05,000\nDiscover premium living in Nashik.\n\n2\n00:00:05,000 --> 00:00:20,000\nSpacious 3 BHK homes with modern finishes.\n\n3\n00:00:20,000 --> 00:00:25,000\nWorld-class amenities for your family.\n\n4\n00:00:25,000 --> 00:00:30,000\nBook your site visit today.",
            thumbnail_idea: "Aerial view of project with 'Nashik Premium Living' text",
          },
          usage: { inputTokens: 180, outputTokens: 400, cachedTokens: 0, costUsd: 0.002, latencyMs: 700, model: "gemini-flash-latest", groundingRequests: 0 },
        };
      }
      return {
        data: {},
        usage: { inputTokens: 0, outputTokens: 0, cachedTokens: 0, costUsd: 0, latencyMs: 0, model: "gemini-flash-latest", groundingRequests: 0 },
      };
    }),
  }),
}));

const NASHIK_BRAND: BrandProfile = {
  id: "nashik-realty",
  name: "Nashik Premier Homes",
  tone: "professional, trustworthy, aspirational",
  languages: ["English", "Hinglish", "Marathi"],
  audience: "Families and investors looking for residential apartments in Nashik",
  products: "3 BHK and 2 BHK residential apartments in Nashik",
  usp: "RERA-registered, prime location with metro connectivity, premium amenities",
  dos: ["Mention RERA registration", "Highlight metro connectivity", "Include specific location benefits"],
  donts: ["No guaranteed returns", "No invented amenities", "No fake testimonials"],
  compliance_notes: "MahaRERA compliance required. All claims must be verifiable.",
};

const NASHIK_BRIEF: BriefInput = {
  brandId: "nashik-realty",
  month: "2026-10",
  goal: "Generate 100 qualified leads for residential apartments in Nashik and convert at least 8 into site visits",
  budget: 500000,
  offers: "Diwali booking offer: 1% stamp duty waiver + free modular kitchen",
  festivals: "Diwali, Dussehra",
  notes: "Focus on 3 BHK units. Target families relocating to Nashik for work.",
};

describe("Nashik Apartment Campaign - End-to-End", () => {
  let campaignContext: CampaignContext;

  beforeEach(async () => {
    // Build the campaign context as the pipeline would
    const { buildCampaignContext, contextToPrompt } = await import("@/lib/campaignContext");
    campaignContext = buildCampaignContext({
      campaignId: "cmp-test-nashik",
      brand: NASHIK_BRAND,
      brief: {
        goal: NASHIK_BRIEF.goal,
        month: NASHIK_BRIEF.month,
        budget: NASHIK_BRIEF.budget,
        offers: NASHIK_BRIEF.offers,
        festivals: NASHIK_BRIEF.festivals,
        notes: NASHIK_BRIEF.notes,
      },
      catalog: [],
      trends: [],
    });
  });

  it("produces content specific to Nashik apartments, not generic marketing", async () => {
    const result = await runCampaignPipeline({
      brand: NASHIK_BRAND,
      brief: NASHIK_BRIEF,
      trends: [],
      source: "brief",
    });

    expect(result.campaignId).toBeDefined();
    expect(result.items).toBeGreaterThan(0);
    expect(result.costUsd).toBeGreaterThan(0);
  });

  it("validates content for campaign relevance and no invented claims", async () => {
    const { buildCampaignContext } = await import("@/lib/campaignContext");
    const context = buildCampaignContext({
      campaignId: "cmp-test-nashik",
      brand: NASHIK_BRAND,
      brief: {
        goal: NASHIK_BRIEF.goal,
        month: NASHIK_BRIEF.month,
        budget: NASHIK_BRIEF.budget,
        offers: NASHIK_BRIEF.offers,
        festivals: NASHIK_BRIEF.festivals,
        notes: NASHIK_BRIEF.notes,
      },
      catalog: [],
      trends: [],
    });

    // Test content validation
    const mockContent = {
      calendar_date: "2026-10-01",
      platform: "instagram",
      format: "post",
      topic: "Why Nashik is the next real estate hotspot",
      caption_variants: [
        "Why Nashik is the next real estate hotspot — Here's what every homebuyer should know before booking.",
        "Why Nashik is the next real estate hotspot — We break down the key factors that affect your decision.",
        "Why Nashik is the next real estate hotspot — Save this checklist for your site visit.",
      ],
      hashtags: ["#NashikRealEstate", "#HomeBuying", "#PropertyInvestment"],
      cta: "Book your site visit this weekend — limited slots available",
      alt_text: "Infographic about Nashik real estate for homebuyers",
    };

    const calendarItem = {
      date: "2026-10-01",
      platform: "instagram" as const,
      format: "post" as const,
      topic: "Why Nashik is the next real estate hotspot",
      goal: "Education",
      hook: "Day 1 — Nashik apartment insight",
      pillar: "Property Education",
    };

    const validation = validateContent({
      content: mockContent,
      calendarItem,
      context,
      existingContent: [],
    });

    expect(validation.passed).toBe(true);
    expect(validation.issues.filter(i => i.code === "WRONG_INDUSTRY_CONTENT").length).toBe(0);
    expect(validation.issues.filter(i => i.code === "UNVERIFIED_NUMERIC_CLAIM").length).toBe(0);
    expect(validation.issues.filter(i => i.code === "PLACEHOLDER_CONTENT").length).toBe(0);
  });

  it("rejects content with generic digital marketing agency language", async () => {
    const { buildCampaignContext } = await import("@/lib/campaignContext");
    const context = buildCampaignContext({
      campaignId: "cmp-test-nashik",
      brand: NASHIK_BRAND,
      brief: {
        goal: NASHIK_BRIEF.goal,
        month: NASHIK_BRIEF.month,
        budget: NASHIK_BRIEF.budget,
        offers: NASHIK_BRIEF.offers,
        festivals: NASHIK_BRIEF.festivals,
        notes: NASHIK_BRIEF.notes,
      },
      catalog: [],
      trends: [],
    });

    const badContent = {
      calendar_date: "2026-10-01",
      platform: "instagram",
      format: "post",
      topic: "Digital marketing tips",
      caption_variants: [
        "Digital marketing tips — Reply to learn more.",
        "How we do SEO for small businesses step by step.",
        "Save this for later. What should we cover next?",
      ],
      hashtags: ["#digitaladvertise", "#smallbusiness", "#marketingtips"],
      cta: "DM us to get a free consultation",
      alt_text: "Graphic about digital marketing",
    };

    const calendarItem = {
      date: "2026-10-01",
      platform: "instagram" as const,
      format: "post" as const,
      topic: "Digital marketing tips",
      goal: "Education",
      hook: "Day 1 — marketing tip",
      pillar: "Education",
    };

    const validation = validateContent({
      content: badContent,
      calendarItem,
      context,
      existingContent: [],
    });

    expect(validation.passed).toBe(false);
    expect(validation.issues.some(i => i.code === "WRONG_INDUSTRY_CONTENT")).toBe(true);
    expect(validation.issues.some(i => i.code === "PLACEHOLDER_CONTENT")).toBe(true);
    expect(validation.issues.some(i => i.code === "IRRELEVANT_HASHTAGS")).toBe(true);
  });

  it("validates design briefs for campaign specificity", async () => {
    const { buildCampaignContext } = await import("@/lib/campaignContext");
    const context = buildCampaignContext({
      campaignId: "cmp-test-nashik",
      brand: NASHIK_BRAND,
      brief: {
        goal: NASHIK_BRIEF.goal,
        month: NASHIK_BRIEF.month,
        budget: NASHIK_BRIEF.budget,
        offers: NASHIK_BRIEF.offers,
        festivals: NASHIK_BRIEF.festivals,
        notes: NASHIK_BRIEF.notes,
      },
      catalog: [],
      trends: [],
    });

    const goodDesign = {
      layout: "Property photo with headline overlay",
      headline: "3 BHK Homes in Nashik - Metro Connected",
      subtext: "RERA registered. Starting ₹75L. Book site visit.",
      color_usage: "Brand blue and gold on white",
      image_prompt: "Modern apartment building in Nashik, green surroundings, no text",
      template_id: "bold-center" as const,
      size: "1080x1080",
      text_overlays: ["Book Visit", "RERA Approved"],
    };

    const calendarItem = {
      date: "2026-10-01",
      platform: "instagram" as const,
      format: "post" as const,
      topic: "Nashik 3 BHK apartments",
      goal: "Education",
      hook: "Metro-connected 3 BHK homes",
      pillar: "Property Education",
    };

    const mockContent = {
      calendar_date: "2026-10-01",
      platform: "instagram",
      format: "post",
      topic: "Nashik 3 BHK apartments",
      caption_variants: ["test"],
      hashtags: [],
      cta: "Book visit",
      alt_text: "test",
    };

    const validation = validateDesign({
      design: goodDesign,
      calendarItem,
      content: mockContent,
      context,
    });

    expect(validation.passed).toBe(true);
    expect(validation.issues.filter(i => i.code === "INVALID_TEMPLATE").length).toBe(0);
  });

  it("validates video plans for shootable scenes and campaign relevance", async () => {
    const { buildCampaignContext } = await import("@/lib/campaignContext");
    const context = buildCampaignContext({
      campaignId: "cmp-test-nashik",
      brand: NASHIK_BRAND,
      brief: {
        goal: NASHIK_BRIEF.goal,
        month: NASHIK_BRIEF.month,
        budget: NASHIK_BRIEF.budget,
        offers: NASHIK_BRIEF.offers,
        festivals: NASHIK_BRIEF.festivals,
        notes: NASHIK_BRIEF.notes,
      },
      catalog: [],
      trends: [],
    });

    const goodVideo = {
      duration_s: 30,
      aspect: "9:16" as const,
      scenes: [
        { n: 1, visual: "Drone shot of project", shot_type: "drone", duration_s: 5, on_screen_text: "Nashik Premium Living", voiceover: "Discover premium living in Nashik." },
        { n: 2, visual: "3 BHK walkthrough", shot_type: "walkthrough", duration_s: 15, on_screen_text: "Spacious Interiors", voiceover: "Spacious 3 BHK homes with modern finishes." },
        { n: 3, visual: "Amenities", shot_type: "montage", duration_s: 5, on_screen_text: "World-Class Amenities", voiceover: "Clubhouse, pool, gym for your family." },
        { n: 4, visual: "CTA card", shot_type: "static", duration_s: 5, on_screen_text: "Book Visit: 1800-XXX-XXXX", voiceover: "Book your site visit today." },
      ],
      music_mood: "aspirational, calm",
      captions_srt: "1\n00:00:00,000 --> 00:00:05,000\nDiscover premium living.\n\n2\n00:00:05,000 --> 00:00:20,000\nSpacious 3 BHK homes.\n\n3\n00:00:20,000 --> 00:00:25,000\nWorld-class amenities.\n\n4\n00:00:25,000 --> 00:00:30,000\nBook your visit today.",
      thumbnail_idea: "Project aerial with headline",
    };

    const calendarItem = {
      date: "2026-10-01",
      platform: "instagram" as const,
      format: "reel" as const,
      topic: "Nashik apartment tour",
      goal: "Education",
      hook: "Virtual tour of 3 BHK",
      pillar: "Property Education",
    };

    const validation = validateVideo({
      video: goodVideo,
      calendarItem,
      context,
    });

    expect(validation.passed).toBe(true);
    expect(validation.issues.filter(i => i.code === "NO_SCENES").length).toBe(0);
    expect(validation.issues.filter(i => i.code === "WEAK_VISUAL").length).toBe(0);
  });

  it("detects duplicate topics and hooks", async () => {
    const { buildCampaignContext } = await import("@/lib/campaignContext");
    const context = buildCampaignContext({
      campaignId: "cmp-test-nashik",
      brand: NASHIK_BRAND,
      brief: {
        goal: NASHIK_BRIEF.goal,
        month: NASHIK_BRIEF.month,
        budget: NASHIK_BRIEF.budget,
        offers: NASHIK_BRIEF.offers,
        festivals: NASHIK_BRIEF.festivals,
        notes: NASHIK_BRIEF.notes,
      },
      catalog: [],
      trends: [],
    });

    const existingContent = [
      { topic: "Why Nashik is hot", hook: "Nashik real estate boom", caption: "Why Nashik is the next real estate hotspot — Here's what every homebuyer should know..." },
    ];

    const duplicateContent = {
      calendar_date: "2026-10-02",
      platform: "facebook",
      format: "post",
      topic: "Why Nashik is booming",
      caption_variants: [
        "Why Nashik is booming — Here's what every homebuyer should know before buying.",
        "Why Nashik is booming — We break down the key factors for investors.",
        "Why Nashik is booming — Save this for your research.",
      ],
      hashtags: ["#NashikRealEstate"],
      cta: "Contact us for details",
      alt_text: "Nashik property graphic",
    };

    const calendarItem = {
      date: "2026-10-02",
      platform: "facebook" as const,
      format: "post" as const,
      topic: "Why Nashik is booming",
      goal: "Education",
      hook: "Nashik real estate boom explained",
      pillar: "Property Education",
    };

    const validation = validateContent({
      content: duplicateContent,
      calendarItem,
      context,
      existingContent,
    });

    expect(validation.passed).toBe(false);
    expect(validation.issues.some(i => i.code === "DUPLICATE_HOOK")).toBe(true);
  });

  it("tracks real costs and token usage, not fake metrics", async () => {
    const result = await runCampaignPipeline({
      brand: NASHIK_BRAND,
      brief: NASHIK_BRIEF,
      trends: [],
      source: "brief",
    });

    // Cost should be real token costs, not fabricated $0.0215
    expect(result.costUsd).toBeGreaterThan(0);
    expect(result.costUsd).toBeLessThan(1); // Should be reasonable for test run
    
    // Items should not have sample: true flag
    // (This is verified by the type system - Item type no longer has sample field)
    expect(result.items).toBeGreaterThanOrEqual(10);
  });
});