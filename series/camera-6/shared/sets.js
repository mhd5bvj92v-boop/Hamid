// CAMERA 6 sets: the street (doorbell view), Noor's bedroom, downstairs hall, upstairs landing, back garden; the figure.
import * as THREE from 'three';

export function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
export function tex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const rep = (t, x, y) => { const c = t.clone(); c.needsUpdate = true; c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(x, y); return c; };
export const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.8, metalness: o.m ?? 0, ...(o.x || {}) });
const mesh = (g, m, cast = true, recv = true) => { const x = new THREE.Mesh(g, m); x.castShadow = cast; x.receiveShadow = recv; return x; };
const box = (w, h, d, m) => mesh(new THREE.BoxGeometry(w, h, d), m);
export const glow = tex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.3, 'rgba(255,255,255,0.45)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
const sprite = (color, s, op = 1) => { const x = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending })); x.scale.set(s, s, 1); return x; };

// ---------------------------------------------------------------- textures
const brick = tex(512, 512, (g, w, h) => {
  g.fillStyle = '#4a3a34'; g.fillRect(0, 0, w, h); const r = rng(3);
  for (let y = 0; y < h; y += 32) for (let x = -64; x < w; x += 64) { const o = (y / 32) % 2 ? 32 : 0; g.fillStyle = `hsl(${12 + r() * 10},${30 + r() * 15}%,${26 + r() * 10}%)`; g.fillRect(x + o + 2, y + 2, 60, 28); }
});
const wood = tex(512, 512, (g, w, h) => { g.fillStyle = '#6a4a30'; g.fillRect(0, 0, w, h); const r = rng(5); for (let x = 0; x < w; x += 64) { g.fillStyle = `hsl(28,${30 + r() * 10}%,${24 + r() * 8}%)`; g.fillRect(x + 1, 0, 62, h); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.12})`; g.fillRect(x + r() * 60, r() * h, 1 + r() * 2, 20 + r() * 80); } g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x + 1, (r() * h) | 0, 62, 2); } });
const paper = tex(256, 256, (g, w, h) => { g.fillStyle = '#9aa0a2'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,0.08)'; for (let x = 0; x < w; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } });
const asph = tex(512, 512, (g, w, h) => { g.fillStyle = '#1c1d20'; g.fillRect(0, 0, w, h); const r = rng(8); for (let i = 0; i < 9000; i++) { const v = r() * 60 | 0; g.fillStyle = `rgba(${v},${v},${v},0.25)`; g.fillRect(r() * w, r() * h, 2, 2); } for (let i = 0; i < 14; i++) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(r() * w, r() * h, 30 + r() * 60, 10 + r() * 25, r() * 3, 0, 7); g.fill(); } });
const pave = tex(256, 256, (g, w, h) => { g.fillStyle = '#5a5854'; g.fillRect(0, 0, w, h); const r = rng(2); for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) { g.fillStyle = `hsl(30,4%,${30 + r() * 8}%)`; g.fillRect(x + 2, y + 2, 60, 60); } });
const grass = tex(256, 256, (g, w, h) => { g.fillStyle = '#26301e'; g.fillRect(0, 0, w, h); const r = rng(4); for (let i = 0; i < 5000; i++) { g.fillStyle = `hsl(${80 + r() * 30},${25 + r() * 20}%,${10 + r() * 14}%)`; g.fillRect(r() * w, r() * h, 1, 3 + r() * 4); } });

// ---------------------------------------------------------------- THE FIGURE (never moves on camera)
export function makeFigure() {
  const g = new THREE.Group();
  const blk = new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.95 });
  const coat = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.9 });
  const s = (r, l, m = blk) => mesh(new THREE.CapsuleGeometry(r, l, 6, 14), m);
  for (const x of [-0.09, 0.09]) { const l = s(0.05, 0.95); l.position.set(x, 0.52, 0); g.add(l); }
  const prof = [[0.0, 0.0], [0.27, 0.0], [0.24, 0.45], [0.2, 0.75], [0.23, 0.95], [0.2, 1.02], [0.08, 1.06], [0, 1.07]].map(([x, y]) => new THREE.Vector2(x, y));
  const body = mesh(new THREE.LatheGeometry(prof, 24), coat); body.scale.set(1, 1, 0.6); body.position.y = 0.72; g.add(body);
  const neck = s(0.045, 0.12); neck.position.set(0, 1.86, 0.03); neck.rotation.x = 0.35; g.add(neck);
  const headP = new THREE.Group(); headP.position.set(0, 1.93, 0.07); g.add(headP);
  const head = mesh(new THREE.SphereGeometry(0.11, 24, 18), blk); head.scale.set(0.85, 1.18, 0.95); head.position.y = 0.1; headP.add(head);
  const eyes = [];
  for (const x of [-0.035, 0.035]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); e.position.set(x, 0.12, 0.1); headP.add(e); eyes.push(e); }
  const arms = [];
  for (const sd of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(sd * 0.21, 1.72, 0); g.add(sh);
    const up = s(0.04, 0.42); up.position.y = -0.25; sh.add(up);
    const lo = s(0.035, 0.45); lo.position.y = -0.74; sh.add(lo);
    const hand = s(0.03, 0.14); hand.position.y = -1.08; sh.add(hand);
    for (let k = 0; k < 3; k++) { const f = s(0.009, 0.1); f.position.set((k - 1) * 0.016, -1.2, 0.01); sh.add(f); }
    if (sd < 0) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0035, 8, 20), new THREE.MeshStandardMaterial({ color: 0xd8b060, metalness: 1, roughness: 0.25 })); ring.position.set(0, -1.19, 0.012); ring.rotation.x = Math.PI / 2; sh.add(ring); }
    sh.rotation.z = sd * 0.06; arms.push(sh);
  }
  g.userData.pose = ({ tilt = 0.25, up = 0, eyes: eo = false } = {}) => { headP.rotation.set(-up, 0, tilt); eyes.forEach(e => e.visible = eo); };
  g.userData.pose({});
  g.scale.setScalar(1.06);
  return g;
}

// ---------------------------------------------------------------- STREET (our house front at z=0, street along x at z 8..15)
export function buildStreet() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06080e);
  scene.fog = new THREE.FogExp2(0x101626, 0.014);
  scene.add(new THREE.HemisphereLight(0x4a5a80, 0x0a0806, 0.7));
  const moon = new THREE.DirectionalLight(0x8090c0, 0.25); moon.position.set(-10, 20, 20); scene.add(moon);
  const road = mesh(new THREE.PlaneGeometry(160, 7), new THREE.MeshStandardMaterial({ map: rep(asph, 30, 1.5), roughness: 0.28, metalness: 0.3 })); road.rotation.x = -Math.PI / 2; road.position.set(0, 0, 11.5); scene.add(road);
  for (const z of [7, 16]) { const sw = box(160, 0.12, 2, new THREE.MeshStandardMaterial({ map: rep(pave, 80, 1), roughness: 0.6 })); sw.position.set(0, 0.06, z); scene.add(sw); }
  for (const z of [3.5, 19.5]) { const ga = mesh(new THREE.PlaneGeometry(160, 5), new THREE.MeshStandardMaterial({ map: rep(grass, 60, 2), roughness: 1 })); ga.rotation.x = -Math.PI / 2; ga.position.set(0, 0.01, z); scene.add(ga); }
  const path = mesh(new THREE.PlaneGeometry(1.3, 6), new THREE.MeshStandardMaterial({ map: rep(pave, 1, 4), roughness: 0.5 })); path.rotation.x = -Math.PI / 2; path.position.set(0.2, 0.02, 3); scene.add(path);
  // row houses on both sides
  const winLit = new THREE.MeshBasicMaterial({ color: 0xffb46a }), winDark = M(0x0c0f16, { r: 0.1, m: 0.6 });
  const roofM = M(0x24262c, { r: 0.7 }), trim = M(0xd8d2c4, { r: 0.7 }), doorM = M(0x1c2a3a, { r: 0.5 });
  const r = rng(12);
  const house = (x, zf, facing) => {
    const g = new THREE.Group(); g.position.set(x, 0, zf); g.rotation.y = facing; scene.add(g);
    const b = box(6.4, 6.2, 9, new THREE.MeshStandardMaterial({ map: rep(brick, 3, 3), roughness: 0.9 })); b.position.set(0, 3.1, -4.5); g.add(b);
    const roof = mesh(new THREE.CylinderGeometry(0.01, 4.8, 3.2, 4, 1), roofM); roof.rotation.y = Math.PI / 4; roof.scale.set(0.95, 1, 1.32); roof.position.set(0, 7.8, -4.5); g.add(roof);
    const dr = box(1.0, 2.1, 0.08, doorM); dr.position.set(1.6, 1.05, 0.02); g.add(dr);
    const fr = box(1.2, 2.25, 0.05, trim); fr.position.set(1.6, 1.1, 0.0); g.add(fr);
    for (const [wx, wy] of [[-1.3, 1.6], [-1.3, 4.6], [1.6, 4.6]]) {
      const lit = r() < 0.28; const w = box(1.3, 1.4, 0.06, lit ? winLit : winDark); w.position.set(wx, wy, 0.03); g.add(w);
      const sill = box(1.5, 0.08, 0.15, trim); sill.position.set(wx, wy - 0.74, 0.08); g.add(sill);
      if (lit) { const l = new THREE.PointLight(0xffa860, 4, 6, 1.6); l.position.set(wx, wy, 1.2); g.add(l); }
    }
    const hedge = box(5.0, 0.9, 0.6, M(0x16200f, { r: 1 })); hedge.position.set(-0.8, 0.45, 5.6); g.add(hedge);
    return g;
  };
  for (let x = -45; x <= 45; x += 6.5) { if (Math.abs(x) > 0.1) house(x, 0, 0); if (Math.abs(x + 3) > 9) house(x + 3, 21, Math.PI); }
  // the long street straight ahead (T-junction): road along z, houses facing it
  const road2 = mesh(new THREE.PlaneGeometry(7, 80), new THREE.MeshStandardMaterial({ map: rep(asph, 1.5, 16), roughness: 0.28, metalness: 0.3 })); road2.rotation.x = -Math.PI / 2; road2.position.set(0, 0.002, 55); scene.add(road2);
  for (const x of [-4.5, 4.5]) { const sw = box(2, 0.12, 80, new THREE.MeshStandardMaterial({ map: rep(pave, 1, 40), roughness: 0.6 })); sw.position.set(x, 0.06, 55); scene.add(sw); }
  for (let z = 19; z < 95; z += 6.5) { house(-7.2, z, Math.PI / 2); house(7.2, z + 3, -Math.PI / 2); }
  // our house: the doorbell is mounted next to our door (x = 1.6). Porch light, gate.
  const ours = house(0, 0, 0);
  const porch = new THREE.PointLight(0xffc890, 0, 5, 1.6); porch.position.set(1.6, 2.4, 0.5); scene.add(porch);
  const gate = new THREE.Group(); gate.position.set(0.2, 0, 5.9); scene.add(gate);
  const gm = M(0x111214, { r: 0.4, m: 0.7 });
  for (let i = -3; i <= 3; i++) { const bar = box(0.025, 1.0, 0.025, gm); bar.position.set(i * 0.17, 0.5, 0); gate.add(bar); }
  for (const y of [0.15, 0.95]) { const rail = box(1.2, 0.04, 0.04, gm); rail.position.y = y; gate.add(rail); }
  const bin = box(0.6, 1.1, 0.7, M(0x1a2a1c, { r: 0.6 })); bin.position.set(-1.8, 0.55, 4.6); scene.add(bin);
  // parked cars
  const car = (x, z, c) => { const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g); const b = box(4.2, 0.75, 1.8, M(c, { r: 0.3, m: 0.6 })); b.position.y = 0.6; g.add(b); const t = box(2.3, 0.6, 1.65, M(0x07090c, { r: 0.1, m: 0.9 })); t.position.set(-0.2, 1.25, 0); g.add(t); for (const [wx, wz] of [[1.3, 0.85], [1.3, -0.85], [-1.3, 0.85], [-1.3, -0.85]]) { const w = mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.22, 16), M(0x050505)); w.rotation.x = Math.PI / 2; w.position.set(wx, 0.33, wz); g.add(w); } };
  car(-9, 9.0, 0x3a3e46); car(11, 14.2, 0x40221e); car(-21, 14.2, 0x2a3440);
  { const c2 = new THREE.Group(); scene.add(c2); }
  car(-2.2, 33, 0x2a2c30); car(2.3, 61, 0x3a2a24);
  // street lamps (sodium). The far one flickers.
  const lamps = [];
  const poleM = M(0x0c0d0f, { r: 0.4, m: 0.6 });
  for (const [x, z, sd] of [[-4.0, 26, -1], [4.0, 42, 1], [-4.0, 58, -1], [4.0, 74, 1], [-9, 7.6, 0], [10, 7.6, 0]]) {
    const ax = sd ? -sd * 1.2 : 0, az = sd ? 0 : 0.8;
    const p = box(0.12, 5.2, 0.12, poleM); p.position.set(x, 2.6, z); scene.add(p);
    const hx = x + ax, hz = z + az;
    const arm = box(Math.abs(ax) + 0.1, 0.08, Math.abs(az) + 0.1, poleM); arm.position.set(x + ax / 2, 5.2, z + az / 2); scene.add(arm);
    const head = box(0.4, 0.12, 0.3, new THREE.MeshBasicMaterial({ color: 0xffb060 })); head.position.set(hx, 5.12, hz); scene.add(head);
    const sp = sprite(0xff9a40, 3.4, 0.95); sp.position.set(hx, 5.05, hz); scene.add(sp);
    const l = new THREE.SpotLight(0xff9a48, 320, 26, 0.95, 0.55, 1.3); l.position.set(hx, 5.0, hz); l.target.position.set(hx - (sd || 0) * 0.6, 0, hz + 0.5); scene.add(l, l.target);
    const pool = sprite(0xff8a30, 7, 0.14); pool.position.set(hx, 0.05, hz); pool.scale.set(6, 6, 1); scene.add(pool);
    lamps.push({ x, head, sp, l, pool });
  }
  // rain
  const N = 2600, pos = new Float32Array(N * 6), seeds = []; { const rr = rng(6); for (let k = 0; k < N; k++) seeds.push([rr() * 12 - 6, rr() * 7, rr() * 22 + 3.5]); }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xa8b8d8, transparent: true, opacity: 0.2 })); scene.add(rain);
  const update = (t, { flicker = true, raining = false, porchOn = false } = {}) => {
    const far = lamps[1]; const f = flicker ? (Math.sin(t * 37) > 0.2 && Math.sin(t * 5.3) > -0.7 ? 1 : 0.08) : 1;
    far.l.intensity = 320 * f; far.sp.material.opacity = 0.9 * f; far.pool.material.opacity = 0.16 * f; far.head.material.color.setScalar(f).multiply(new THREE.Color(0xffb060));
    porch.intensity = porchOn ? 6 : 0;
    rain.visible = raining;
    if (raining) { for (let k = 0; k < N; k++) { const [x, y0, z] = seeds[k]; const y = ((y0 - t * 11) % 7 + 7) % 7; pos.set([x + 0.05, y, z, x, y - 0.35, z], k * 6); } rg.attributes.position.needsUpdate = true; }
  };
  return { scene, update, lamps, gate };
}

// ---------------------------------------------------------------- BEDROOM
export function buildBedroom() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020306);
  scene.add(new THREE.HemisphereLight(0x2a3450, 0x080604, 0.3));
  const W = 4.0, D = 4.4, Hh = 2.6;
  const floor = mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: rep(wood, 2, 2), roughness: 0.55 })); floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const wallM = new THREE.MeshStandardMaterial({ map: rep(paper, 4, 2), roughness: 0.95, color: 0x8a90a0 });
  const back = box(W, Hh, 0.1, wallM); back.position.set(0, Hh / 2, -D / 2); scene.add(back);
  const left = box(0.1, Hh, D, wallM); left.position.set(-W / 2, Hh / 2, 0); scene.add(left);
  const right = box(0.1, Hh, D, wallM); right.position.set(W / 2, Hh / 2, 0); scene.add(right);
  const ceil = box(W, 0.05, D, M(0x6a6e78, { r: 1 })); ceil.position.y = Hh; scene.add(ceil);
  // bed: head against the left wall, along x
  const frame = box(2.1, 0.35, 1.6, M(0x2a2420, { r: 0.6 })); frame.position.set(-0.85, 0.18, -0.9); scene.add(frame);
  const head = box(0.08, 1.0, 1.6, M(0x2a2420, { r: 0.6 })); head.position.set(-1.92, 0.6, -0.9); scene.add(head);
  const matt = box(2.0, 0.22, 1.5, M(0xc8c4bc, { r: 0.9 })); matt.position.set(-0.85, 0.46, -0.9); scene.add(matt);
  const pillowM = M(0xd4d0c8, { r: 0.95 });
  const pil = mesh(new THREE.SphereGeometry(0.4, 24, 16), pillowM); pil.scale.set(0.75, 0.28, 1.3); pil.position.set(-1.55, 0.66, -1.0); scene.add(pil);
  // duvet: displaced plane draped over the bed (folds)
  const dg = new THREE.PlaneGeometry(1.92, 1.95, 60, 60); const p = dg.attributes.position, rr = rng(7);
  const bumps = Array.from({ length: 14 }, () => [rr() * 1.6 - 0.8, rr() * 1.8 - 0.9, 0.08 + rr() * 0.12, 0.2 + rr() * 0.3]);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i); let z = 0;
    for (const [bx, by, a, s] of bumps) z += a * Math.exp(-((x - bx) ** 2 + (y - by) ** 2) / (s * s));
    const edge = Math.max(0, Math.abs(y) - 0.55); z -= Math.min(0.68, edge * edge * 6.0 + edge * 0.9); z -= 0.05 * Math.max(0, -x - 0.8) * 10 * (x < -0.8 ? 1 : 0); // drape over the sides
    z += 0.12 * Math.exp(-((x + 0.45) ** 2) / 0.12) * Math.exp(-(y * y) / 0.25); // body under the duvet
    p.setZ(i, z);
  }
  dg.computeVertexNormals();
  const duvet = mesh(dg, new THREE.MeshStandardMaterial({ color: 0x262b36, roughness: 0.92, side: THREE.DoubleSide })); duvet.rotation.x = -Math.PI / 2; duvet.position.set(-0.36, 0.99, -0.9); scene.add(duvet);
  // nightstand + lamp (off) + glass
  const ns = box(0.5, 0.55, 0.45, M(0x3a2c22, { r: 0.6 })); ns.position.set(-1.6, 0.28, 0.25); scene.add(ns);
  const lb = mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.25, 20), M(0xd8d0c0, { r: 0.6 })); lb.position.set(-1.6, 0.68, 0.2); scene.add(lb);
  const glass = mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.11, 14), new THREE.MeshStandardMaterial({ color: 0x9ab0c8, transparent: true, opacity: 0.35, roughness: 0.05 })); glass.position.set(-1.45, 0.61, 0.35); scene.add(glass);
  // window on the back wall with blinds: orange streetlight stripes
  const win = box(1.2, 1.3, 0.04, new THREE.MeshBasicMaterial({ color: 0x15100c })); win.position.set(0.9, 1.5, -D / 2 + 0.06); scene.add(win);
  for (let y = 0.9; y < 2.15; y += 0.07) { const sl = box(1.25, 0.03, 0.02, M(0xb0aaa0, { r: 0.6 })); sl.position.set(0.9, y, -D / 2 + 0.1); sl.rotation.x = 0.5; scene.add(sl); }
  const street = new THREE.SpotLight(0xff9a50, 6, 8, 0.45, 0.4, 1.2); street.position.set(1.0, 2.0, -D / 2 - 0.3); street.target.position.set(-0.2, 0.3, 0.6); street.castShadow = true; street.shadow.mapSize.set(1024, 1024); scene.add(street, street.target);
  // door on the right wall, ajar, with a dark gap to the landing
  const doorPiv = new THREE.Group(); doorPiv.position.set(W / 2 - 0.05, 0, 1.4); scene.add(doorPiv); doorPiv.rotation.y = -0.6;
  const door = box(0.05, 2.05, 0.85, M(0xd8d4cc, { r: 0.7 })); door.position.set(0, 1.03, -0.43); doorPiv.add(door);
  const knob = mesh(new THREE.SphereGeometry(0.03, 12, 10), M(0xb8a070, { m: 0.9, r: 0.3 })); knob.position.set(-0.05, 1.0, -0.75); doorPiv.add(knob);
  const gap = box(0.02, 2.05, 0.85, new THREE.MeshBasicMaterial({ color: 0x141a26 })); gap.position.set(W / 2 - 0.06, 1.03, 0.97); gap.scale.z = 0.55; gap.position.z = 1.15; scene.add(gap);
  const landing = new THREE.PointLight(0x9ab0d0, 0, 3.2, 1.4); landing.position.set(W / 2 - 0.25, 1.7, 0.95); scene.add(landing);
  const keyL = new THREE.DirectionalLight(0xffffff, 0); scene.add(keyL, keyL.target);
  return { scene, doorPiv, landing, street, keyL, W, D, gap };
}

// ---------------------------------------------------------------- DOWNSTAIRS HALL (front door at z = 0 wall, facing into +z... door in wall x = -2)
export function buildHall() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x010101);
  scene.add(new THREE.HemisphereLight(0x405060, 0x101010, 0.25));
  const floor = mesh(new THREE.PlaneGeometry(5, 7), new THREE.MeshStandardMaterial({ map: rep(wood, 2.5, 3), roughness: 0.4 })); floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const wallM = new THREE.MeshStandardMaterial({ map: rep(paper, 4, 2), color: 0xb0a898, roughness: 0.95 });
  for (const [x, z, w, d] of [[-2.5, 0, 0.1, 7], [2.5, 0, 0.1, 7], [0, 3.5, 5, 0.1]]) { const b = box(w, 2.7, d, wallM); b.position.set(x, 1.35, z); scene.add(b); }
  // front wall at z = -3.5 with the door opening
  const fwL = box(1.7, 2.7, 0.1, wallM); fwL.position.set(-1.65, 1.35, -3.5); scene.add(fwL);
  const fwR = box(2.3, 2.7, 0.1, wallM); fwR.position.set(1.35, 1.35, -3.5); scene.add(fwR);
  const fwT = box(1.0, 0.55, 0.1, wallM); fwT.position.set(-0.3, 2.42, -3.5); scene.add(fwT);
  const doorPiv = new THREE.Group(); doorPiv.position.set(-0.8, 0, -3.5); scene.add(doorPiv);
  const door = box(0.98, 2.12, 0.06, M(0x1c2a3a, { r: 0.5 })); door.position.set(0.49, 1.06, 0); doorPiv.add(door);
  const outside = mesh(new THREE.PlaneGeometry(1.0, 2.15), new THREE.MeshBasicMaterial({ color: 0x1a1c24 })); outside.position.set(-0.3, 1.07, -3.62); scene.add(outside);
  const outL = new THREE.SpotLight(0xff9a50, 0, 9, 0.6, 0.6, 1.2); outL.position.set(-0.3, 2.0, -5.0); outL.target.position.set(0.2, 0, 0); scene.add(outL, outL.target);
  // stairs going up along the right wall
  const st = M(0x5a4030, { r: 0.6 });
  for (let i = 0; i < 12; i++) { const s = box(1.0, 0.18, 0.3, st); s.position.set(1.95, 0.09 + i * 0.2, -1.5 + i * 0.28); s.scale.y = 1 + i * 0.0; scene.add(s); const riser = box(1.0, 0.2 * (i + 1), 0.3, st); riser.position.set(1.95, 0.1 * (i + 1), -1.5 + i * 0.28); scene.add(riser); }
  const rail = box(0.05, 0.05, 3.6, M(0x2a1e16, { r: 0.5 })); rail.position.set(1.42, 1.7, 0.1); rail.rotation.x = -0.62; scene.add(rail);
  const rug = mesh(new THREE.PlaneGeometry(1.2, 2.2), M(0x4a2a24, { r: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.set(-0.2, 0.005, -1.4); scene.add(rug);
  const coat = box(0.08, 1.8, 0.08, M(0x2a1e16)); coat.position.set(-2.2, 0.9, -2.6); scene.add(coat);
  const coatC = mesh(new THREE.CapsuleGeometry(0.18, 0.7, 6, 12), M(0x3a3a40, { r: 0.9 })); coatC.position.set(-2.15, 1.25, -2.45); scene.add(coatC);
  const table = box(0.9, 0.8, 0.35, M(0x3a2c22, { r: 0.6 })); table.position.set(-2.25, 0.4, 0.6); scene.add(table);
  const keysL = new THREE.PointLight(0xffd8a0, 0.6, 4, 1.6); keysL.position.set(0, 2.5, 1.5); scene.add(keysL);
  // wet footprints (appear from t) — dark glossy ellipses from the door to the stairs
  const prints = new THREE.Group(); scene.add(prints);
  const pm = new THREE.MeshStandardMaterial({ color: 0x05060a, roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 9; i++) { const z = -3.1 + i * 0.42, x = -0.35 + i * 0.22 + (i % 2 ? 0.12 : -0.12); const f = mesh(new THREE.CircleGeometry(0.07, 16), pm, false, false); f.scale.set(0.75, 1.6, 1); f.rotation.x = -Math.PI / 2; f.rotation.z = -0.5; f.position.set(x, 0.006, z); prints.add(f); }
  const N = 900, pos = new Float32Array(N * 6), seeds = []; { const r = rng(3); for (let k = 0; k < N; k++) seeds.push([-0.8 + r() * 1.1, r() * 2.4, -3.3 - r() * 3]); }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xc0c8d8, transparent: true, opacity: 0.4 })); scene.add(rain);
  const update = (t, open) => {
    doorPiv.rotation.y = open ? -1.45 : 0; outL.intensity = open ? 14 : 0; outside.visible = open; prints.visible = open; rain.visible = open;
    if (open) { for (let k = 0; k < N; k++) { const [x, y0, z] = seeds[k]; const y = ((y0 - t * 9) % 2.4 + 2.4) % 2.4; pos.set([x + 0.04, y, z, x, y - 0.25, z], k * 6); } rg.attributes.position.needsUpdate = true; }
  };
  return { scene, update };
}

// ---------------------------------------------------------------- UPSTAIRS LANDING
export function buildLanding() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x010101);
  scene.add(new THREE.HemisphereLight(0x405060, 0x101010, 0.25));
  const floor = mesh(new THREE.PlaneGeometry(2.2, 7), new THREE.MeshStandardMaterial({ map: rep(wood, 1, 3), roughness: 0.45 })); floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const wallM = new THREE.MeshStandardMaterial({ map: rep(paper, 3, 2), color: 0xb0a898, roughness: 0.95 });
  for (const x of [-1.1, 1.1]) { const w = box(0.1, 2.6, 7, wallM); w.position.set(x, 1.3, 0); scene.add(w); }
  const end = box(2.2, 2.6, 0.1, wallM); end.position.set(0, 1.3, -3.5); scene.add(end);
  const doors = [];
  for (const [z, sd, ajar] of [[-2.2, -1, 0], [-0.4, 1, 0], [1.6, -1, 1]]) {
    const piv = new THREE.Group(); piv.position.set(sd * 1.05, 0, z + 0.45); scene.add(piv);
    const d = box(0.05, 2.05, 0.85, M(0xd8d4cc, { r: 0.7 })); d.position.set(0, 1.03, -0.43); piv.add(d);
    piv.rotation.y = ajar ? sd * 0.35 : 0;
    const gap = box(0.02, 2.05, 0.85, new THREE.MeshBasicMaterial({ color: 0x000000 })); gap.position.set(sd * 1.07, 1.03, z); scene.add(gap);
    doors.push(piv);
  }
  for (const z of [-1.3, 0.6]) { const fr = box(0.04, 0.5, 0.4, M(0x1a1410)); fr.position.set(1.04, 1.6, z); scene.add(fr); const pic = mesh(new THREE.PlaneGeometry(0.34, 0.44), M(0x6a7a8a)); pic.position.set(1.015, 1.6, z); pic.rotation.y = -Math.PI / 2; scene.add(pic); }
  const nl = new THREE.PointLight(0xffd0a0, 1.2, 3, 1.6); nl.position.set(-0.9, 0.3, -3.0); scene.add(nl);
  const nlm = mesh(new THREE.BoxGeometry(0.06, 0.08, 0.04), new THREE.MeshBasicMaterial({ color: 0xffe0b0 })); nlm.position.set(-1.04, 0.3, -3.0); scene.add(nlm);
  return { scene, doors };
}

// ---------------------------------------------------------------- BACK GARDEN
export function buildGarden() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020306);
  scene.fog = new THREE.FogExp2(0x05070a, 0.06);
  scene.add(new THREE.HemisphereLight(0x405070, 0x101010, 0.35));
  const g = mesh(new THREE.PlaneGeometry(14, 16), new THREE.MeshStandardMaterial({ map: rep(grass, 6, 6), roughness: 1 })); g.rotation.x = -Math.PI / 2; scene.add(g);
  const fm = new THREE.MeshStandardMaterial({ map: rep(wood, 6, 1), roughness: 0.9, color: 0x7a6a5a });
  for (const [x, z, w, d] of [[-5, 0, 0.1, 16], [5, 0, 0.1, 16], [0, -8, 10, 0.1]]) { const f = box(w, 1.9, d, fm); f.position.set(x, 0.95, z); scene.add(f); }
  const shed = box(2.2, 2.2, 1.8, new THREE.MeshStandardMaterial({ map: rep(wood, 2, 1), roughness: 0.9 })); shed.position.set(3.2, 1.1, -6.2); scene.add(shed);
  const line = box(6, 0.01, 0.01, M(0xcccccc)); line.position.set(0, 1.9, -3); scene.add(line);
  for (const x of [-3, 3]) { const p = box(0.06, 2, 0.06, M(0x3a3a3a)); p.position.set(x, 1, -3); scene.add(p); }
  const sheet = mesh(new THREE.PlaneGeometry(1.4, 1.5, 10, 10), new THREE.MeshStandardMaterial({ color: 0xd8d8d0, roughness: 1, side: THREE.DoubleSide })); sheet.position.set(-0.8, 1.15, -3); scene.add(sheet);
  const sp = sheet.geometry.attributes.position; const base = Float32Array.from(sp.array);
  const update = t => { for (let i = 0; i < sp.count; i++) { const y = base[i * 3 + 1]; sp.setZ(i, Math.sin(t * 2.1 + base[i * 3] * 3) * 0.08 * (0.75 - y)); } sp.needsUpdate = true; sheet.geometry.computeVertexNormals(); };
  for (let i = 0; i < 6; i++) { const tr = mesh(new THREE.ConeGeometry(0.9, 3.2, 8), M(0x101a10, { r: 1 })); tr.position.set(-4 + i * 1.6, 1.6, -7.3); scene.add(tr); }
  const sec = new THREE.PointLight(0xdde6ff, 4, 9, 1.4); sec.position.set(0, 2.6, 2.5); scene.add(sec);
  return { scene, update };
}
