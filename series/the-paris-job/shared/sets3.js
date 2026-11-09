// Sets/props for Part 3+ : ventilation duct (with corridor below), police car, dog, van (exterior + interior),
// Seine quay at night, transport tube with tracker, UV lamp.
import * as THREE from 'three';
import { M } from './person.js';
import { canvasTex, rng, glowTex } from './world.js';
import { makeBeam } from './sets2.js';

const mesh = (g, m, cast = true, recv = true) => { const x = new THREE.Mesh(g, m); x.castShadow = cast; x.receiveShadow = recv; return x; };
const box = (w, h, d, m) => mesh(new THREE.BoxGeometry(w, h, d), m);

// ---------------------------------------------------------------- small props
export function makeTube() { // painting transport tube, worn on the back
  const g = new THREE.Group();
  const mat = M(0x15161a, { r: 0.55, m: 0.2 });
  const body = mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.78, 24), mat); g.add(body);
  for (const y of [-0.39, 0.39]) { const cap = mesh(new THREE.CylinderGeometry(0.064, 0.064, 0.06, 24), M(0x0a0a0a, { r: 0.35, m: 0.5 })); cap.position.y = y; g.add(cap); }
  const strap = mesh(new THREE.TorusGeometry(0.2, 0.012, 6, 30), M(0x111111, { r: 0.8 })); strap.scale.set(1, 1.6, 0.6); strap.rotation.y = Math.PI / 2; strap.position.z = 0.1; g.add(strap);
  return g;
}

export function makeTracker() {
  const g = new THREE.Group();
  g.add(box(0.032, 0.012, 0.045, M(0x0c0c0e, { r: 0.4, m: 0.4 })));
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.003, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2020 })); led.position.set(0.008, 0.007, 0.014); g.add(led);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff2a2a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); glow.scale.set(0.08, 0.08, 1); glow.position.copy(led.position); g.add(glow);
  const pl = new THREE.PointLight(0xff2020, 0, 0.25, 2); pl.position.copy(led.position); g.add(pl);
  g.userData.set = on => { led.visible = glow.visible = on; pl.intensity = on ? 0.06 : 0; };
  return g;
}

export function makeUVLamp() {
  const g = new THREE.Group();
  const b = mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.15, 12), M(0x1a1a1a, { r: 0.4, m: 0.6 })); b.rotation.x = Math.PI / 2; g.add(b);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.017, 16), new THREE.MeshBasicMaterial({ color: 0x8a5cff })); lens.position.z = 0.076; g.add(lens);
  const spot = new THREE.SpotLight(0x7a40ff, 0, 3, 0.5, 0.6, 1.6); spot.position.z = 0.08; g.add(spot);
  const tgt = new THREE.Object3D(); tgt.position.z = 2; g.add(tgt); spot.target = tgt;
  const beam = makeBeam(1.2, 0.45, 0x7a40ff, 0.0); beam.position.z = 0.08; g.add(beam);
  g.userData.set = on => { spot.intensity = 14 * on; beam.material.opacity = 0.06 * on; lens.material.color.setHex(on > 0.5 ? 0xd8c0ff : 0x2a1a44); };
  g.userData.set(0);
  return g;
}

