// Shared renderer for all episodes. Usage (from series/the-paris-job):
//   node shared/render.js <epdir> stills 2.0,8.0,12.0 [outdir]
//   node shared/render.js <epdir> video <startFrame> <endFrame> <out.mp4>   (30 fps, end exclusive)
const http = require('http'), fs = require('fs'), path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../..'), FPS = 30;
const EP = process.argv[2];
const types = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.woff': 'font/woff' };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(r);
    }).listen(0, () => res(srv));
  });
}

(async () => {
  const [mode, a, b, c] = process.argv.slice(3);
  const srv = await serve();
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text()); });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  if (process.env.OVR) await page.addInitScript(o => { window.OVR = JSON.parse(o); }, process.env.OVR);
  await page.goto(`http://localhost:${srv.address().port}/camera-6/${EP}/index.html`);
  await page.waitForFunction('window.READY === true', null, { timeout: 120000 });
  const root = await page.$('#root');

  if (mode === 'stills') {
    const out = b || path.join(ROOT, 'camera-6', EP, 'work', 'stills'); fs.mkdirSync(out, { recursive: true });
    for (const t of a.split(',').map(Number)) {
      const t0 = Date.now();
      await page.evaluate(t => window.renderAt(t), t);
      await root.screenshot({ path: path.join(out, `t${t.toFixed(2).padStart(6, '0')}.jpg`), type: 'jpeg', quality: 85 });
      console.log('still', t, Date.now() - t0, 'ms');
    }
  } else {
    const f0 = +a, f1 = +b, out = c;
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let f = f0; f < f1; f++) {
      await page.evaluate(t => window.renderAt(t), f / FPS);
      const buf = await root.screenshot({ type: 'jpeg', quality: 93 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if ((f - f0) % 60 === 0) console.log(`${out}: frame ${f}/${f1} (${((Date.now() - t0) / (f - f0 + 1)).toFixed(0)} ms/f)`);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
