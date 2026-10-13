#!/usr/bin/env node
/* Render an animated HTML template to a transparent PNG sequence (frame-exact).
 *
 *   node scripts/render_html.js --html templates/stat-card.html --config my.json \
 *        --out work/statcard --fps 30 [--duration 4] [--width 1080 --height 1920]
 *   node scripts/render_html.js --html ... --still 1.2 --out work/preview.png   # one frame
 *   add --bg path/to/frame.png to render over a still for previews (output then opaque)
 *
 * Sound design (System D) analysis - measures what actually moves, frame by frame:
 *   --motion work/sound/NN_motion.json   per-element kinematics + MOVEMENT/EVENT candidates
 *                                        (fastest frame of each move, frame each element appears)
 *   --cues   work/sound/NN_cues.json     the template's declared sound intents (window.sfxCues),
 *                                        with times resolved from the measured motion
 *   --analyze-only                       skip screenshots (fast; use with --motion/--cues)
 *   --track ".anim,.planet"              CSS selectors to measure (default: template SFX_TRACK or .anim)
 *
 * Requires Playwright + Chromium. Resolution order: local node_modules, global npm root.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function loadPlaywright() {
  const tries = ['playwright', 'playwright-core'];
  for (const t of tries) { try { return require(t); } catch (e) {} }
  try {
    const root = execSync('npm root -g').toString().trim();
    for (const t of tries) { try { return require(path.join(root, t)); } catch (e) {} }
  } catch (e) {}
  console.error('Playwright not found. Install with: npm i -D playwright && npx playwright install chromium');
  process.exit(2);
}

function args() {
  const a = {}; const v = process.argv.slice(2);
  for (let i = 0; i < v.length; i++) if (v[i].startsWith('--')) { const k = v[i].slice(2); a[k] = (v[i + 1] && !v[i + 1].startsWith('--')) ? v[++i] : true; }
  return a;
}

(async () => {
  const a = args();
  if (!a.html || (!a.out && !a['analyze-only'])) { console.error('usage: --html file --out dir|file.png [--config json] [--fps 30] [--duration s] [--still t] [--bg image]'); process.exit(1); }
  const cfg = a.config ? JSON.parse(fs.readFileSync(a.config, 'utf8')) : {};
  const W = +(a.width || cfg.width || 1080), H = +(a.height || cfg.height || 1920);
  cfg.width = W; cfg.height = H;
  if (a.bg) cfg.previewBackground = 'data:image/png;base64,' + fs.readFileSync(a.bg).toString('base64');
  const { chromium } = loadPlaywright();
  const launchOpts = {};
  if (process.env.CHROMIUM_PATH) launchOpts.executablePath = process.env.CHROMIUM_PATH;
  const browser = await chromium.launch(launchOpts);
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  await page.addInitScript((c) => { window.VV_CONFIG = c; window.VV_RENDER = true; }, cfg);
  await page.goto('file://' + path.resolve(a.html));
  await page.waitForFunction(() => window.VV_READY === true, null, { timeout: 30000 });
  const fps = +(a.fps || 30);
  const dur = a.duration ? +a.duration : await page.evaluate(() => (window.duration ? window.duration(window.VV.cfg()) : 4));
  const shoot = async (t, file) => {
    await page.evaluate((tt) => window.renderFrame(tt, window.VV.cfg()), t);
    await page.screenshot({ path: file, omitBackground: !a.bg });
  };
  const wantMotion = a.motion || a.cues;
  const track = a.track || (await page.evaluate(() => window.SFX_TRACK || '.anim'));
  const samples = [];
  const sample = async (t) => {
    if (!wantMotion) return;
    samples.push(await page.evaluate(([tt, sel]) => {
      const out = [];
      sel.split(',').map((x) => x.trim()).filter(Boolean).forEach((one) => {
        document.querySelectorAll(one).forEach((el, i) => {
          const r = el.getBoundingClientRect();
          let op = 1, n = el;
          while (n && n.nodeType === 1) { op *= parseFloat(getComputedStyle(n).opacity || '1'); n = n.parentElement; }
          out.push({ k: one + '[' + i + ']', cx: r.x + r.width / 2, cy: r.y + r.height / 2, w: r.width, h: r.height, op });
        });
      });
      return { t: tt, els: out };
    }, [t, track]));
  };
  if (a.still !== undefined) {
    await shoot(+a.still, a.out);
    console.log('wrote', a.out);
  } else {
    const n = Math.round(dur * fps);
    if (!a['analyze-only']) fs.mkdirSync(a.out, { recursive: true });
    for (let i = 0; i < n; i++) {
      const t = i / fps;
      if (a['analyze-only']) await page.evaluate((tt) => window.renderFrame(tt, window.VV.cfg()), t);
      else await shoot(t, path.join(a.out, String(i).padStart(5, '0') + '.png'));
      await sample(t);
    }
    if (!a['analyze-only']) console.log(`wrote ${n} frames (${dur}s @ ${fps}fps, ${W}x${H}) to ${a.out}`);
  }
  if (wantMotion) {
    const motion = analyzeMotion(samples, fps, W, H);
    if (a.motion) { fs.mkdirSync(path.dirname(path.resolve(a.motion)), { recursive: true }); fs.writeFileSync(a.motion, JSON.stringify(motion, null, 1)); console.log('wrote motion report', a.motion, `(${motion.events.length} candidate events)`); }
    if (a.cues) {
      const declared = await page.evaluate(() => (window.sfxCues ? window.sfxCues(window.VV.cfg()) : []));
      const resolved = declared.map((c) => resolveCue(c, motion, fps));
      fs.mkdirSync(path.dirname(path.resolve(a.cues)), { recursive: true });
      fs.writeFileSync(a.cues, JSON.stringify({ template: path.basename(a.html), fps, duration: dur, width: W, height: H, cues: resolved }, null, 1));
      console.log('wrote declared sound cues', a.cues, `(${resolved.length})`);
    }
  }
  await browser.close();
})();

// ---- motion analysis (System D) ----------------------------------------------------------
function analyzeMotion(samples, fps, W, H) {
  const tracks = {};
  samples.forEach((s) => s.els.forEach((e) => { (tracks[e.k] = tracks[e.k] || []).push({ t: s.t, ...e }); }));
  const diag = Math.min(W, H), events = [], summary = {};
  for (const [k, tr] of Object.entries(tracks)) {
    // per-frame speed (px/s), counting position + size change while the element is visible
    const pos = tr.map((b, i) => (!i || (tr[i - 1].op < 0.05 && b.op < 0.05)) ? 0 : Math.hypot(b.cx - tr[i - 1].cx, b.cy - tr[i - 1].cy) * fps);
    const sp = tr.map((b, i) => (!i || (tr[i - 1].op < 0.05 && b.op < 0.05)) ? 0 : pos[i] + (Math.abs(b.w - tr[i - 1].w) + Math.abs(b.h - tr[i - 1].h)) / 2 * fps);
    // split into motion segments (speed above 1.5% of frame per second)
    const segs = []; let cur = null;
    sp.forEach((v, i) => {
      if (v > 0.015 * diag) { if (!cur) cur = { i0: i, i1: i, travel: 0, vmax: 0, tmax: null }; cur.i1 = i; cur.travel += pos[i] / fps; if (v > cur.vmax) { cur.vmax = v; cur.tmax = tr[i].t; } }
      else if (cur) { segs.push(cur); cur = null; }
    });
    if (cur) segs.push(cur);
    let tVis = null, tHide = null;
    for (let i = 1; i < tr.length; i++) {
      if (tVis === null && tr[i - 1].op < 0.5 && tr[i].op >= 0.5) tVis = tr[i].t;
      if (tr[i - 1].op >= 0.5 && tr[i].op < 0.5) tHide = tr[i].t;
    }
    if (tVis === null && tr.length && tr[0].op >= 0.5) tVis = tr[0].t;
    const segOut = segs.map((g) => {
      const a = tr[Math.max(0, g.i0 - 1)], b = tr[g.i1];
      const area0 = Math.max(a.w * a.h, 1), area1 = b.w * b.h;
      const scaleChange = Math.abs(area1 - area0) / area0;
      const kind = (g.travel >= 0.06 * diag || scaleChange >= 0.3) ? 'MOVEMENT' : 'MICRO';
      const phase = tHide !== null && g.tmax >= tHide - 0.5 ? 'exit' : (tVis !== null && Math.abs(g.tmax - tVis) <= 0.5 ? 'entrance' : 'mid');
      return { start: tr[g.i0].t, end: b.t, fastest_t: g.tmax, travel_px: +g.travel.toFixed(1), max_speed_px_s: +g.vmax.toFixed(1), scale_change: +scaleChange.toFixed(3), kind, phase };
    });
    summary[k] = { visible_t: tVis, hidden_t: tHide, segments: segOut,
                   fastest_t: segOut.filter((x) => x.kind === 'MOVEMENT').sort((x, y) => y.max_speed_px_s - x.max_speed_px_s)[0]?.fastest_t ?? (segOut[0]?.fastest_t ?? null) };
    segOut.filter((g) => g.kind === 'MOVEMENT').forEach((g) => events.push({ element: k, kind: 'MOVEMENT', phase: g.phase, t: snap(g.fastest_t, fps), start: g.start, end: g.end,
      travel_px: g.travel_px, measure: 'fastest frame of this movement', suggestion: g.phase === 'exit' ? 'whoosh only if the exit is a real slide/transition' : 'whoosh, loudest point on this frame' }));
    if (tVis !== null) events.push({ element: k, kind: 'EVENT', phase: 'entrance', t: snap(tVis, fps), measure: 'first visible frame (opacity>=0.5)',
      suggestion: segOut.some((g) => g.kind === 'MOVEMENT' && g.phase === 'entrance') ? 'arrives by sliding: whoosh covers it; optional texture on arrival' : 'texture on this frame (pop/click/reveal) or silence' });
    if (tHide !== null) events.push({ element: k, kind: 'EXIT', phase: 'exit', t: snap(tHide, fps), measure: 'last visible frame', suggestion: 'usually silent' });
  }
  events.sort((x, y) => x.t - y.t);
  return { fps, width: W, height: H, frames: samples.length, elements: summary, events,
           note: 'Candidates only. MOVEMENT segment = positional travel >= 6% of the short frame side or area change >= 30% (slide/zoom -> whoosh on its fastest frame). MICRO = small drift that belongs to a pop/fade (texture or silence). Decide per Systems A-D; silence is allowed.' };
}
function snap(t, fps) { return Math.round(t * fps) / fps; }
function resolveCue(c, motion, fps) {
  const out = { ...c };
  if (c.select && motion.elements) {
    const key = c.select + '[' + (c.index || 0) + ']';
    const m = motion.elements[key];
    if (m) {
      if (c.measure === 'fastest' && m.fastest_t !== null) out.t = snap(m.fastest_t, fps);
      if (c.measure === 'visible' && m.visible_t !== null) out.t = snap(m.visible_t, fps);
      if (c.measure === 'hidden' && m.hidden_t !== null) out.t = snap(m.hidden_t, fps);
      out.measured_from = key;
    } else out.measured_from = 'NOT FOUND - using declared time';
  }
  if (out.t !== undefined) out.t = snap(out.t, fps);
  return out;
}
