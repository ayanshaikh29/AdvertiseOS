import { describe, expect, it } from "vitest";
import { findDueItems } from "@/lib/publish/tick";
import type { Item } from "@/lib/db/repo";

function item(over: Partial<Item>): Item {
  return {
    id: "i1",
    topic: "t",
    platform: "instagram",
    format: "post",
    scheduled_for: "2026-10-17T10:00:00.000Z",
    captions: [],
    hashtags: [],
    cta: "",
    ceo_score: 90,
    status: "scheduled",
    ...over,
  };
}

describe("autopilot tick selection", () => {
  const now = new Date("2026-10-17T12:00:00.000Z");

  it("publishes only scheduled items whose time has passed", () => {
    const due = findDueItems(
      [
        item({ id: "past", scheduled_for: "2026-10-17T11:00:00.000Z" }),
        item({ id: "future", scheduled_for: "2026-10-18T11:00:00.000Z" }),
        item({ id: "pending", status: "pending_human" }),
        item({ id: "approved", status: "approved" }),
        item({ id: "published", status: "published" }),
        item({ id: "notime", scheduled_for: "" }),
      ],
      now
    );
    expect(due.map((i) => i.id)).toEqual(["past"]);
  });

  it("ignores unparsable dates", () => {
    expect(findDueItems([item({ scheduled_for: "not-a-date" })], now)).toHaveLength(0);
  });
});
