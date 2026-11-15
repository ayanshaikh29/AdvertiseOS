import { describe, expect, it, vi, beforeEach } from "vitest";
import { runAgencyOrchestration, type OrchestrationEvent } from "@/lib/agents/orchestrator";
import { ChatStore } from "@/lib/db/chatStore";
import type { BrandProfile } from "@/lib/brand";
import type { Deliverable } from "@/types/chat";

process.env.LLM_PROVIDER = "fake";

vi.mock("@/lib/db/fileRepo", () => ({
  getRepo: vi.fn().mockResolvedValue({
    listCatalog: vi.fn().mockResolvedValue([]),
    listTrends: vi.fn().mockResolvedValue([]),
    listMetrics: vi.fn().mockResolvedValue([]),
    saveCampaign: vi.fn().mockResolvedValue(undefined),
    addRun: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@/lib/image/provider", () => ({
  renderCreative: vi.fn().mockResolvedValue({
    url: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
    width: 1080,
    height: 1080,
    provider: "template",
    svg: "<svg></svg>",
  }),
}));

const THIN_BRAND: BrandProfile = {
  id: "nashik-thin",
  name: "Nashik Premier Homes",
  tone: "professional",
  languages: ["English"],
  audience: "",
  products: "",
  usp: "",
  dos: [],
  donts: [],
  compliance_notes: "",
};

async function collect(instruction: string, brand: BrandProfile) {
  const events: OrchestrationEvent[] = [];
  await runAgencyOrchestration({
    instruction,
    brand,
    conversationId: "conv-test",
    onEvent: (ev) => { events.push(ev); },
  });
  const deliverables = events
    .filter((e): e is Extract<OrchestrationEvent, { type: "deliverable" }> => e.type === "deliverable")
    .map((e) => e.deliverable);
  return { events, deliverables };
}

function kinds(dels: Deliverable[]): string[] {
  return dels.map((d) => d.kind);
}

describe("runAgencyOrchestration (offline, deterministic)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ChatStore.clearTask("conv-test");
  });

  it("stops at the missing-facts gate — asks instead of inventing location/price/amenities", async () => {
    const { deliverables, events } = await collect(
      "Mere client ke residential project ke liye 30-day marketing strategy banao. 12 posts aur 4 Reels ready karo.",
      THIN_BRAND
    );

    expect(kinds(deliverables)).toEqual(["clarifications"]);
    const clar = deliverables[0] as Extract<Deliverable, { kind: "clarifications" }>;
    expect(clar.questions.length).toBeGreaterThan(0);
    expect(clar.questions.some((q) => q.fact === "location")).toBe(true);
    expect(clar.questions.some((q) => q.fact === "price_range")).toBe(true);

    // No fabricated deliverables may leak past the gate.
    expect(kinds(deliverables)).not.toContain("strategy");
    expect(kinds(deliverables)).not.toContain("crm_leads");
    expect(kinds(deliverables)).not.toContain("content_posts");
    expect(kinds(deliverables)).not.toContain("audit");

    const completed = events.find((e) => e.type === "completed");
    expect(completed).toBeDefined();
  });

  it("runs a scoped single-caption request without the whole agency", async () => {
    const rich: BrandProfile = {
      ...THIN_BRAND,
      audience: "Small business owners in Pune",
      products: "Social media retainers for local shops with Instagram growth focus",
      usp: "Transparent weekly reporting",
      dos: ["Use clear CTA"],
      donts: ["No fake awards"],
    };
    const { deliverables } = await collect(
      "Ek Instagram caption likho hamare festive offer ke liye — Instagram par DM lena hai.",
      rich
    );

    const k = kinds(deliverables);
    expect(k).toContain("content_posts");
    // A caption request must not manufacture CRM pipeline, calendars or full strategy decks.
    expect(k).not.toContain("crm_leads");
    expect(k).not.toContain("calendar");
    expect(k).not.toContain("videos");
  });

  it("never emits fabricated CRM pipeline numbers", async () => {
    const rich: BrandProfile = {
      ...THIN_BRAND,
      audience: "Homebuyers in Nashik",
      products: "2 BHK and 3 BHK flats in Nashik with clubhouse and gym amenities near metro",
      usp: "RERA registered project with garden and parking",
      dos: ["Mention RERA"],
      donts: ["No guaranteed returns"],
      compliance_notes: "MahaRERA rules apply",
    };
    const { deliverables } = await collect(
      "CRM follow-up strategy aur leads pipeline plan banao — WhatsApp par follow-ups karne hain.",
      rich
    );
    const crm = deliverables.find((d) => d.kind === "crm_leads") as Extract<Deliverable, { kind: "crm_leads" }> | undefined;
    if (crm) {
      expect(crm.pipelineStages).toHaveLength(0);
      expect(crm.hasLiveData).toBe(false);
      expect(crm.dataNote).toBeTruthy();
    }
  });

  it("answers general chat without launching production agents", async () => {
    const { deliverables, events } = await collect("Hello! Kya haal chaal?", THIN_BRAND);
    expect(deliverables).toHaveLength(0);
    const text = events
      .filter((e): e is Extract<OrchestrationEvent, { type: "text_chunk" }> => e.type === "text_chunk")
      .map((e) => e.text)
      .join("");
    expect(text.toLowerCase()).toContain("marketing");
  });
});
