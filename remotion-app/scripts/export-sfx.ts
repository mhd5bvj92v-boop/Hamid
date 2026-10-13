// Export a project's beat timeline and sound intents for the video-editing
// skill's System D tools (sfx_plan.py -> sound_mix.py -> sound_qc.py).
//
//   npx tsx scripts/export-sfx.ts <slug> <outDir>
//
// Writes:
//   <outDir>/layers/<beatId>.json  sound intents per beat (beat-relative seconds,
//                                  measured from the same pose functions the
//                                  components render)
//   <outDir>/timeline.json         beat windows on the source timeline + lint
//   <outDir>/plan.json             draft plan for sfx_plan.py ("video" is filled
//                                  in by edit_render.py)
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { beatWindow, kitTiming, TimingRegistry } from "../src/kit/timing";
import type { ConceptBeat } from "../src/kit/concepts";
import type { Beat, SourceInfo } from "../src/kit/types";

const [slug, outDir] = process.argv.slice(2);
if (!slug || !outDir) {
  console.error("usage: npx tsx scripts/export-sfx.ts <slug> <outDir>");
  process.exit(2);
}
const projectDir = path.resolve(__dirname, "..", "src", "projects", slug);
const load = async (f: string) => import(pathToFileURL(path.join(projectDir, f)).href);

const main = async () => {
  const { SOURCE } = (await load("source.ts")) as { SOURCE: SourceInfo };
  const { BEATS, HOOK_END } = (await load("beats.ts")) as { BEATS: Beat[]; HOOK_END: number | null };
  const extra: TimingRegistry = existsSync(path.join(projectDir, "timing.ts")) ? ((await load("timing.ts")).PROJECT_TIMING ?? {}) : {};
  const timing: TimingRegistry = { ...kitTiming, ...extra };
  const fps = SOURCE.fps;
  const total = SOURCE.durationInFrames;
  const warnings: string[] = [];
  const errors: string[] = [];

  mkdirSync(path.join(outDir, "layers"), { recursive: true });
  const ids = new Set<string>();
  const rows = BEATS.map((b) => {
    if (!/^[A-Za-z0-9_-]+$/.test(b.id)) errors.push(`beat id "${b.id}" must be [A-Za-z0-9_-] (no spaces)`);
    if (ids.has(b.id)) errors.push(`duplicate beat id ${b.id}`);
    ids.add(b.id);
    const tm = timing[b.kind] as unknown as { sfx: (p: unknown, fps: number) => unknown[]; duration: (p: unknown) => number };
    const w = beatWindow(b, timing, fps);
    if (w.from < 0 || w.from + w.durationInFrames > total) errors.push(`beat ${b.id} runs outside the source timeline (${w.from}..${w.from + w.durationInFrames} of ${total} frames)`);
    if (!b.reason) warnings.push(`beat ${b.id} has no reason (every visual needs one)`);
    if (!b.refs?.length) warnings.push(`beat ${b.id} lists no reference IDs (design from the library first)`);
    const cues = tm.sfx(b.props, fps);
    writeFileSync(
      path.join(outDir, "layers", `${b.id}.json`),
      JSON.stringify({ template: b.kind, fps, duration: tm.duration(b.props), width: 1080, height: 1920, cues }, null, 1),
    );
    return {
      id: b.id,
      kind: b.kind,
      system: w.system,
      fullscreen: w.fullscreen,
      startFrame: w.from,
      endFrame: w.from + w.durationInFrames,
      start: w.from / fps,
      end: (w.from + w.durationInFrames) / fps,
      refs: b.refs ?? [],
      reason: b.reason ?? "",
    };
  });

  // lint: editorial rules from the skill (warnings: the plan is the user's call)
  const sorted = [...rows].sort((a, b) => a.startFrame - b.startFrame);
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1];
    const b = sorted[i];
    if (a.system === "B" && b.system === "B" && b.startFrame < a.endFrame) warnings.push(`text beats ${a.id} and ${b.id} overlap (do not overlap two text beats)`);
  }
  const fsFrames = rows.filter((r) => r.fullscreen).reduce((s, r) => s + (r.endFrame - r.startFrame), 0);
  if (fsFrames / total > 0.25) warnings.push(`full-screen scenes cover ${((100 * fsFrames) / total).toFixed(0)}% of the runtime (guideline: <= 20-25%)`);

  // Creative Director concepts (concepts.ts): windows for preview frames / motion previews
  const concepts: ConceptBeat[] = existsSync(path.join(projectDir, "concepts.ts")) ? ((await load("concepts.ts")).CONCEPTS ?? []) : [];
  const conceptRows = concepts.map((c) => {
    const w = beatWindow(c.beat, timing, fps);
    if (w.from < 0 || w.from + w.durationInFrames > total) errors.push(`concept ${c.moment}:${c.option} (round ${c.round}) runs outside the source timeline`);
    if (!c.beat.refs?.length && c.option !== "D") warnings.push(`concept ${c.moment}:${c.option} lists no reference IDs (concepts must be grounded in the library)`);
    return {
      moment: c.moment,
      option: c.option,
      round: c.round,
      id: c.beat.id,
      kind: c.beat.kind,
      system: w.system,
      fullscreen: w.fullscreen,
      startFrame: w.from,
      endFrame: w.from + w.durationInFrames,
      start: w.from / fps,
      end: (w.from + w.durationInFrames) / fps,
      refs: c.beat.refs ?? [],
      reason: c.beat.reason ?? "",
    };
  });

  const fullscreen_windows = rows.filter((r) => r.fullscreen).map((r) => [r.start, r.end]);
  writeFileSync(
    path.join(outDir, "timeline.json"),
    JSON.stringify({ slug, fps, durationInFrames: total, duration: total / fps, beats: rows, concepts: conceptRows, fullscreen_windows, graphic_windows: [], warnings, errors }, null, 1),
  );
  writeFileSync(
    path.join(outDir, "plan.json"),
    JSON.stringify(
      {
        video: null,
        hook_end: HOOK_END,
        layers: rows.map((r) => ({ name: `${r.id} ${r.kind}`, cues: `layers/${r.id}.json`, offset: r.start, system: r.system, fullscreen: r.fullscreen, duration: r.end - r.start })),
      },
      null,
      1,
    ),
  );
  console.log(`exported ${rows.length} beats (${fullscreen_windows.length} full-screen) for ${slug} -> ${outDir}`);
  for (const w of warnings) console.log(`WARN  ${w}`);
  for (const e of errors) console.log(`ERROR ${e}`);
  if (errors.length) process.exit(1);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
