// AssetScene (System C, full-screen): the user's own 3D asset as the hero of the
// frame, staged like a product shot. Claude Code never draws realistic objects
// with code shapes; the concept asks the user for the asset (Concept.assets) and
// this scene stages it: a dark stage with a spotlight and accent glow, the asset
// enters (rise / zoom / drop), floats with a slow camera push, casts a contact
// shadow and an optional floor reflection, an optional headline builds under it,
// and the scene leaves with a push-through fade. It covers the footage; the
// footage and dialogue keep running underneath. Pure: the same pose drives the
// component and the sound intents.
import { E, clamp, envelope, fastestFrame, firstFrameWhere, lerp, prog, snap } from "../motion";
import type { BeatTiming, SfxIntent } from "../types";

export type AssetSceneProps = {
  /** staticFile() path of the user's asset: "projects/<slug>/assets/..." (PNG/WebP with transparency, WebM with alpha, or MP4). */
  asset: string;
  /** Stage: "void" black with a top spotlight, "aurora" deep accent gradient, "studio" dark gradient with a floor. */
  look?: "void" | "aurora" | "studio";
  /** How the asset arrives: rises from below, zooms out of blur, or drops and settles. */
  enter?: "rise" | "zoom" | "drop";
  /** Asset height as a fraction of the frame height. */
  size?: number;
  /** Vertical centre of the asset as a fraction of the frame height. */
  y?: number;
  /** Optional statement under the asset, one line per item (the speaker's words). */
  headline?: string[];
  accentLine?: number;
  kicker?: string;
  accent?: string;
  /** Mirrored floor reflection under the asset (default: on without a headline). */
  reflection?: boolean;
  /** Slow rotation of the asset in degrees over the scene (0 = none). */
  turn?: number;
  inAt?: number;
  /** Seconds from the beat start where the exit begins. */
  outAt: number;
  outDur?: number;
};

export const assetDefaults = (p: AssetSceneProps) => ({
  look: p.look ?? "void",
  enter: p.enter ?? "rise",
  size: p.size ?? 0.42,
  y: p.y ?? (p.headline?.length ? 0.38 : 0.45),
  accentLine: p.accentLine ?? 0,
  accent: p.accent ?? "#3D7BFF",
  reflection: p.reflection ?? !p.headline?.length,
  turn: p.turn ?? 3,
  inAt: p.inAt ?? 0.1,
  outDur: p.outDur ?? 0.4,
});

/** Everything that moves, at t seconds from the beat start (0..1 progress values, plus offsets in frame fractions). */
export const assetPose = (t: number, p: AssetSceneProps) => {
  const d = assetDefaults(p);
  const scene = envelope(t, -1, 0.01, p.outAt, d.outDur);
  const enterDur = d.enter === "drop" ? 0.55 : 0.9;
  const a = prog(t, d.inAt, enterDur, d.enter === "drop" ? "inCubic" : "outQuart");
  const settle = d.enter === "drop" ? E.settle(clamp((t - d.inAt - enterDur) / 0.35)) : 1;
  const landed = d.inAt + enterDur;
  // offsets as fractions of the frame height; scale and blur of the asset
  const dy = d.enter === "rise" ? lerp(0.22, 0, a) : d.enter === "drop" ? lerp(-0.55, 0, a) + (t > landed ? (1 - settle) * 0.012 : 0) : 0;
  const scale = d.enter === "zoom" ? lerp(1.35, 1, a) : d.enter === "drop" && t > landed ? lerp(0.97, 1, settle) : lerp(0.92, 1, a);
  const blur = d.enter === "zoom" ? (1 - a) * 18 : (1 - a) * 6;
  const float = Math.sin(Math.max(0, t - landed) * 1.6) * 0.008 * prog(t, landed, 0.6);
  const out = t > p.outAt ? E.inCubic(clamp((t - p.outAt) / d.outDur)) : 0;
  return {
    scene,
    asset: d.enter === "drop" ? (t >= d.inAt ? 1 : 0) : a,
    dy: dy + float,
    scale: scale * (1 + 0.06 * out),
    blur: blur + out * 10,
    rot: d.turn * prog(t, d.inAt, p.outAt + d.outDur - d.inAt, "linear") - d.turn / 2,
    glow: prog(t, d.inAt + 0.2, 0.8) * (1 + 0.25 * Math.exp(-Math.max(0, t - landed) * 4) * (t >= landed ? 1 : 0)),
    shadow: d.enter === "drop" ? prog(t, d.inAt, enterDur, "inCubic") : a,
    push: 1 + 0.05 * prog(t, 0, p.outAt + d.outDur, "linear"),
    lines: (p.headline ?? []).map((_, i) => prog(t, landed - 0.15 + i * 0.16, 0.45, "outQuart")),
    kicker: prog(t, landed - 0.3, 0.4),
    landed,
  };
};

export const assetSceneTiming: BeatTiming<AssetSceneProps> = {
  system: "C",
  fullscreen: () => true,
  duration: (p) => p.outAt + assetDefaults(p).outDur + 0.1,
  sfx: (p, fps) => {
    const d = assetDefaults(p);
    const pose0 = assetPose(0, p);
    const out: SfxIntent[] = [
      { id: "entry", label: "cut into the 3D asset scene", kind: "transition", t: 0, category: "SCI", roles: ["activate-energy", "sci-fi-impact"], priority: "recommended", note: "Cut frame of a new scene; a riser can resolve here (pass 3)." },
    ];
    if (d.enter === "drop") {
      out.push({ id: "land", label: "asset lands", kind: "event", t: snap(pose0.landed, fps), category: "HIT", roles: ["impact-hit", "sub-drop"], priority: "recommended", measured_from: "landing frame of the drop" });
    } else {
      out.push({ id: "asset", label: `asset ${d.enter === "zoom" ? "zooms in" : "rises in"}`, kind: "movement", t: fastestFrame((t) => assetPose(t, p).asset, fps, d.inAt, d.inAt + 0.9), category: "WSH", roles: ["transition-spacey-whoosh", "synthetic-whoosh"], priority: "recommended", measured_from: "fastest frame of the asset entrance" });
    }
    if (p.headline?.length) {
      const i = Math.min(d.accentLine, p.headline.length - 1);
      const at = firstFrameWhere((t) => (assetPose(t, p).lines[i] ?? 0) >= 0.5, fps, 0, p.outAt);
      out.push({ id: "headline", label: `headline lands: "${p.headline[i]}"`, kind: "event", t: at ?? snap(pose0.landed, fps), category: "POP", roles: ["pop", "sci-fi-click"], priority: "optional", measured_from: "first visible frame of the accent line" });
    }
    return out;
  },
};
