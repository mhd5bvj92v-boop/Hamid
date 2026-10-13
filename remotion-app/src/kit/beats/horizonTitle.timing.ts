// System C full-screen: HORIZON-ARC family (FUL-002 "300 on the planet
// horizon", FUL-028, FUL-067). Opaque black scene, glowing planet rim rises
// like a sunrise, thin numerals count up and sink behind the limb.
// Port of templates/fullscreen-horizon-title.html.
import {
  envelope,
  fastestFrame,
  firstFrameWhere,
  lerp,
  prog,
  snap,
} from "../motion";
import type { BeatTiming } from "../types";

export type HorizonTitleProps = {
  kicker: string;
  /** Use the speaker's own number. Never invent data. */
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  body?: string;
  rim?: string;
  rimSolid?: string;
  haze?: string;
  /** Top of the planet after the rise, as a frame fraction. */
  horizonY?: number;
  /** Numeral size in rem (10 px): 35 spans ~63% of the width, like FUL-002. */
  numSize?: number;
  riseAt?: number;
  riseDur?: number;
  numAt?: number;
  numDur?: number;
  kickerAt?: number;
  bodyAt?: number;
  /** Slow push-in over the shot (3-5%). */
  camPush?: number;
  outAt: number;
  outDur?: number;
};

export const horizonDefaults = (p: HorizonTitleProps) => ({
  rim: p.rim ?? "rgba(45,125,255,1)",
  rimSolid: p.rimSolid ?? "#2F7BFF",
  haze: p.haze ?? "rgba(35,105,255,.75)",
  horizonY: p.horizonY ?? 0.47,
  numSize: p.numSize ?? 35,
  riseAt: p.riseAt ?? 0,
  riseDur: p.riseDur ?? 1.6,
  numAt: p.numAt ?? 0.6,
  numDur: p.numDur ?? 1.6,
  kickerAt: p.kickerAt ?? 0.35,
  bodyAt: p.bodyAt ?? 1.5,
  camPush: p.camPush ?? 0.04,
  outDur: p.outDur ?? 0.4,
});

export const horizonPose = (t: number, p: HorizonTitleProps, H = 1920) => {
  const d = horizonDefaults(p);
  const rise = prog(t, d.riseAt, d.riseDur, "outQuart");
  const top = lerp(d.horizonY + 0.12, d.horizonY, rise) * H;
  return {
    rise,
    top,
    kicker: prog(t, d.kickerAt, 0.6),
    num: prog(t, d.numAt, 0.5),
    count: prog(t, d.numAt, d.numDur, "outExpo"),
    tick: prog(t, d.bodyAt - 0.2, 0.5),
    body: prog(t, d.bodyAt, 0.6),
    out: envelope(t, -1, 0.01, p.outAt, d.outDur),
    push: 1 + d.camPush * prog(t, 0, p.outAt + d.outDur, "linear"),
  };
};

export const horizonTitleTiming: BeatTiming<HorizonTitleProps> = {
  system: "C",
  fullscreen: () => true,
  duration: (p) => p.outAt + horizonDefaults(p).outDur + 0.1,
  sfx: (p, fps) => {
    const d = horizonDefaults(p);
    const planet = fastestFrame(
      (t) => horizonPose(t, p).top,
      fps,
      d.riseAt,
      d.riseAt + d.riseDur,
    );
    const body = firstFrameWhere(
      (t) => horizonPose(t, p).body >= 0.5,
      fps,
      d.bodyAt,
      p.outAt,
    );
    return [
      {
        id: "entry",
        label: "cut into full-screen scene (frame 0 of this beat)",
        kind: "transition",
        t: 0,
        category: "SCI",
        roles: ["activate-energy", "sci-fi-impact", "camera-click"],
        priority: "recommended",
        note: "Transition into a brand-new animation, on the cut frame. Pass 3: a riser can resolve here with a hit beneath. No music under this scene.",
      },
      {
        id: "planet",
        label: "planet horizon rises",
        kind: "movement",
        t: planet,
        category: "WSH",
        roles: [
          "classy-airy-whoosh",
          "generic-long-whoosh",
          "organic-wind-whoosh",
        ],
        priority: "recommended",
        note: "Big, slow move -> classy airy or organic wind; up to -10 dB. outQuart: fastest at the very start.",
        measured_from: "fastest frame of the planet top",
      },
      {
        id: "number",
        label: "numerals count up",
        kind: "continuous",
        t: snap(d.numAt, fps),
        t_end: snap(d.numAt + d.numDur, fps),
        category: "MEC",
        roles: ["gears", "video-scan"],
        priority: "optional",
      },
      {
        id: "body",
        label: "body line appears",
        kind: "event",
        t: body ?? snap(d.bodyAt, fps),
        category: "POP",
        roles: ["pop"],
        priority: "silence-ok",
        measured_from: "first visible frame (>= 0.5)",
      },
      {
        id: "push",
        label: "slow camera push",
        kind: "movement",
        t: 0,
        category: "WSH",
        roles: ["organic-wind-whoosh"],
        priority: "silence-ok",
        note: "A 3-5% drift is too slow to need a whoosh.",
      },
    ];
  },
};
