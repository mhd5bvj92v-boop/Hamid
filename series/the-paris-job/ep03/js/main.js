// THE PARIS JOB — Part 3/5 "Lockdown". Deterministic timeline: window.renderAt(t).
import * as THREE from 'three';
import { makePerson, makeMask, M, kf, talk, blinkAt, walk, clamp, smooth, easeOut, easeIn, lerp } from '../../shared/person.js';
import { buildGallery, rng, canvasTex, glowTex } from '../../shared/world.js';
import { buildExterior } from '../../shared/louvre.js';
import { makeBeam } from '../../shared/sets2.js';
import { buildDuct, buildQuay, buildVanInterior, makeVan, makePoliceCar, makeDog, makeTube, makeTracker, makeUVLamp } from '../../shared/sets3.js';
import { makeCast } from '../../shared/cast2.js';
import { makePost } from '../../shared/post.js';

const W = 1080, H = 1920, PI = Math.PI;
const lin = u => u;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(40, W / H, 0.03, 2000);
const post = makePost(renderer, W, H);

// ---------------------------------------------------------------- sets
const gal = buildGallery(), ext = buildExterior(), duct = buildDuct(), quay = buildQuay(), van = buildVanInterior();
const SC = { gal, ext, duct, quay, van };
gal.posts.forEach(p => p.visible = false); gal.ropes.forEach(r => r.visible = false);
gal.shutter.position.y = 3; // closed since Part 2
gal.fill.intensity = 14;
gal.painting.visible = false; // the crew already has it
gal.scene.traverse(o => { if (o.isSpotLight && o.intensity === 50) o.intensity = 14; });
for (const s of Object.values(SC)) { const rim = new THREE.DirectionalLight(0x9ab8ff, 0); s.scene.add(rim, rim.target); s.rim = rim; }
// gallery: vent grille high on the left wall + police strobes through the skylight
const vent = new THREE.Group(); vent.position.set(-4.83, 4.7, -3.2); vent.rotation.y = PI / 2; gal.scene.add(vent);
vent.add(new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.6), new THREE.MeshBasicMaterial({ color: 0x050506 })));
for (let y = -0.25; y <= 0.25; y += 0.07) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.025, 0.04), M(0x6a6e74, { r: 0.4, m: 0.8 })); b.position.set(0, y, 0.02); b.rotation.x = 0.5; vent.add(b); }
const skyTex = canvasTex(128, 512, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#000'; for (let x = 0; x <= w; x += 32) g.fillRect(x - 3, 0, 6, h); for (let y = 0; y <= h; y += 32) g.fillRect(0, y - 3, w, 6); const r = rng(4); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.35})`; g.fillRect(r() * w, r() * h, 2, 6 + r() * 14); } });
const skyBlue = new THREE.Mesh(new THREE.PlaneGeometry(4, 16), new THREE.MeshBasicMaterial({ color: 0x000000, map: skyTex })); skyBlue.rotation.x = PI / 2; skyBlue.position.set(0, 5.96, -1); gal.scene.add(skyBlue);
const blueL = [[-1.2, 7.0, -3], [1.2, 7.0, 0.5]].map(([x, y, z]) => { const l = new THREE.SpotLight(0x2a5aff, 0, 22, 0.75, 0.6, 1.0); l.position.set(x, y, z); l.target.position.set(x * 0.5, 0, z - 1); gal.scene.add(l, l.target); return l; });
const alarmPulse = t => 0.5 + 0.5 * Math.cos(((t * 1.6) % 1) * 2 * PI);
const strobe = (t, seed = 0) => { const ph = (t * 2.6 + seed) % 1; return (ph < 0.1 || (ph > 0.2 && ph < 0.3)) ? 1 : 0; };

// exterior: police cordon, roof walkway, helicopter searchlight
const extCars = [[-11, 26, 0.6], [12, 30, -0.4], [-4, 40, 1.2], [7, 44, PI + 0.3], [-16, 38, PI / 2], [17, 22, 2.2]].map(([x, z, r], i) => { const c = makePoliceCar(); c.position.set(x, 0, z); c.rotation.y = r; ext.scene.add(c); return c; });
const roofM = M(0x5a6070, { r: 0.4, m: 0.6 });
{ const walkw = new THREE.Mesh(new THREE.BoxGeometry(60, 0.12, 2.2), roofM); walkw.position.set(0, 26.05, -90.6); walkw.receiveShadow = true; ext.scene.add(walkw);
  for (let x = -24; x <= 24; x += 8) { const ch = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.2, 0.9), M(0x7a5a48, { r: 0.9 })); ch.position.set(x + 3, 27.1, -99.6); ext.scene.add(ch); }
  const hatch = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 1.0), M(0x2a2c30, { r: 0.5, m: 0.6 })); hatch.position.set(-12, 26.25, -92.3); ext.scene.add(hatch); }
const yardBlue = new THREE.PointLight(0x2a50ff, 0, 160, 1.0); yardBlue.position.set(0, 22, -70); ext.scene.add(yardBlue);
const heli = makeBeam(60, 0.05, 0xdfe8ff, 0.07); ext.scene.add(heli);
const heliSpot = new THREE.SpotLight(0xdfe8ff, 0, 120, 0.07, 0.4, 0.6); ext.scene.add(heliSpot, heliSpot.target);
const heliGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); heliGlow.scale.set(6, 6, 1); ext.scene.add(heliGlow);

// quay: van + passing police cars
const vanX = makeVan(); quay.scene.add(vanX);
const qCars = [0, 1].map(() => { const c = makePoliceCar(); c.rotation.y = PI; quay.scene.add(c); return c; });

// ---------------------------------------------------------------- cast + props
const C = makeCast();
const { victor, sasha, marco, camille } = C;
camille.root.traverse(o => { if (o.material && o.material.color && o.material.color.getHex() === 0xa02a18) { o.material = o.material.clone(); o.material.color.setHex(0x5c1c12); } });
delete C.masked; delete C.guard; delete C.comte;
const officer = (seed) => makePerson({ real: true, skin: seed ? 0xc89a80 : 0xa87458, shirt: 0x141c30, pants: 0x0e1322, shoes: 0x080808, hairStyle: 'guardcap', capColor: 0x0e1424, hair: 0x2a2018, eye: 0x3a2a1a, lip: 0x9a6458, scale: seed ? 1.0 : 1.04, build: 1.12 });
C.cop1 = officer(0); C.cop2 = officer(1);
const flashOf = p => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.026, 0.2, 10), M(0x111111, { r: 0.4, m: 0.6 })); b.rotation.x = PI / 2; g.add(b);
  const sp = new THREE.SpotLight(0xfff1d6, 0, 14, 0.32, 0.45, 1.3); sp.castShadow = true; sp.shadow.mapSize.set(1024, 1024); sp.shadow.bias = -0.0008; sp.position.z = 0.11; g.add(sp); const tg = new THREE.Object3D(); tg.position.z = 5; g.add(tg); sp.target = tg;
  const bm = makeBeam(6, 0.32, 0xfff1d6, 0.07); bm.position.z = 0.11; g.add(bm); g.userData.sp = sp; g.position.set(0.0, -0.07, 0.05); p.arms[1].hand.add(g); return g; };
