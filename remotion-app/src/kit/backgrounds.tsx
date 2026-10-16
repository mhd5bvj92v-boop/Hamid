// Background library: animated, palette-driven stages with deep glows for full-screen scenes
// (KineticText fullscreen, AssetScene, custom kinds). Every preset uses the edit's 60-30-10
// palette (usePalette) and keeps moving, so no scene is ever a flat, static fill.
// Claude Code adds new presets to src/kit/backgrounds/custom.tsx when the user asks for one.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CinematicFinish, Dust, LightRays, alpha } from "./premium";
import { GRID, isLightBase, useCanvas, usePalette } from "./style";
import { useStage } from "./stage";
import { customBackgrounds } from "./backgrounds/custom";
import { gradientBackgrounds } from "./backgrounds/gradients";

export type BackgroundProps = { t: number; c60: string; c30: string; c10: string; W: number; H: number };
export type BackgroundDef = {
  id: string;
  label: string;
  description: string;
  render: React.FC<BackgroundProps>;
  /** a light background whatever the palette (fixed light colours): gets the light finish */
  light?: boolean;
};

const Aurora: React.FC<BackgroundProps> = ({ t, c60, c30, c10 }) => (
  <AbsoluteFill style={{ background: c60, overflow: "hidden" }}>
    {[0, 1, 2].map((i) => (
      <AbsoluteFill
        key={i}
        style={{
          background: `radial-gradient(${55 + i * 10}% ${40 + i * 6}% at ${50 + 28 * Math.sin(t * 0.35 + i * 2.1)}% ${35 + 18 * Math.cos(t * 0.28 + i * 1.3)}%, ${alpha(i === 1 ? c30 : c10, i === 1 ? 0.9 : 0.55)}, transparent 70%)`,
          filter: "blur(60px)",
          mixBlendMode: "screen",
        }}
      />
    ))}
  </AbsoluteFill>
);

