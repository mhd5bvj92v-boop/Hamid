import React from "react";
import { AbsoluteFill, useCurrentFrame} from "remotion";
import { useCanvas } from "../style";
import { MONO } from "../../fonts";
import { LockdownTitleProps, lockDefaults, lockPose } from "./lockdownTitle.timing";

/** Deterministic pseudo-random in [0,1) for the glitch slices. */
const rnd = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const Padlock: React.FC<{ color: string; snapK: number }> = ({ color, snapK }) => (
  <svg width={150} height={190} viewBox="0 0 150 190">
    {/* shackle: raised 34 px while open, drops into the body when it snaps shut */}
    <path d="M38 92 V62 a37 37 0 0 1 74 0 V92" fill="none" stroke={color} strokeWidth={16} strokeLinecap="round" transform={`translate(0 ${-34 * (1 - snapK)})`} />
    <rect x={14} y={88} width={122} height={96} rx={18} fill={color} />
    <circle cx={75} cy={128} r={12} fill="#000" />
    <rect x={69} y={132} width={12} height={28} rx={5} fill="#000" />
  </svg>
);

/** System C: black screen, typed red monospace title, padlock snap, glitch-cut back to the speaker. */
export const LockdownTitle: React.FC<LockdownTitleProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useCanvas();
  const t = frame / fps;
  const d = lockDefaults(p);
  const pose = lockPose(t, p, fps);

  const content = (
    <AbsoluteFill style={{ backgroundColor: "#000", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 70 }}>
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 126, letterSpacing: 0, color: d.color, textShadow: `0 0 28px ${d.color}88`, whiteSpace: "pre" }}>
        {p.text.slice(0, pose.shown)}
        <span style={{ opacity: pose.cursorOn ? 1 : 0 }}>▌</span>
        {/* keep the line centred on the full text while typing */}
        <span style={{ visibility: "hidden" }}>{p.text.slice(pose.shown)}</span>
      </div>
      <div style={{ opacity: pose.lockIn, translate: `0px ${(1 - pose.lockIn) * 20}px`, scale: `1 ${pose.squash}`, filter: `drop-shadow(0 0 24px ${d.color}66)` }}>
        <Padlock color={d.color} snapK={pose.snapK} />
      </div>
    </AbsoluteFill>
  );

  if (!pose.glitching) return content;
  // glitch: 8 horizontal slices jump sideways for a few frames, then the scene ends (hard cut)
  const slices = 8;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {Array.from({ length: slices }, (_, i) => {
        const shift = (rnd(i * 7 + pose.glitchFrame * 31) - 0.5) * 260;
        return (
          <AbsoluteFill key={i} style={{ clipPath: `inset(${(i / slices) * 100}% 0 ${100 - ((i + 1) / slices) * 100}% 0)`, translate: `${shift}px 0px` }}>
            {content}
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
