// THE PARIS JOB — Episode 2 "The Competition". Deterministic timeline: window.renderAt(t).
import * as THREE from 'three';
import { makePerson, makeMask, M, kf, talk, blinkAt, walk, clamp, smooth, easeOut, easeIn, lerp } from '../../shared/person.js';
import { buildGallery, rng } from '../../shared/world.js';
import { buildExterior, buildCorridor } from '../../shared/louvre.js';

const W = 1080, H = 1920, PI = Math.PI;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(50, W / H, 0.05, 2000);

const ext = buildExterior(), cor = buildCorridor(), gal = buildGallery();
const SC = { ext, cor, gal };

// ---------------------------------------------------------------- cast
const victor = makePerson({ skin: 0xc8977c, shirt: 0x17171c, collar: 0x17171c, pants: 0x2c2f36, hair: 0x16110d, hairStyle: 'slick', eye: 0x3b2a1a, lip: 0xa0705f, browThick: 1.2 });
const sasha = makePerson({ skin: 0x87583f, shirt: 0x5b3fa0, hood: true, pants: 0x1c1c22, shoes: 0xeeeeee, hair: 0x15100c, hairStyle: 'curlyBun', glasses: true, earrings: true, lashes: true, lip: 0x6e3530, eye: 0x24160c, scale: 0.93 });
const marco = makePerson({ skin: 0xdcb09a, shirt: 0x5a3420, jacketFront: 0xe9e6df, pants: 0x2e4a78, shoes: 0x3a2414, hairStyle: 'beanie', beanie: 0xb3261e, hair: 0x6a3418, beard: 0x8a4a22, brow: 0x6a3418, eye: 0x3a6a8a, lip: 0xb8706a, scale: 1.06, build: 1.22 });
const masked = makePerson({ skin: 0x101012, mask: true, hairStyle: 'hood', shirt: 0x0d0d10, pants: 0x0d0d10, gloves: 0x0a0a0a, shoes: 0x050505, scale: 0.96 });
const camille = makePerson({ skin: 0xf0c8b0, hairStyle: 'ponytail', hair: 0xb8341c, shirt: 0x0d0d10, collar: 0x0d0d10, pants: 0x0d0d10, gloves: 0x0a0a0a, shoes: 0x050505, lashes: true, lip: 0xb02a3a, eye: 0x3a7a4a, scale: 0.96 });
const guard = makePerson({ skin: 0xe2b49c, shirt: 0x22305a, pants: 0x1b2238, hairStyle: 'guardcap', hair: 0x5a4030, mustache: 0x4a3020, brow: 0x4a3020, eye: 0x4a3a2a, lip: 0xb06a60, scale: 1.04, build: 1.3 });
const CAST = { victor, sasha, marco, masked, camille, guard };

// props
function makeSandwich() {
  const g = new THREE.Group();
  const lay = (h, c, y, wv = 1) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.17 * wv, h, 0.1), M(c, { r: 0.8 })); b.position.y = y; b.castShadow = true; g.add(b); };
  lay(0.03, 0xd9a35c, 0); lay(0.012, 0x5fb43a, 0.02, 1.08); lay(0.01, 0xe23b2e, 0.031); lay(0.008, 0xf5c842, 0.04, 1.05); lay(0.012, 0xe48a8a, 0.05); lay(0.035, 0xd9a35c, 0.072);
  return g;
}
const handSandwich = makeSandwich(); handSandwich.rotation.set(0, 0, PI / 2); handSandwich.position.set(0, -0.07, 0.04);
marco.arms[0].hand.add(handSandwich);
const floorSandwich = makeSandwich(); cor.scene.add(floorSandwich);
const guardSandwich = makeSandwich(); guardSandwich.rotation.set(0.15, 0.45, 0.05); guardSandwich.position.set(-0.07, -0.12, 0.2); guardSandwich.scale.setScalar(0.8); guard.head.add(guardSandwich);
const giftBag = new THREE.Group();
{
  const c = document.createElement('canvas'); c.width = 256; c.height = 300; const g = c.getContext('2d');
  g.fillStyle = '#efe6d2'; g.fillRect(0, 0, 256, 300);
  g.fillStyle = '#1b1b1b'; g.font = '900 34px Inter'; g.textAlign = 'center'; g.fillText('LOUVRE', 128, 150); g.font = '700 22px Inter'; g.fillText('BOUTIQUE', 128, 185);
  g.strokeStyle = '#1b1b1b'; g.lineWidth = 6; g.beginPath(); g.moveTo(128, 60); g.lineTo(168, 120); g.lineTo(88, 120); g.closePath(); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const bag = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.3, 0.1), [M(0xefe6d2), M(0xefe6d2), M(0xefe6d2), M(0xefe6d2), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 })]);
  bag.position.y = -0.2; bag.castShadow = true; giftBag.add(bag);
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 12), M(0xd8c7a0)); roll.position.set(0.05, -0.05, 0); giftBag.add(roll); // rolled poster sticking out
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 6, 16, PI), M(0x1b1b1b)); handle.position.y = -0.05; giftBag.add(handle);
  giftBag.position.set(0, -0.05, 0);
}
marco.arms[1].hand.add(giftBag);
const heldMask = makeMask(); heldMask.position.set(0, -0.08, 0.06); heldMask.rotation.set(-0.3, PI, 0); camille.arms[0].hand.add(heldMask);

