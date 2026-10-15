import React from "react";
import { AbsoluteFill, random, useCurrentFrame } from "remotion";
import { SANS } from "../../fonts";
import { Backdrop } from "../backgrounds";
import { clamp, lerp } from "../motion";
import { alpha } from "../premium";
import { useCanvas, useInk, usePalette } from "../style";
import { KineticTextProps, splitWords, textDefaults, textScene, wordProg } from "./kineticText.timing";

const SIZE = { s: 54, m: 72, l: 104, xl: 140 } as const;
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&$";

/** The text-animation library (kineticText.timing.ts lists the styles). */
export const KineticText: React.FC<KineticTextProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H, landscape } = useCanvas();
  const pal = usePalette();
  const ink = useInk();
  const t = frame / fps;
  const d = textDefaults(p);
  const sc = textScene(t, p);
  const words = splitWords(p.text);
  const accentSet = new Set((p.accent ?? []).flatMap((a) => splitWords(a)).map((w) => w.toLowerCase().replace(/[^\w]/g, "")));
  const isAccent = (w: string) => accentSet.has(w.toLowerCase().replace(/[^\w]/g, ""));
  // portrait full-screen lines are narrow: the biggest sizes step down so 3 words fit a line
  const fs = SIZE[d.size] * (landscape ? (d.placement === "fullscreen" ? 1 : 0.8) : d.size === "xl" ? 0.84 : 1);

  // lines of at most wordsPerLine words
  const lines: { w: string; i: number }[][] = [];
  words.forEach((w, i) => {
    if (!lines.length || lines[lines.length - 1].length >= d.wordsPerLine) lines.push([]);
    lines[lines.length - 1].push({ w, i });
  });

  const top = d.placement === "caption" ? (landscape ? H * 0.72 : H * 0.62) : H * 0.5;
  const glitching = d.style === "glitch" && t < d.inAt + 0.45;

  const renderWord = (w: string, i: number, li: number) => {
    const k = wordProg(t, i, p);
    const acc = isAccent(w);
    // over the footage (caption / center) text stays white; on a light full-screen base it turns to ink
    const onPaper = d.placement === "fullscreen" && ink.light;
    const color = acc ? pal.c10 : onPaper ? ink.ink : "#FFFFFF";
    const glow = acc
      ? onPaper
        ? `0 0 ${fs * 0.3}px ${alpha(pal.c10, 0.35)}`
        : `0 0 ${fs * 0.35}px ${alpha(pal.c10, 0.85)}, 0 0 ${fs * 0.9}px ${alpha(pal.c10, 0.45)}`
      : onPaper
        ? ink.shadow
        : "0 4px 24px rgba(0,0,0,.45)";
    const base: React.CSSProperties = { display: "inline-block", color, textShadow: glow, fontWeight: acc ? 800 : 600, marginRight: "0.26em", whiteSpace: "pre" };
    switch (d.style) {
      case "typewriter":
      case "letter-cascade":
      case "scramble": {
        const before = words.slice(0, i).join(" ").length + (i ? 1 : 0);
        return (
          <span key={i} style={base}>
            {w.split("").map((ch, c) => {
              const start = d.inAt + (before + c) * d.stagger;
              const lk = clamp((t - start) / (d.stagger * 2));
              if (d.style === "typewriter") return <span key={c} style={{ opacity: t >= start ? 1 : 0 }}>{ch}</span>;
              if (d.style === "scramble") {
                const done = t >= start + 0.25;
                const g = GLYPHS[Math.floor(random(`s${i}-${c}-${Math.floor(frame / 2)}`) * GLYPHS.length)];
                return <span key={c} style={{ opacity: t >= start ? 1 : 0 }}>{done ? ch : g}</span>;
              }
              return (
                <span key={c} style={{ display: "inline-block", opacity: lk, transform: `translateY(${(1 - lk) * -0.6 * fs}px) rotate(${(1 - lk) * -12}deg)`, filter: `blur(${(1 - lk) * 6}px)` }}>
                  {ch}
                </span>
              );
            })}
          </span>
        );
      }
      case "word-pop":
        return <span key={i} style={{ ...base, opacity: clamp(k * 2), transform: `scale(${lerp(0.4, 1, k)})` }}>{w}</span>;
      case "scale-punch":
        return <span key={i} style={{ ...base, opacity: clamp(k * 1.6), transform: `scale(${lerp(1.8, 1, k)})`, filter: `blur(${(1 - k) * 14}px)` }}>{w}</span>;
      case "blur-in":
        return <span key={i} style={{ ...base, opacity: k, filter: `blur(${(1 - k) * 22}px)`, letterSpacing: `${(1 - k) * 0.4}em` }}>{w}</span>;
      case "mask-reveal":
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", marginRight: "0.26em" }}>
            <span style={{ ...base, marginRight: 0, transform: `translateY(${(1 - k) * 110}%)` }}>{w}</span>
          </span>
        );
      case "slide-stack":
        return <span key={i} style={{ ...base, opacity: k, transform: `translateX(${(1 - k) * (li % 2 ? 1 : -1) * W * 0.35}px)`, filter: `blur(${(1 - k) * 8}px)` }}>{w}</span>;
      case "karaoke":
        return <span key={i} style={{ ...base, color: k ? color : onPaper ? ink.soft : "rgba(255,255,255,.38)", textShadow: k ? glow : "none", transform: `scale(${k ? 1.04 : 1})` }}>{w}</span>;
      case "highlight-sweep": {
        const sweep = acc ? clamp((t - (d.inAt + words.length * d.stagger + 0.15)) / 0.45) : 0;
        return (
          <span key={i} style={{ ...base, position: "relative", opacity: k, transform: `translateY(${(1 - k) * 30}px)`, color: acc && sweep > 0.5 ? "#fff" : color }}>
            {acc ? (
              <span style={{ position: "absolute", left: "-0.12em", right: "-0.12em", top: "8%", bottom: "4%", zIndex: -1, borderRadius: fs * 0.12, background: pal.c10,
                transformOrigin: "0 50%", transform: `scaleX(${sweep})`, boxShadow: `0 0 ${fs * 0.5}px ${alpha(pal.c10, 0.7)}` }} />
            ) : null}
            {w}
          </span>
        );
      }
      default: // word-rise, glitch
        return <span key={i} style={{ ...base, opacity: k, transform: `translateY(${(1 - k) * 0.5 * fs}px)`, filter: `blur(${(1 - k) * 10}px)` }}>{w}</span>;
    }
  };

  const typingDone = d.inAt + p.text.length * d.stagger;
  const block = (
    <div
      style={{
        position: "absolute",
        left: W * 0.08,
        right: W * 0.08,
        top,
        translate: d.placement === "caption" ? undefined : "0 -50%",
        textAlign: "center",
        fontFamily: SANS,
        fontSize: fs,
        lineHeight: 1.12,
        letterSpacing: "-0.02em",
        opacity: 1 - sc.out,
        filter: sc.out ? `blur(${sc.out * 12}px)` : undefined,
        transform: glitching ? `translateX(${(random(`g${frame}`) - 0.5) * 30}px)` : undefined,
      }}
    >
      {p.kicker ? (
        <div style={{ fontSize: fs * 0.24, fontWeight: 600, letterSpacing: "0.3em", textTransform: "uppercase", color: pal.c10, marginBottom: fs * 0.3, textShadow: `0 0 20px ${alpha(pal.c10, 0.7)}` }}>
          {p.kicker}
        </div>
      ) : null}
      {lines.map((ln, li) => (
        <div key={li} style={{ position: "relative", textShadow: glitching ? `${6}px 0 rgba(255,0,80,.8), ${-6}px 0 rgba(0,220,255,.8)` : undefined }}>
          {ln.map(({ w, i }) => renderWord(w, i, li))}
          {d.style === "typewriter" && li === lines.length - 1 ? (
            <span style={{ display: "inline-block", width: fs * 0.08, height: fs * 0.9, verticalAlign: "-0.1em", background: pal.c10,
              boxShadow: `0 0 16px ${alpha(pal.c10, 0.9)}`, opacity: t < typingDone || Math.floor(t * 2) % 2 === 0 ? 1 : 0 }} />
          ) : null}
        </div>
      ))}
    </div>
  );

  return (
    <AbsoluteFill>
      {d.placement === "fullscreen" ? <Backdrop preset={d.background} /> : null}
      {d.placement === "caption" ? (
        <AbsoluteFill style={{ background: "linear-gradient(to top, rgba(0,0,0,.55), transparent 45%)", opacity: (1 - sc.out) * sc.in }} />
      ) : null}
      {block}
    </AbsoluteFill>
  );
};
