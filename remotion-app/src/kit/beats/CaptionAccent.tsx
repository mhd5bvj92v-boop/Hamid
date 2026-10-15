import React from "react";
import { AbsoluteFill, useCurrentFrame} from "remotion";
import { useCanvas } from "../style";
import { SANS } from "../../fonts";
import { lerp } from "../motion";
import { COLORS } from "../tokens";
import {
  CaptionAccentProps,
  CaptionLineStyle,
  captionWordPose,
  captionWords,
  isHeavy,
  nameSuperPose,
} from "./captionAccent.timing";

// Line styles at 1080 px width (1rem = 10px in the HTML template).
const lineStyle = (
  s: CaptionLineStyle,
  serif: string,
  c: Required<NonNullable<CaptionAccentProps["colors"]>>,
): React.CSSProperties => {
  switch (s) {
    case "sans":
      return {
        fontFamily: SANS,
        fontWeight: 600,
        fontSize: 56,
        lineHeight: 1,
        color: c.text,
        letterSpacing: "-0.01em",
        textShadow: "0 2px 16px rgba(0,0,0,.45)",
      };
    case "sans-sm":
      return {
        fontFamily: SANS,
        fontWeight: 500,
        fontSize: 44,
        lineHeight: 1,
        color: c.text,
        letterSpacing: "-0.01em",
        textShadow: "0 2px 14px rgba(0,0,0,.45)",
      };
    case "serif":
      return {
        fontFamily: serif,
        fontStyle: "italic",
        fontWeight: serif === "Playfair Display" ? 600 : 400,
        fontSize: 160,
        lineHeight: 0.84,
        color: c.accent,
        letterSpacing: "-0.035em",
        textShadow: `0 0 30px ${c.glow}, 0 3px 12px rgba(0,0,0,.35)`,
        fontVariantNumeric: "lining-nums",
      };
    case "script":
      return {
        fontFamily: serif,
        fontStyle: "italic",
        fontWeight: 500,
        fontSize: 105,
        lineHeight: 0.86,
        color: c.script,
        textShadow:
          "0 0 20px rgba(243,230,196,.25), 0 3px 12px rgba(0,0,0,.35)",
      };
    case "bold":
      return {
        fontFamily: SANS,
        fontWeight: 800,
        fontSize: 90,
        lineHeight: 0.9,
        letterSpacing: "-0.03em",
        backgroundImage: c.boldFill,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        filter: `drop-shadow(0 0 18px ${c.glow})`,
      };
    case "tracked":
      return {
        fontFamily: SANS,
        fontWeight: 300,
        fontSize: 30,
        lineHeight: 1.2,
        color: c.text,
        opacity: 0.7,
        textTransform: "uppercase",
      };
    case "micro":
      return {
        fontFamily: SANS,
        fontWeight: 600,
        fontSize: 22,
        lineHeight: 1,
        color: c.text,
        textTransform: "uppercase",
        display: "flex",
        justifyContent: "space-between",
        alignSelf: "stretch",
      };
  }
};

/** System B: designed caption (TXT-001..TXT-009). Times are seconds from the beat start. */
export const CaptionAccent: React.FC<CaptionAccentProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useCanvas();
  const t = frame / fps;
  const c = {
    text: COLORS.ink,
    accent: COLORS.amber,
    glow: COLORS.amberGlow,
    script: COLORS.cream,
    boldFill: "linear-gradient(180deg,#FFF6D8,#F7D774)",
    ...p.colors,
  };
  const serif = p.serifFont ?? "Playfair Display";
  const anchor = p.anchor ?? { x: 0.5, y: 0.58 };
  const left = p.align === "left";
  const words = captionWords(p);

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: anchor.x * width,
          top: anchor.y * height,
          translate: left ? "0 -50%" : "-50% -50%",
          display: "flex",
          flexDirection: "column",
          alignItems: left ? "flex-start" : "center",
          textAlign: left ? "left" : "center",
        }}
      >
        {p.lines.map((ln, i) => {
          const heavy = isHeavy(ln.style);
          const k0 = captionWordPose(t, words[i][0].at, ln.style, p).k;
          return (
            <div
              key={i}
              style={{
                whiteSpace: "nowrap",
                marginTop: i === 0 ? 0 : heavy ? "-0.06em" : "-0.12em",
                ...lineStyle(ln.style, serif, c),
                letterSpacing:
                  ln.style === "tracked"
                    ? `${lerp(0.55, 0.3, k0)}em`
                    : ln.style === "micro"
                      ? `${lerp(0.3, 0.05, k0)}em`
                      : lineStyle(ln.style, serif, c).letterSpacing,
              }}
            >
              {words[i].map((wd, k) => {
                const pose = captionWordPose(t, wd.at, ln.style, p);
                return (
                  <React.Fragment key={k}>
                    <span
                      style={{
                        display: "inline-block",
                        opacity: pose.opacity,
                        translate: `0px ${pose.rise}px`,
                        scale: String(pose.scale),
                        filter: `blur(${pose.blur}px)`,
                        transformOrigin: heavy ? "50% 60%" : undefined,
                      }}
                    >
                      {wd.w}
                    </span>
                    {k < words[i].length - 1 && ln.style !== "micro"
                      ? " "
                      : null}
                  </React.Fragment>
                );
              })}
            </div>
          );
        })}
      </div>
      {p.nameSuper ? <NameSuper n={p.nameSuper} t={t} serif={serif} /> : null}
    </AbsoluteFill>
  );
};

const NameSuper: React.FC<{
  n: NonNullable<CaptionAccentProps["nameSuper"]>;
  t: number;
  serif: string;
}> = ({ n, t, serif }) => {
  const { width, height } = useCanvas();
  const pose = nameSuperPose(t, n);
  const style = n.style ?? "plain";
  return (
    <div
      style={{
        position: "absolute",
        left: (n.x ?? 0.06) * width,
        top: (n.y ?? 0.88) * height,
        color: "#fff",
        opacity: pose.opacity,
        translate: `${pose.x}px 0px`,
      }}
    >
      <div
        style={{
          fontFamily: style === "serif" ? serif : SANS,
          fontStyle: style === "serif" ? "italic" : undefined,
          fontWeight: style === "serif" ? 400 : 500,
          fontSize: style === "serif" ? 40 : 34,
          lineHeight: 1.1,
          display: "inline-block",
          ...(style === "boxed"
            ? {
                padding: "4px 10px",
                border: "1.5px solid rgba(255,255,255,.85)",
                borderRadius: 5,
              }
            : {}),
          ...(style === "highlight"
            ? {
                padding: "3px 10px",
                background: "#fff",
                color: "#111",
                borderRadius: 3,
              }
            : {}),
        }}
      >
        {n.name}
      </div>
      {style === "serif" ? (
        <div
          style={{
            height: 1.5,
            width: 60,
            background: "rgba(255,255,255,.7)",
            margin: "8px 0",
            transformOrigin: "left",
            scale: `${pose.rule} 1`,
          }}
        />
      ) : null}
      {n.role ? (
        <div
          style={{
            fontFamily: SANS,
            fontWeight: 400,
            fontSize: 22,
            lineHeight: 1.3,
            opacity: 0.75,
          }}
        >
          {n.role}
        </div>
      ) : null}
    </div>
  );
};
