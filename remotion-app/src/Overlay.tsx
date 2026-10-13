import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { SANS, SERIF } from "./fonts";
import { EASE_IN, presence, travel } from "./motion";

// Beat timings in seconds. Converted with the composition's fps so they stay
// correct at any frame rate. CARD_LANDS is shared with the audio layer so the
// sound lands on the exact frame the card settles.
export const BEATS = {
  kickerIn: [0.15, 0.6],
  line1In: [0.25, 0.85],
  accentIn: [0.5, 1.1],
  cardIn: [0.8, 1.3],
  progress: [1.4, 3.4],
  cardOut: [4.1, 4.6],
  textOut: [4.2, 4.8],
} as const;
export const CARD_LANDS = BEATS.cardIn[1];

const ACCENT_BLUE = "#4C8DFF";
const AMBER = "#F6C98B";
const CREAM = "#F4EFE6";

const f = (seconds: number, fps: number) => Math.round(seconds * fps);

/**
 * Transparent overlay layer: no background is painted, so it can sit over
 * footage (FootageComposite), over a plain background (TestComposition), or
 * be rendered on its own with alpha (Overlay composition, ProRes 4444).
 */
export const Overlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  const textOut = [f(BEATS.textOut[0], fps), f(BEATS.textOut[1], fps)] as const;
  const kicker = presence(frame, f(BEATS.kickerIn[0], fps), f(BEATS.kickerIn[1], fps), ...textOut);
  const line1 = presence(frame, f(BEATS.line1In[0], fps), f(BEATS.line1In[1], fps), ...textOut);
  const accent = presence(frame, f(BEATS.accentIn[0], fps), f(BEATS.accentIn[1], fps), ...textOut);
  const line1Travel = travel(frame, f(BEATS.line1In[0], fps), f(BEATS.line1In[1], fps), ...textOut);
  const accentTravel = travel(frame, f(BEATS.accentIn[0], fps), f(BEATS.accentIn[1], fps), ...textOut);

  const cardTiming = [
    f(BEATS.cardIn[0], fps),
    f(BEATS.cardIn[1], fps),
    f(BEATS.cardOut[0], fps),
    f(BEATS.cardOut[1], fps),
  ] as const;
  const card = presence(frame, ...cardTiming);
  const cardTravel = travel(frame, ...cardTiming);

  // Gentle float once the card has landed: eased in so there is no jump.
  const floatAmount = interpolate(frame, [cardTiming[1], cardTiming[1] + f(0.6, fps)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const floatY = Math.sin(((frame - cardTiming[1]) / fps) * ((2 * Math.PI) / 2.4)) * 10 * floatAmount;
  const floatTilt = Math.sin(((frame - cardTiming[1]) / fps) * ((2 * Math.PI) / 3.6)) * 0.6 * floatAmount;

  const progress = interpolate(frame, [f(BEATS.progress[0], fps), f(BEATS.progress[1], fps)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_IN,
  });
  const framesShown = Math.round(progress * durationInFrames);

  return (
    <AbsoluteFill style={{ fontFamily: SANS, color: CREAM }}>
      {/* Typography: quiet sans + one expressive italic serif word */}
      <AbsoluteFill style={{ top: 560, height: 520, alignItems: "center" }}>
        <div
          style={{
            opacity: kicker,
            fontWeight: 600,
            fontSize: 30,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "rgba(244,239,230,0.72)",
            translate: `0px ${(1 - kicker) * 16}px`,
          }}
        >
          Remotion · render test
        </div>
        <div
          style={{
            marginTop: 34,
            opacity: line1,
            fontWeight: 600,
            fontSize: 92,
            letterSpacing: "-0.02em",
            translate: `0px ${line1Travel * 48}px`,
            filter: `blur(${(1 - line1) * 14}px)`,
            textShadow: "0 0 40px rgba(244,239,230,0.18)",
          }}
        >
          Every frame,
        </div>
        <div
          style={{
            marginTop: -18,
            opacity: accent,
            fontFamily: SERIF,
            fontStyle: "italic",
            fontSize: 210,
            lineHeight: 1,
            color: AMBER,
            translate: `0px ${accentTravel * 56}px`,
            scale: interpolate(accent, [0, 1], [0.92, 1]),
            filter: `blur(${(1 - accent) * 18}px)`,
            textShadow: "0 0 60px rgba(246,201,139,0.35)",
          }}
        >
          on cue.
        </div>
      </AbsoluteFill>

      {/* Floating interface card */}
      <AbsoluteFill style={{ top: 1140, alignItems: "center" }}>
        <div
          style={{
            width: 760,
            padding: "40px 44px",
            borderRadius: 36,
            background: "linear-gradient(160deg, rgba(30,36,48,0.86), rgba(14,17,24,0.86))",
            border: "1px solid rgba(255,255,255,0.09)",
            boxShadow: `0 40px 90px rgba(0,0,0,0.45), 0 0 0 1px rgba(76,141,255,${0.12 * card}) inset`,
            opacity: card,
            translate: `0px ${cardTravel * 140 + floatY}px`,
            rotate: `${floatTilt}deg`,
            scale: interpolate(card, [0, 1], [0.96, 1]),
            filter: `blur(${(1 - card) * 16}px)`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontWeight: 700, fontSize: 38 }}>Render check</div>
            <div
              style={{
                fontWeight: 600,
                fontSize: 24,
                letterSpacing: "0.08em",
                color: ACCENT_BLUE,
                padding: "8px 18px",
                borderRadius: 999,
                background: "rgba(76,141,255,0.14)",
              }}
            >
              LIVE
            </div>
          </div>
          {[
            ["Canvas", `${width} × ${height}`],
            ["Frame rate", `${fps} fps`],
            ["Codec", "H.264 · MP4"],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 26,
                fontSize: 30,
                fontWeight: 500,
              }}
            >
              <span style={{ color: "rgba(244,239,230,0.6)" }}>{label}</span>
              <span style={{ fontWeight: 600 }}>{value}</span>
            </div>
          ))}
          <div style={{ marginTop: 36, height: 12, borderRadius: 999, background: "rgba(255,255,255,0.08)" }}>
            <div
              style={{
                width: `${progress * 100}%`,
                height: "100%",
                borderRadius: 999,
                background: ACCENT_BLUE,
                boxShadow: "0 0 24px rgba(76,141,255,0.6)",
              }}
            />
          </div>
          <div
            style={{
              marginTop: 16,
              fontSize: 24,
              fontWeight: 600,
              color: "rgba(244,239,230,0.6)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {framesShown} / {durationInFrames} frames
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
