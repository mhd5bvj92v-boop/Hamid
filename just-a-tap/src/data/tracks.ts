// Global hero geometry. Every hero object reads its state from the global
// frame here, so scene boundaries never re-mount or pop anything.
import { EASE, SPRING } from "../theme";
import { Pt, Rect, lerp, lerpRect, quad, sp, track, tween } from "../lib/anim";

export const PANEL: Rect = { x: 1230, y: 548, w: 700, h: 820, r: 30 };
export const PHONE: Rect = { x: 760, y: 540, w: 404, h: 840, r: 62 };
export const TERM: Rect = { x: 1360, y: 540, w: 500, h: 700, r: 44 };
export const GAP: Pt = [1068, 600]; // between phone and terminal: NFC centre

/** World camera. */
export const camera = (f: number) => ({
  x: track(f, [[0, 0], [150, 0], [216, 170], [300, 190], [396, -96], [600, -96], [660, 0], [1200, 0]], EASE.camera),
  s: track(f, [[0, 1], [150, 1.022], [216, 1.03], [300, 1.0], [440, 0.95], [600, 0.955], [660, 1.0], [890, 1.02], [1050, 1.0], [1199, 1.015]], EASE.camera),
});

/** Panel ↔ phone morph progress. */
export const morphAt = (f: number) => tween(f, 158, 206, EASE.morph);

/** The shell (panel → phone) rect, rotation, opacity and scale at frame f. */
export const shellAt = (f: number) => {
  const m = morphAt(f);
  const rect = lerpRect(PANEL, PHONE, m);
  const enter = sp(f, 4, SPRING.ui);
  rect.y += (1 - enter) * 90;
  // scene 3: shallow bezier glide towards the terminal
  const g = tween(f, 322, 400, EASE.inOut);
  const [gx, gy] = quad([0, 0], [40, -36], [60, 16], g);
  rect.x += gx;
  rect.y += gy;
  let rot = -4 * g;
  // scene 5: exit left
  const out = tween(f, 600, 636, EASE.exit);
  rect.x -= 300 * out;
  rot -= 3 * out;
  return { rect, m, rot, opacity: Math.min(1, f / 14) * (1 - out), scale: 1 - 0.08 * out };
};

/** Card rect in shell-local coordinates (origin = shell top-left). */
export const cardLocal = (f: number, m: number) => {
  const a = { x: 350, y: 291, w: 620 };
  const b = { x: 202, y: 222, w: 344 };
  const e = sp(f, 14, SPRING.settle);
  return {
    x: lerp(a.x, b.x, m) + (1 - e) * 300,
    y: lerp(a.y, b.y, m) + (1 - e) * 26,
    w: lerp(a.w, b.w, m),
    rot: (1 - e) * 7,
    opacity: Math.min(1, Math.max(0, (f - 12) / 10)),
  };
};

/** Phone-local centre of the READY TO PAY glyph. */
export const PHONE_GLYPH: Pt = [62, 424];

/** Map a shell-local point to world space. */
export const shellToWorld = (f: number, p: Pt): Pt => {
  const s = shellAt(f);
  const dx = (p[0] - s.rect.w / 2) * s.scale;
  const dy = (p[1] - s.rect.h / 2) * s.scale;
  const a = (s.rot * Math.PI) / 180;
  return [s.rect.x + dx * Math.cos(a) - dy * Math.sin(a), s.rect.y + dx * Math.sin(a) + dy * Math.cos(a)];
};

/** Terminal: springs in from the right in scene 3, leaves in scene 5. */
export const termAt = (f: number) => {
  const e = sp(f, 306, SPRING.settle);
  const out = tween(f, 604, 640, EASE.exit);
  return { x: TERM.x + (1 - e) * 760 + out * 320, y: TERM.y, opacity: Math.min(1, Math.max(0, (f - 306) / 8)) * (1 - out), scale: 1 - 0.08 * out, rot: (1 - e) * 4 };
};

/** World → screen (camera: translateX then scale about the centre). */
export const toScreen = (f: number, p: Pt): Pt => {
  const c = camera(f);
  return [960 + c.s * (p[0] - 960) + c.x, 540 + c.s * (p[1] - 540)];
};

/** Status rail (scene 4) in world space; it becomes the confirmation panel. */
export const RAIL = { x: 1360, y: 974, w: 460, h: 6 };
/** Confirmation panel (scene 5), world space. */
export const CONFIRM: Rect = { x: 960, y: 532, w: 720, h: 740, r: 30 };

/** Phone / terminal state machine for scene 4. */
export const phoneStateAt = (f: number) => (f < 500 ? 0 : f < 578 ? 1 : 2);
export const termStateAt = (f: number) => (f < 486 ? 0 : f < 578 ? 1 : 2);