const GridFloor: React.FC<BackgroundProps> = ({ t, c60, c30, c10, H }) => (
  <AbsoluteFill style={{ background: `linear-gradient(180deg, ${c60} 0%, ${c60} 52%, ${c30} 100%)`, overflow: "hidden", perspective: 900 }}>
    <div style={{ position: "absolute", left: "-50%", right: "-50%", top: "55%", height: H, transform: "rotateX(72deg)", transformOrigin: "50% 0",
      backgroundImage: `linear-gradient(${alpha(c10, 0.55)} 2px, transparent 2px), linear-gradient(90deg, ${alpha(c10, 0.55)} 2px, transparent 2px)`,
      backgroundSize: "90px 90px", backgroundPosition: `0 ${(t * 60) % 90}px`,
      maskImage: "linear-gradient(to bottom, transparent 0%, black 25%, black 100%)", WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 25%, black 100%)" }} />
    <AbsoluteFill style={{ background: `radial-gradient(60% 12% at 50% 55%, ${alpha(c10, 0.8)}, transparent 70%)`, filter: "blur(20px)" }} />
  </AbsoluteFill>
);

const Rays: React.FC<BackgroundProps> = ({ t, c60, c30, c10 }) => (
  <AbsoluteFill style={{ background: `radial-gradient(90% 60% at 50% 0%, ${c30}, ${c60} 70%)` }}>
    <LightRays x={0.5} y={-0.05} color={c10} t={t} strength={1.2} spread={90} />
    <Dust t={t} color={c10} count={50} strength={0.8} />
  </AbsoluteFill>
);

const Horizon: React.FC<BackgroundProps> = ({ t, c60, c10, W, H }) => {
  const r = W * 1.6;
  const rise = Math.min(1, t / 1.2);
  return (
    <AbsoluteFill style={{ background: c60, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: W / 2 - r, top: H * (0.78 - 0.1 * rise), width: r * 2, height: r * 2, borderRadius: "50%",
        background: `radial-gradient(circle at 50% 0%, ${alpha(c10, 0.35)}, ${c60} 30%)`,
        boxShadow: `0 -6px 40px 6px ${alpha(c10, 0.9)}, 0 -40px 160px 40px ${alpha(c10, 0.45)}, inset 0 8px 30px ${alpha(c10, 0.7)}` }} />
      <Dust t={t} color="#ffffff" count={40} size={2} strength={0.6} seed="stars" />
    </AbsoluteFill>
  );
};

const Starfield: React.FC<BackgroundProps> = ({ t, c60, c30, c10 }) => (
  <AbsoluteFill style={{ background: `radial-gradient(80% 60% at 60% 40%, ${c30}, ${c60} 75%)` }}>
    <AbsoluteFill style={{ background: `radial-gradient(40% 30% at ${40 + 6 * Math.sin(t * 0.2)}% 45%, ${alpha(c10, 0.35)}, transparent 70%)`, filter: "blur(50px)" }} />
    <Dust t={t} color="#ffffff" count={120} size={2} seed="starfield" />
    <Dust t={t} color={c10} count={30} size={4} seed="nebula" strength={0.7} />
  </AbsoluteFill>
);

const GlassBlobs: React.FC<BackgroundProps> = ({ t, c60, c30, c10, W, H }) => (
  <AbsoluteFill style={{ background: c60, overflow: "hidden" }}>
    {[0, 1, 2, 3].map((i) => {
      const s = W * (0.35 + 0.12 * i);
      return (
        <div key={i} style={{ position: "absolute", width: s, height: s, borderRadius: "50%",
          left: W * (0.5 + 0.35 * Math.sin(t * 0.25 + i * 1.7)) - s / 2, top: H * (0.45 + 0.3 * Math.cos(t * 0.2 + i * 2.3)) - s / 2,
          background: `radial-gradient(circle at 30% 30%, ${alpha(i % 2 ? c10 : c30, 0.85)}, ${alpha(c60, 0)} 70%)`, filter: "blur(30px)" }} />
      );
    })}
    <AbsoluteFill style={{ backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }} />
  </AbsoluteFill>
);

const Spotlight: React.FC<BackgroundProps> = ({ t, c60, c30, c10 }) => (
  <AbsoluteFill style={{ background: `linear-gradient(180deg, ${c60} 0%, ${c60} 62%, ${c30} 100%)` }}>
    <AbsoluteFill style={{ background: `conic-gradient(from 165deg at 50% -10%, transparent 0deg, ${alpha("#ffffff", 0.13)} 15deg, transparent 30deg)`, filter: "blur(12px)" }} />
    <AbsoluteFill style={{ background: `radial-gradient(30% 8% at 50% 66%, ${alpha(c10, 0.55 + 0.1 * Math.sin(t * 2))}, transparent 70%)`, filter: "blur(18px)" }} />
    <Dust t={t} color="#ffffff" count={35} size={2} strength={0.5} seed="haze" />
  </AbsoluteFill>
);

const Mesh: React.FC<BackgroundProps> = ({ t, c60, c30, c10 }) => (
  <AbsoluteFill
    style={{
      background: [
        `radial-gradient(50% 50% at ${30 + 15 * Math.sin(t * 0.4)}% ${30 + 10 * Math.cos(t * 0.3)}%, ${alpha(c10, 0.75)}, transparent 70%)`,
        `radial-gradient(55% 55% at ${70 + 12 * Math.cos(t * 0.35)}% ${60 + 12 * Math.sin(t * 0.25)}%, ${alpha(c30, 0.95)}, transparent 70%)`,
        `radial-gradient(45% 45% at ${50 + 20 * Math.sin(t * 0.2 + 1)}% ${85}%, ${alpha(c10, 0.4)}, transparent 70%)`,
        c60,
      ].join(", "),
      filter: "saturate(1.2)",
    }}
  />
);

const Tunnel: React.FC<BackgroundProps> = ({ t, c60, c10, W }) => (
  <AbsoluteFill style={{ background: c60, overflow: "hidden" }}>
    {Array.from({ length: 9 }, (_, i) => {
      const p = ((i / 9 + t * 0.12) % 1);
      const s = W * (0.1 + 2.2 * p * p);
      return (
        <div key={i} style={{ position: "absolute", left: "50%", top: "45%", width: s, height: s, translate: "-50% -50%", borderRadius: "50%",
          border: `2px solid ${alpha(c10, 0.9 * (1 - p))}`, boxShadow: `0 0 30px ${alpha(c10, 0.6 * (1 - p))}, inset 0 0 30px ${alpha(c10, 0.4 * (1 - p))}` }} />
      );
    })}
    <AbsoluteFill style={{ background: `radial-gradient(20% 14% at 50% 45%, ${alpha(c10, 0.6)}, transparent 70%)`, filter: "blur(30px)" }} />
  </AbsoluteFill>
);

const Beams: React.FC<BackgroundProps> = ({ t, c60, c30, c10 }) => (
  <AbsoluteFill style={{ background: `linear-gradient(180deg, ${c30}, ${c60})`, overflow: "hidden" }}>
    {[0, 1, 2, 3, 4].map((i) => (
      <div key={i} style={{ position: "absolute", top: "-10%", bottom: "-10%", width: 120, left: `${(10 + i * 20 + 8 * Math.sin(t * 0.5 + i)) % 100}%`,
        background: `linear-gradient(180deg, transparent, ${alpha(c10, 0.5)} 50%, transparent)`, filter: "blur(40px)", transform: "skewX(-12deg)", opacity: 0.5 + 0.5 * Math.sin(t * 0.8 + i * 1.3) }} />
    ))}
  </AbsoluteFill>
);

const Minimal: React.FC<BackgroundProps> = ({ t, c60, c30, c10 }) => (
  <AbsoluteFill style={{ background: `radial-gradient(90% 70% at 50% 40%, ${c30}, ${c60} 80%)` }}>
    <AbsoluteFill style={{ background: `radial-gradient(35% 25% at 50% ${42 + 2 * Math.sin(t * 0.6)}%, ${alpha(c10, 0.18)}, transparent 70%)`, filter: "blur(40px)" }} />
  </AbsoluteFill>
);

// Light paper with a fine grid: 40 px cells (GRID) whose lines pass exactly through the thirds, which are
// drawn a touch stronger; everything barely visible. The grid itself stays put (the camera moves it, so
// elements snapped with snapGrid stay on the lines); only a faint accent glow breathes.
const PaperGrid: React.FC<BackgroundProps> = ({ t, c60, c10, W, H }) => {
  const line = "rgba(20,22,28,.05)";
  const third = "rgba(20,22,28,.085)";
  const v = (x: number) => `linear-gradient(90deg, transparent ${x - 0.5}px, ${third} ${x - 0.5}px, ${third} ${x + 0.5}px, transparent ${x + 0.5}px)`;
  const h = (y: number) => `linear-gradient(180deg, transparent ${y - 0.5}px, ${third} ${y - 0.5}px, ${third} ${y + 0.5}px, transparent ${y + 0.5}px)`;
  return (
    <AbsoluteFill style={{ background: c60, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          backgroundImage: `${v(W / 3)}, ${v((2 * W) / 3)}, ${h(H / 3)}, ${h((2 * H) / 3)}, linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
          backgroundSize: `100% 100%, 100% 100%, 100% 100%, 100% 100%, ${GRID}px ${GRID}px, ${GRID}px ${GRID}px`,
          maskImage: "radial-gradient(125% 100% at 50% 45%, black 60%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(125% 100% at 50% 45%, black 60%, transparent 100%)",
        }}
      />
      <AbsoluteFill style={{ background: `radial-gradient(40% 32% at ${50 + 6 * Math.sin(t * 0.3)}% ${44 + 4 * Math.cos(t * 0.25)}%, ${alpha(c10, 0.09 + 0.03 * Math.sin(t * 0.8))}, transparent 72%)`, filter: "blur(30px)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(130% 110% at 50% 40%, transparent 60%, rgba(20,22,28,.06) 100%)" }} />
    </AbsoluteFill>
  );
};

const DataLines: React.FC<BackgroundProps> = ({ t, c60, c10, W, H }) => (
  <AbsoluteFill style={{ background: c60 }}>
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, filter: `drop-shadow(0 0 12px ${alpha(c10, 0.9)})` }}>
      {Array.from({ length: 7 }, (_, i) => {
        const pts = Array.from({ length: 40 }, (_, k) => {
          const x = (k / 39) * W;
          const y = H * (0.3 + i * 0.07) + Math.sin(k * 0.35 + t * 1.2 + i * 0.8) * 40 * (1 + i * 0.15);
          return `${k ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(" ");
        return <path key={i} d={pts} fill="none" stroke={alpha(c10, 0.25 + 0.1 * i)} strokeWidth={2} />;
      })}
    </svg>
  </AbsoluteFill>
);

export const BACKGROUNDS: BackgroundDef[] = [
  { id: "aurora", label: "Aurora", description: "slow-moving glowing colour clouds", render: Aurora },
  { id: "grid-floor", label: "Grid floor", description: "glowing perspective grid floor rolling towards you, light on the horizon", render: GridFloor },
  { id: "light-rays", label: "Light rays", description: "volumetric rays from above with floating dust", render: Rays },
  { id: "horizon", label: "Planet horizon", description: "a glowing planet edge rising at the bottom, stars", render: Horizon },
  { id: "starfield", label: "Starfield", description: "deep space, drifting stars and a soft nebula", render: Starfield },
  { id: "glass-blobs", label: "Glass blobs", description: "large frosted colour orbs floating behind glass", render: GlassBlobs },
  { id: "spotlight", label: "Spotlight stage", description: "one spotlight on a dark stage with haze and a glowing floor", render: Spotlight },
  { id: "mesh", label: "Mesh gradient", description: "smooth animated mesh of the palette colours", render: Mesh },
  { id: "tunnel", label: "Light tunnel", description: "glowing rings flying towards the camera", render: Tunnel },
  { id: "beams", label: "Light beams", description: "soft vertical beams sweeping across", render: Beams },
  { id: "data-lines", label: "Data waves", description: "glowing flowing data lines", render: DataLines },
  { id: "minimal", label: "Minimal glow", description: "calm dark gradient with one soft glow", render: Minimal },
  { id: "paper-grid", label: "Paper grid (light)", description: "off-white paper with a fine, barely visible grid that drifts slowly; use with a light 60 % colour", render: PaperGrid },
  ...gradientBackgrounds,
  ...customBackgrounds,
];

const FIXED_DARK = new Set(["midnight-blue", "indigo-violet", "deep-teal", "warm-graphite", "near-black-light"]);

/**
 * A library background, animated, in the edit's palette, with the cinematic finish (grain + vignette).
 * Inside a stage scene (constants.stage) it renders nothing: the stage's one continuous background shows.
 */
export const Backdrop: React.FC<{ preset?: string; finish?: boolean; force?: boolean }> = ({ preset = "aurora", finish = true, force = false }) => {
  const onStage = useStage();
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useCanvas();
  const pal = usePalette();
  const def = BACKGROUNDS.find((b) => b.id === preset) ?? BACKGROUNDS[0];
  const R = def.render;
  if (onStage && !force) return null;
  return (
    <AbsoluteFill>
      <R t={frame / fps} c60={pal.c60} c30={pal.c30} c10={pal.c10} W={W} H={H} />
      {/* light bases get a much lighter finish: a dark vignette and heavy grain look dirty on paper */}
      {finish ? (def.light ?? (def.id === "paper-grid" || def.id === "dot-field" ? isLightBase(pal.c60) : isLightBase(pal.c60) && !FIXED_DARK.has(def.id)) ? <CinematicFinish grain={0.035} vignette={0.12} /> : <CinematicFinish />) : null}
    </AbsoluteFill>
  );
};
