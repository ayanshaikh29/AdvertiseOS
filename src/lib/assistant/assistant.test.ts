import { describe, expect, it } from "vitest";
import { keywordIntent } from "@/lib/assistant/intent";
import { pcmToWav } from "@/lib/assistant/wav";

describe("assistant keyword intents", () => {
  it("routes common voice commands without an LLM call", () => {
    expect(keywordIntent("how are my approvals")).toBe("approvals");
    expect(keywordIntent("any news or trends today")).toBe("trends");
    expect(keywordIntent("what's in my catalog")).toBe("catalog");
    expect(keywordIntent("how much did we spend")).toBe("cost");
    expect(keywordIntent("give me a status summary")).toBe("status");
    expect(keywordIntent("what can you do")).toBe("help");
    expect(keywordIntent("fly me to the moon")).toBeNull();
  });
});

describe("pcmToWav", () => {
  it("writes a valid 44-byte RIFF header with correct sizes", () => {
    const pcm = Buffer.alloc(2400, 7);
    const wav = pcmToWav(pcm, 24000, 1, 16);
    expect(wav.subarray(0, 4).toString()).toBe("RIFF");
    expect(wav.subarray(8, 12).toString()).toBe("WAVE");
    expect(wav.readUInt32LE(4)).toBe(36 + pcm.length);
    expect(wav.readUInt32LE(24)).toBe(24000);
    expect(wav.readUInt32LE(40)).toBe(pcm.length);
    expect(wav.length).toBe(44 + pcm.length);
  });
});
