import type { VideoPlan } from "@/lib/schemas";

/** Render a video plan as portable Markdown (print to PDF from the browser). */
export function videoPlanToMarkdown(plan: VideoPlan, topic: string): string {
  const scenes = plan.scenes
    .map(
      (s) =>
        `### Scene ${s.n} (${s.duration_s}s — ${s.shot_type})\n- Visual: ${s.visual}\n- On-screen text: ${s.on_screen_text || "—"}\n- Voiceover: ${s.voiceover}`
    )
    .join("\n\n");
  return `# Video plan — ${topic}\n\n- Duration: ${plan.duration_s}s · Aspect: ${plan.aspect}\n- Music mood: ${plan.music_mood}\n- Thumbnail: ${plan.thumbnail_idea}\n\n## Scenes\n\n${scenes}\n\n## Captions (SRT)\n\n\`\`\`srt\n${plan.captions_srt}\n\`\`\`\n`;
}