// ---------------------------------------------------------------- DOG (german shepherd, faces +z)
export function makeDog() {
  const root = new THREE.Group();
  const tan = M(0x7a5230, { r: 0.9 }), dark = M(0x16110c, { r: 0.9 }), black = M(0x050505, { r: 0.3 });
  const body = new THREE.Group(); body.position.y = 0.52; root.add(body);
  const torso = mesh(new THREE.CapsuleGeometry(0.13, 0.42, 8, 16), tan); torso.rotation.x = Math.PI / 2; torso.scale.set(0.9, 1, 1.05); body.add(torso);
  const saddle = mesh(new THREE.SphereGeometry(0.15, 20, 14), dark); saddle.scale.set(0.95, 0.6, 2.1); saddle.position.set(0, 0.06, -0.02); body.add(saddle);
  const chest = mesh(new THREE.SphereGeometry(0.135, 18, 14), tan); chest.position.set(0, 0.0, 0.25); body.add(chest);
  const neck = new THREE.Group(); neck.position.set(0, 0.08, 0.3); body.add(neck);
  const nk = mesh(new THREE.CapsuleGeometry(0.075, 0.16, 6, 12), tan); nk.rotation.x = 0.7; nk.position.set(0, 0.07, 0.04); neck.add(nk);
  const head = new THREE.Group(); head.position.set(0, 0.17, 0.1); neck.add(head);
  const skull = mesh(new THREE.SphereGeometry(0.085, 18, 14), tan); skull.scale.set(0.95, 0.85, 1.1); head.add(skull);
  const snout = mesh(new THREE.CapsuleGeometry(0.042, 0.1, 6, 12), dark); snout.rotation.x = Math.PI / 2; snout.position.set(0, -0.03, 0.11); head.add(snout);
  const nose = mesh(new THREE.SphereGeometry(0.02, 10, 8), black); nose.position.set(0, -0.015, 0.18); head.add(nose);
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.ConeGeometry(0.035, 0.1, 8), dark); ear.position.set(s * 0.05, 0.09, -0.01); ear.rotation.z = -s * 0.25; head.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), new THREE.MeshStandardMaterial({ color: 0x1a0e04, roughness: 0.1 })); eye.position.set(s * 0.04, 0.02, 0.07); head.add(eye);
  }
  const legs = [];
  for (const [x, z] of [[-0.07, 0.24], [0.07, 0.24], [-0.07, -0.24], [0.07, -0.24]]) {
    const hip = new THREE.Group(); hip.position.set(x, -0.04, z); body.add(hip);
    const up = mesh(new THREE.CapsuleGeometry(0.035, 0.18, 6, 10), z > 0 ? tan : dark); up.position.y = -0.13; hip.add(up);
    const lo = new THREE.Group(); lo.position.y = -0.25; hip.add(lo);
    const ll = mesh(new THREE.CapsuleGeometry(0.025, 0.17, 6, 10), tan); ll.position.y = -0.1; lo.add(ll);
    legs.push({ hip, lo, front: z > 0 });
  }
  const tail = mesh(new THREE.CapsuleGeometry(0.03, 0.3, 6, 10), dark); tail.position.set(0, -0.02, -0.4); tail.rotation.x = -0.5; body.add(tail);
  function apply(P) {
    root.position.set(P.x ?? 0, P.y ?? 0, P.z ?? 0); root.rotation.y = P.ry ?? 0;
    const ph = P.phase ?? 0, a = P.amt ?? 0;
    legs.forEach((l, i) => { const s = Math.sin(ph + (i === 0 || i === 3 ? 0 : Math.PI)); l.hip.rotation.x = s * 0.5 * a; l.lo.rotation.x = (l.front ? -1 : 1) * Math.max(0, -s) * 0.6 * a; });
    body.position.y = 0.52 + Math.abs(Math.sin(ph)) * 0.015 * a;
    neck.rotation.x = P.neck ?? 0; head.rotation.set(P.hp ?? 0, P.hy ?? 0, 0);
    tail.rotation.y = Math.sin(ph * 0.5) * 0.3 * a;
  }
  apply({});
  return { root, apply };
}

// ---------------------------------------------------------------- POLICE CAR (faces +x)
export function makePoliceCar() {
  const g = new THREE.Group();
  const paint = M(0x1c2440, { r: 0.25, m: 0.6 }), white = M(0xd8dbe2, { r: 0.3, m: 0.5 }), glass = M(0x05070a, { r: 0.05, m: 0.9 }), tyre = M(0x0a0a0a, { r: 0.8 });
  const low = box(4.4, 0.6, 1.8, paint); low.position.y = 0.55; g.add(low);
  const stripe = box(4.42, 0.12, 1.82, white); stripe.position.y = 0.62; g.add(stripe);
  const cab = box(2.3, 0.55, 1.62, glass); cab.position.set(-0.2, 1.12, 0); g.add(cab);
  const roof = box(1.8, 0.05, 1.5, white); roof.position.set(-0.2, 1.41, 0); g.add(roof);
  for (const [x, z] of [[1.4, 0.82], [1.4, -0.82], [-1.4, 0.82], [-1.4, -0.82]]) { const w = mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.24, 18), tyre); w.rotation.x = Math.PI / 2; w.position.set(x, 0.33, z); g.add(w); }
  const bar = box(0.3, 0.1, 1.2, M(0x111111)); bar.position.set(-0.2, 1.48, 0); g.add(bar);
  const blues = [];
  for (const z of [-0.35, 0.35]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.09, 0.34), new THREE.MeshBasicMaterial({ color: 0x2050ff })); b.position.set(-0.2, 1.54, z); g.add(b);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x3060ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.position.copy(b.position); s.scale.set(2.2, 2.2, 1); g.add(s);
    const l = new THREE.PointLight(0x2a50ff, 0, 30, 1.3); l.position.copy(b.position).add(new THREE.Vector3(0, 0.3, 0)); g.add(l);
    blues.push({ b, s, l });
  }
  const heads = [];
  for (const z of [-0.6, 0.6]) {
    const h = new THREE.Mesh(new THREE.CircleGeometry(0.1, 12), new THREE.MeshBasicMaterial({ color: 0xfff4e0 })); h.position.set(2.21, 0.7, z); h.rotation.y = Math.PI / 2; g.add(h);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff0d0, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending })); s.position.copy(h.position); s.scale.set(1.2, 1.2, 1); g.add(s); heads.push(s);
  }
  for (const z of [-0.65, 0.65]) { const r = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.12), new THREE.MeshBasicMaterial({ color: 0xff1010 })); r.position.set(-2.21, 0.72, z); r.rotation.y = -Math.PI / 2; g.add(r); }
  const hl = new THREE.SpotLight(0xfff0d0, 0, 40, 0.5, 0.6, 1.2); hl.position.set(2.3, 0.75, 0); hl.target.position.set(12, 0, 0); g.add(hl, hl.target);
  g.userData.update = (t, seed = 0, power = 1, lights = true) => {
    const ph = (t * 2.6 + seed * 0.37) % 1;
    blues.forEach((x, i) => {
      const on = (i === 0 ? (ph < 0.12 || (ph > 0.24 && ph < 0.36)) : (ph > 0.5 && ph < 0.62) || (ph > 0.74 && ph < 0.86)) ? 1 : 0.04;
      x.b.material.color.setScalar(0).setRGB(0.12 * on, 0.3 * on, 1.0 * on); x.s.material.opacity = on; x.s.scale.setScalar(on > 0.5 ? 1.6 : 0.5); x.l.intensity = on * 60 * power;
    });
    hl.intensity = lights ? 60 : 0; heads.forEach(s => s.visible = lights);
  };
  return g;
}

