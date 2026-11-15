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

const TEST_BRAND: BrandProfile = {
  id: "test-brand",
  name: "Skyline Realty",
  tone: "professional, aspirational",
  languages: ["English", "Hindi"],
  audience: "Homebuyers in Maharashtra",
  products: "2BHK and 3BHK Residential Apartments",
  usp: "Prime locations with transparent pricing",
  dos: ["Clear CTAs"],
  donts: ["No unverified awards"],
  compliance_notes: "Follow RERA advertising guidelines",
};

async function runStep(conversationId: string, instruction: string) {
  const events: OrchestrationEvent[] = [];
  await runAgencyOrchestration({
    instruction,
    brand: TEST_BRAND,
    conversationId,
    onEvent: (ev) => {
      events.push(ev);
    },
  });
  const deliverables = events
    .filter((e): e is Extract<OrchestrationEvent, { type: "deliverable" }> => e.type === "deliverable")
    .map((e) => e.deliverable);
  const text = events
    .filter((e): e is Extract<OrchestrationEvent, { type: "text_chunk" }> => e.type === "text_chunk")
    .map((e) => e.text)
    .join("");
  const activities = events
    .filter((e): e is Extract<OrchestrationEvent, { type: "agent_update" }> => e.type === "agent_update")
    .map((e) => e.activity);
  return { events, deliverables, text, activities };
}