// ---------------------------------------------------------------- acting
const idleArms = () => [[0.05, 0.1, 0, 0.18], [0.05, 0.1, 0, 0.18]];
const behind = () => [[-0.25, 0.12, 0, 0.5], [-0.25, 0.12, 0, 0.5]];
const sneak = (P, t, amt = 1) => { walk(P, t * 7, amt); P.lean = 0.18 * amt; P.legs = P.legs.map(([h, k]) => [h + 0.15, k + 0.25]); P.y = -0.06; P.arms = [[0.55, 0.15, 0.2, 1.3], [0.55, 0.15, 0.2, 1.3]]; return P; };
const faceTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);

function poses(t) {
  const P = {};
  // ---------------- S0 recap (gallery, CCTV): masked waving at camera
  if (t < 2.6) {
    const camAng = faceTo(0.25, -4.85, 3.3, 2.6);
    P.masked = { x: 0.25, z: -4.85, ry: camAng, hp: -0.38, hr: 0.15, arms: [[0.2, 2.5 + 0.25 * Math.sin(t * 14), 0, 0.5], [0.05, 0.1, 0, 0.15]] };
    return P;
  }
  // ---------------- S1 exterior: sneaking across the courtyard
  if (t < 7.0) {
    const z = lerp(52, 46, (t - 2.6) / 4.4);
    P.victor = sneak({ x: -0.15, z, ry: PI }, t);
    P.sasha = sneak({ x: 0.45, z: z + 1.5, ry: PI }, t + 0.3);
    P.marco = sneak({ x: -0.3, z: z + 3.0, ry: PI }, t + 0.6);
    P.marco.arms[0] = [0.4, 0.15, 0.2, 1.3];
    return P;
  }
  // ---------------- corridor 7.0 – 23.2
  if (t < 23.2) {
    P.victor = { x: 0, z: 4.0, ry: PI, arms: idleArms(), blink: blinkAt(t, 1) };
    P.sasha = { x: -0.75, z: 4.4, ry: PI - 0.15, arms: idleArms(), blink: blinkAt(t, 2), mouth: 0.08 + 0.08 * Math.max(0, Math.sin(t * 7)) };
    P.marco = { x: 0.8, z: 4.5, ry: PI + 0.15, arms: [[0.55, 0.15, 0.3, 1.45], [0.15, 0.12, 0, 0.3]], blink: blinkAt(t, 3) };
    P.guard = { x: 0.6, y: 0.5 - 0.92 * 1.04, z: -10.1, ry: 0, legs: [[1.45, 1.4], [1.45, 1.4]], arms: [[0.6, 0.1, 0.3, 1.1], [0.6, 0.1, 0.3, 1.1]], hp: 0.15, lid: 0.55, lean: 0.05 };
    const V = P.victor, S = P.sasha, Mo = P.marco, G = P.guard;
    // gift shop exchange
    Mo.mouth = talk(t, 7.3, 9.1, 9); Mo.smile = 0.35;
    const lift = kf(t, [[7.4, 0], [7.9, 1], [9.0, 1], [9.4, 0]]);
    Mo.arms[1] = lerp([0.15, 0.12, 0, 0.3], [1.15, -0.15, 0.7, 0.95], lift);
    Mo.hy = kf(t, [[7.3, 0], [7.6, 0.35], [9.2, 0.35], [9.5, 0]]); Mo.browL = Mo.browR = 0.4 * lift;
    S.mouth = Math.max(S.mouth, talk(t, 9.3, 11.0, 2) * 0.8);
    S.hy = kf(t, [[9.0, 0], [9.3, -0.55], [11.2, -0.55], [11.5, 0]]); S.lid = kf(t, [[9.2, 0], [9.6, 0.45]]); S.browL = kf(t, [[9.2, 0], [9.6, 0.8]]);
    // Victor: step one
    V.mouth = talk(t, 11.4, 12.6, 5); V.furrow = 0.4; V.smirk = 0.3;
    V.hy = kf(t, [[11.2, 0], [11.5, 0.5], [12.7, 0.5], [13, 0]]);
    // Marco crouch + slide
    const cr = kf(t, [[12.2, 0], [12.6, 1], [13.8, 1], [14.3, 0]]);
    Mo.legs = [[cr * 1.1, cr * 1.7], [cr * 0.9, cr * 1.5]]; Mo.y = -cr * 0.33; Mo.lean = cr * 0.35;
    const sw = kf(t, [[12.6, 0], [12.95, 1]], easeOut);
    if (t > 12.2 && t < 14.3) Mo.arms[0] = lerp([0.3, 0.15, 0.1, 0.4], [0.9, 0.1, 0.1, 0.1], sw);
    handSandwich.visible = t < 12.95;
    // floor sandwich
    const u = kf(t, [[12.95, 0], [15.4, 1]], easeOut);
    floorSandwich.visible = t >= 12.95 && t < 16.6;
    floorSandwich.position.set(lerp(0.75, 0.45, u), 0.03, lerp(3.75, -8.55, u));
    floorSandwich.rotation.set(0, u * 2.2, 0);
    // guard: sniff, eat, sleep
    G.hp = kf(t, [[15.6, 0.15], [16.0, -0.22], [16.45, -0.22], [16.6, 0.5], [16.8, 0.05]]);
    G.lid = kf(t, [[15.6, 0.55], [15.9, 1.0], [16.4, 1.0], [16.6, 0.3], [17.0, 0.6]]);
    G.smile = kf(t, [[15.7, 0], [16.1, 0.6]]);
    G.lean = kf(t, [[16.4, 0.05], [16.6, 0.65], [16.8, 0.08]]);
    const bite = t > 16.75 && t < 18.3;
    guardSandwich.visible = bite;
    if (t > 16.6) G.arms[0] = [1.5, -0.8, 0.5, 2.2];
    if (t > 18.3) G.arms[0] = [0.4, 0.1, 0.3, 1.2];
    G.mouth = t > 16.8 && t < 18.6 ? 0.15 + 0.35 * Math.max(0, Math.sin(t * 9)) : 0;
    if (t > 18.5) { const sl = kf(t, [[18.5, 0], [19.0, 1]]); G.hp = lerp(0.05, 0.55, sl); G.hr = 0.3 * sl; G.lid = 1; G.smile = 0.7; G.lean = -0.1 * sl; }
    // reactions
    S.mouth = Math.max(S.mouth, talk(t, 19.5, 21.2, 4)); if (t > 19.3) { S.browL = S.browR = 0.9; S.lid = -0.1; S.hy = -0.3; }
    Mo.mouth = Math.max(Mo.mouth, talk(t, 21.3, 23.1, 10)); if (t > 21.1) { Mo.smile = 0.5; Mo.hp = -0.12; Mo.hy = 0.3; Mo.browL = 0.5; }
    return P;
  }
  // ---------------- gallery 23.2 – 54.6
  const wIn = clamp((t - 23.2) / 2.4);
  const walkIn = (x0, z0, x1, z1, seed) => { const p = { x: lerp(x0, x1, smooth(wIn)), z: lerp(z0, z1, smooth(wIn)), ry: PI, arms: idleArms(), blink: blinkAt(t, seed) }; if (wIn < 1) walk(p, t * 7 + seed, Math.sin(wIn * PI) * 0.8); return p; };
  const V = P.victor = walkIn(0, 4, 0, -0.9, 1);
  const S = P.sasha = walkIn(-0.9, 4.4, -0.95, -0.5, 2);
  const Mo = P.marco = walkIn(0.95, 4.5, 1.0, -0.55, 3);
  S.mouth = 0.08 + 0.08 * Math.max(0, Math.sin(t * 7));
  Mo.arms = [[0.2, 0.15, 0.2, 0.8], [0.15, 0.12, 0, 0.3]];
  // the competition
  const Mk = P.masked = { x: 0.15, z: -4.95, ry: PI, arms: [[0.05, 0.1, 0, 0.15], [0.05, 0.1, 0, 0.15]] };
  V.mouth = talk(t, 25.6, 27.8, 6); V.furrow = kf(t, [[25.4, 0], [25.8, 0.6]]);
  Mk.hy = kf(t, [[28.0, 0], [28.5, 0.6]]);
  Mk.ry = kf(t, [[28.4, PI], [29.4, 2 * PI]]); if (t > 28.4) Mk.hy = kf(t, [[28.4, 0.6], [29.2, 0]]);
  Mk.hr = kf(t, [[29.5, 0], [30.0, 0.18], [31.6, 0.18], [32, 0]]);
  V.mouth += talk(t, 31.8, 33.9, 7); if (t > 31.6) { V.browL = V.browR = 0.5; V.furrow = -0.2; }
  // Marco charges
  if (t >= 34.0) {
    const c = clamp((t - 34.0) / 1.5);
    Mo.x = lerp(1.0, 0.25, c); Mo.z = lerp(-0.55, -5.0, c); Mo.ry = faceTo(1.0, -0.55, 0.25, -5.0);
    if (c < 1) { walk(Mo, (t - 34) * 13, 1.5); Mo.lean = 0.3; Mo.arms = [[1.2, 0.3, 0, 0.4], [1.2, 0.3, 0, 0.4]]; }
    Mo.browL = Mo.browR = -0.3; Mo.furrow = 0.8; Mo.mouth = 0.6;
    const fall = kf(t, [[35.45, 0], [35.9, 1]], easeIn);
    if (t > 35.45) { Mo.rx = fall * 1.45; Mo.y = fall * 0.12; Mo.arms = lerp(Mo.arms, [[2.6, 0.4, 0, 0.3], [2.6, 0.4, 0, 0.3]], fall); Mo.legs = [[0.1, 0.2], [-0.1, 0.4]]; Mo.lean = 0; Mo.bob = 0; }
    if (t > 36.0) { Mo.hp = kf(t, [[38.4, 0.0], [38.8, -0.9]]); Mo.mouth = talk(t, 38.6, 40.8, 11) * 0.7; Mo.lid = 0.35; Mo.smile = 0.2; Mo.furrow = 0; }
    Mk.x = kf(t, [[34.85, 0.15], [35.25, -0.95]], easeOut); Mk.z = kf(t, [[34.85, -4.95], [35.25, -4.75]]);
    Mk.ry = kf(t, [[34.85, 2 * PI], [35.25, 2 * PI + 0.6]]);
    S.mouth = Math.max(S.mouth, talk(t, 34.2, 35.5, 8)); if (t > 34.1) { S.browL = S.browR = 1; S.lid = -0.12; S.arms = [[0.9, 0.2, 0, 0.3], [0.2, 0.1, 0, 0.2]]; }
    V.browL = V.browR = kf(t, [[34.1, 0.5], [34.4, 1]]); V.hy = kf(t, [[34.3, 0], [35.2, 0.5], [37, 0.5], [37.6, 0]]);
  }
  // masked approaches Victor
  if (t >= 41.0) {
    const a = clamp((t - 41.0) / 2.0);
    Mk.x = lerp(-0.95, -0.1, smooth(a)); Mk.z = lerp(-4.75, -1.75, smooth(a)); Mk.ry = faceTo(-0.95, -4.75, 0, -0.9);
    if (a < 1) walk(Mk, (t - 41) * 6.5, Math.sin(a * PI) * 0.9);
    if (a >= 1) Mk.ry = faceTo(-0.1, -1.75, 0, -0.9);
    Mk.hr = kf(t, [[43.5, 0], [44, -0.15]]);
    V.hy = 0; V.browL = 0.2; V.furrow = 0.4;
    S.mouth = Math.max(S.mouth, talk(t, 45.5, 47.2, 12) * 0.6);
    if (t > 45.3) { S.smile = 0.5; S.lid = 0.4; S.browL = 0.8; S.hy = kf(t, [[45.3, 0], [45.6, 0.5]]); S.ex = 0.6; }
    if (t > 46.3) { V.hy = kf(t, [[46.3, 0], [46.6, -0.5]]); V.ex = -0.8; V.lid = 0.5; V.furrow = 0.8; }
  }
  // reveal
  let reveal = false;
  if (t >= 47.5) {
    V.hy = kf(t, [[47.5, -0.5], [47.8, 0]]); V.ex = 0; V.lid = kf(t, [[49.1, 0.2], [49.4, -0.12]]);
    V.browL = V.browR = kf(t, [[49.1, 0.2], [49.4, 1]]); V.furrow = kf(t, [[49.1, 0.4], [49.4, -0.7]]);
    V.mouth = Math.max(kf(t, [[49.2, 0], [49.5, 0.45]]), talk(t, 50.8, 53.8, 13)); V.lean = kf(t, [[49.2, 0], [49.6, -0.08]]);
    const up = kf(t, [[47.7, 0], [48.4, 1]]);
    Mk.arms[0] = lerp(Mk.arms[0], [1.95, -0.35, 0.7, 1.55], up);
    reveal = t >= 48.75;
    if (reveal) {
      const down = kf(t, [[48.75, 0], [49.5, 1]]);
      P.camille = { ...Mk, arms: [lerp([1.95, -0.35, 0.7, 1.55], [0.35, 0.15, 0.2, 0.5], down), Mk.arms[1]], hr: 0.1 };
      delete P.masked;
    }
  }
  heldMask.visible = reveal;
  return P;
}

