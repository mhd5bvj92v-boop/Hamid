import React from "react";
import { AbsoluteFill, useCurrentFrame} from "remotion";
import { useCanvas } from "../style";
import { MONO, PLAYFAIR, SANS, SERIF } from "../../fonts";
import { COLORS } from "../tokens";
import { HalfPanelProps, halfDefaults, halfRowPose, panelPose } from "./halfPanel.timing";

const FONT = { "Instrument Serif": SERIF, "Playfair Display": PLAYFAIR, "JetBrains Mono": MONO, Montserrat: SANS } as const;

/** Halfscreen: a panel fills the lower half; the speaker stays visible above it. */
export const HalfPanel: React.FC<HalfPanelProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, height } = useCanvas();
  const t = frame / fps;
  const d = halfDefaults(p);
  const { slide } = panelPose(t, p);
  const panelH = (1 - d.top) * height;
  const parts = p.accent && p.headline.includes(p.accent) ? p.headline.split(p.accent) : [p.headline];

  return (
    <AbsoluteFill style={{ fontFamily: SANS, color: COLORS.ink }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: d.top * height,
          height: panelH,
          translate: `0px ${(1 - slide) * (panelH + 40)}px`,
          background: d.background,
          borderTop: `2px solid ${d.accentColor}`,
          boxShadow: `0 -20px 60px rgba(0,0,0,.55), 0 -1px 24px ${d.accentColor}55`,
          padding: "70px 76px",
          display: "flex",
          flexDirection: "column",
          gap: 26,
        }}
      >
        {p.kicker ? <div style={{ fontWeight: 600, fontSize: 28, letterSpacing: 6, textTransform: "uppercase", color: COLORS.ink2 }}>{p.kicker}</div> : null}
        <div style={{ fontWeight: 700, fontSize: 86, lineHeight: 1.05, letterSpacing: -1 }}>
          {parts.length === 2 ? (
            <>
              {parts[0]}
              <span style={{ fontFamily: FONT[d.accentFont], fontStyle: d.accentFont === "JetBrains Mono" || d.accentFont === "Montserrat" ? "normal" : "italic", fontWeight: d.accentFont === "Montserrat" ? 800 : 500, color: d.accentColor }}>
                {p.accent}
              </span>
              {parts[1]}
            </>
          ) : (
            p.headline
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 10 }}>
          {(p.rows ?? []).slice(0, 4).map((r, i) => {
            const rp = halfRowPose(t, i, p);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 20, opacity: rp.opacity, translate: `${rp.dx}px 0px`, fontSize: 38, fontWeight: 500 }}>
                <span style={{ width: 40, height: 40, borderRadius: 99, background: `${d.accentColor}26`, border: `2px solid ${d.accentColor}`, display: "grid", placeItems: "center", fontSize: 22, color: d.accentColor, flex: "none" }}>✓</span>
                {r}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
