import React, { useState } from "react";
import type { EditDoc, MotionSettings } from "../../src/kit/project";
import { MOTION_DEFAULTS } from "../../src/kit/project";
import { mergeMotion } from "../../src/kit/style";
import { MOTION_BLUR } from "../../src/kit/motionBlur";

type Key = "softness" | "bounce" | "glow" | "blur";
const SLIDERS: { k: Key; label: string; lo: string; hi: string }[] = [
  { k: "softness", label: "Softness", lo: "crisp", hi: "soft" },
  { k: "bounce", label: "Bounce", lo: "none", hi: "clear settle" },
  { k: "glow", label: "Glow", lo: "off", hi: "double" },
  { k: "blur", label: "Blur in/out", lo: "sharp", hi: "strong" },
];

/**
 * Motion controls for a scene or the whole project (constants.motion / constants.sceneMotion in edit.json).
 * Softness and bounce shape the curves inside the authored timing, so events and sound sync never move.
 */
export const MotionControls: React.FC<{ doc: EditDoc; segId: string | null; setDoc: (d: EditDoc) => void }> = ({ doc, segId, setDoc }) => {
  const [scope, setScope] = useState<"scene" | "project">(segId ? "scene" : "project");
  const c = doc.constants ?? ({} as NonNullable<EditDoc["constants"]>);
  const scene = (segId && c.sceneMotion?.[segId]) || {};
  const eff = mergeMotion(c.motion, segId ? scene : null);
  const set = (patch: MotionSettings) => {
    const constants = { ...c } as NonNullable<EditDoc["constants"]>;
    if (scope === "scene" && segId) constants.sceneMotion = { ...(c.sceneMotion ?? {}), [segId]: { ...scene, ...patch } };
    else constants.motion = { ...(c.motion ?? {}), ...patch };
    setDoc({ ...doc, constants });
  };
  const resetScene = () => {
    if (!segId) return;
    const rest = { ...(c.sceneMotion ?? {}) };
    delete rest[segId];
    setDoc({ ...doc, constants: { ...c, sceneMotion: rest } });
  };
  const overridden = (k: keyof MotionSettings) => segId && scene[k] !== undefined;
  const val = (k: Key) => (scope === "scene" ? eff[k] : (c.motion?.[k] ?? MOTION_DEFAULTS[k]));

  return (
    <div className="motion-controls" data-testid="motion-controls">
      <div className="row small">
        <b>Motion</b>
        <span className="seg-toggle">
          <button className={`chip${scope === "scene" ? " active" : ""}`} disabled={!segId} onClick={() => setScope("scene")} data-testid="motion-scope-scene">
            this scene
          </button>
          <button className={`chip${scope === "project" ? " active" : ""}`} onClick={() => setScope("project")} data-testid="motion-scope-project">
            whole project
          </button>
        </span>
        {segId && Object.keys(scene).length ? (
          <button className="ghost small" onClick={resetScene} data-testid="motion-reset" title="remove this scene's overrides: it follows the project again">
            reset to project
          </button>
        ) : null}
      </div>
      <label className="field">
        <span>enters from {scope === "scene" && overridden("direction") ? <i className="badge">scene</i> : null}</span>
        <select value={(scope === "scene" ? eff.direction : (c.motion?.direction ?? MOTION_DEFAULTS.direction)) as string} onChange={(e) => set({ direction: e.target.value as MotionSettings["direction"] })} data-testid="motion-direction">
          <option value="right">right (leaves left)</option>
          <option value="left">left (leaves right)</option>
          <option value="bottom">bottom (leaves up)</option>
          <option value="top">top (leaves down)</option>
        </select>
      </label>
      {SLIDERS.map((s) => (
        <label key={s.k} className="field slider">
          <span>
            {s.label} {scope === "scene" && overridden(s.k) ? <i className="badge">scene</i> : null}
          </span>
          <span className="muted small">{s.lo}</span>
          <input type="range" min={0} max={1} step={0.05} value={val(s.k)} onChange={(e) => set({ [s.k]: Number(e.target.value) })} data-testid={`motion-${s.k}`} />
          <span className="muted small">{s.hi}</span>
        </label>
      ))}
      <label className="field check">
        <input type="checkbox" checked={Boolean(scope === "scene" ? eff.morph : (c.motion?.morph ?? MOTION_DEFAULTS.morph))} onChange={(e) => set({ morph: e.target.checked })} data-testid="motion-morph" />
        <span>
          Shape morph {scope === "scene" && overridden("morph") ? <i className="badge">scene</i> : null}
        </span>
        <span className="muted small">status icons fold into their new shape (ring to check, dot to arrow); off = a clean crossfade. Cheap to render.</span>
      </label>
      <label className="field">
        <span>Motion blur {scope === "scene" && overridden("motionBlur") ? <i className="badge">scene</i> : null}</span>
        <select value={(scope === "scene" ? eff.motionBlur : (c.motion?.motionBlur ?? MOTION_DEFAULTS.motionBlur)) as string} onChange={(e) => set({ motionBlur: e.target.value as MotionSettings["motionBlur"] })} data-testid="motion-blur-mode">
          <option value="off">off (no extra render cost)</option>
          <option value="light">light</option>
          <option value="strong">strong</option>
        </select>
      </label>
      {(() => {
        const mb = (scope === "scene" ? eff.motionBlur : (c.motion?.motionBlur ?? "off")) as MotionSettings["motionBlur"];
        return mb && mb !== "off" ? (
          <p className="muted small" data-testid="motion-blur-note">
            Motion blur {mb}: {MOTION_BLUR[mb].note}. Only cards in motion; skipped in draft previews.
          </p>
        ) : null;
      })()}
      <p className="muted small">
        {scope === "scene" ? "Changes apply to this scene only (badge = overrides the project)." : "Changes apply to every scene without its own override."} Timing and sound sync never change.
      </p>
    </div>
  );
};