// ---------------------------------------------------------------- shots
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const hp = p => p.head.getWorldPosition(new THREE.Vector3());
const fc = (h, ry, dist, side = 0, dy = 0) => [h.x + Math.sin(ry) * dist + Math.cos(ry) * side, h.y + dy, h.z + Math.cos(ry) * dist - Math.sin(ry) * side];
const dn = (h, d) => [h.x, h.y - d, h.z];
const lin = u => u;
const shake = (t, a) => V3(Math.sin(t * 1.7) * a + Math.sin(t * 3.9) * a * 0.4, Math.sin(t * 2.3 + 1) * a * 0.7, Math.sin(t * 1.1 + 2) * a * 0.5);
const CCTV = [3.3, 3.3, 2.6];
const shots = [
  { t0: 0, t1: 2.6, sc: 'gal', fov: 62, cctv: true, cam: () => [CCTV, [-0.4, 1.0, -6.0]] },
  { t0: 2.6, t1: 7.0, sc: 'ext', fov: 50, cam: t => { const z = lerp(52, 46, (t - 2.6) / 4.4); return [[kf(t, [[2.6, 1.0], [7, 0.6]], lin), kf(t, [[2.6, 1.3], [7, 1.8]], lin), z + kf(t, [[2.6, 6.5], [7, 5.5]], lin)], [0, kf(t, [[2.6, 3.5], [7, 5.5]], lin), 0]]; }, sh: 0.01 },
  { t0: 7.0, t1: 9.2, sc: 'cor', fov: 38, cam: t => { const h = hp(marco); return [fc(h, PI - 0.3, kf(t, [[7, 2.5], [9.2, 2.3]], lin), 0, -0.15), dn(h, 0.32)]; }, sh: 0.005 },
  { t0: 9.2, t1: 11.2, sc: 'cor', fov: 36, cam: t => { const h = hp(sasha); return [fc(h, PI + 0.25, kf(t, [[9.2, 1.3], [11.2, 1.2]], lin), 0, 0), dn(h, 0.16)]; }, sh: 0.005 },
  { t0: 11.2, t1: 12.7, sc: 'cor', fov: 36, cam: t => { const h = hp(victor); return [fc(h, PI + 0.3, 1.25, 0, -0.03), dn(h, 0.17)]; }, sh: 0.005 },
  { t0: 12.7, t1: 13.6, sc: 'cor', fov: 46, cam: () => [[2.1, 1.25, 1.7], [0.55, 0.5, 4.0]], sh: 0.006 },
  { t0: 13.6, t1: 15.6, sc: 'cor', fov: 50, cam: () => { const s = floorSandwich.position; return [[s.x + 0.22, 0.12, s.z + 0.85], [s.x - 0.05, 0.25, s.z - 3]]; } },
  { t0: 15.6, t1: 19.4, sc: 'cor', fov: 38, cam: t => { const h = hp(guard); return [fc(h, -0.25, kf(t, [[15.6, 1.6], [19.4, 1.4]], lin), 0, -0.05), dn(h, 0.24)]; }, sh: 0.004, zzz: 18.6 },
  { t0: 19.4, t1: 21.25, sc: 'cor', fov: 36, cam: t => { const h = hp(sasha); return [fc(h, PI + 0.1, 1.2, 0, 0), dn(h, 0.16)]; }, sh: 0.005 },
  { t0: 21.25, t1: 23.2, sc: 'cor', fov: 36, cam: t => { const h = hp(marco); return [fc(h, PI - 0.25, kf(t, [[21.25, 1.6], [23.2, 1.45]], lin), 0, -0.05), dn(h, 0.22)]; }, sh: 0.005 },
  { t0: 23.2, t1: 28.0, sc: 'gal', fov: 46, cam: t => [kf(t, [[23.2, [0.35, 1.35, 4.8]], [28, [0.2, 1.42, 2.4]]], lin), [0, 1.45, -6]], sh: 0.004 },
  { t0: 28.0, t1: 31.7, sc: 'gal', fov: 38, cam: t => { const h = hp(masked); return [fc(V3(0.15, h.y, -4.95), 0, kf(t, [[28, 1.7], [31.7, 1.35]], lin), 0.15, -0.05), dn(h, 0.16)]; }, sh: 0.004 },
  { t0: 31.7, t1: 34.0, sc: 'gal', fov: 36, cam: t => { const h = hp(victor); return [fc(h, PI + 0.2, 1.25, 0, -0.04), dn(h, 0.16)]; }, sh: 0.005 },
  { t0: 34.0, t1: 35.7, sc: 'gal', fov: 54, cam: t => [kf(t, [[34, [3.6, 1.7, -0.4]], [35.7, [3.3, 1.5, -1.6]]], lin), kf(t, [[34, [0.4, 1.0, -2.5]], [35.7, [0.0, 0.8, -4.6]]], lin)], sh: 0.012 },
  { t0: 35.7, t1: 37.0, sc: 'gal', fov: 52, cam: () => [[1.9, 1.0, -3.1], [-0.1, 0.3, -5.8]], sh: 0.01 },
  { t0: 37.0, t1: 41.0, sc: 'gal', fov: 50, cam: t => [kf(t, [[37, [1.7, 2.4, 1.6]], [41, [1.4, 2.1, 0.9]]], lin), [0, 0.5, -5.2]], sh: 0.008 },
  { t0: 41.0, t1: 45.3, sc: 'gal', fov: 40, cam: t => { const a = hp(masked), b = hp(victor); return [[b.x + 0.4, b.y + 0.05, b.z + kf(t, [[41, 0.95], [45.3, 0.8]], lin)], dn(a, 0.1)]; }, sh: 0.006 },
  { t0: 45.3, t1: 47.5, sc: 'gal', fov: 36, cam: t => { const h = hp(sasha); return [fc(h, PI + 0.45, 1.15, 0, 0), dn(h, 0.16)]; }, sh: 0.005 },
  { t0: 47.5, t1: 50.4, sc: 'gal', fov: 38, cam: t => { const c = V3(-0.1, 1.58, -1.75), v = hp(victor); return [[c.x + 0.42, c.y + 0.1, c.z - kf(t, [[47.5, 1.0], [50.4, 0.85]], lin)], dn(v, 0.08)]; }, sh: 0.004 },
  { t0: 50.4, t1: 54.6, sc: 'gal', fov: 32, cam: t => { const h = hp(victor); return [fc(h, PI + 0.45, kf(t, [[50.4, 1.55], [54.6, 1.3]]), 0, 0), dn(h, 0.12)]; }, sh: 0.004 },
  { t0: 54.6, t1: 61, sc: 'none' },
];