// ---------------------------------------------------------------- VAN exterior (faces +x)
export function makeVan() {
  const g = new THREE.Group();
  const paint = M(0x2c2f34, { r: 0.35, m: 0.55 }), glass = new THREE.MeshStandardMaterial({ color: 0x0a0e14, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.55 }), tyre = M(0x0a0a0a, { r: 0.8 });
  const body = box(3.6, 1.9, 1.95, paint); body.position.set(-0.6, 1.35, 0); g.add(body);
  // cab: floor, roof, nose, back panel; open sides with glass
  const nose = box(0.9, 0.85, 1.95, paint); nose.position.set(1.65, 0.85, 0); g.add(nose);
  const cabRoof = box(1.0, 0.08, 1.95, paint); cabRoof.position.set(1.2, 2.26, 0); g.add(cabRoof);
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 0.95), glass); ws.position.set(1.62, 1.75, 0); ws.rotation.y = Math.PI / 2; ws.rotation.z = 0; ws.rotateX(-0.0); ws.rotation.order = 'YXZ'; ws.rotation.x = -0.32; g.add(ws);
  const sideGlassL = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.8), glass); sideGlassL.position.set(1.15, 1.75, 0.976); g.add(sideGlassL);
  const sideR = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.8), glass); sideR.position.set(1.15, 1.75, -0.976); sideR.rotation.y = Math.PI; // driver window rolled down
  const doorLow = box(1.0, 0.9, 0.04, paint); doorLow.position.set(1.15, 0.85, 0.975); g.add(doorLow);
  const doorLowR = box(1.0, 0.9, 0.04, paint); doorLowR.position.set(1.15, 0.85, -0.975); g.add(doorLowR);
  const pillar = box(0.08, 0.85, 1.95, paint); pillar.position.set(1.66, 1.8, 0); pillar.visible = false; g.add(pillar);
  const seat = box(0.5, 0.12, 0.55, M(0x1a1a1c, { r: 0.8 })); seat.position.set(0.95, 0.95, -0.45); g.add(seat);
  const seatB = box(0.1, 0.7, 0.55, M(0x1a1a1c, { r: 0.8 })); seatB.position.set(0.7, 1.35, -0.45); g.add(seatB);
  const wheel = mesh(new THREE.TorusGeometry(0.19, 0.022, 8, 24), M(0x111111, { r: 0.5 })); wheel.position.set(1.42, 1.38, -0.45); wheel.rotation.y = Math.PI / 2; wheel.rotation.x = 0.0; wheel.rotateY(0); wheel.rotation.set(0, Math.PI / 2, 0); wheel.rotateX(0.55); g.add(wheel);
  for (const [x, z] of [[1.45, 0.9], [1.45, -0.9], [-1.6, 0.9], [-1.6, -0.9]]) { const w = mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 18), tyre); w.rotation.x = Math.PI / 2; w.position.set(x, 0.36, z); g.add(w); }
  const heads = [], tails = [];
  for (const z of [-0.7, 0.7]) {
    const h = new THREE.Mesh(new THREE.CircleGeometry(0.11, 14), new THREE.MeshBasicMaterial({ color: 0xfff2dc })); h.position.set(2.11, 0.95, z); h.rotation.y = Math.PI / 2; g.add(h);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff0d6, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.position.copy(h.position); s.scale.set(1.4, 1.4, 1); g.add(s); heads.push(h, s);
    const tl = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.3), new THREE.MeshBasicMaterial({ color: 0xff1a10 })); tl.position.set(-2.41, 1.0, z); tl.rotation.y = -Math.PI / 2; g.add(tl);
    const ts = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff2010, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); ts.position.copy(tl.position); ts.scale.set(0.9, 0.9, 1); g.add(ts); tails.push(ts);
  }
  const hl = new THREE.SpotLight(0xfff0d6, 50, 30, 0.45, 0.6, 1.2); hl.position.set(2.2, 0.95, 0); hl.target.position.set(12, -0.5, 0); g.add(hl, hl.target);
  const tailL = new THREE.PointLight(0xff2010, 8, 5, 1.5); tailL.position.set(-2.7, 1.0, 0); g.add(tailL);
  const cabL = new THREE.PointLight(0x9ab0ff, 4, 2.5, 1.5); cabL.position.set(1.3, 1.9, 0.2); g.add(cabL);
  // sliding side door (+z side): moves toward -x when open
  const door = box(1.1, 1.75, 0.05, paint); door.position.set(-0.05, 1.32, 1.0); g.add(door);
  const opening = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.75), new THREE.MeshBasicMaterial({ color: 0x2a1e14 })); opening.position.set(-0.05, 1.32, 0.977); g.add(opening);
  const inL = new THREE.PointLight(0xffc890, 0, 4, 1.5); inL.position.set(-0.05, 1.5, 1.3); g.add(inL);
  g.userData.setDoor = u => { inL.intensity = 10 * u; opening.visible = u > 0.02; door.position.x = -0.05 - 1.15 * u; door.position.z = 1.0 + 0.04 * Math.min(1, u * 4); };
  g.userData.setLights = (head, brake = 0) => { heads.forEach(h => h.visible = head); hl.intensity = head ? 50 : 0; tails.forEach(s => s.scale.setScalar(0.9 + brake * 0.8)); tailL.intensity = 8 + brake * 10; };
  g.userData.cabL = cabL;
  return g;
}

