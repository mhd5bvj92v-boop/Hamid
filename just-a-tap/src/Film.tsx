import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import "./fonts";
import { DarkBg, LightBg } from "./components/Background";
import { Shell } from "./components/Shell";
import { Terminal } from "./components/Terminal";
import { TERM, camera, phoneStateAt, termAt, termStateAt, toScreen } from "./data/tracks";
import { S1Headline } from "./scenes/S1Headline";
import { GlyphFlight, NfcLink, StatusRail } from "./scenes/S34Nfc";
import { ConfirmPanel, confirmRect } from "./scenes/S5Confirm";
import { MethodRows } from "./scenes/S6Methods";
import { Capsule, EndTitle, OneTap, Stroke, UL } from "./scenes/S78Finale";
import { C, EASE, FONT } from "./theme";
import { tween } from "./lib/anim";

/** One global composition: hero objects read the global frame, so nothing
 * re-mounts at scene boundaries. Light/dark changes are shape masks driven
 * by hero elements (glyph, confirmation panel, stroke). */
/** Clip that grows a world-space rect (centre, size, radius) out to the full frame. */
const grow = (f: number, cx: number, cy: number, w: number, h: number, r: number, k: number) => {
  const cam = camera(f);
  const [x, y] = toScreen(f, [cx, cy]);
  const hw = (w * cam.s) / 2 + k * 1400;
  const hh = (h * cam.s) / 2 + k * 900;
  return `inset(${Math.max(0, y - hh)}px ${Math.max(0, 1920 - x - hw)}px ${Math.max(0, 1080 - y - hh)}px ${Math.max(0, x - hw)}px round ${r * cam.s * (1 - k)}px)`;
};

export const Film: React.FC = () => {
  const f = useCurrentFrame();
  const cam = camera(f);
  // dark grows out of the terminal surface (scene 4)
  const t = termAt(f);
  const darkA = grow(f, t.x, t.y, TERM.w, TERM.h, TERM.r, tween(f, 448, 500, EASE.morph));
  // light returns through the confirmation panel's expansion (scene 5)
  const cr = confirmRect(f);
  const lightB = grow(f, cr.x, cr.y, cr.w, cr.h, 30, tween(f, 606, 662, EASE.morph));
  // the final underline swells into the dark end surface (scene 8)
  const darkC = grow(f, (UL.x0 + UL.x1) / 2, UL.y, UL.x1 - UL.x0, 4, 2, tween(f, 1042, 1096, EASE.morph));
  const darkEnd = tween(f, 1050, 1078);

  return (
    <AbsoluteFill style={{ background: C.canvas, fontFamily: FONT, overflow: "hidden" }}>
      <LightBg f={f} />
      {f >= 450 && f < 700 && (
        <AbsoluteFill style={{ clipPath: darkA }}>
          <DarkBg f={f} cx={55} />
        </AbsoluteFill>
      )}
      {f >= 604 && f < 1100 && (
        <AbsoluteFill style={{ clipPath: lightB }}>
          <LightBg f={f} />
        </AbsoluteFill>
      )}
      {f >= 1042 && (
        <AbsoluteFill style={{ clipPath: darkC }}>
          <DarkBg f={f} cx={50} />
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ transform: `translateX(${cam.x}px) scale(${cam.s})`, transformOrigin: "960px 540px" }}>
        <S1Headline f={f} />
        <Terminal f={f} state={termStateAt(f)} zone={tween(f, 446, 478)} />
        <Shell f={f} phoneState={phoneStateAt(f)} glyphLeft={tween(f, 352, 362)} />
        <GlyphFlight f={f} />
        <NfcLink f={f} />
        <StatusRail f={f} />
        <ConfirmPanel f={f} />
        <MethodRows f={f} />
        <OneTap f={f} />
        <Capsule f={f} dark={darkEnd} />
        <Stroke f={f} />
        <EndTitle f={f} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
