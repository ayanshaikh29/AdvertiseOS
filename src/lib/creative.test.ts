import { describe, expect, it } from "vitest";
import { designSchema, videoPlanSchema } from "@/lib/schemas";
import { videoPlanToMarkdown } from "@/lib/video";

const design = {
  layout: "centered",
  headline: "Big sale today",
  subtext: "Only this week",
  color_usage: "blue on black",
  image_prompt: "Abstract dark blue gradient background without any text",
  template_id: "bold-center",
  size: "1080x1080",
  text_overlays: [],
};

const plan = {
  duration_s: 30,
  aspect: "9:16",
  scenes: [
    { n: 1, visual: "hook close-up", shot_type: "close-up", duration_s: 10, on_screen_text: "Stop scrolling", voiceover: "Stop scrolling." },
  ],
  music_mood: "upbeat",
  captions_srt: "1\n00:00:00,000 --> 00:00:10,000\nStop scrolling.",
  thumbnail_idea: "Bold headline on blue",
};

describe("creative schemas", () => {
  it("accepts valid design + video plan", () => {
    expect(designSchema.safeParse(design).success).toBe(true);
    expect(videoPlanSchema.safeParse(plan).success).toBe(true);
  });

  it("rejects oversized headline and bad size", () => {
    expect(designSchema.safeParse({ ...design, headline: "x".repeat(81) }).success).toBe(false);
    expect(designSchema.safeParse({ ...design, size: "huge" }).success).toBe(false);
  });
});

describe("video markdown", () => {
  it("includes scenes, SRT and thumbnail", () => {
    const md = videoPlanToMarkdown(videoPlanSchema.parse(plan), "Diwali reel");
    expect(md).toContain("### Scene 1");
    expect(md).toContain("```srt");
    expect(md).toContain("Thumbnail");
  });
});
