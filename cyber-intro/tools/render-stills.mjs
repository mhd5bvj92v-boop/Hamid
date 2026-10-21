// Render selected frames as PNG stills: node tools/render-stills.mjs 0 60 120 ...
// With no args, renders opening / midpoint / transition / end of every scene.
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const out = path.join(root, "out/stills");
mkdirSync(out, { recursive: true });
const browserExecutable = process.env.REMOTION_BROWSER ?? "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";

const SCENES = [[0, 210], [210, 420], [420, 690], [690, 990], [990, 1260], [1260, 1500]];
const defaults = SCENES.flatMap(([a, b]) => [a + 6, Math.round((a + b) / 2), b - 14, Math.min(b, 1499)]);
const frames = process.argv.slice(2).length ? process.argv.slice(2).map(Number) : [...new Set(defaults)];

const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts") });
const composition = await selectComposition({ serveUrl, id: "CyberIntro", browserExecutable });
for (const frame of frames) {
  const output = path.join(out, `f${String(frame).padStart(4, "0")}.png`);
  await renderStill({ serveUrl, composition, frame, output, browserExecutable, chromiumOptions: { gl: "swangle" } });
  console.log("still", frame);
}
