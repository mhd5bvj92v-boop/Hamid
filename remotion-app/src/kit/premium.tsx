// Premium UI building blocks (the GLASS-DARK / NEON-RIM look of the reference
// library: ONS-024, ONS-041, ONS-056...). Every UI element the kit or Claude Code
// builds should be made of these instead of flat boxes: frosted glass with a top
// highlight and a coloured rim light, deep soft shadows, a fine grid, film grain,
// one light sweep on arrival, thin line icons (never letter tiles or emoji), and a
// 3D tilt-in. All static styles or pure functions of a 0..1 progress, so they
// render identically in the Player and in every Remotion render.
import React from "react";
import { AbsoluteFill } from "remotion";
import { clamp, lerp } from "./motion";

/** Hex colour + alpha (0..1) -> #RRGGBBAA. */
export const alpha = (hex: string, a: number) => `${hex.slice(0, 7)}${Math.round(clamp(a) * 255).toString(16).padStart(2, "0")}`;

/** Frosted dark glass: gradient body, blur behind, hairline border, top highlight, deep shadow. */
export const glass = (o: { radius?: number; tint?: string; depth?: number } = {}): React.CSSProperties => ({
  position: "relative",
  overflow: "hidden",
  borderRadius: o.radius ?? 34,
  background: `linear-gradient(165deg, rgba(255,255,255,.11) 0%, rgba(255,255,255,.035) 34%, ${o.tint ?? "rgba(7,11,24,.62)"} 100%)`,
  backdropFilter: "blur(30px) saturate(150%)",
  WebkitBackdropFilter: "blur(30px) saturate(150%)",
  border: "1px solid rgba(255,255,255,.10)",
  boxShadow: [
    "inset 0 1px 0 rgba(255,255,255,.20)",
    "inset 0 -1px 0 rgba(255,255,255,.04)",
    `0 ${40 * (o.depth ?? 1)}px ${90 * (o.depth ?? 1)}px rgba(0,0,0,.55)`,
    "0 10px 26px rgba(0,0,0,.35)",
  ].join(", "),
});

/** Light frosted glass for light bases (paper, porcelain): white body, hairline border, soft long shadow. Text uses dark ink. */
export const lightGlass = (o: { radius?: number; depth?: number } = {}): React.CSSProperties => ({
  position: "relative",
  overflow: "hidden",
  borderRadius: o.radius ?? 34,
  background: "linear-gradient(170deg, rgba(255,255,255,.96) 0%, rgba(255,255,255,.86) 100%)",
  backdropFilter: "blur(24px) saturate(140%)",
  WebkitBackdropFilter: "blur(24px) saturate(140%)",
  border: "1px solid rgba(20,22,28,.08)",
  boxShadow: [
    "inset 0 1px 0 rgba(255,255,255,.9)",
    `0 ${30 * (o.depth ?? 1)}px ${70 * (o.depth ?? 1)}px rgba(20,30,60,.16)`,
    "0 6px 16px rgba(20,30,60,.08)",
  ].join(", "),
});

/** The edit's surface: dark glass on dark bases, light glass on light ones (one material for the whole video). */
export const surface = (light: boolean, o: { radius?: number; depth?: number; tint?: string } = {}) => (light ? lightGlass(o) : glass(o));

/** Coloured light rising from the bottom edge of a glass panel (NEON-RIM, ONS-024). */
export const RimGlow: React.FC<{ color: string; strength?: number; edge?: "bottom" | "top" }> = ({ color, strength = 1, edge = "bottom" }) => (
  <>
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background: `radial-gradient(70% 45% at 50% ${edge === "bottom" ? "108%" : "-8%"}, ${alpha(color, 0.55 * strength)} 0%, ${alpha(color, 0.12 * strength)} 45%, transparent 75%)`,
      }}
    />
    <div
      style={{
        position: "absolute",
        left: "12%",
        right: "12%",
        [edge]: 0,
        height: 2,
        pointerEvents: "none",
        background: `linear-gradient(90deg, transparent, ${alpha(color, 0.95 * strength)}, transparent)`,
        boxShadow: `0 0 24px 4px ${alpha(color, 0.6 * strength)}`,
      }}
    />
  </>
);

