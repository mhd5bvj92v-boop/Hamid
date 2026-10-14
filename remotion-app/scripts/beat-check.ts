// Validate a timeline item before Claude Code writes it into edit.json
// (edit_decisions.py built runs this; it never writes anything itself).
//
//   npx tsx scripts/beat-check.ts <slug> <candidate.json>
//   candidate.json: {"segmentId": "S02", "beat": {"id": "S02", "kind": "...", "at": 3.5, "props": {...}}}
//
// Prints JSON: {ok, errors, warnings, window, sfx}. Checks that the kind is
// registered (kit or src/kit/custom), that its timing functions run on these
// props, that the item stays inside the source timeline and lines up with the
// segment, and derives the sound effects from the kind's sound intents. Whether
// the React component renders is proven by the Remotion still that `built`
// renders next.
import { readFileSync } from "node:fs";
import path from "node:path";
import type { EditDoc, SfxItem } from "../src/kit/project";
import { normalizeDoc } from "../src/kit/project";
import { sfxForBeat } from "../src/kit/studio";
import { customTiming } from "../src/kit/custom/timing";
import { beatWindow, kitTiming } from "../src/kit/timing";
import type { Beat } from "../src/kit/types";

const [slug, file] = process.argv.slice(2);
if (!slug || !file) {
  console.error("usage: npx tsx scripts/beat-check.ts <slug> <candidate.json>");
  process.exit(2);
}
const doc = normalizeDoc(JSON.parse(readFileSync(path.resolve(__dirname, "..", "src", "projects", slug, "edit.json"), "utf8")) as EditDoc);
const cand = JSON.parse(readFileSync(file, "utf8")) as { segmentId: string; beat: Beat };
const errors: string[] = [];
const warnings: string[] = [];
const fps = doc.source.fps;
const seg = doc.segments.find((s) => s.id === cand.segmentId);
const beat = cand.beat;
let window: Record<string, unknown> | null = null;
let sfx: SfxItem[] = [];

if (!seg) errors.push(`unknown segment ${cand.segmentId}`);
if (!beat || typeof beat.kind !== "string" || typeof beat.at !== "number" || typeof beat.props !== "object") {
  errors.push("beat needs kind (string), at (seconds) and props (object)");
} else if (!(beat.kind in kitTiming)) {
  errors.push(`kind "${beat.kind}" is not registered: add its timing to src/kit/custom/timing.ts and its component to src/kit/custom/components.ts (or use a kit kind)`);
} else {
  const custom = readFileSync(path.resolve(__dirname, "..", "src", "kit", "custom", "components.ts"), "utf8");
  if (beat.kind in customTiming && !new RegExp(`\\b${beat.kind}\\b`).test(custom)) errors.push(`kind "${beat.kind}" has timing but no component in src/kit/custom/components.ts`);
  try {
    const w = beatWindow(beat, kitTiming, fps);
    const start = w.from / fps;
    const end = (w.from + w.durationInFrames) / fps;
    window = { from: w.from, durationInFrames: w.durationInFrames, start: +start.toFixed(4), end: +end.toFixed(4), fullscreen: w.fullscreen, system: w.system };
    if (w.from < 0 || w.from + w.durationInFrames > doc.source.durationInFrames) errors.push(`runs outside the source timeline (${start.toFixed(2)}-${end.toFixed(2)} s, video is ${doc.source.sourceDurationSeconds.toFixed(2)} s)`);
    if (seg) {
      if (end <= seg.start || start >= seg.end) errors.push(`does not overlap its segment ${seg.id} (${seg.start}-${seg.end} s)`);
      if (Math.abs(start - seg.start) > 0.25) warnings.push(`starts ${(start - seg.start).toFixed(2)} s from the segment start (${seg.start} s)`);
      if (Math.abs(end - seg.end) > 0.35) warnings.push(`ends ${(end - seg.end).toFixed(2)} s from the segment end (${seg.end} s)`);
    }
    sfx = sfxForBeat({ ...beat, segmentId: cand.segmentId } as Beat, fps);
  } catch (e) {
    errors.push(`timing failed on these props: ${String((e as Error).message ?? e)}`);
  }
  // other timeline items of other segments must not share the id
  if (doc.beats.some((b) => b.id === beat.id && b.segmentId !== cand.segmentId)) errors.push(`beat id ${beat.id} is used by another segment`);
}
console.log(JSON.stringify({ ok: errors.length === 0, errors, warnings, window, sfx }));
process.exit(errors.length ? 1 : 0);
