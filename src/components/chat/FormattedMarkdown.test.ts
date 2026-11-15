import { describe, expect, it } from "vitest";
import { splitBlocks } from "@/components/chat/FormattedMarkdown";

describe("FormattedMarkdown block parser", () => {
  it("parses pipe tables into structured rows (no raw markdown)", () => {
    const md = [
      "| Scene | Visual |",
      "| ----- | ------ |",
      "| 0–3 sec | Hook: bold text '3 things to check' |",
      "| 3–9 sec | Location tour |",
    ].join("\n");
    const blocks = splitBlocks(md);
    expect(blocks).toHaveLength(1);
    const table = blocks[0]!;
    expect(table.type).toBe("table");
    if (table.type === "table") {
      expect(table.header).toEqual(["Scene", "Visual"]);
      expect(table.rows).toHaveLength(2);
      expect(table.rows[0]?.[1]).toContain("Hook");
    }
  });

  it("parses numbered lists", () => {
    const md = "1. Awareness: education content\n2. Consideration: project details\n3. Conversion: enquiry CTA";
    const blocks = splitBlocks(md);
    expect(blocks[0]?.type).toBe("ol");
    if (blocks[0]?.type === "ol") {
      expect(blocks[0].items).toHaveLength(3);
      expect(blocks[0].items[0]).toContain("Awareness");
    }
  });

  it("parses bullet lists, headings and paragraphs separately", () => {
    const md = "## Strategy\n\n- Pillar A\n- Pillar B\n\nClosing paragraph.";
    const blocks = splitBlocks(md);
    expect(blocks.map((b) => b.type)).toEqual(["heading", "ul", "p"]);
  });

  it("parses blockquotes and fenced code", () => {
    const quote = "> Goal: qualified enquiries\n> Budget: not disclosed";
    const qBlocks = splitBlocks(quote);
    expect(qBlocks[0]?.type).toBe("quote");

    const code = "```\nnpx vitest run\n```";
    const cBlocks = splitBlocks(code);
    expect(cBlocks[0]?.type).toBe("code");
    if (cBlocks[0]?.type === "code") expect(cBlocks[0].code).toContain("vitest");
  });

  it("never infinite-loops on mixed real agent output", () => {
    const md = `# Campaign package ready

Objective: **qualified enquiries** badhana.

| Metric | Source |
| ------ | ------ |
| Leads | CRM |

1. Review drafts
2. Approve items

> Sample copy only.

---
Done.`;
    const blocks = splitBlocks(md);
    expect(blocks.length).toBeGreaterThan(4);
    expect(blocks.some((b) => b.type === "table")).toBe(true);
    expect(blocks.some((b) => b.type === "ol")).toBe(true);
    expect(blocks.some((b) => b.type === "hr")).toBe(true);
  });
});
