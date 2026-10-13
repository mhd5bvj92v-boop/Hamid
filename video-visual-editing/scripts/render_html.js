#!/usr/bin/env node
/* Render an animated HTML template to a transparent PNG sequence (frame-exact).
 *
 *   node scripts/render_html.js --html templates/stat-card.html --config my.json \
 *        --out work/statcard --fps 30 [--duration 4] [--width 1080 --height 1920]
 *   node scripts/render_html.js --html ... --still 1.2 --out work/preview.png   # one frame
 *   add --bg path/to/frame.png to render over a still for previews (output then opaque)
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
  if (!a.html || !a.out) { console.error('usage: --html file --out dir|file.png [--config json] [--fps 30] [--duration s] [--still t] [--bg image]'); process.exit(1); }
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
  if (a.still !== undefined) {
    await shoot(+a.still, a.out);
    console.log('wrote', a.out);
  } else {
    fs.mkdirSync(a.out, { recursive: true });
    const n = Math.round(dur * fps);
    for (let i = 0; i < n; i++) await shoot(i / fps, path.join(a.out, String(i).padStart(5, '0') + '.png'));
    console.log(`wrote ${n} frames (${dur}s @ ${fps}fps, ${W}x${H}) to ${a.out}`);
  }
  await browser.close();
})();
