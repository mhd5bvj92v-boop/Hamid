import React from "react";
import { AbsoluteFill, useCurrentFrame} from "remotion";
import { useCanvas } from "../style";
import { SANS } from "../../fonts";
import { AssetMedia } from "../Asset";
import { enterStyle } from "../motion";
import { AssetSceneProps, assetDefaults, assetPose } from "./assetScene.timing";

/** System C full-screen: the user's 3D asset staged like a product shot. Opaque cover; the footage keeps running underneath. */
export const AssetScene: React.FC<AssetSceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useCanvas();
  const t = frame / fps;
  const d = assetDefaults(p);
  const pose = assetPose(t, p);
  const h = H * d.size;
  const cy = H * (d.y + pose.dy);

  const stage =
    d.look === "aurora"
      ? `radial-gradient(110% 70% at 50% 30%, ${d.accent}AA 0%, ${d.accent}44 35%, #070B1F 70%, #02030A 100%)`
      : d.look === "studio"
        ? `linear-gradient(180deg, #11141C 0%, #07080C 58%, #15171E 58.2%, #050608 100%)`
        : "#020307";

  const media: React.CSSProperties = { height: h, width: "auto", maxWidth: W * 0.92, objectFit: "contain", display: "block" };

  return (
    <AbsoluteFill style={{ background: stage, overflow: "hidden", opacity: pose.scene, fontFamily: SANS }}>
      <AbsoluteFill style={{ scale: String(pose.push) }}>
        {/* spotlight from above + accent glow behind the asset */}
        <AbsoluteFill style={{ background: `radial-gradient(38% 30% at 50% ${d.y * 100 - 18}%, rgba(255,255,255,${0.1 * pose.glow}), transparent 70%)` }} />
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: cy,
            width: h * 1.25,
            height: h * 1.25,
            translate: "-50% -50%",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${d.accent}${Math.round(Math.min(1, 0.55 * pose.glow) * 255).toString(16).padStart(2, "0")} 0%, transparent 65%)`,
            filter: "blur(40px)",
          }}
        />
        {/* contact shadow */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: H * (d.y + 0.5 * d.size + 0.01),
            width: h * 0.7,
            height: h * 0.07,
            translate: "-50% -50%",
            borderRadius: "50%",
            background: "rgba(0,0,0,.75)",
            filter: "blur(18px)",
            opacity: 0.8 * pose.shadow,
          }}
        />
        {d.reflection ? (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: H * (d.y + 0.5 * d.size) + h * 0.5 + (cy - H * d.y),
              translate: "-50% -50%",
              scale: `${pose.scale} ${-pose.scale}`,
              opacity: 0.16 * pose.asset,
              filter: `blur(${2 + pose.blur}px)`,
              maskImage: "linear-gradient(to top, black 0%, transparent 55%)",
              WebkitMaskImage: "linear-gradient(to top, black 0%, transparent 55%)",
            }}
          >
            <AssetMedia src={p.asset} style={media} />
          </div>
        ) : null}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: cy,
            translate: "-50% -50%",
            scale: String(pose.scale),
            rotate: `${pose.rot}deg`,
            opacity: pose.asset,
            filter: `blur(${pose.blur}px) drop-shadow(0 30px 60px rgba(0,0,0,.55))`,
          }}
        >
          <AssetMedia src={p.asset} style={media} />
        </div>
      </AbsoluteFill>

      {p.kicker ? (
        <div style={{ position: "absolute", top: H * 0.1, width: "100%", textAlign: "center", color: d.accent, fontWeight: 600, fontSize: 34, letterSpacing: "0.32em", textTransform: "uppercase", ...enterStyle(pose.kicker) }}>
          {p.kicker}
        </div>
      ) : null}
      {p.headline?.length ? (
        <div style={{ position: "absolute", left: W * 0.08, right: W * 0.08, top: H * (d.y + 0.5 * d.size + 0.07), textAlign: "center" }}>
          {p.headline.map((line, i) => (
            <div
              key={i}
              style={{
                color: i === d.accentLine ? d.accent : "#FFFFFF",
                fontWeight: i === d.accentLine ? 800 : 300,
                fontSize: i === d.accentLine ? 96 : 70,
                lineHeight: 1.08,
                letterSpacing: "-0.02em",
                textShadow: i === d.accentLine ? `0 0 40px ${d.accent}66` : undefined,
                ...enterStyle(pose.lines[i], { rise: 26, blur: 10 }),
              }}
            >
              {line}
            </div>
          ))}
        </div>
      ) : null}
      {/* vignette */}
      <AbsoluteFill style={{ background: "radial-gradient(120% 90% at 50% 45%, transparent 55%, rgba(0,0,0,.65) 100%)", pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};
