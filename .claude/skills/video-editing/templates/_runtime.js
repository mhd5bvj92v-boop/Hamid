/* Deterministic animation runtime shared by all templates.
 *
 * A template defines:
 *   window.DEFAULT_CONFIG = {...}            // used when no config is injected
 *   window.setup(cfg)                        // build DOM once
 *   window.renderFrame(t, cfg)               // pose every element for time t (seconds)
 *   window.duration(cfg) -> seconds
 * The renderer (scripts/render_html.js) injects window.VV_CONFIG and calls
 * renderFrame(t) for each frame, so output is frame-exact and repeatable.
 * Opening a template directly in a browser plays it in real time (preview).
 */
(function () {
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const E = {
    linear: (x) => x,
    outCubic: (x) => 1 - Math.pow(1 - x, 3),
    outQuart: (x) => 1 - Math.pow(1 - x, 4),
    outQuint: (x) => 1 - Math.pow(1 - x, 5),
    outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    inCubic: (x) => x * x * x,
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
    // gentle "settle" with no visible bounce: overshoot capped at ~1.5%
    settle: (x) => { const c = 1.05; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
  };
  /** 0..1 progress of a window [start, start+dur] with easing. */
  const prog = (t, start, dur, ease = 'outCubic') => (E[ease] || E.outCubic)(clamp((t - start) / Math.max(dur, 1e-6)));
  const lerp = (a, b, p) => a + (b - a) * p;
  /** Enter/hold/exit envelope -> 0..1 (for opacity etc). */
  const envelope = (t, inAt, inDur, outAt, outDur, easeIn = 'outCubic', easeOut = 'inCubic') =>
    t < outAt ? prog(t, inAt, inDur, easeIn) : 1 - (E[easeOut] || E.inCubic)(clamp((t - outAt) / Math.max(outDur, 1e-6)));
  /** Standard premium entrance: fade + rise + de-blur + slight scale. */
  function enter(el, p, { rise = 14, blur = 8, scale = 0.97 } = {}) {
    el.style.opacity = p;
    el.style.transform = `translateY(${(1 - p) * rise}px) scale(${lerp(scale, 1, p)})`;
    el.style.filter = blur ? `blur(${(1 - p) * blur}px)` : '';
  }
  const fmtNumber = (v, { decimals = 0, prefix = '', suffix = '' } = {}) =>
    prefix + Number(v).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
  function cfg() {
    const base = JSON.parse(JSON.stringify(window.DEFAULT_CONFIG || {}));
    return Object.assign(base, window.VV_CONFIG || {});
  }
  window.VV = { E, prog, lerp, clamp, envelope, enter, fmtNumber, cfg };

  window.addEventListener('DOMContentLoaded', async () => {
    const c = cfg();
    document.documentElement.style.setProperty('--w', (c.width || 1080) + 'px');
    document.documentElement.style.setProperty('--h', (c.height || 1920) + 'px');
    if (c.previewBackground) {
      document.body.style.background = `center / cover no-repeat url("${c.previewBackground}")`;
    }
    window.setup && window.setup(c);
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    window.renderFrame && window.renderFrame(0, c);
    window.VV_READY = true;
    if (!window.VV_RENDER) {               // live preview in a normal browser
      const t0 = performance.now(), D = window.duration ? window.duration(c) : 4;
      const loop = () => { const t = ((performance.now() - t0) / 1000) % (D + 0.8); window.renderFrame(t, c); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    }
  });
})();