const fl1 = flashOf(C.cop1), fl2 = flashOf(C.cop2);
const dog = makeDog(); duct.scene.add(dog.root);
const tube = makeTube(); tube.position.set(0.05, 0.3, -0.17); tube.rotation.set(0, 0, 0.42); camille.spine.add(tube);
const tracker = makeTracker();
const TRACK_SLOT = { p: V3(0.0, -0.24, -0.064), r: new THREE.Euler(-PI / 2, 0, 0) };
const heldMask = makeMask(); heldMask.position.set(0, -0.08, 0.06); heldMask.rotation.set(-0.3, PI, 0); camille.arms[0].hand.add(heldMask);
const uv = makeUVLamp(); uv.position.set(0, -0.08, 0.05); sasha.arms[1].hand.add(uv);
const headlamp = new THREE.SpotLight(0xdde6ff, 0, 5, 0.6, 0.6, 1.6); headlamp.position.set(0, 0.2, 0.12); const hlT = new THREE.Object3D(); hlT.position.set(0, -0.6, 1.2); camille.head.add(headlamp, hlT); headlamp.target = hlT;
const spill = new THREE.PointLight(0xc8d4ff, 0, 2.2, 1.6); spill.position.set(0, 0.25, 0.25); camille.head.add(spill);
const phone = new THREE.PointLight(0x6a9cff, 0, 1.6, 1.6); phone.position.set(0, -0.05, 0.08); sasha.arms[0].hand.add(phone);
// the (fake) painting in the van, with an ultraviolet layer
function drawPortrait(g, w, h) {
  const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#5f6a4a'); bg.addColorStop(0.5, '#4a5238'); bg.addColorStop(1, '#2c2a1c'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = '#7a8a6a'; g.beginPath(); g.moveTo(0, 140); g.bezierCurveTo(60, 110, 120, 150, 256, 120); g.lineTo(256, 180); g.lineTo(0, 190); g.fill();
  g.fillStyle = '#1e1810'; g.beginPath(); g.ellipse(128, 130, 56, 76, 0, 0, 7); g.fill();
  g.fillStyle = '#d6a96e'; g.beginPath(); g.ellipse(128, 128, 36, 47, 0, 0, 7); g.fill();
  g.fillStyle = '#1e1810'; g.beginPath(); g.moveTo(40, 360); g.quadraticCurveTo(50, 200, 128, 185); g.quadraticCurveTo(206, 200, 216, 360); g.fill();
  g.fillStyle = '#d6a96e'; g.beginPath(); g.ellipse(128, 300, 50, 16, 0, 0, 7); g.fill();
  const sh = g.createRadialGradient(118, 120, 4, 128, 132, 46); sh.addColorStop(0, 'rgba(255,230,190,0.35)'); sh.addColorStop(1, 'rgba(60,30,10,0.35)'); g.fillStyle = sh; g.beginPath(); g.ellipse(128, 128, 36, 47, 0, 0, 7); g.fill();
  g.fillStyle = 'rgba(60,35,20,0.55)'; g.beginPath(); g.ellipse(115, 121, 6, 2.6, 0, 0, 7); g.ellipse(141, 121, 6, 2.6, 0, 0, 7); g.fill();
  g.strokeStyle = 'rgba(110,60,40,0.5)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(118, 150); g.quadraticCurveTo(128, 153, 139, 149); g.stroke();
  g.strokeStyle = 'rgba(120,80,50,0.4)'; g.beginPath(); g.moveTo(128, 124); g.lineTo(126, 139); g.stroke();
  const r = rng(3); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.08})`; g.fillRect(r() * w, r() * h, 1, 3 + r() * 6); }
}
const portraitTex = canvasTex(512, 720, (g, w, h) => { g.scale(2, 2); drawPortrait(g, 256, 360); });
const uvTex = canvasTex(512, 720, (g, w, h) => {
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  const r = rng(77); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 260; i++) { const x = r() * w, y = r() * h; g.strokeStyle = `rgba(150,255,190,${0.05 + r() * 0.12})`; g.lineWidth = 3 + r() * 9; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (r() - 0.5) * 80, y + (r() - 0.5) * 40, x + (r() - 0.5) * 120, y + (r() - 0.5) * 60); g.stroke(); }
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = 'rgba(190,255,215,0.95)'; g.font = 'italic 700 64px Georgia, serif'; g.save(); g.translate(410, 660); g.rotate(-0.12); g.fillText('C.', 0, 0); g.restore();
  g.strokeStyle = 'rgba(190,255,215,0.7)'; g.lineWidth = 3; g.beginPath(); g.moveTo(392, 672); g.quadraticCurveTo(440, 690, 490, 664); g.stroke();
});
const vPainting = new THREE.Group(); van.scene.add(vPainting);
{ const gold = M(0xb8892c, { r: 0.35, m: 0.8 });
  const fr = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.98, 0.05), gold); fr.castShadow = true; vPainting.add(fr);
  const pp = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.85), new THREE.MeshStandardMaterial({ map: portraitTex, roughness: 0.7 })); pp.position.z = 0.027; vPainting.add(pp);
  const up = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.85), new THREE.MeshBasicMaterial({ map: uvTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); up.position.z = 0.029; vPainting.add(up);
  vPainting.userData.uv = up; vPainting.userData.base = pp; }

// ---------------------------------------------------------------- acting helpers
const idle = () => [[0.05, 0.1, 0, 0.18], [0.05, 0.1, 0, 0.18]];
const faceTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
const seat = (s = 1) => 0.5 - 0.92 * s;
function crawl(P, ph, amt) { // prone, moving head-first
  const s = Math.sin(ph), c = Math.cos(ph);
  P.arms = [[2.35 + 0.35 * s * amt, 0.25, 0.2, 0.9 - 0.4 * s * amt], [2.35 - 0.35 * s * amt, 0.25, 0.2, 0.9 + 0.4 * s * amt]];
  P.legs = [[0.25 + 0.2 * c * amt, 0.55 - 0.25 * c * amt], [0.25 - 0.2 * c * amt, 0.55 + 0.25 * c * amt]];
  P.side = 0.05 * s * amt; P.twist = 0.06 * c * amt;
  return P;
}
const prone = (x, headZ, s, extra) => ({ x, z: headZ + 1.62 * s, y: 0.15, ry: PI, rx: PI / 2, hp: -1.05, ...extra });
const run = (P, t, ph, amt = 1.35) => { walk(P, t * 10 + ph, amt); P.lean = 0.22; P.arms = P.arms.map(a => [a[0] * 1.6, 0.12, 0, 1.3]); return P; };

// world positions
const hp = p => p.head.getWorldPosition(new THREE.Vector3());
const fc = (h, ry, dist, side = 0, dy = 0) => [h.x + Math.sin(ry) * dist + Math.cos(ry) * side, h.y + dy, h.z + Math.cos(ry) * dist - Math.sin(ry) * side];
const dn = (h, d) => [h.x, h.y - d, h.z];

// duct timeline: Camille's head z
const camZ = t => kf(t, [[20, -2.2], [27.2, -5.0], [29.6, -6.42], [33.4, -6.42], [34.5, -7.4]], lin);
const dogP = t => kf(t, [[27.4, -13.5], [30.2, -6.9], [32.9, -6.9], [34.5, -2.5]], lin);
const VAN0 = 0; // van x at the quay
const vanPos = t => t < 42.4 ? VAN0 : VAN0 + 2.2 * (t - 42.4) ** 2 * 0.5 * (1 + 0.6 * (t - 42.4));

function poses(t, sc) {
  const P = {};
  if (sc === 'gal') {
    const pulse = alarmPulse(t);
    const V = P.victor = { x: 0, z: -1.05, ry: PI, arms: idle(), blink: blinkAt(t, 1), furrow: 0.55, lid: 0.12, hp: 0.05 };
    const Ca = P.camille = { x: 0.05, z: -1.95, ry: 0.0, arms: [[0.3, 0.12, 0.2, 0.45], [0.05, 0.1, 0, 0.18]], blink: blinkAt(t, 9), lid: 0.22, smirk: 0.12, hp: -0.03 };
    const S = P.sasha = { x: -1.05, z: -0.45, ry: faceTo(-1.05, -0.45, 0, -1.6), arms: idle(), blink: blinkAt(t, 2), furrow: 0.45, hy: 0 };
    V.mouth = talk(t, 4.2, 6.3, 1) * 0.65 + talk(t, 10.1, 12.0, 2) * 0.6;
    Ca.mouth = talk(t, 6.5, 8.3, 3) * 0.55 + talk(t, 17.1, 18.9, 4) * 0.55 + talk(t, 19.0, 19.95, 5) * 0.55;
    S.mouth = talk(t, 8.5, 9.9, 6) * 0.6;
    Ca.hy = kf(t, [[8.4, 0], [8.8, -0.25], [9.9, -0.25], [10.3, 0]]); // glance at Sasha
    S.hy = kf(t, [[8.2, 0.3], [8.6, -0.25], [10.0, -0.25], [10.4, 0.25]]); S.ex = kf(t, [[9.6, 0], [10.0, 0.6]]);
    V.lid = kf(t, [[10.0, 0.12], [11.0, 0.3]]); V.hp = kf(t, [[10, 0.05], [11.5, 0.12]]);
    Ca.smirk = kf(t, [[6.4, 0.12], [7.0, 0.3], [11.0, 0.3], [11.6, 0.0]]);
    if (t >= 12) { // everybody looks up at the skylight
      const up = kf(t, [[12.3, 0], [13.0, 1]]);
      for (const p of [V, Ca, S]) { p.hp = lerp(p.hp ?? 0, -0.45, up); p.ey = 0.6 * up; p.browL = p.browR = 0.3 * up; }
    }
    if (t >= 17) { // Camille turns to the vent and points
      Ca.hp = kf(t, [[17, -0.2], [17.6, -0.38]]); Ca.hy = 0;
      Ca.ry = kf(t, [[17.0, 0.0], [17.8, -1.25]]); Ca.x = 0.05; Ca.z = -1.95;
      Ca.arms[1] = lerp([0.05, 0.1, 0, 0.18], [2.0, 0.35, 0.1, 0.1], kf(t, [[17.3, 0], [17.9, 1], [18.6, 1], [19.0, 0]]));
      if (t >= 18.95) { Ca.ry = 0; Ca.hp = -0.03; Ca.hy = 0; }
      V.hy = kf(t, [[17.2, 0], [17.9, 0.7]]); V.hp = -0.35; V.ey = 0.4;
      Ca.smirk = kf(t, [[19.0, 0], [19.4, 0.25]]);
    }
    return P;
  }
  if (sc === 'duct') {
    const cz = camZ(t), moving = t < 29.6 || t > 33.4 ? 1 : 0;
    const Ca = P.camille = crawl(prone(0.02, cz, 0.96, { blink: blinkAt(t, 9), lid: 0.15, furrow: 0.35 }), t * 3.2, moving);
    const Sa = P.sasha = crawl(prone(-0.04, cz + 1.12, 0.94, { blink: blinkAt(t, 2), furrow: 0.3 }), t * 3.2 + 1.1, moving);
    const Vi = P.victor = crawl(prone(0.03, cz + 3.35, 1, { blink: blinkAt(t, 1), furrow: 0.45 }), t * 3.2 + 2.0, moving);
    // tracker plant 23.0-25.4
    if (t >= 22.6 && t < 25.6) {
      const reach = kf(t, [[22.8, 0], [23.6, 1], [24.9, 1], [25.4, 0]]);
      Sa.arms = [[2.35, 0.25, 0.2, 0.9], lerp(Sa.arms[1], [2.75, -0.05, 0.1, 0.25], reach)];
      Sa.hp = -1.15; Sa.ey = 0.5;
      Ca.arms = [[2.4, 0.25, 0.2, 0.9], [2.4, 0.25, 0.2, 0.9]]; Ca.legs = [[0.25, 0.55], [0.25, 0.55]];
    }
    Vi.ex = kf(t, [[25.6, 0], [26.1, 0.25], [26.6, 0.25], [27.0, -0.1]]); Vi.ey = kf(t, [[25.6, 0.3], [26.1, -0.2], [26.6, -0.2], [27.0, 0.4]]);
    Vi.lid = kf(t, [[25.9, 0.0], [26.3, 0.25]]); Vi.furrow = kf(t, [[25.8, 0.45], [26.3, 0.75]]);
    if (t >= 29.6 && t < 33.6) { // looking down through the grate, frozen
      Ca.hp = kf(t, [[29.6, -1.05], [30.0, 0.15]]); Ca.lid = kf(t, [[31.6, 0.15], [32.0, 0.0], [33.0, 0.0], [33.3, 0.2]]); Ca.browL = Ca.browR = 0.25;
      Ca.mouth = kf(t, [[31.8, 0.0], [32.2, 0.12], [33.2, 0.12], [33.5, 0]]);
      Ca.blink = 0;
    }
    // below: dog + two officers walking +z
    const dz = dogP(t), walking = (t < 30.2 || t > 32.9);
    const D = { x: 0.15, y: duct.FY, z: dz, ry: 0, phase: t * 9, amt: walking ? 1 : 0.1 };
    if (!walking) { const up = kf(t, [[30.6, 0], [31.1, 1], [32.3, 1], [32.7, 0]]); D.neck = -0.55 * up; D.hp = -0.4 * up + Math.sin(t * 20) * 0.03 * (1 - up); D.hy = kf(t, [[30.2, 0.3], [30.6, 0]]); }
    if (t >= 33 && t < 33.4) D.neck = -0.2;
    P.dog = D;
    const c1z = kf(t, [[27.4, -15.5], [30.6, -8.2], [32.9, -8.0], [34.5, -4.0]], lin), c2z = c1z - 1.4;
    const c1 = P.cop1 = { x: 0.65, z: c1z, y: duct.FY, ry: 0, arms: idle(), blink: blinkAt(t, 4), furrow: 0.3 };
    const c2 = P.cop2 = { x: -0.7, z: c2z, y: duct.FY, ry: 0, arms: idle(), blink: blinkAt(t, 5) };
    for (const c of [c1, c2]) { if (t < 30.6 || t > 32.9) walk(c, t * 5.6 + c.x, 0.7); c.arms[1] = [1.2, 0.05, 0.1, 0.3]; }
    c1.arms[0] = [0.5, -0.05, 0.2, 0.7]; // leash hand
    if (t >= 30.6 && t < 33.0) { c2.arms[1] = [1.2 + kf(t, [[30.9, 0], [31.4, 0.75], [32.4, 0.75], [32.8, 0]]), 0.05, 0.1, 0.3]; c2.hp = kf(t, [[30.9, 0], [31.4, -0.5], [32.4, -0.5], [32.8, 0]]); c2.hy = 0.2; }
    if (t >= 32.6) { c1.mouth = talk(t, 32.9, 34.0, 7) * 0.5; c1.hy = -0.4; }
    return P;
  }
  if (sc === 'ext') { // running along the Louvre roof
    const base = kf(t, [[34.0, -9], [37.6, 4.5]], lin);
    P.camille = run({ x: base + 2.2, z: -90.6, y: 26.11, ry: PI / 2, blink: 0 }, t, 0);
    P.sasha = run({ x: base + 0.6, z: -90.4, y: 26.11, ry: PI / 2 }, t, 1.7);
    P.victor = run({ x: base - 1.1, z: -90.7, y: 26.11, ry: PI / 2 }, t, 3.1);
    return P;
  }
  if (sc === 'quay') {
    if (t < 40.8) { // run to the van, climb in
      const u = (x0, d) => clamp((t - 37.6 - d) / 2.4);
      const path = (d, ph, x0) => { const v = u(x0, d); const x = lerp(x0, -0.6, smooth(v)), z = lerp(4.6, 2.75, smooth(clamp(v * 1.5 - 0.5))); const p = { x, z, ry: faceTo(0, 0, 1, (2.75 - 4.6) * 0.15), blink: 0 }; if (v < 1) run(p, t, ph, 1.2 * Math.sin(Math.max(0.15, v) * PI * 0.5 + PI * 0.5) + 0.3); else { p.ry = 0; p.arms = idle(); } return { p, v }; };
      const a = path(0, 0, -13), b = path(0.35, 1.5, -15), c = path(0.7, 2.8, -16.5);
      if (t < 39.7) P.camille = a.p; if (t < 40.1) P.sasha = b.p; if (t < 40.5) P.victor = c.p;
    }
    const vx = vanPos(t);
    P.marco = { x: vx + 0.95, y: 1.03 - 0.92 * 1.05, z: -0.45, ry: PI / 2, legs: [[1.45, 1.45], [1.45, 1.45]], arms: [[1.25, 0.18, 0.2, 0.55], [1.25, 0.18, 0.2, 0.55]], blink: blinkAt(t, 3), lid: 0.3, furrow: 0.25, mouth: talk(t, 41.0, 42.0, 8) * 0.45, hy: kf(t, [[40.8, 0], [41.4, -0.35], [41.9, -0.35], [42.2, 0]]) };
    if (t >= 52) { // Camille alone in the road, the van gone
      const rise = kf(t, [[52.4, 0], [53.4, 1]]);
      const Ca = P.camille = { x: 30, z: 2.6, ry: PI / 2, y: lerp(-0.45, 0, rise), lean: lerp(0.6, 0.08, rise), legs: lerp([[1.6, 2.3], [1.2, 1.8]], [[0, 0], [0, 0]], rise), arms: lerp([[0.9, 0.2, 0.3, 0.6], [0.7, 0.2, 0.2, 0.4]], idle(), rise), blink: blinkAt(t, 9), lid: 0.25, hp: lerp(0.4, 0, rise) };
      Ca.hy = kf(t, [[53.6, 0], [54.4, -0.5]]); Ca.smirk = kf(t, [[54.0, 0], [54.6, 0.35]]);
    }
    return P;
  }
  if (sc === 'van') {
    const V = P.victor = { x: -0.6, z: -0.55, y: seat(1), ry: PI / 2, legs: [[1.5, 1.4], [1.5, 1.4]], arms: [[0.75, 0.2, 0.2, 0.75], [0.75, 0.2, 0.2, 0.75]], blink: blinkAt(t, 1), lid: 0.2, furrow: 0.45, hp: 0.25, lean: 0.12 };
    const S = P.sasha = { x: 0.6, z: -0.25, y: seat(0.94), ry: -PI / 2, legs: [[1.5, 1.4], [1.5, 1.4]], arms: [[0.4, 0.15, 0, 0.6], [lerp(0.4, 1.05, kf(t, [[44.6, 0], [45.4, 1]])), 0.05, 0.25, lerp(0.6, 0.55, 1)]], blink: blinkAt(t, 2), furrow: 0.35, lean: kf(t, [[44.4, 0.05], [45.4, 0.32]]), hp: 0.35 };
    if (t < 51.4) P.camille = { x: 0.6, z: 1.15, y: seat(0.96), ry: -PI / 2, legs: [[1.5, 1.4], [1.5, 1.4]], arms: [[0.3, 0.15, 0.2, 0.5], [0.3, 0.15, 0.2, 0.5]], blink: blinkAt(t, 9), lid: 0.35, hp: 0.1, hy: kf(t, [[44.5, 0.2], [45.6, 0.55]]) };
    S.mouth = talk(t, 45.8, 46.5, 9) * 0.4 + talk(t, 46.7, 48.5, 10) * 0.5;
    V.mouth = talk(t, 48.8, 50.2, 11) * 0.55;
    S.browL = S.browR = kf(t, [[46.6, 0], [47.0, 0.45]]);
    V.lid = kf(t, [[48.6, 0.2], [49.4, 0.35]]);
    if (t >= 49.8) { // everybody turns to the back of the van
      const turn = kf(t, [[49.8, 0], [50.4, 1]]);
      V.hy = -1.0 * turn; V.hp = lerp(0.25, 0.0, turn); V.ex = -0.7 * turn; V.browL = V.browR = 0.5 * turn; V.lid = lerp(0.35, -0.1, turn);
      S.hy = 1.0 * turn; S.hp = lerp(0.35, 0.05, turn); S.ex = 0.7 * turn; S.browL = S.browR = 0.6 * turn;
    }
    return P;
  }
  return P;
}

// ---------------------------------------------------------------- shots
const shake = (t, a) => V3(Math.sin(t * 1.3) * a + Math.sin(t * 2.9) * a * 0.4, Math.sin(t * 1.9 + 1) * a * 0.7, Math.sin(t * 0.9 + 2) * a * 0.5);
const head = (p, ...a) => () => hp(p);
const shots = [
  // --- gallery, red alarm
  { t0: 0.0, t1: 4.0, sc: 'gal', fov: 28, cam: t => { const h = hp(camille); return [[h.x + 0.5, h.y + 0.02, h.z + kf(t, [[0, 2.9], [4, 2.15]], lin)], dn(h, 0.06)]; }, sh: 0.004, ap: 0.006 },
  { t0: 4.0, t1: 6.4, sc: 'gal', fov: 28, cam: t => { const h = hp(victor); return [[h.x - 0.5, h.y + 0.02, h.z - kf(t, [[4, 2.5], [6.4, 2.3]], lin)], dn(h, 0.08)]; }, sh: 0.003 },
  { t0: 6.4, t1: 8.4, sc: 'gal', fov: 28, cam: t => { const h = hp(camille); return [[h.x + 0.5, h.y + 0.02, h.z + kf(t, [[6.4, 2.4], [8.4, 2.25]], lin)], dn(h, 0.08)]; }, sh: 0.003 },
  { t0: 8.4, t1: 10.0, sc: 'gal', fov: 28, cam: t => { const h = hp(sasha); return [[-0.62, h.y + 0.0, kf(t, [[8.4, -2.55], [10, -2.45]], lin)], dn(h, 0.08)]; }, sh: 0.003 },
  { t0: 10.0, t1: 12.0, sc: 'gal', fov: 26, cam: t => { const h = hp(victor); return [[h.x - 0.38, h.y + 0.01, h.z - kf(t, [[10, 2.2], [12, 1.95]], lin)], dn(h, 0.06)]; }, sh: 0.002 },
  { t0: 12.0, t1: 14.9, sc: 'gal', fov: 52, cam: t => [[kf(t, [[12, 1.6], [14.9, 1.3]], lin), 0.95, kf(t, [[12, 2.4], [14.9, 2.0]], lin)], [-0.3, kf(t, [[12, 3.0], [14.9, 4.4]], lin), -2.2]], sh: 0.005, ap: 0.0, key: 0.25 },
  // --- outside: the cordon (title card)
  { t0: 14.9, t1: 17.0, sc: 'ext', fov: 42, cam: t => [[kf(t, [[14.9, -26], [17, -22]], lin), kf(t, [[14.9, 13], [17, 11.5]], lin), 92], [0, 4, 18]], sh: 0.03, ap: 0.0 },
  // --- the vent
  { t0: 17.0, t1: 18.95, sc: 'gal', fov: 36, cam: t => [[kf(t, [[17, 1.3], [18.95, 1.1]], lin), 1.35, -0.7], [-3.6, 3.7, -3.0]], sh: 0.003, ap: 0.002 },
  { t0: 18.95, t1: 20.0, sc: 'gal', fov: 28, key: 0.25, cam: t => { const h = hp(camille); return [[h.x + 0.45, h.y + 0.02, h.z + kf(t, [[18.95, 2.2], [20, 2.1]], lin)], dn(h, 0.08)]; }, sh: 0.003 },
  // --- duct
  { t0: 20.0, t1: 23.0, sc: 'duct', fov: 40, key: 0.3, cam: t => { const z = camZ(t); return [[0.12, 0.42, z - kf(t, [[20, 2.1], [23, 1.6]], lin)], [0.0, 0.25, z + 1.5]]; }, sh: 0.003, ap: 0.005 },
  { t0: 23.0, t1: 25.4, sc: 'duct', fov: 30, cam: t => { const p = tube.localToWorld(V3(0, -0.2, -0.06)); return [[0.34, p.y + 0.22, p.z - kf(t, [[23, 0.2], [25.4, 0.12]], lin)], [p.x, p.y - 0.02, p.z + 0.1]]; }, sh: 0.002, ap: 0.012 },
  { t0: 25.4, t1: 27.4, sc: 'duct', fov: 34, cam: t => { const h = hp(victor); return [[h.x + 0.3, 0.32, h.z - kf(t, [[25.4, 0.66], [27.4, 0.6]], lin)], [h.x, h.y + 0.02, h.z]]; }, sh: 0.002, ap: 0.008 },
  { t0: 27.4, t1: 30.0, sc: 'duct', fov: 50, cam: t => [[0.3, 0.66, -5.95], [0.05, duct.FY, -7.7]], sh: 0.002, ap: 0.0 },
  { t0: 30.0, t1: 31.8, sc: 'duct', fov: 58, cam: t => [[1.75, duct.FY + kf(t, [[30, 0.8], [31.8, 0.9]], lin), kf(t, [[30, -4.7], [31.8, -4.9]], lin)], [0.0, duct.FY + 1.6, -6.75]], sh: 0.003, ap: 0.0 },
  { t0: 31.8, t1: 33.0, sc: 'duct', fov: 30, cam: t => { const h = hp(camille); return [[h.x + 0.12, kf(t, [[31.8, -0.8], [33, -0.7]], lin), h.z + 0.18], [h.x, h.y, h.z]]; }, up: [0, 0, -1], sh: 0.0015, ap: 0.004 },
  { t0: 33.0, t1: 34.0, sc: 'duct', fov: 58, cam: t => [[1.75, duct.FY + 0.95, -4.95], [0.0, duct.FY + 1.3, -6.0]], sh: 0.003, ap: 0.0 },
  // --- roof
  { t0: 34.0, t1: 37.6, sc: 'ext', fov: 50, cam: t => [[kf(t, [[34, -9], [37.6, -1]], lin), 28.3, -101], [kf(t, [[34, -2], [37.6, 6]], lin), 27.0, -90]], sh: 0.012, ap: 0.0 },
  // --- quay
  { t0: 37.6, t1: 40.8, sc: 'quay', fov: 38, cam: t => [[kf(t, [[37.6, 6.5], [40.8, 5.6]], lin), 1.25, 10.5], [-3.5, 1.2, 2.4]], sh: 0.006, ap: 0.002 },
  { t0: 40.8, t1: 42.4, sc: 'quay', fov: 30, cam: t => { const h = hp(marco); return [[h.x + 0.75, h.y + 0.05, h.z - 1.75], dn(h, 0.1)]; }, sh: 0.003, ap: 0.006 },
  { t0: 42.4, t1: 44.0, sc: 'quay', fov: 44, cam: t => [[-5, 2.4, 11.5], [kf(t, [[42.4, 4], [44, 9]], lin), 1.0, 2.5]], sh: 0.004, ap: 0.0 },
  // --- inside the van
  { t0: 44.0, t1: 46.4, sc: 'van', fov: 58, cam: t => [[kf(t, [[44, -0.2], [46.4, -0.1]], lin), 1.5, -1.55], [0.1, 0.55, 0.9]], sh: 0.008, ap: 0.002 },
  { t0: 46.4, t1: 48.6, sc: 'van', fov: 34, cam: t => { const p = vPainting.getWorldPosition(new THREE.Vector3()), q = vPainting.localToWorld(V3(0.08, -0.12, 0)); return [[p.x + 0.5, p.y + kf(t, [[46.4, 0.75], [48.6, 0.62]], lin), p.z - 0.15], [q.x, q.y, q.z]]; }, sh: 0.006, ap: 0.006 },
  { t0: 48.6, t1: 50.4, sc: 'van', fov: 30, cam: t => { const h = hp(victor); return [[h.x + 1.15, h.y + 0.05, h.z - 0.75], dn(h, 0.1)]; }, sh: 0.006, ap: 0.006 },
  { t0: 50.4, t1: 52.4, sc: 'van', fov: 56, cam: t => [[-0.1, 1.25, kf(t, [[50.4, -0.4], [52.4, -0.1]], lin)], [0.25, 0.75, 1.7]], sh: 0.012, ap: 0.0, key: 0 },
  // --- Camille in the road
  { t0: 52.4, t1: 54.4, sc: 'quay', fov: 34, cam: t => [[kf(t, [[52.4, 25.6], [54.4, 26.3]], lin), 1.15, 3.6], [36, 1.0, 2.2]], sh: 0.004, ap: 0.003 },
  { t0: 54.4, t1: 55.6, sc: 'quay', fov: 28, cam: t => { const p = tracker.getWorldPosition(new THREE.Vector3()); return [[p.x - 0.42, p.y + 0.12, p.z + kf(t, [[54.4, 0.3], [55.6, 0.24]], lin)], [p.x, p.y, p.z]]; }, sh: 0.0015, ap: 0.014 },
  { t0: 55.6, t1: 61, sc: 'none' },
];

const subs = [
  ['VICTOR', 'Five years. Not a word.', 4.2, 6.3],
  ['CAMILLE', 'You’d have done the same.', 6.5, 8.3],
  ['SASHA', 'Who is she?', 8.5, 9.95],
  ['VICTOR', 'The reason I went to prison.', 10.1, 11.95],
  ['POLICE RADIO', 'All units. Denon wing. Nobody leaves.', 12.3, 14.85],
  ['CAMILLE', 'There’s a way out. The ventilation.', 17.1, 18.9],
  ['CAMILLE', 'Fifty-fifty.', 19.0, 19.95],
  ['OFFICER', 'Nothing. Move on.', 32.9, 33.95],
  ['MARCO', 'Seatbelts.', 41.0, 42.35],
  ['SASHA', 'Wait…', 45.8, 46.5],
  ['SASHA', 'This paint is a week old.', 46.7, 48.55],
  ['VICTOR', 'She switched it.', 48.8, 50.35],
];
const subColor = { VICTOR: '#f5c04a', SASHA: '#ff6fae', MARCO: '#4fd1c5', OFFICER: '#9fb8ff', 'POLICE RADIO': '#9fb8ff', CAMILLE: '#ff4a4a' };

// ---------------------------------------------------------------- overlays
const $ = id => document.getElementById(id);
const grainCtx = $('grain').getContext('2d');
$('grain').style.opacity = 0.09;
function drawGrain(t) {
  const r = rng(Math.floor(t * 30) * 7 + 1), img = grainCtx.createImageData(270, 480);
  for (let i = 0; i < img.data.length; i += 4) { const v = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  grainCtx.putImageData(img, 0, 0);
}
const pad = n => String(Math.max(0, Math.floor(n))).padStart(2, '0');
let lastSub = '';
const grade = {
  gal: 'contrast(1.12) saturate(0.85) brightness(0.95)', ext: 'contrast(1.1) saturate(0.9)', duct: 'contrast(1.15) saturate(0.7) brightness(1.05)',
  quay: 'contrast(1.12) saturate(0.85)', van: 'contrast(1.12) saturate(0.85)',
};
function overlays(t, shot) {
  const s = subs.find(s => t >= s[2] && t < s[3]);
  if (s) {
    if (s[1] !== lastSub) { $('subText').innerHTML = s[1].split(' ').map(w => `<span class="w">${w}</span>`).join(' '); $('subName').textContent = s[0]; $('subName').style.color = subColor[s[0]]; lastSub = s[1]; }
    const words = $('subText').querySelectorAll('.w'); const dur = Math.min(s[3] - s[2] - 0.4, words.length * 0.2);
    words.forEach((w, i) => { const u = clamp((t - s[2] - (i / words.length) * dur) / 0.16); w.style.opacity = u; w.style.transform = `translateY(${(1 - easeOut(u)) * 10}px)`; });
    $('sub').style.opacity = clamp((s[3] - t) / 0.15);
    $('subText').style.fontStyle = s[0] === 'POLICE RADIO' ? 'italic' : 'normal';
  } else $('sub').style.opacity = 0;
  const ti = clamp((t - 15.1) / 0.5), to = clamp((16.9 - t) / 0.3);
  $('title').style.opacity = Math.min(ti, to); $('title').style.transform = `scale(${1.08 - 0.08 * easeOut(ti)})`;
  $('titleSub').style.opacity = clamp((t - 15.6) / 0.5) * to;
  $('loc').textContent = t < 30 ? 'MUSÉE DU LOUVRE  ·  02:21' : 'QUAI DES TUILERIES  ·  02:34';
  $('loc').style.top = t < 30 ? '1560px' : '230px';
  $('loc').style.opacity = t > 14.9 && t < 17.0 ? clamp((t - 15.2) / 0.4) * clamp((16.9 - t) / 0.3) : (t > 37.6 && t < 40.6 ? clamp((t - 37.8) / 0.4) * clamp((40.5 - t) / 0.3) : 0);
  $('badge').style.opacity = t < 55.6 ? 1 : 0;
  const left = 41 * 3600 + 57 * 60 + 20 - t;
  $('clockT').textContent = `${pad(left / 3600)}:${pad((left / 60) % 60)}:${pad(left % 60)}`;
  $('clock').style.opacity = t < 55.6 ? clamp(t / 0.4) : 0;
  $('clock').style.transform = t < 4 ? `scale(${1 + 0.35 * (1 - clamp((t - 0.6) / 0.6))})` : '';
  $('clock').style.transformOrigin = '100% 0';
  const red = shot.sc === 'gal' && t < 20;
  $('alarm').style.opacity = red ? 0.06 + 0.12 * alarmPulse(t) : 0;
  $('stage').style.filter = grade[shot.sc] || '';
  $('flash').style.opacity = 0;
  const e = t - 55.6;
  $('black').style.opacity = t >= 55.6 ? 1 : clamp((t - 55.35) / 0.25);
  $('end').style.opacity = e > 0 ? 1 : 0;
  $('endShow').style.opacity = clamp((e - 0.9) / 0.4);
  $('endEp').style.opacity = clamp((e - 1.3) / 0.4);
  $('endTitle').style.opacity = clamp((e - 1.6) / 0.3);
  $('endTitle').style.transform = `scale(${1.1 - 0.1 * easeOut(clamp((e - 1.6) / 0.5))})`;
  $('endFollow').style.opacity = clamp((e - 2.4) / 0.4);
  $('vig').style.opacity = t >= 55.6 ? 0 : 1;
  $('cctv').style.display = 'none'; $('timer').style.opacity = 0; $('prev').style.opacity = 0; $('earlier').style.opacity = 0; $('alarmTxt').style.opacity = 0;
}

// ---------------------------------------------------------------- render
function placeTracker(t) {
  // in Sasha's hand until 24.3, then glides onto the tube slot; blinks once attached
  const slot = new THREE.Matrix4().compose(TRACK_SLOT.p, new THREE.Quaternion().setFromEuler(TRACK_SLOT.r), V3(1, 1, 1));
  const slotW = tube.matrixWorld.clone().multiply(slot);
  const sp = new THREE.Vector3(), sq = new THREE.Quaternion(), ss = new THREE.Vector3(); slotW.decompose(sp, sq, ss);
  let u = 1;
  if (t < 24.6) {
    const hand = sasha.arms[1].hand; const hpz = hand.localToWorld(V3(0, -0.07, 0.03)); const hq = hand.getWorldQuaternion(new THREE.Quaternion());
    u = kf(t, [[23.9, 0], [24.5, 1]]);
    tracker.position.lerpVectors(hpz, sp, u); tracker.quaternion.slerpQuaternions(hq, sq, u);
  } else { tracker.position.copy(sp); tracker.quaternion.copy(sq); }
  tracker.userData.set(u >= 1 ? ((t * 1.25) % 1) < 0.22 : false);
}

window.renderAt = function (t) {
  const shot = shots.find(s => t >= s.t0 && t < s.t1) || shots[shots.length - 1];
  drawGrain(t); overlays(t, shot);
  if (shot.sc === 'none') { renderer.setClearColor(0x000000); renderer.clear(); return; }
  const set = SC[shot.sc];
  const P = poses(t, shot.sc);
  for (const [name, person] of Object.entries(C)) {
    if (P[name]) { set.scene.add(person.root); person.apply(P[name]); person.root.visible = true; }
    else person.root.visible = false;
  }
  dog.root.visible = !!P.dog; if (P.dog) dog.apply(P.dog);
  heldMask.visible = shot.sc === 'gal';
  tube.visible = true;
  uv.visible = shot.sc === 'van';
  headlamp.intensity = shot.sc === 'duct' ? 3 : 0; spill.intensity = shot.sc === 'duct' ? 1.2 : 0; phone.intensity = shot.sc === 'duct' && t < 29.6 ? 1.5 : 0;
  // per-set animation
  const pulse = alarmPulse(t);
  if (shot.sc === 'gal') {
    gal.alarms.forEach(l => l.intensity = 26 * pulse);
    const sb = (0.25 + 0.75 * Math.max(strobe(t), strobe(t, 0.5) * 0.8)) * (t >= 12 ? 1 : 0);
    blueL.forEach((l, i) => l.intensity = (i ? strobe(t, 0.5) : strobe(t)) * 220 * (t >= 12 ? 1 : 0) + (t >= 12 ? 12 : 0));
    skyBlue.material.color.setRGB(0.06 * sb, 0.16 * sb, 0.75 * sb);
  }
  if (shot.sc === 'ext') {
    ext.updateRain(t);
    extCars.forEach((c, i) => c.userData.update(t, i, window.OVR && window.OVR.nocars ? 0 : 1.4, false));
    const a = t * 0.35; const hx = 30 * Math.sin(a), hz = 40 + 20 * Math.cos(a * 0.7);
    const src = V3(-40, 70, 10), tgt = t < 30 ? V3(hx, 0, hz) : V3(kf(t, [[34, -30], [37.6, -10]], lin), 26, -84);
    heli.position.copy(src); heli.lookAt(tgt); heli.scale.set(1, 1, src.distanceTo(tgt) / 60);
    heliSpot.position.copy(src); heliSpot.target.position.copy(tgt); heliSpot.target.updateMatrixWorld(); heliSpot.intensity = t < 30 ? 0 : 120; heli.visible = t >= 30;
    heliGlow.position.copy(src); heliGlow.visible = !(window.OVR && window.OVR.nohg); yardBlue.intensity = (window.OVR && window.OVR.noyb) ? 0 : (t < 30 ? 350 : 1500) * Math.max(strobe(t), strobe(t, 0.5));
  }
  if (shot.sc === 'duct') {
    tracker.parent !== duct.scene && duct.scene.add(tracker);
    duct.dust.rotation.y = Math.sin(t * 0.2) * 0.01;
    fl1.userData.sp.intensity = 34; fl2.userData.sp.intensity = 34;
    fl1.rotation.set(-0.15 + Math.sin(t * 1.3) * 0.08, Math.sin(t * 0.9) * 0.2, 0);
    fl2.rotation.set(t > 30.6 && t < 32.9 ? -kf(t, [[30.9, 0.1], [31.4, 0.75], [32.4, 0.75], [32.8, 0.1]]) : -0.1, 0.1 + Math.sin(t * 1.1) * 0.2, 0);
    duct.redL.intensity = 0;
  } else if (shot.sc === 'quay' && t > 52) { quay.scene.add(tracker); }
  if (shot.sc === 'quay') {
    quay.updateRain(t, t > 52 ? 30 : 0);
    const vx = vanPos(t); vanX.position.set(vx, 0, 1.6);
    vanX.userData.setDoor(t < 40.0 ? 1 : kf(t, [[40.0, 1], [40.6, 0]]));
    vanX.userData.setLights(t > 40.6, t > 52 ? 0 : (t < 42.4 ? 1 : 0));
    if (t > 52) vanX.position.x = 30 + 14 + (t - 52.4) * 9;
    qCars.forEach((c, i) => { c.position.set(34 - (t - 42.3 - i * 0.5) * 28, 0, 6.8 - i * 1.6); c.visible = t > 41 && t < 52; c.userData.update(t, i, 1.0, true); });
    vanX.userData.cabL.intensity = t > 40.8 && t < 42.4 ? 0.8 + 2.5 * strobe(t, 0.2) : 0.6;
    if (t > 40.8 && t < 42.4) vanX.userData.cabL.color.setHex(strobe(t, 0.2) ? 0x3a60ff : 0x9ab0ff);
  }
  if (shot.sc === 'van') {
    const open = t >= 50.4;
    van.update(t, open);
    const dOpen = open ? kf(t, [[50.4, 0.35], [51.2, 1.1], [52.4, 0.9]]) : 0;
    van.doors.forEach(d => d.pv.rotation.y = -d.s * dOpen * (d.s > 0 ? 1 : 0.15));
    const uvOn = kf(t, [[45.5, 0], [45.6, 1], [50.3, 1], [50.4, 0]]);
    uv.userData.set(uvOn); van.dome.intensity = lerp(0.9, 0.25, uvOn);
    vPainting.position.set(-0.18, 0.68, -0.45); vPainting.rotation.set(-0.75, PI / 2, 0, 'YXZ');
    vPainting.userData.uv.material.opacity = uvOn * kf(t, [[45.6, 0.25], [46.8, 1]]); vPainting.userData.base.material.color.setRGB(lerp(1, 0.35, uvOn), lerp(1, 0.25, uvOn), lerp(1, 0.6, uvOn));
    const rock = Math.sin(t * 2.3) * 0.004 + Math.sin(t * 5.1) * 0.002;
    van.scene.position.y = rock;
  }
  set.scene.updateMatrixWorld();
  if (shot.sc === 'duct' || (shot.sc === 'quay' && t > 52)) placeTracker(t);
  let [p, l] = shot.cam(t);
  if (window.OVR && window.OVR.cam) [p, l] = window.OVR.cam;
  camera.fov = shot.fov; camera.updateProjectionMatrix();
  camera.up.set(...(shot.up || [0, 1, 0])); camera.position.set(...p); if (shot.sh) camera.position.add(shake(t, shot.sh));
  camera.lookAt(...l); camera.updateMatrixWorld();
  const kl = set.keyL; kl.intensity = shot.key ?? (shot.fov < 40 ? (shot.sc === 'duct' ? 0.35 : 0.55) : 0);
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  kl.position.copy(camera.position).addScaledVector(right, -1.4).add(V3(0, 0.9, 0));
  kl.target.position.set(...l); kl.target.updateMatrixWorld();
  const look = V3(...l), back = look.clone().sub(camera.position).normalize();
  set.rim.position.copy(look).addScaledVector(back, 3).addScaledVector(right, 1.2).add(V3(0, 1.5, 0));
  set.rim.target.position.copy(look); set.rim.target.updateMatrixWorld();
  set.rim.intensity = shot.fov < 40 ? (shot.rim ?? (shot.sc === 'gal' ? 0.4 : 1.6)) : 0;
  set.rim.color.setHex(shot.sc === 'gal' && t < 12 ? 0xff6a5a : (shot.sc === 'van' && t > 45.5 ? 0x9a70ff : 0x9ab8ff));
  const focus = camera.position.distanceTo(look);
  post.render(set.scene, camera, focus, shot.ap ?? (shot.fov <= 36 ? 0.006 : 0.0025));
};
window.DURATION = 60.0;
await document.fonts.ready;
window.READY = true;
window.DBG = () => { const o = {}; for (const [n, p] of Object.entries(C)) if (p.root.visible) { const h = hp(p); o[n] = [h.x, h.y, h.z].map(v => +v.toFixed(2)); } o.cam = camera.position.toArray().map(v => +v.toFixed(2)); return o; };