/** Hairline grid inside a panel, faded towards the edges. */
export const FineGrid: React.FC<{ size?: number; opacity?: number }> = ({ size = 30, opacity = 1 }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      opacity,
      backgroundImage: "linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px)",
      backgroundSize: `${size}px ${size}px`,
      maskImage: "radial-gradient(80% 70% at 50% 40%, black 30%, transparent 85%)",
      WebkitMaskImage: "radial-gradient(80% 70% at 50% 40%, black 30%, transparent 85%)",
    }}
  />
);

const GRAIN = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>",
).replace(/%2523/g, "%23")}")`;

/** Film grain over a panel or the whole frame (kills the flat, digital look). */
export const Grain: React.FC<{ opacity?: number; full?: boolean }> = ({ opacity = 0.07, full }) => {
  const style: React.CSSProperties = { pointerEvents: "none", opacity, backgroundImage: GRAIN, mixBlendMode: "overlay" };
  return full ? <AbsoluteFill style={style} /> : <div style={{ position: "absolute", inset: 0, ...style }} />;
};

/** One diagonal light sweep across a panel; p goes 0 -> 1 over the sweep. */
export const LightSweep: React.FC<{ p: number; strength?: number }> = ({ p, strength = 1 }) =>
  p <= 0 || p >= 1 ? null : (
    <div
      style={{
        position: "absolute",
        inset: "-20% -60%",
        pointerEvents: "none",
        translate: `${lerp(-70, 70, p)}% 0`,
        background: `linear-gradient(105deg, transparent 42%, rgba(255,255,255,${0.16 * strength}) 50%, transparent 58%)`,
        mixBlendMode: "screen",
      }}
    />
  );

/** 3D tilt-in of a panel: p 0 -> 1 (tilted back, low, soft) -> (flat, sharp). */
export const tiltIn = (p: number, o: { tilt?: number; rise?: number; blur?: number } = {}): React.CSSProperties => ({
  transform: `perspective(1600px) rotateX(${(1 - p) * (o.tilt ?? 16)}deg) translateY(${(1 - p) * (o.rise ?? 60)}px) scale(${lerp(0.94, 1, p)})`,
  transformOrigin: "50% 100%",
  opacity: clamp(p * 1.4),
  filter: `blur(${(1 - p) * (o.blur ?? 12)}px)`,
});

/** A small glowing status dot. */
export const StatusDot: React.FC<{ color: string; size?: number; pulse?: number }> = ({ color, size = 12, pulse = 0 }) => (
  <span
    style={{
      display: "inline-block",
      width: size,
      height: size,
      borderRadius: "50%",
      background: color,
      boxShadow: `0 0 ${10 + 14 * pulse}px ${3 + 4 * pulse}px ${alpha(color, 0.55)}`,
      flex: "none",
    }}
  />
);

const ICONS: Record<string, string> = {
  door: "M7 21V4.5A1.5 1.5 0 0 1 8.5 3h7A1.5 1.5 0 0 1 17 4.5V21M4 21h16M14 12.5v.01",
  pin: "M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  signal: "M4 20v-3M9 20v-7M14 20V9M19 20V4",
  lock: "M6.5 11h11v9.5h-11zM8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  check: "M5 12.5l4.2 4.2L19 7",
  spark: "M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3",
  chart: "M4 20h16M6 16l4-5 4 3 5-7",
  alert: "M12 4l9 16H3zM12 10v4.5M12 17.2v.01",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5a7.5 7.5 0 0 1 15 0",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.6 2.5 4 5.6 4 9s-1.4 6.5-4 9c-2.6-2.5-4-5.6-4-9s1.4-6.5 4-9z",
  layers: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5",
  bolt: "M13 2L4.5 13.5H12L11 22l8.5-11.5H12z",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  wave: "M2 12c2.5-4 4.5-4 7 0s4.5 4 7 0 4.5-4 6 0",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  mail: "M3.5 6.5h17v11h-17zM3.5 7l8.5 6.5L20.5 7",
  users: "M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 20a6.5 6.5 0 0 0-3-5.5",
};
export const ICON_NAMES = Object.keys(ICONS);

