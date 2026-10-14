// Remotion rendering for the Studio: one cached bundle, then renderStill /
// renderMedia of the "StudioEdit" composition with the project document as
// inputProps. Data changes never need a rebundle; code changes (src/) do,
// and are detected by mtime.
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import type { StudioEditProps } from "../../src/kit/StudioEdit";

export const APP = path.resolve(__dirname, "..", "..");

const browserExecutable = () => {
  if (process.env.REMOTION_BROWSER_EXECUTABLE) return process.env.REMOTION_BROWSER_EXECUTABLE;
  const own = path.join(APP, "node_modules", ".remotion");
  // Remotion's own Chrome Headless Shell, if it was actually downloaded (an empty folder with a lock file is not enough)
  const hasOwn =
    existsSync(own) &&
    (readdirSync(own, { recursive: true }) as string[]).some((f) => /(^|\/)(chrome-headless-shell|headless_shell)$/.test(f) && statSync(path.join(own, f)).isFile());
  if (hasOwn) return null;
  const base = "/opt/pw-browsers";
  if (existsSync(base)) {
    const d = readdirSync(base).filter((x) => x.startsWith("chromium_headless_shell-")).sort().pop();
    if (d) return path.join(base, d, "chrome-linux", "headless_shell");
  }
  return null;
};

const newestSrc = (dir: string): number => {
  let m = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) m = Math.max(m, newestSrc(p));
    else if (/\.(tsx?|css)$/.test(e.name) && !e.name.endsWith(".json")) m = Math.max(m, statSync(p).mtimeMs);
  }
  return m;
};

let cached: { url: string; at: number } | null = null;
let building: Promise<string> | null = null;

export const getBundle = async (log: (s: string) => void = () => {}) => {
  const src = newestSrc(path.join(APP, "src"));
  if (cached && cached.at >= src) return cached.url;
  if (building) return building;
  building = (async () => {
    log("bundling the Remotion project...");
    const t = Date.now();
    const url = await bundle({ entryPoint: path.join(APP, "src", "index.ts"), rootDir: APP, publicDir: path.join(APP, "public") });
    cached = { url, at: Date.now() };
    log(`bundled in ${((Date.now() - t) / 1000).toFixed(1)} s`);
    return url;
  })();
  try {
    return await building;
  } finally {
    building = null;
  }
};

const common = () => ({ browserExecutable: browserExecutable(), logLevel: "error" as const });

export const still = async (props: StudioEditProps, frame: number, out: string, scale = 0.5) => {
  const serveUrl = await getBundle();
  const composition = await selectComposition({ serveUrl, id: "StudioEdit", inputProps: props, ...common() });
  await renderStill({ serveUrl, composition, inputProps: props, frame, output: out, imageFormat: "png", scale, ...common() });
  return out;
};

export const media = async (
  props: StudioEditProps,
  out: string,
  opts: { scale?: number; frameRange?: [number, number] | null; onProgress?: (p: number) => void; final?: boolean },
) => {
  const serveUrl = await getBundle();
  const composition = await selectComposition({ serveUrl, id: "StudioEdit", inputProps: props, ...common() });
  await renderMedia({
    serveUrl,
    composition,
    inputProps: props,
    codec: "h264",
    outputLocation: out,
    crf: opts.final ? 18 : 23,
    pixelFormat: "yuv420p",
    colorSpace: "bt709",
    audioCodec: "aac",
    audioBitrate: opts.final ? "320k" : "192k",
    imageFormat: "jpeg",
    scale: opts.scale ?? 1,
    frameRange: opts.frameRange ?? null,
    onProgress: ({ progress }) => opts.onProgress?.(progress),
    ...common(),
  });
  return out;
};
