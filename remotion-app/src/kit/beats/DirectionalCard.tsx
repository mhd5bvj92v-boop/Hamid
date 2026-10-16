import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { SANS } from "../../fonts";
import { Backdrop } from "../backgrounds";
import { RADII, TYPE } from "../motionTokens";
import { LineIcon, RimGlow, alpha, surface } from "../premium";
import { useCanvas, useInk, useLayout, useMotion, usePalette } from "../style";
import { DirectionalCardProps, dcDefaults, dcPose } from "./directionalCard.timing";

/** Recipe "Directional card": arrive, settle, one state change, continue out (directionalCard.timing.ts). */
export const DirectionalCard: React.FC<DirectionalCardProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H, landscape } = useCanvas();
  const L = useLayout();
  const pal = usePalette();
  const ink = useInk();
  const fg = ink.light ? ink.ink : "#fff";
  const fg2 = ink.light ? "rgba(20,22,28,.6)" : "rgba(255,255,255,.62)";
  const t = frame / fps;
  const d = dcDefaults(p);
  const m = useMotion();
  const raw = dcPose(t, p);
  // the motion controls shape the curves inside the authored timing (sound sync unchanged)
  const pose = { ...raw, enter: m.arrive(raw.enterRaw), exit: m.leave(raw.exitRaw), scale: 0.97 + 0.03 * Math.min(1, m.arrive(raw.enterRaw)) };
  const accent = d.accent ?? pal.c10;
  const T = landscape ? TYPE.landscape : TYPE.portrait;

  // size and anchor: on the thirds or centred; vertical overlays sit in the lower UI band, clear of the face
  const cw = Math.min(landscape ? L.span(5) : W * 0.78, H * 0.9);
  const ch = cw * (landscape ? 0.5 : 0.56);
  const x0 = d.anchor === "left-third" ? L.thirds.x[0] : d.anchor === "right-third" ? L.thirds.x[1] : W / 2;
  const y0 = p.fullscreen || landscape ? H / 2 : H * 0.68;

  // travel: from the actual card bounds plus its glow (offscreen), or a short in-frame move
  const glowPad = 90;
  const off = {
    right: W - (x0 - cw / 2) + glowPad,
    left: x0 + cw / 2 + glowPad,
    bottom: H - (y0 - ch / 2) + glowPad,
  };
  const short = { right: W * 0.06, left: W * 0.06, bottom: H * 0.05 };
  const dist = d.travel === "offscreen" ? off : short;
  const from = p.enterFrom ?? (m.direction === "top" ? "bottom" : m.direction);
  const to = d.exit === "return" ? from : from === "right" ? "left" : from === "left" ? "right" : "top";
  const vec = (side: string) => (side === "right" ? [1, 0] : side === "left" ? [-1, 0] : side === "bottom" ? [0, 1] : [0, -1]);
  const [ix, iy] = vec(from);
  const [ox, oy] = vec(to);
  const outD = to === "top" ? (d.travel === "offscreen" ? y0 + ch / 2 + glowPad : H * 0.05) : dist[to as "left" | "right"];
  const inD = dist[from];
  const dx = ix * inD * (1 - pose.enter) + ox * outD * pose.exit;
  const dy = iy * inD * (1 - pose.enter) + oy * outD * pose.exit;

  const pill = (text: string, on: boolean, o: number) => (
    <span
      style={{
        position: "absolute",
        right: 0,
        top: 0,
        opacity: o,
        padding: `${ch * 0.035}px ${ch * 0.08}px`,
        borderRadius: RADII.pill,
        fontSize: T.ui * 0.9,
        fontWeight: 600,
        color: on ? "#fff" : fg2,
        background: on ? accent : ink.light ? "rgba(20,22,28,.05)" : "rgba(255,255,255,.08)",
        border: `1px solid ${on ? alpha(accent, 0.9) : ink.light ? "rgba(20,22,28,.12)" : "rgba(255,255,255,.14)"}`,
        boxShadow: on && m.glowK > 0 ? `0 0 ${(18 + 30 * pose.pulse) * m.glowK}px ${alpha(accent, Math.min(1, (0.45 + 0.35 * pose.pulse) * m.glowK))}` : "none",
        transform: `scale(${on ? 0.92 + 0.08 * pose.change : 1})`,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );

  return (
    <AbsoluteFill style={{ fontFamily: SANS }}>
      {p.fullscreen ? <Backdrop preset={p.background ?? "near-black-light"} /> : null}
      {p.scrim ? (
        <AbsoluteFill style={{ opacity: pose.opacity * 0.75, background: `radial-gradient(${cw * 0.9}px ${ch * 1.2}px at ${x0 + dx}px ${y0 + dy}px, rgba(0,0,0,.55), transparent 70%)` }} />
      ) : null}
      <div
        style={{
          position: "absolute",
          left: x0 - cw / 2,
          top: y0 - ch / 2,
          width: cw,
          height: ch,
          opacity: pose.opacity,
          transform: `translate(${dx}px, ${dy}px) scale(${pose.scale})`,
          filter: m.blurK > 0 && (raw.enterRaw < 1 || raw.exitRaw > 0) ? `blur(${((1 - Math.min(1, pose.enter)) * 10 + pose.exit * 6) * m.blurK}px)` : undefined,
          transformOrigin: from === "right" ? "100% 50%" : from === "left" ? "0% 50%" : "50% 100%",
        }}
      >
        <div style={{ ...surface(ink.light, { radius: RADII.card * (cw / 700) }), position: "absolute", inset: 0, padding: ch * 0.12, display: "flex", flexDirection: "column", justifyContent: "space-between", color: fg }}>
          <RimGlow color={accent} strength={(0.55 + 0.6 * pose.pulse) * m.glowK} />
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: ch * 0.06 }}>
            {p.icon ? (
              <span style={{ display: "grid", placeItems: "center", width: ch * 0.2, height: ch * 0.2, borderRadius: RADII.chip, background: alpha(accent, 0.18), border: `1px solid ${alpha(accent, 0.45)}` }}>
                <LineIcon name={p.icon} size={ch * 0.11} color={ink.light ? accent : "#fff"} />
              </span>
            ) : null}
            {p.label ? <span style={{ fontSize: T.ui * 0.85, fontWeight: 500, color: fg2, letterSpacing: "0.02em" }}>{p.label}</span> : null}
          </div>
          <div style={{ position: "relative", display: "grid", gap: ch * 0.06 }}>
            <div style={{ fontSize: Math.min(T.key * 0.8, cw * 0.075), fontWeight: 700, letterSpacing: "-0.015em", lineHeight: 1.1, textWrap: "balance" }}>{p.title}</div>
            {p.status ? (
              <div style={{ position: "relative", height: T.ui * 1.6 }}>
                <span style={{ position: "absolute", left: 0, top: 0, fontSize: T.ui * 0.85, color: fg2 }}>Status</span>
                {pill(p.status.from, false, 1 - pose.change)}
                {pill(p.status.to, true, pose.change)}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
