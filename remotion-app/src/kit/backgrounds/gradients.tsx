// Background families from the brief (§11): four-colour multi-point gradients, a dot field and a near-black
// with one light. Layered radial fields, each with its own position, radius, opacity and a slow periodic
// path (periods 11-19 s, out of phase), driven only by composition time, so seeking is exact and nothing
// pumps or rotates like a rainbow. The darkest (or lightest) colour is the base field, the midtones carry
// structure, the strongest colour is used sparingly and kept away from small text (upper-centre by default).
import React from "react";
import { AbsoluteFill } from "remotion";
import { alpha } from "../premium";
import type { BackgroundDef, BackgroundProps } from "../backgrounds";

/** Original starting palettes (dark → light, or light → strong); not taken from any creator or brand. */
export const GRADIENT_PRESETS = {
  "midnight-blue": ["#05070D", "#101B3D", "#244E9B", "#487EC7"],
  "indigo-violet": ["#0B0B17", "#24204A", "#514899", "#8A79CB"],
  "deep-teal": ["#061211", "#10352F", "#246357", "#629587"],
  "warm-graphite": ["#100E0C", "#30231B", "#73503A", "#AD8661"],
  "porcelain-blue": ["#F4F6FA", "#E6ECF5", "#CCD9EE", "#A7BDDF"],
  "soft-lavender": ["#F5F3F8", "#E8E2F0", "#D1C5E2", "#B4A1CC"],
} as const satisfies Record<string, readonly [string, string, string, string]>;

type Field = { x: number; y: number; rx: number; ry: number; o: number; ax: number; ay: number; px: number; py: number; ph: number };
// base field + three structure/accent fields; the brightest one sits upper-centre-right, small and soft
const FIELDS: Field[] = [
  { x: 22, y: 78, rx: 75, ry: 60, o: 0.85, ax: 5, ay: 3, px: 17, py: 19, ph: 0 },
  { x: 78, y: 22, rx: 60, ry: 50, o: 0.75, ax: 6, ay: 4, px: 13, py: 15, ph: 1.7 },
  { x: 58, y: 38, rx: 34, ry: 28, o: 0.55, ax: 4, ay: 3, px: 11, py: 14, ph: 3.1 },
];

const Gradient4: React.FC<BackgroundProps & { colors: readonly string[] }> = ({ t, colors }) => {
  const [base, c1, c2, c3] = colors;
  const pos = (f: Field) => ({
    x: f.x + f.ax * Math.sin((2 * Math.PI * t) / f.px + f.ph),
    y: f.y + f.ay * Math.cos((2 * Math.PI * t) / f.py + f.ph * 0.7),
  });
  const layer = (f: Field, c: string) => {
    const p = pos(f);
    return `radial-gradient(${f.rx}% ${f.ry}% at ${p.x}% ${p.y}%, ${alpha(c, f.o)} 0%, ${alpha(c, f.o * 0.35)} 45%, transparent 75%)`;
  };
  return (
    <AbsoluteFill style={{ background: base, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: [layer(FIELDS[2], c3), layer(FIELDS[1], c2), layer(FIELDS[0], c1)].join(", "), filter: "blur(24px)", transform: "scale(1.08)" }} />
    </AbsoluteFill>
  );
};

/** The edit's own palette as a four-colour field: c60 base, c30 structure, a c30/c10 mix, c10 sparingly. */
const PaletteGradient: React.FC<BackgroundProps> = (p) => <Gradient4 {...p} colors={[p.c60, p.c30, mix(p.c30, p.c10, 0.45), p.c10]} />;

const mix = (a: string, b: string, k: number) => {
  const h = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const [x, y] = [h(a), h(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, "0")).join("")}`;
};

/** Low-contrast dot field (40 px pitch, aligned with the thirds like paper-grid) with one soft accent light. */
const DotField: React.FC<BackgroundProps> = ({ t, c60, c10 }) => {
  const light = parseInt(c60.slice(1, 3), 16) > 128;
  const dot = light ? "rgba(20,22,28,.13)" : "rgba(255,255,255,.08)";
  return (
    <AbsoluteFill style={{ background: c60, overflow: "hidden" }}>
      <AbsoluteFill style={{ backgroundImage: `radial-gradient(${dot} 1.2px, transparent 1.6px)`, backgroundSize: "40px 40px", backgroundPosition: "-20px -20px",
        maskImage: "radial-gradient(120% 95% at 50% 45%, black 50%, transparent 100%)", WebkitMaskImage: "radial-gradient(120% 95% at 50% 45%, black 50%, transparent 100%)" }} />
      <AbsoluteFill style={{ background: `radial-gradient(38% 30% at ${50 + 5 * Math.sin((2 * Math.PI * t) / 14)}% ${42 + 3 * Math.cos((2 * Math.PI * t) / 17)}%, ${alpha(c10, light ? 0.1 : 0.16)}, transparent 70%)`, filter: "blur(30px)" }} />
    </AbsoluteFill>
  );
};

/** Near-black with one soft coloured light source drifting very slowly (the dark technology look). */
const NearBlackLight: React.FC<BackgroundProps> = ({ t, c10 }) => (
  <AbsoluteFill style={{ background: "#05070D", overflow: "hidden" }}>
    <AbsoluteFill style={{ background: `radial-gradient(55% 42% at ${62 + 4 * Math.sin((2 * Math.PI * t) / 16)}% ${30 + 3 * Math.cos((2 * Math.PI * t) / 19)}%, ${alpha(c10, 0.34)}, ${alpha(c10, 0.08)} 45%, transparent 72%)`, filter: "blur(20px)" }} />
    <AbsoluteFill style={{ background: "radial-gradient(130% 100% at 50% 40%, transparent 55%, rgba(0,0,0,.55) 100%)" }} />
  </AbsoluteFill>
);

const label = (id: string) => id.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

export const gradientBackgrounds: BackgroundDef[] = [
  ...Object.entries(GRADIENT_PRESETS).map(([id, colors]) => ({
    id,
    label: `${label(id)} (4-colour)`,
    description: `four-colour field ${colors.join(" / ")}: base ${colors[0]}, the strongest colour used sparingly`,
    render: (p: BackgroundProps) => <Gradient4 {...p} colors={colors} />,
    light: parseInt(colors[0].slice(1, 3), 16) > 128,
  })),
  { id: "palette-gradient", label: "Palette gradient (4-colour)", description: "the edit's own 60-30-10 colours as a slow four-colour field", render: PaletteGradient },
  { id: "dot-field", label: "Dot field", description: "low-contrast dot grid (40 px, on the thirds) with one soft accent light", render: DotField },
  { id: "near-black-light", label: "Near-black + one light", description: "near-black with one soft coloured light drifting slowly (dark technology look)", render: NearBlackLight },
];