const subs = [
  ['MARCO', 'I went to the gift shop.', 7.3, 9.15],
  ['SASHA', 'It’s 2 AM.', 9.3, 11.15],
  ['VICTOR', 'Step one.', 11.4, 12.7],
  ['GÉRARD', '…mmm. Jambon-beurre.', 16.9, 18.7],
  ['SASHA', 'That actually worked?!', 19.5, 21.25],
  ['MARCO', 'Never underestimate a sandwich.', 21.3, 23.2],
  ['VICTOR', 'We’re not alone.', 25.6, 27.9],
  ['???', 'You’re late, Victor.', 29.5, 31.7],
  ['VICTOR', '…how do you know my name?', 31.8, 34.0],
  ['SASHA', 'MARCO, NO—', 34.2, 35.6],
  ['MARCO', '…I’m okay.', 38.6, 40.9],
  ['???', 'Still pretending you’re the brain?', 42.4, 45.3],
  ['SASHA', 'Ha.', 45.5, 47.3],
  ['VICTOR', '…Camille?!', 50.8, 54.4],
];
const subColor = { VICTOR: '#f5c04a', SASHA: '#ff6fae', MARCO: '#4fd1c5', 'GÉRARD': '#9fb8ff', '???': '#ff4a4a' };

// ---------------------------------------------------------------- overlays
const $ = id => document.getElementById(id);
const grainCtx = $('grain').getContext('2d');
function drawGrain(t) {
  const r = rng(Math.floor(t * 30) * 7 + 1), img = grainCtx.createImageData(270, 480);
  for (let i = 0; i < img.data.length; i += 4) { const v = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  grainCtx.putImageData(img, 0, 0);
}
let lastSub = '';
const alarmOn = t => t >= 36.4 && t < 54.6;
function overlays(t, shot) {
  const s = subs.find(s => t >= s[2] && t < s[3]);
  if (s) {
    if (s[1] !== lastSub) { $('subText').innerHTML = s[1].split(' ').map(w => `<span class="w">${w}</span>`).join(' '); $('subName').textContent = s[0]; $('subName').style.color = subColor[s[0]]; lastSub = s[1]; }
    const words = $('subText').querySelectorAll('.w'); const dur = Math.min(s[3] - s[2] - 0.4, words.length * 0.2);
    words.forEach((w, i) => { const u = clamp((t - s[2] - (i / words.length) * dur) / 0.13); w.style.opacity = u; w.style.transform = `translateY(${(1 - easeOut(u)) * 14}px) scale(${0.9 + 0.1 * easeOut(u)})`; });
    $('sub').style.opacity = clamp((s[3] - t) / 0.15);
  } else $('sub').style.opacity = 0;
  // previously
  $('prev').style.opacity = t < 2.5 ? clamp((t - 0.15) / 0.2) * (Math.floor(t * 3) % 3 ? 1 : 0.6) : 0;
  // title
  const ti = clamp((t - 3.0) / 0.35), to = clamp((6.8 - t) / 0.35);
  $('title').style.opacity = Math.min(ti, to);
  $('title').style.transform = `scale(${1.25 - 0.25 * easeOut(ti) + Math.max(0, t - 3) * 0.015})`;
  $('titleSub').style.opacity = clamp((t - 3.6) / 0.4) * to;
  $('loc').textContent = 'MUSÉE DU LOUVRE  ·  02:13';
  $('loc').style.opacity = t > 2.6 && t < 7 ? clamp((t - 2.8) / 0.3) * clamp((7 - t) / 0.3) : 0;
  $('badge').style.opacity = t < 54.6 ? 1 : 0;
  // zzz
  if (shot.zzz && t > shot.zzz) {
    $('zzz').style.opacity = clamp((t - shot.zzz) / 0.2);
    [...$('zzz').children].forEach((c, i) => { const u = (t - shot.zzz - i * 0.15); c.style.opacity = clamp(u / 0.15); c.style.transform = `translate(${i * 10}px, ${-i * 40 - Math.max(0, u) * 30}px) rotate(${-10 + Math.sin(u * 4) * 8}deg)`; });
  } else $('zzz').style.opacity = 0;
  // alarm
  const ph = (t * 2.2) % 1, pulse = alarmOn(t) && shot.sc !== 'none' ? 0.5 + 0.5 * Math.cos(ph * 2 * PI) : 0;
  $('alarm').style.opacity = alarmOn(t) ? 0.18 + 0.32 * pulse : 0;
  $('alarmTxt').style.opacity = t >= 36.4 && t < 38.4 && Math.floor(t * 4) % 2 === 0 ? 1 : 0;
  // CCTV
  $('cctv').style.display = shot.cctv ? 'block' : 'none'; $('scan').style.opacity = shot.cctv ? 0.5 : 0;
  if (shot.cctv) { $('cctvTime').textContent = `11/08  02:14:${String(17 + Math.floor(t)).padStart(2, '0')}`; $('rec').style.opacity = Math.floor(t * 2) % 2 ? 1 : 0.2; }
  const stage = $('stage');
  stage.style.filter = shot.cctv ? 'grayscale(1) sepia(0.35) hue-rotate(55deg) saturate(1.5) contrast(1.3) brightness(1.35) blur(0.6px)' : (alarmOn(t) ? 'contrast(1.12) saturate(1.2)' : 'contrast(1.06) saturate(1.12)');
  // glitches at cuts
  const gl = (t > 2.35 && t < 2.6) ? 0.7 : (t > 54.3 && t < 54.6 ? 1 : 0);
  if (gl > 0) {
    const r = rng(Math.floor(t * 30) + 99);
    $('glitch').style.display = 'block';
    $('glitch').innerHTML = Array.from({ length: Math.floor(3 + gl * 10) }, () => `<div style="top:${r() * 100}%;height:${4 + r() * 60 * gl}px;background:${['#fff', '#f00', '#f0f', '#000'][Math.floor(r() * 4)]};opacity:${0.3 + r() * 0.5}"></div>`).join('');
    stage.style.transform = `translateX(${(r() - 0.5) * 80 * gl}px)`;
  } else { $('glitch').style.display = 'none'; stage.style.transform = ''; }
  // flash on the mask reveal
  $('flash').style.opacity = t > 48.75 && t < 49.0 ? (49.0 - t) * 2.4 : (t > 50.4 && t < 50.55 ? 0.5 : 0);
  // end card
  const e = t - 54.6;
  $('black').style.opacity = t >= 54.6 ? 1 : 0;
  $('end').style.opacity = e > 0 ? 1 : 0;
  $('endShow').style.opacity = clamp((e - 0.5) / 0.4);
  $('endEp').style.opacity = clamp((e - 0.9) / 0.4);
  $('endTitle').style.opacity = clamp((e - 1.3) / 0.25);
  $('endTitle').style.transform = `scale(${1.15 - 0.15 * easeOut(clamp((e - 1.3) / 0.4))})`;
  $('endFollow').style.opacity = clamp((e - 2.4) / 0.4);
  $('vig').style.opacity = t >= 54.6 ? 0 : 1;
}

// ---------------------------------------------------------------- render
window.renderAt = function (t) {
  const shot = shots.find(s => t >= s.t0 && t < s.t1) || shots[shots.length - 1];
  drawGrain(t); overlays(t, shot);
  if (shot.sc === 'none') { renderer.setClearColor(0x000000); renderer.clear(); return; }
  const set = SC[shot.sc];
  const P = poses(t);
  for (const [name, person] of Object.entries(CAST)) {
    if (P[name]) { set.scene.add(person.root); person.apply(P[name]); person.root.visible = true; }
    else person.root.visible = false;
  }
  // gallery fx: posts domino, ropes, alarm lights
  const order = [[1, 35.55], [2, 35.6], [0, 35.85], [3, 35.9]];
  for (const [i, tf] of order) { const f = kf(t, [[tf, 0], [tf + 0.35, 1]], easeIn); gal.posts[i].rotation.z = (i < 2 ? 1 : -1) * f * 1.5; }
  gal.ropes.forEach(r => r.visible = t < 35.55);
  const pulse = 0.5 + 0.5 * Math.cos(((t * 2.2) % 1) * 2 * PI);
  gal.alarms.forEach(l => l.intensity = alarmOn(t) ? 60 * pulse : 0);
  gal.fill.intensity = alarmOn(t) ? 15 : 45;
  set.scene.updateMatrixWorld();
  let [p, l] = shot.cam(t);
  if (window.OVR && window.OVR.cam) [p, l] = window.OVR.cam;
  camera.fov = shot.fov; camera.updateProjectionMatrix();
  camera.position.set(...p); if (shot.sh) camera.position.add(shake(t, shot.sh));
  camera.lookAt(...l); camera.updateMatrixWorld();
  const kl = set.keyL; kl.intensity = shot.fov < 47 && !shot.cctv ? 1.3 : 0;
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  kl.position.copy(camera.position).addScaledVector(right, -1.2).add(V3(0, 1.0, 0));
  kl.target.position.set(...l); kl.target.updateMatrixWorld();
  renderer.render(set.scene, camera);
};
window.DURATION = 60.0;
await document.fonts.ready;
window.READY = true;