describe("AdvertiseOS — Critical Execution & Task Continuity Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Test A: Supply all three facts in one message -> executes complete 30-day campaign", async () => {
    const convId = `conv-test-a-${Date.now()}`;
    const prompt =
      "Create a 30-day Instagram strategy with 12 posts and 4 Reels for Skyline Residency, Pathardi Phata, Nashik. Price: ₹45 Lakhs - ₹85 Lakhs. Budget: ₹25,000/month. Objective is qualified enquiries.";

    const { deliverables, activities } = await runStep(convId, prompt);

    // Must not be blocked on clarifications
    const kinds = deliverables.map((d) => d.kind);
    expect(kinds).toContain("overview");
    expect(kinds).toContain("strategy");
    expect(kinds).toContain("calendar");
    expect(kinds).toContain("content_posts");
    expect(kinds).toContain("videos");
    expect(kinds).toContain("performance");
    expect(kinds).toContain("critic");
    expect(kinds).toContain("summary");

    // Check deliverables
    const posts = deliverables.find((d) => d.kind === "content_posts") as any;
    expect(posts.items.length).toBe(12);

    const videos = deliverables.find((d) => d.kind === "videos") as any;
    expect(videos.plans.length).toBe(4);

    // Ledger must show completed specialists
    expect(activities.some((a) => a.agent === "strategist" && a.status === "completed")).toBe(true);
    expect(activities.some((a) => a.agent === "creative" && a.status === "completed")).toBe(true);
    expect(activities.some((a) => a.agent === "critic" && a.status === "completed")).toBe(true);

    const task = ChatStore.getTask(convId);
    expect(task?.status).toBe("COMPLETED");
  }, 25000);

  it("Test B: Supply facts one by one across multiple turns without resetting task", async () => {
    const convId = `conv-test-b-${Date.now()}`;

    // Turn 1: Initial brief without location or price
    const turn1 = await runStep(
      convId,
      "Create a 30-day Instagram strategy with 12 posts and 4 Reels to generate qualified enquiries."
    );
    expect(turn1.deliverables.map((d) => d.kind)).toContain("clarifications");
    const taskAfterTurn1 = ChatStore.getTask(convId);
    expect(taskAfterTurn1?.status).toBe("COLLECTING_FACTS");

    // Turn 2: User provides location only
    const turn2 = await runStep(convId, "Location is Skyline Residency, Pathardi Phata, Nashik.");
    const taskAfterTurn2 = ChatStore.getTask(convId);
    expect(taskAfterTurn2?.collectedFacts.location?.value).toContain("Pathardi Phata");
    expect(taskAfterTurn2?.status).toBe("COLLECTING_FACTS");
    // Should NOT reset to generic greeting
    expect(turn2.text).not.toContain("Hello! Main AdvertiseOS ka AI Agency Manager hoon.");

    // Turn 3: User provides price and budget
    const turn3 = await runStep(convId, "Price is ₹45 Lakhs to ₹85 Lakhs. Advertising budget is ₹25,000/month.");

    // Now all facts are satisfied -> campaign must automatically execute!
    const kinds3 = turn3.deliverables.map((d) => d.kind);
    expect(kinds3).toContain("overview");
    expect(kinds3).toContain("strategy");
    expect(kinds3).toContain("calendar");
    expect(kinds3).toContain("content_posts");
    expect(kinds3).toContain("videos");
    expect(kinds3).toContain("summary");

    const taskAfterTurn3 = ChatStore.getTask(convId);
    expect(taskAfterTurn3?.status).toBe("COMPLETED");
    expect(taskAfterTurn3?.collectedFacts.location?.value).toContain("Pathardi Phata");
    expect(taskAfterTurn3?.collectedFacts.price_range?.value).toBeDefined();
  }, 25000);

  it("Test C: Supply fictional demo facts -> runs in DEMO MODE without blocking", async () => {
    const convId = `conv-test-c-${Date.now()}`;
    const prompt =
      "Create a 30-day Instagram strategy with 12 posts and 4 Reels for Skyline Residency, Nashik. Price: ₹45 Lakhs - ₹85 Lakhs. Budget: ₹25,000/month. Note: This is fictional demo data for testing.";

    const { deliverables } = await runStep(convId, prompt);
    const kinds = deliverables.map((d) => d.kind);

    expect(kinds).toContain("overview");
    const overview = deliverables.find((d) => d.kind === "overview") as any;
    expect(overview.isDemoMode).toBe(true);

    const task = ChatStore.getTask(convId);
    expect(task?.isDemoMode).toBe(true);
    expect(task?.status).toBe("COMPLETED");
  }, 25000);

  it("Test D: Answer a clarification question after task persistence check", async () => {
    const convId = `conv-test-d-${Date.now()}`;

    // Step 1: Start request
    await runStep(convId, "30-day campaign for our real estate project in Nashik. Goal: leads.");
    const savedTask = ChatStore.getTask(convId);
    expect(savedTask).toBeDefined();
    expect(savedTask?.status).toBe("COLLECTING_FACTS");

    // Step 2: Answer missing price & budget
    const step2 = await runStep(convId, "Price: ₹50L - ₹90L, Budget: ₹20,000/month.");
    expect(step2.deliverables.map((d) => d.kind)).toContain("strategy");

    const completedTask = ChatStore.getTask(convId);
    expect(completedTask?.status).toBe("COMPLETED");
  }, 25000);

  it("Test E: Provide the same fact twice -> updates idempotently without duplicating", async () => {
    const convId = `conv-test-e-${Date.now()}`;
    await runStep(convId, "30-day campaign for Nashik project. Location: Pathardi Phata, Nashik.");
    const t1 = ChatStore.getTask(convId);
    expect(t1?.collectedFacts.location?.value).toContain("Pathardi Phata");

    // Provide location again
    await runStep(convId, "Confirming location: Pathardi Phata, Nashik.");
    const t2 = ChatStore.getTask(convId);
    expect(t2?.collectedFacts.location?.value).toContain("Pathardi Phata");
    expect(Object.keys(t2?.collectedFacts || {}).filter((k) => k === "location").length).toBe(1);
  }, 25000);

  it("Test F: Start a second campaign after completing the first", async () => {
    const convId = `conv-test-f-${Date.now()}`;

    // Campaign 1
    await runStep(
      convId,
      "Create a 30-day Instagram strategy with 12 posts for Skyline Residency, Nashik. Price: ₹45-85L. Budget: ₹25k. Fictional demo data."
    );
    const task1 = ChatStore.getTask(convId);
    expect(task1?.status).toBe("COMPLETED");
    const task1Id = task1?.id;

    // Campaign 2 in same conversation
    await runStep(
      convId,
      "Now create a brand new 30-day campaign for Skyline Commercial Plaza, Mumbai. Price: ₹1.2 Cr - ₹2.5 Cr. Budget: ₹50k. Fictional demo data."
    );
    const task2 = ChatStore.getTask(convId);
    expect(task2?.id).not.toBe(task1Id);
    expect(task2?.collectedFacts.location?.value).toContain("Mumbai");
  }, 25000);

  it("Test G: Ledger displays real specialist execution metadata and critic verification", async () => {
    const convId = `conv-test-g-${Date.now()}`;
    const { activities, deliverables } = await runStep(
      convId,
      "Skyline Residency, Nashik. Price: ₹45-85L. Budget: ₹25,000. 30-day Instagram strategy with 12 posts and 4 Reels. Fictional demo data."
    );

    // Check activities
    const strategist = activities.find((a) => a.agent === "strategist" && a.status === "completed");
    expect(strategist).toBeDefined();
    expect(strategist?.taskId).toBeDefined();

    const critic = activities.find((a) => a.agent === "critic" && a.status === "completed");
    expect(critic).toBeDefined();
    expect(critic?.criticScore).toBeGreaterThanOrEqual(80);

    const criticDel = deliverables.find((d) => d.kind === "critic") as any;
    expect(criticDel.overallScore).toBeGreaterThanOrEqual(80);
    expect(criticDel.passed).toBe(true);
  }, 25000);
});