// ---------------------------------------------------------------- DUCT + corridor below
export function buildDuct() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x010102);
  scene.fog = new THREE.Fog(0x010102, 2, 11);
  scene.add(new THREE.HemisphereLight(0x3a4458, 0x0a0806, 0.3));
  const sheet = canvasTex(512, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#7a7e84'); gr.addColorStop(0.5, '#9a9ea4'); gr.addColorStop(1, '#73777d');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = rng(17);
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${r() * 0.05})`; g.fillRect(r() * w, r() * h, 2 + r() * 30, 1 + r() * 2); }
    for (let i = 0; i < 25; i++) { g.fillStyle = `rgba(60,40,20,${r() * 0.15})`; g.beginPath(); g.arc(r() * w, r() * h, 10 + r() * 40, 0, 7); g.fill(); }
    g.fillStyle = '#3a3c40'; g.fillRect(0, 0, w, 10); g.fillStyle = '#b8bcc2'; g.fillRect(0, 10, w, 3);
    g.fillStyle = '#2a2c30'; for (let x = 20; x < w; x += 60) { g.beginPath(); g.arc(x, 24, 3, 0, 7); g.fill(); }
  });
  sheet.wrapS = sheet.wrapT = THREE.RepeatWrapping;
  const mk = (rw, rh) => { const t = sheet.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rw, rh); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.45, metalness: 0.75 }); };
  const W = 1.0, Hd = 0.78, Z0 = 6, Z1 = -16, GZ0 = -6.75, GZ1 = -6.05, GW = 0.6;
  // floor in pieces around the grate
  const fl = mk(1, 12);
  const f1 = box(W, 0.03, Z0 - GZ1, fl); f1.position.set(0, -0.015, (Z0 + GZ1) / 2); scene.add(f1);
  const f2 = box(W, 0.03, GZ0 - Z1, fl); f2.position.set(0, -0.015, (GZ0 + Z1) / 2); scene.add(f2);
  for (const s of [-1, 1]) { const f3 = box((W - GW) / 2, 0.03, GZ1 - GZ0, fl); f3.position.set(s * (GW + (W - GW) / 2) / 2, -0.015, (GZ0 + GZ1) / 2); scene.add(f3); }
  const len = Z0 - Z1;
  for (const s of [-1, 1]) { const wl = box(0.03, Hd, len, mk(12, 1)); wl.position.set(s * W / 2, Hd / 2, (Z0 + Z1) / 2); scene.add(wl); }
  const top = box(W, 0.03, len, mk(1, 12)); top.position.set(0, Hd + 0.015, (Z0 + Z1) / 2); scene.add(top);
  // ribs every 1.2 m
  const ribM = M(0x55585e, { r: 0.4, m: 0.8 });
  for (let z = Z0; z > Z1; z -= 1.2) {
    for (const s of [-1, 1]) { const r = box(0.05, Hd, 0.05, ribM); r.position.set(s * (W / 2 - 0.02), Hd / 2, z); scene.add(r); }
    const r2 = box(W, 0.05, 0.05, ribM); r2.position.set(0, Hd - 0.02, z); scene.add(r2);
  }
  // grate slats
  const slatM = M(0x2a2c30, { r: 0.4, m: 0.8 });
  for (let z = GZ0 + 0.06; z < GZ1; z += 0.09) { const s = box(GW, 0.025, 0.018, slatM); s.position.set(0, -0.012, z); scene.add(s); }
  for (const x of [-GW / 2, GW / 2]) { const s = box(0.03, 0.03, GZ1 - GZ0, slatM); s.position.set(x, -0.012, (GZ0 + GZ1) / 2); scene.add(s); }
  // bend / end of duct ahead: faint light leaking from a grille at the far end
  const endGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4), new THREE.MeshBasicMaterial({ color: 0x5a6a88 })); endGlow.position.set(0, 0.4, Z1 + 0.02); scene.add(endGlow);
  for (let y = 0.22; y < 0.6; y += 0.05) { const b = box(0.62, 0.012, 0.02, slatM); b.position.set(0, y, Z1 + 0.05); scene.add(b); }
  const endL = new THREE.PointLight(0x6a7aa0, 1.5, 6, 1.5); endL.position.set(0, 0.4, Z1 + 0.6); scene.add(endL);
  // dust motes
  const dp = [], r = rng(81);
  for (let i = 0; i < 900; i++) dp.push((r() - 0.5) * 0.9, r() * 0.75, Z1 + r() * len);
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.003, color: 0xcfd6e8, transparent: true, opacity: 0.22, depthWrite: false })); scene.add(dust);

  // corridor below (security corridor, floor at y = -3.4)
  const FY = -3.4;
  const tile = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#4a4740'; g.fillRect(0, 0, w, h); const rr = rng(5); for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) { g.fillStyle = `hsl(40,6%,${24 + rr() * 6}%)`; g.fillRect(x + 2, y + 2, 60, 60); } });
  tile.wrapS = tile.wrapT = THREE.RepeatWrapping; tile.repeat.set(3, 12);
  const cf = new THREE.Mesh(new THREE.PlaneGeometry(5, 24), new THREE.MeshStandardMaterial({ map: tile, roughness: 0.35, metalness: 0.1 })); cf.rotation.x = -Math.PI / 2; cf.position.set(0, FY, -6); cf.receiveShadow = true; scene.add(cf);
  const cw = M(0x8a8478, { r: 0.85 });
  for (const s of [-1, 1]) { const w = box(0.2, 3.4, 24, cw); w.position.set(s * 2.5, FY + 1.7, -6); scene.add(w); }
  const cc = new THREE.Mesh(new THREE.PlaneGeometry(5, 24), M(0x2a2826, { r: 1 })); cc.rotation.x = Math.PI / 2; cc.position.set(0, -0.08, -6); scene.add(cc);
  cc.material.side = THREE.DoubleSide;
  // hole in the corridor ceiling for the grate is implied: ceiling is split
  cc.visible = false;
  for (const [z0, z1] of [[6, GZ1], [GZ0, -18]]) { const c = box(5, 0.08, z0 - z1, M(0x2a2826, { r: 1 })); c.position.set(0, -0.1, (z0 + z1) / 2); scene.add(c); }
  for (const s of [-1, 1]) { const c = box(2.5 - GW / 2, 0.08, GZ1 - GZ0, M(0x2a2826, { r: 1 })); c.position.set(s * (GW / 2 + (2.5 - GW / 2) / 2), -0.1, (GZ0 + GZ1) / 2); scene.add(c); }
  const exitS = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.05), new THREE.MeshBasicMaterial({ color: 0x18c060 })); exitS.position.set(-2.38, FY + 2.8, -9); exitS.rotation.y = Math.PI / 2; scene.add(exitS);
  const exL = new THREE.PointLight(0x30ff80, 1.5, 4, 1.5); exL.position.set(-2.0, FY + 2.7, -9); scene.add(exL);
  // night lighting in the corridor; one lamp right under the grate throws slat shadows up into the duct
  for (const z of [-1.5, -12]) { const l = new THREE.PointLight(0xffdcb0, 5, 9, 1.4); l.position.set(0, FY + 3.0, z); scene.add(l); const fx = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.2), new THREE.MeshBasicMaterial({ color: 0xffe8c8 })); fx.position.set(0, -0.16, z); scene.add(fx); }
  const grateL = new THREE.PointLight(0xffdcb0, 7, 7, 1.3); grateL.position.set(0.9, FY + 2.6, -7.6); grateL.castShadow = true; grateL.shadow.mapSize.set(1024, 1024); grateL.shadow.bias = -0.002; scene.add(grateL);
  const gfx = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.2), new THREE.MeshBasicMaterial({ color: 0xffe8c8 })); gfx.position.set(0.9, -0.16, -7.6); scene.add(gfx);
  // light leaking in through side grilles along the duct
  for (const z of [2.5, -1.5, -4.0, -10]) { const l = new THREE.PointLight(0x7a8cb8, 0.9, 2.6, 1.6); l.position.set(0.42, 0.55, z); scene.add(l); const sl = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.12), new THREE.MeshBasicMaterial({ color: 0x55607a })); sl.position.set(0.484, 0.55, z); sl.rotation.y = -Math.PI / 2; scene.add(sl); }
  const redL = new THREE.PointLight(0xff2020, 0, 9, 1.3); redL.position.set(1.5, FY + 2.8, -3); scene.add(redL);
  const keyL = new THREE.DirectionalLight(0xffe6d2, 0); scene.add(keyL, keyL.target);
  return { scene, keyL, dust, redL, FY, grate: [GZ0, GZ1] };
}

// ---------------------------------------------------------------- VAN interior (front = -z, rear doors at +z)
export function buildVanInterior() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020203);
  scene.add(new THREE.HemisphereLight(0x404a60, 0x100c08, 0.45));
  const rib = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#34363a'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 32) { const gr = g.createLinearGradient(x, 0, x + 32, 0); gr.addColorStop(0, '#2a2c30'); gr.addColorStop(0.5, '#4a4c52'); gr.addColorStop(1, '#2a2c30'); g.fillStyle = gr; g.fillRect(x, 0, 32, h); } });
  rib.wrapS = rib.wrapT = THREE.RepeatWrapping; rib.repeat.set(6, 1);
  const wallM = new THREE.MeshStandardMaterial({ map: rib, roughness: 0.55, metalness: 0.5 });
  const W = 1.8, Hh = 1.65, L = 3.3;
  for (const s of [-1, 1]) { const w = box(0.04, Hh, L, wallM); w.position.set(s * W / 2, Hh / 2, 0); scene.add(w); }
  const floor = box(W, 0.04, L, M(0x1a1a1c, { r: 0.8, m: 0.3 })); floor.position.y = -0.02; scene.add(floor);
  const roof = box(W, 0.04, L, M(0x2a2a2e, { r: 0.9 })); roof.position.y = Hh; scene.add(roof);
  const bulk = box(W, Hh, 0.04, wallM); bulk.position.set(0, Hh / 2, -L / 2); scene.add(bulk);
  const hatch = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshBasicMaterial({ color: 0x0c1018 })); hatch.position.set(-0.4, 1.2, -L / 2 + 0.03); scene.add(hatch);
  const benchM = M(0x1c1c20, { r: 0.7 });
  for (const s of [-1, 1]) { const b = box(0.42, 0.42, L - 0.3, benchM); b.position.set(s * (W / 2 - 0.23), 0.21, 0.05); scene.add(b); const pad = box(0.4, 0.06, L - 0.3, M(0x0f0f12, { r: 0.9 })); pad.position.set(s * (W / 2 - 0.23), 0.45, 0.05); scene.add(pad); }
  // rear doors (hinged on the outside edges)
  const doors = [];
  for (const s of [-1, 1]) {
    const pv = new THREE.Group(); pv.position.set(s * W / 2, 0, L / 2); scene.add(pv);
    const d = box(W / 2, Hh, 0.05, wallM); d.position.set(-s * W / 4, Hh / 2, 0); pv.add(d);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.35), new THREE.MeshBasicMaterial({ color: 0x1a2030 })); win.position.set(-s * W / 4, 1.15, -0.03); win.rotation.y = Math.PI; pv.add(win);
    doors.push({ pv, s, win });
  }
  // outside world seen through the open doors: wet road, rain, street lamps rushing away
  const road = new THREE.Mesh(new THREE.PlaneGeometry(14, 60), new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.15, metalness: 0.6 })); road.rotation.x = -Math.PI / 2; road.position.set(0, -0.45, L / 2 + 30); scene.add(road);
  const lampGeo = new THREE.BufferGeometry(); const lampPos = new Float32Array(30 * 3); lampGeo.setAttribute('position', new THREE.BufferAttribute(lampPos, 3));
  const lamps = new THREE.Points(lampGeo, new THREE.PointsMaterial({ map: glowTex, size: 1.2, color: 0xffb060, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(lamps);
  const rainN = 800, rp = new Float32Array(rainN * 6), seeds = []; { const r = rng(9); for (let k = 0; k < rainN; k++) seeds.push([r() * 10 - 5, r() * 5, L / 2 + 0.6 + r() * 14]); }
  const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rp, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0x9aa8c8, transparent: true, opacity: 0.3 })); scene.add(rain);
  const passL = new THREE.PointLight(0xffb070, 0, 6, 1.6); scene.add(passL);
  const dome = new THREE.PointLight(0xffd8a8, 7, 5, 1.4); dome.position.set(0, 1.55, -0.6); scene.add(dome);
  const domeM = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.03, 0.1), new THREE.MeshBasicMaterial({ color: 0xffe8c0 })); domeM.position.set(0, Hh - 0.03, -0.6); scene.add(domeM);
  const update = (t, open) => {
    // passing street lamps: amber light sweeping front -> back through the rear windows
    const ph = (t * 0.9) % 1;
    passL.position.set(0.7, 1.3, L / 2 + 0.4 - ph * 1.2); passL.intensity = Math.sin(ph * Math.PI) ** 2 * (open ? 40 : 14);
    for (let i = 0; i < 30; i++) { const z = L / 2 + 1 + ((i * 4 + t * 14) % 60); lampPos.set([(i % 2 ? -4 : 4), 3.2, z], i * 3); }
    lampGeo.attributes.position.needsUpdate = true;
    for (let k = 0; k < rainN; k++) { const [x, y0, z0] = seeds[k]; const y = ((y0 - t * 9) % 5 + 5) % 5 - 0.4; const z = L / 2 + 0.6 + ((z0 - L / 2 - 0.6 + t * 6) % 14); rp.set([x, y, z, x, y - 0.25, z - 0.25], k * 6); }
    rainGeo.attributes.position.needsUpdate = true;
    rain.visible = open; road.visible = open; lamps.visible = open;
  };
  const keyL = new THREE.DirectionalLight(0xffe6d2, 0); scene.add(keyL, keyL.target);
  return { scene, keyL, doors, update, dome, passL, W, L };
}

// ---------------------------------------------------------------- SEINE QUAY (road along x, river at -z)
export function buildQuay() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0d1020, 0.018);
  scene.background = new THREE.Color(0x070912);
  scene.add(new THREE.HemisphereLight(0x3a4870, 0x100c08, 0.7));
  const moon = new THREE.DirectionalLight(0x8a9ad8, 0.6); moon.position.set(-20, 30, -10); scene.add(moon);
  const asph = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#18191c'; g.fillRect(0, 0, w, h); const r = rng(3); for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? 0 : 255},${r() < 0.5 ? 0 : 255},${r() < 0.5 ? 0 : 255},${r() * 0.05})`; g.fillRect(r() * w, r() * h, 2, 2); } for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(0,0,0,${0.2 + r() * 0.3})`; g.beginPath(); g.ellipse(r() * w, r() * h, 20 + r() * 50, 8 + r() * 20, r() * 3, 0, 7); g.fill(); } });
  asph.wrapS = asph.wrapT = THREE.RepeatWrapping; asph.repeat.set(20, 3);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(200, 14), new THREE.MeshStandardMaterial({ map: asph, roughness: 0.32, metalness: 0.25 })); road.rotation.x = -Math.PI / 2; road.position.set(0, 0, 4); road.receiveShadow = true; scene.add(road);
  const kerbM = M(0x8a8478, { r: 0.8 });
  const parapet = box(200, 0.9, 0.5, kerbM); parapet.position.set(0, 0.45, -3.2); parapet.receiveShadow = true; scene.add(parapet);
  const wall = box(200, 6, 0.5, M(0x5a554c, { r: 0.9 })); wall.position.set(0, -3, -3.2); scene.add(wall);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(400, 160), new THREE.MeshStandardMaterial({ color: 0x04060c, roughness: 0.08, metalness: 0.95 })); water.rotation.x = -Math.PI / 2; water.position.set(0, -4.5, -83); scene.add(water);
  const walk = box(200, 0.3, 11, M(0x6a655a, { r: 0.9 })); walk.position.set(0, 0.0, 15); scene.add(walk);
  // Haussmann facades behind the road
  const fac = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#b8a888'; g.fillRect(0, 0, w, h); for (let c = 0; c < 8; c++) for (let f = 0; f < 4; f++) { g.fillStyle = '#1e1e24'; g.fillRect(14 + c * 64, 30 + f * 56, 30, 40); } for (let f = 0; f < 4; f++) { g.fillStyle = '#2a2a2a'; g.fillRect(0, 70 + f * 56, w, 4); } });
  const facE = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); const r = rng(14); for (let c = 0; c < 8; c++) for (let f = 0; f < 4; f++) if (r() < 0.3) { g.fillStyle = r() < 0.8 ? '#ffb868' : '#a8c4ff'; g.fillRect(14 + c * 64, 30 + f * 56, 30, 40); } });
  for (let x = -100; x < 100; x += 18) {
    const h = 17 + (Math.abs(x * 7) % 5);
    const fm = fac.clone(); fm.needsUpdate = true; const fe = facE.clone(); fe.needsUpdate = true;
    const b = box(17.6, h, 12, new THREE.MeshStandardMaterial({ map: fm, emissive: 0xffffff, emissiveMap: fe, emissiveIntensity: 0.9, roughness: 0.9 })); b.position.set(x, h / 2, 26.5); scene.add(b);
    const rf = box(17.6, 3, 11, M(0x3a4252, { r: 0.5, m: 0.4 })); rf.position.set(x, h + 1.5, 26.5); scene.add(rf);
  }
  // far bank + bridge
  for (let x = -200; x < 200; x += 20) { const h = 14 + (Math.abs(x * 13) % 7); const fe = facE.clone(); fe.needsUpdate = true; const fm = fac.clone(); fm.needsUpdate = true; const b = box(19.5, h, 10, new THREE.MeshStandardMaterial({ map: fm, emissive: 0xffffff, emissiveMap: fe, emissiveIntensity: 1.2, roughness: 0.9, color: 0x6a6a70 })); b.position.set(x, -4.5 + h / 2 + 4, -165); scene.add(b); }
  const bridgeM = M(0x6a6458, { r: 0.85 });
  const deck = box(12, 1.6, 160, bridgeM); deck.position.set(-70, 2.6, -84); scene.add(deck);
  for (let z = -150; z <= -15; z += 27) { const p = box(9, 7, 4, bridgeM); p.position.set(-70, -1.5, z); scene.add(p); }
  // street lamps along the parapet with fake water/road reflections
  const lampPos = [], lamps = [];
  const poleM = M(0x111214, { r: 0.4, m: 0.6 });
  for (let x = -96; x < 100; x += 16) {
    const p = mesh(new THREE.CylinderGeometry(0.07, 0.1, 4.6, 8), poleM); p.position.set(x, 2.3, -2.6); scene.add(p);
    lampPos.push(x, 4.65, -2.6);
    const refl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffa050, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending })); refl.position.set(x, 0.02, -0.6); refl.scale.set(1.2, 4.5, 1); scene.add(refl);
    if (Math.abs(x) < 50) { const l = new THREE.PointLight(0xffb060, 110, 18, 1.4); l.position.set(x, 4.4, -2.4); scene.add(l); lamps.push(l); }
  }
  for (let x = -60; x < 60; x += 3) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffa860, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending })); s.position.set(x, -4.4, -10 - (Math.abs(x * 31) % 40)); s.scale.set(0.8, 6, 1); scene.add(s); }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lampPos, 3));
  scene.add(new THREE.Points(lg, new THREE.PointsMaterial({ map: glowTex, size: 2.0, color: 0xffc070, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
  // stairs down from the street (where the crew arrives)
  const rainN = 3500, rp = new Float32Array(rainN * 6), seeds = [];
  { const r = rng(45); for (let k = 0; k < rainN; k++) seeds.push([r() * 40 - 20, r() * 12, r() * 16 - 4]); }
  const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rp, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xb0bedc, transparent: true, opacity: 0.28 })); scene.add(rain);
  const updateRain = (t, cx = 0) => {
    for (let k = 0; k < rainN; k++) { const [x, y0, z] = seeds[k]; const y = ((y0 - t * 13) % 12 + 12) % 12; rp.set([cx + x + 0.06, y, z, cx + x, y - 0.45, z], k * 6); }
    rainGeo.attributes.position.needsUpdate = true;
  };
  const keyL = new THREE.DirectionalLight(0xffe6d2, 0); scene.add(keyL, keyL.target);
  return { scene, keyL, updateRain };
}