/** Thin line icon (24x24 grid, 1.6 stroke). Unknown names fall back to a small ring. */
export const LineIcon: React.FC<{ name?: string; size?: number; color?: string; stroke?: number }> = ({ name, size = 26, color = "#fff", stroke = 1.6 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    {name && ICONS[name] ? <path d={ICONS[name]} /> : <circle cx="12" cy="12" r="3.5" />}
  </svg>
);

// ------------------------------------------------------------ cinematic finish
// Real-looking motion design is layered: atmosphere -> light source -> subject -> particles ->
// haze -> grade. These layers turn flat CSS shapes into light (references/premium-motion.md).

/** Bloom: the children plus a blurred, brightened copy screened on top (light that glows past its edges). */
export const Bloom: React.FC<{ children: React.ReactNode; radius?: number; strength?: number }> = ({ children, radius = 28, strength = 0.9 }) => (
  <AbsoluteFill>
    <AbsoluteFill>{children}</AbsoluteFill>
    <AbsoluteFill style={{ filter: `blur(${radius}px) brightness(1.6)`, opacity: strength, mixBlendMode: "screen", pointerEvents: "none" }}>{children}</AbsoluteFill>
  </AbsoluteFill>
);

/** Dark edges that focus the eye and hide the frame's flatness. */
export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.7 }) => (
  <AbsoluteFill style={{ pointerEvents: "none", background: `radial-gradient(115% 85% at 50% 45%, transparent 50%, rgba(0,0,0,${strength}) 100%)` }} />
);

/** Volumetric light rays fanning out from a point (x, y in frame fractions); t = seconds, for a slow drift. */
export const LightRays: React.FC<{ x?: number; y?: number; color?: string; t?: number; strength?: number; spread?: number }> = ({ x = 0.5, y = 0.35, color = "#9CC7FF", t = 0, strength = 1, spread = 70 }) => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      mixBlendMode: "screen",
      opacity: 0.55 * strength,
      filter: "blur(18px)",
      background: `repeating-conic-gradient(from ${-spread / 2 + 6 * Math.sin(t * 0.6)}deg at ${x * 100}% ${y * 100}%, ${alpha(color, 0.0)} 0deg, ${alpha(color, 0.35)} 3deg, ${alpha(color, 0.0)} 7deg, ${alpha(color, 0.0)} 11deg)`,
      maskImage: `radial-gradient(60% 70% at ${x * 100}% ${y * 100}%, black 0%, transparent 75%)`,
      WebkitMaskImage: `radial-gradient(60% 70% at ${x * 100}% ${y * 100}%, black 0%, transparent 75%)`,
    }}
  />
);

/** Deterministic floating dust / embers (seeded, so every render is identical); t = seconds. */
export const Dust: React.FC<{ count?: number; color?: string; t?: number; seed?: string; size?: number; strength?: number }> = ({ count = 60, color = "#CFE3FF", t = 0, seed = "dust", size = 3, strength = 1 }) => {
  const rnd = (i: number, k: number) => {
    let h = 2166136261;
    for (const c of `${seed}:${i}:${k}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return ((h >>> 0) % 100000) / 100000;
  };
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: count }, (_, i) => {
        const depth = 0.3 + 0.7 * rnd(i, 1);
        const x = (rnd(i, 2) * 100 + t * (rnd(i, 3) - 0.5) * 4 * depth + 100) % 100;
        const y = (rnd(i, 4) * 100 - t * 2.5 * depth + 100) % 100;
        const s = size * (0.4 + depth);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              width: s,
              height: s,
              borderRadius: "50%",
              background: color,
              opacity: strength * (0.15 + 0.6 * depth) * (0.6 + 0.4 * Math.sin(t * 2 + i)),
              filter: `blur(${(1 - depth) * 2.5}px)`,
              boxShadow: `0 0 ${6 * depth}px ${alpha(color, 0.8)}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** The finishing pass every full-screen scene gets: grain + vignette (+ a faint colour wash). */
export const CinematicFinish: React.FC<{ grain?: number; vignette?: number; wash?: string }> = ({ grain = 0.08, vignette = 0.65, wash }) => (
  <>
    {wash ? <AbsoluteFill style={{ background: wash, mixBlendMode: "soft-light", pointerEvents: "none" }} /> : null}
    <Vignette strength={vignette} />
    <Grain full opacity={grain} />
  </>
);
