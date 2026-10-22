import React from "react";
import { COPY } from "../data/copy";
import { C, EASE, FONT, SPRING } from "../theme";
import { sp, tween } from "../lib/anim";

/** Scene 1 headline: two lines, word-masked rise, readable ~1.3 s, fast exit. */
export const S1Headline: React.FC<{ f: number }> = ({ f }) => {
  if (f > 170) return null;
  const out = tween(f, 128, 150, EASE.exit);
  let w = 0;
  return (
    <div style={{ position: "absolute", left: 130, top: 418, fontFamily: FONT, color: C.ink }}>
      {COPY.headline.map((line, li) => (
        <div key={li} style={{ display: "flex", gap: 16, fontSize: 62, fontWeight: 600, letterSpacing: -2, lineHeight: 1.08 }}>
          {line.split(" ").map((word) => {
            const p = sp(f, 18 + w++ * 3, SPRING.ui);
            const accent = word === COPY.headlineAccent;
            return (
              <span key={word} style={{ display: "inline-block", overflow: "hidden", paddingBottom: 8, marginBottom: -8 }}>
                <span
                  style={{
                    display: "inline-block",
                    transform: `translateY(${(1 - p) * 84 - out * 40}px)`,
                    opacity: Math.min(1, p * 1.5) * (1 - out),
                    color: accent ? C.deep : undefined,
                  }}
                >
                  {word}
                </span>
              </span>
            );
          })}
        </div>
      ))}
      <div style={{ marginTop: 26, display: "flex", alignItems: "center", gap: 10, opacity: tween(f, 40, 56) * (1 - out), fontSize: 18, fontWeight: 500, color: C.mute }}>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: C.orange }} />
        A contactless moment, frame by frame
      </div>
    </div>
  );
};
