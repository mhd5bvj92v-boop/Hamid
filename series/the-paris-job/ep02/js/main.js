// THE PARIS JOB — Part 2/5 "The Competition" (serious version). Deterministic timeline: window.renderAt(t).
import * as THREE from 'three';
import { makeMask, M, kf, talk, blinkAt, walk, clamp, smooth, easeOut, easeIn, lerp } from '../../shared/person.js';
import { buildGallery, buildRooftop, rng } from '../../shared/world.js';
import { buildExterior, buildCorridor } from '../../shared/louvre.js';
import { buildWarehouse, makeFlashlight } from '../../shared/sets2.js';
import { makeCast } from '../../shared/cast2.js';
import { makePost } from '../../shared/post.js';

const W = 1080, H = 1920, PI = Math.PI;
const lin = u => u;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(40, W / H, 0.05, 2000);
const post = makePost(renderer, W, H);

const gal = buildGallery(), roof = buildRooftop(), wh = buildWarehouse(), ext = buildExterior(), cor = buildCorridor();
const SC = { gal, roof, wh, ext, cor };
gal.posts.forEach(p => p.visible = false); gal.ropes.forEach(r => r.visible = false);
cor.ceilLights.forEach(l => l.intensity = 3.5);

const emerg = new THREE.PointLight(0xffb0a0, 0, 12, 1.2); emerg.position.set(0, 4.2, 3.5); gal.scene.add(emerg);
const radio = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.03), M(0x111111, { r: 0.4 })); radio.position.set(0, -0.09, 0.03);
const C = makeCast();
const { victor, sasha, marco, camille, guard, comte } = C;

// props
guard.arms[1].hand.add(radio);
const flash = makeFlashlight(); flash.position.set(0.16, 1.22, 0.38); guard.root.add(flash);
const tablet = new THREE.Group();
{
  tablet.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.012), M(0x111111, { r: 0.3 })));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.12), new THREE.MeshBasicMaterial({ color: 0x3a8cff })); scr.position.z = 0.007; tablet.add(scr);
  const tl = new THREE.PointLight(0x5aa0ff, 0.25, 0.8, 1.5); tl.position.z = 0.15; tablet.add(tl);
  tablet.position.set(0, -0.08, 0.06); tablet.rotation.set(-1.0, 0, 0);
}
sasha.arms[1].hand.add(tablet);
const heldMask = makeMask(); heldMask.position.set(0, -0.08, 0.06); heldMask.rotation.set(-0.3, PI, 0); camille.arms[0].hand.add(heldMask);

// ---------------------------------------------------------------- acting
const idle = () => [[0.05, 0.1, 0, 0.18], [0.05, 0.1, 0, 0.18]];
const faceTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
const angLerp = (a, b, u) => { const d = ((((b - a) + PI) % (2 * PI)) + 2 * PI) % (2 * PI) - PI; return a + d * u; };
const HOLD = [[0.7, -0.12, 0.3, 0.85], [0.7, -0.12, 0.3, 0.85]];
const BTN = [1.55, -6.6];

function poses(t) {
  const P = {};
  if (t < 3.0) { // recap: masked faces the CCTV camera and waves
    const camAng = faceTo(0.25, -4.85, 3.3, 2.6);
    P.masked = { x: 0.25, z: -4.85, ry: camAng, hp: -0.38, hr: 0.15, arms: [[0.2, 2.5 + 0.25 * Math.sin(t * 9), 0, 0.5], [0.05, 0.1, 0, 0.15]] };
    gal.painting.position.set(0, 1.75, -6.95); gal.painting.rotation.set(0, 0, 0);
    return P;
  }
  if (t < 8.4) { // rooftop
    const S = P.sasha = { x: 2.15, z: -0.1, y: 0.5 - 0.92 * 0.94, ry: -PI / 2, legs: [[1.45, 1.35], [1.45, 1.3]], lean: 0.2, ey: -0.4, lid: 0.15, blink: blinkAt(t, 2),
      arms: [[0.95, 0.05, 0.3, 1.0], [0.95, 0.05, 0.3, 1.0]], furrow: 0.35, mouth: talk(t, 3.3, 5.7, 2) * 0.7 };
    S.hp = kf(t, [[3.0, 0.3], [4.6, 0.3], [5.0, 0.05]]); S.hy = kf(t, [[4.6, 0], [5.0, -0.5]]); S.ex = kf(t, [[4.6, 0], [5.0, -0.6]]);
    tablet.visible = false;
    P.victor = { x: 0.35, z: -1.5, ry: 0.15, arms: idle(), blink: blinkAt(t, 1), furrow: 0.55, lid: 0.15, hp: 0.04,
      mouth: talk(t, 6.0, 8.3, 1) * 0.75, hy: kf(t, [[5.8, 0.45], [6.6, 0.1]]) };
    return P;
  }
  if (t < 12.0) { // warehouse flashback
    const slide = kf(t, [[8.6, 0], [9.7, 1]]);
    wh.photo.position.z = lerp(-0.15, 0.15, slide);
    P.comte = { x: 0, z: -0.78, y: 0.52 - 0.92 * 1.02, ry: 0, legs: [[1.5, 1.5], [1.5, 1.5]], lean: kf(t, [[10.4, 0.12], [11.8, 0.22]]),
      arms: [[lerp(0.95, 1.3, slide), 0.12, 0.25, lerp(0.75, 0.35, slide)], [0.9, 0.15, 0.4, 1.0]], hp: 0.1, lid: 0.3, furrow: 0.2, smirk: 0.2,
      mouth: talk(t, 8.7, 10.4, 3) * 0.6 + talk(t, 10.5, 12.0, 4) * 0.6, blink: blinkAt(t, 5) };
    return P;
  }
  if (t < 16.4) { // exterior, rain
    const z = lerp(52, 47, (t - 12.0) / 4.4);
    const w = (p, ph) => { walk(p, t * 6.2 + ph, 0.9); return p; };
    P.victor = w({ x: -0.1, z, ry: PI, lean: 0.05 }, 0);
    P.sasha = w({ x: 0.35, z: z + 1.4, ry: PI, lean: 0.05 }, 1.3);
    P.marco = w({ x: -0.25, z: z + 2.8, ry: PI, lean: 0.05 }, 2.4);
    return P;
  }
  if (t < 26.4) { // corridor
    tablet.visible = true;
    P.victor = { x: -2.08, z: 0.6, ry: PI / 2 - 0.2, arms: [[-0.1, 0.12, 0, 0.3], [-0.1, 0.12, 0, 0.3]], blink: blinkAt(t, 1), lean: -0.04, furrow: 0.4 };
    P.sasha = { x: -2.05, z: 1.5, ry: PI / 2 - 0.3, arms: [[0.1, 0.1, 0, 0.3], [0.85, 0.05, 0.6, 1.25]], blink: blinkAt(t, 2), hp: 0.25, ey: -0.4, furrow: 0.3,
      mouth: talk(t, 16.6, 19.3, 6) * 0.7 };
    P.marco = { x: -2.05, z: 2.4, ry: PI / 2 - 0.3, arms: idle(), blink: blinkAt(t, 3), lean: -0.04 };
    if (t > 19.3) { // hiding: press against the wall, watch the guard
      P.sasha.arms = [[0.1, 0.1, 0, 0.3], [0.35, 0.05, 0.6, 1.4]]; P.sasha.hp = 0; P.sasha.ey = 0; P.sasha.hy = -0.6; P.sasha.ex = -0.6;
      P.victor.hy = kf(t, [[19.4, 0], [20.0, -0.75], [22.4, -0.75], [22.8, 0.1], [24.6, 0.1], [25.2, -0.6]]);
      P.victor.ex = kf(t, [[22.2, -0.8], [22.6, 0.4], [23.6, 0.4], [24.2, -0.6]]);
      P.victor.lid = kf(t, [[22.4, 0], [22.7, 0.25]]); P.victor.browL = P.victor.browR = kf(t, [[22.3, 0], [22.6, 0.5]]);
      P.marco.hy = -0.6;
    }
    const gz = kf(t, [[18.5, -13.5], [24.0, -1.35]], lin);
    const back = kf(t, [[25.6, 0], [26.4, 1]]);
    const G = P.guard = { x: 0.25, z: gz, ry: angLerp(0, PI, back), blink: blinkAt(t, 4), furrow: 0.3, lid: 0.15,
      mouth: talk(t, 25.0, 26.3, 7) * 0.5 };
    if (t < 24.0) walk(G, t * 5.0, 0.7); else G.arms = idle();
    G.arms[0] = [1.25, 0.05, 0.1, 0.25];
    if (t > 24.8) G.arms[1] = [1.25, -0.3, 0.5, 1.75]; // radio to mouth
    flash.rotation.y = kf(t, [[18.5, 0.25], [20.5, -0.15], [21.8, 0.2], [22.6, -0.42], [23.6, -0.42], [24.4, 0.1]]);
    flash.rotation.x = 0.12;
    return P;
  }
  // ---------------- gallery 26.4 – 55.6
  tablet.visible = false;
  const wIn = clamp((t - 26.4) / 2.2);
  const enter = (x0, z0, x1, z1, seed) => { const p = { x: lerp(x0, x1, smooth(wIn)), z: lerp(z0, z1, smooth(wIn)), ry: PI, arms: idle(), blink: blinkAt(t, seed), furrow: 0.35 }; if (wIn < 1) walk(p, t * 6.5 + seed, Math.sin(wIn * PI) * 0.75); return p; };
  const V = P.victor = enter(0, 4.5, 0, -1.0, 1);
  const S = P.sasha = enter(-0.9, 4.9, -0.9, -0.6, 2);
  const Mo = P.marco = enter(0.95, 5.0, 0.95, -0.6, 3);
  const Mk = P.masked = { x: 0.1, z: -6.35, ry: PI, arms: HOLD.map(a => [...a]) };
  const lift = kf(t, [[26.4, 0], [27.8, 1]]);
  Mk.arms = lerp([[1.5, -0.1, 0.3, 0.4], [1.5, -0.1, 0.3, 0.4]], HOLD, lift);
  Mk.ry = angLerp(PI, 2 * PI, kf(t, [[31.5, 0], [33.0, 1]]));
  Mk.hy = kf(t, [[31.2, 0], [31.6, 0.5], [32.6, 0]]);
  V.mouth = talk(t, 28.8, 31.1, 5) * 0.8 + talk(t, 35.1, 37.3, 6) * 0.8;
  V.furrow = kf(t, [[28.6, 0.35], [29.0, 0.7]]);
  if (t > 34.8) { V.browL = 0.3; V.lid = 0.1; }
  let down = 0;
  if (t >= 37.4) { // set the painting down, then press the alarm
    down = kf(t, [[37.4, 0], [38.0, 1]]);
    Mk.lean = Math.sin(down * PI) * 0.55; Mk.ry = angLerp(2 * PI, PI, kf(t, [[37.4, 0], [37.8, 1]]));
    const go = kf(t, [[38.2, 0], [38.9, 1]]);
    Mk.x = lerp(0.1, BTN[0], go); Mk.z = lerp(-6.35, BTN[1], go);
    Mk.arms = down < 1 ? HOLD.map(a => [...a]) : idle();
    if (go > 0 && go < 1) walk(Mk, t * 9, 0.8);
    const press = kf(t, [[39.1, 0], [39.4, 1], [39.8, 1], [40.1, 0]]);
    if (t > 38.9) Mk.arms[0] = lerp([0.05, 0.1, 0, 0.15], [1.45, 0.05, 0, 0.1], press);
  }
  if (t >= 41.8) { // walk around to Victor
    const a = kf(t, [[41.8, 0], [45.2, 1]], lin);
    const p1 = BTN, p2 = [2.2, -5.0], p3 = [0, -1.9];
    const q = a < 0.35 ? [lerp(p1[0], p2[0], a / 0.35), lerp(p1[1], p2[1], a / 0.35)] : [lerp(p2[0], p3[0], (a - 0.35) / 0.65), lerp(p2[1], p3[1], (a - 0.35) / 0.65)];
    Mk.x = q[0]; Mk.z = q[1]; Mk.lean = 0;
    Mk.ry = a < 1 ? faceTo(Mk.x, Mk.z, a < 0.35 ? p2[0] : p3[0], a < 0.35 ? p2[1] : p3[1]) : faceTo(0, -1.9, 0, -1.0);
    if (a < 1) walk(Mk, t * 6.5, 0.85); else Mk.arms = idle();
  }
  if (t >= 39.5) { // alarm reactions
    S.mouth = talk(t, 39.9, 41.7, 8); S.browL = S.browR = 0.8; S.lid = -0.1; S.furrow = -0.3; S.hy = kf(t, [[39.5, 0], [39.9, 0.35]]);
    V.hy = kf(t, [[39.5, 0], [39.9, 0.3], [41.5, 0.3], [41.9, 0]]); V.browL = V.browR = 0.5;
    const run = kf(t, [[42.0, 0], [44.8, 1]]);
    Mo.x = lerp(0.95, 0.5, run); Mo.z = lerp(-0.6, 5.8, run); Mo.ry = run > 0 ? 0 : PI;
    if (run > 0 && run < 1) { walk(Mo, t * 12, 1.4); Mo.lean = 0.25; }
    if (run >= 1) { Mo.arms = [[1.4, 0.2, 0, 0.2], [1.4, 0.2, 0, 0.2]]; Mo.lean = 0.1; }
  }
  let reveal = false;
  if (t >= 45.6) { // the reveal
    const up = kf(t, [[46.8, 0], [47.5, 1]]);
    Mk.arms[0] = lerp(idle()[0], [1.95, -0.35, 0.7, 1.55], up);
    V.lid = kf(t, [[47.8, 0.1], [48.1, -0.12]]); V.browL = V.browR = kf(t, [[47.8, 0.3], [48.1, 0.75]]); V.furrow = kf(t, [[47.8, 0.4], [48.2, -0.5]]);
    V.mouth = Math.max(kf(t, [[47.9, 0], [48.2, 0.2]]), talk(t, 48.6, 50.0, 13) * 0.6);
    reveal = t >= 47.6;
    if (reveal) {
      const dn2 = kf(t, [[47.6, 0], [48.4, 1]]);
      P.camille = { ...Mk, arms: [lerp([1.95, -0.35, 0.7, 1.55], [0.3, 0.12, 0.2, 0.45], dn2), idle()[1]], blink: blinkAt(t, 9), lid: 0.25,
        smirk: kf(t, [[50.2, 0], [50.8, 0.45]]), smile: kf(t, [[50.2, 0], [50.8, 0.12]]), hp: -0.04, hy: 0,
        mouth: talk(t, 50.8, 52.9, 14) * 0.6 + talk(t, 53.2, 55.5, 15) * 0.6, browL: kf(t, [[52.8, 0], [53.3, 0.35]]) };
      delete P.masked;
    }
  }
  heldMask.visible = reveal;
  // painting: on the wall -> in her hands -> leaning against the wall
  if (t < 37.4) {
    const fx = Math.sin(Mk.ry), fz = Math.cos(Mk.ry);
    const hold = [0.1 + fx * 0.34, 0.98, -6.35 + fz * 0.34];
    gal.painting.position.set(...lerp([0, 1.75, -6.95], hold, lift));
    gal.painting.rotation.set(0, lift < 1 ? 0 : Mk.ry, 0);
  } else {
    const hold = [0.1, 0.98, -6.69];
    gal.painting.position.set(...lerp(hold, [0.55, 0.47, -6.82], down));
    gal.painting.rotation.set(-0.18 * down, 0, 0);
  }
  return P;
}

// ---------------------------------------------------------------- shots
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const hp = p => p.head.getWorldPosition(new THREE.Vector3());
const fc = (h, ry, dist, side = 0, dy = 0) => [h.x + Math.sin(ry) * dist + Math.cos(ry) * side, h.y + dy, h.z + Math.cos(ry) * dist - Math.sin(ry) * side];
const dn = (h, d) => [h.x, h.y - d, h.z];
const shake = (t, a) => V3(Math.sin(t * 1.3) * a + Math.sin(t * 2.9) * a * 0.4, Math.sin(t * 1.9 + 1) * a * 0.7, Math.sin(t * 0.9 + 2) * a * 0.5);
const CCTV = [3.3, 3.3, 2.6];
const shots = [
  { t0: 0, t1: 3.0, sc: 'gal', fov: 62, cctv: true, cam: () => [CCTV, [-0.4, 1.0, -6.0]] },
  { t0: 3.0, t1: 5.8, sc: 'roof', fov: 32, cam: t => { const h = hp(sasha); return [fc(h, -PI / 2 - 0.55, kf(t, [[3, 1.15], [5.8, 1.0]], lin), 0, 0.02), dn(h, 0.12)]; }, sh: 0.004 },
  { t0: 5.8, t1: 8.4, sc: 'roof', fov: 30, cam: t => { const h = hp(victor); return [fc(h, 0.15, kf(t, [[5.8, 1.5], [8.4, 1.25]], lin), -0.25, -0.04), dn(h, 0.1)]; }, sh: 0.004 },
  { t0: 8.4, t1: 10.4, sc: 'wh', fov: 34, flashback: true, cam: t => [kf(t, [[8.4, [0.75, 1.15, 1.05]], [10.4, [0.6, 1.05, 0.85]]], lin), [0.05, 0.85, kf(t, [[8.4, -0.25], [10.4, -0.05]], lin)]] },
  { t0: 10.4, t1: 12.0, sc: 'wh', fov: 30, flashback: true, cam: t => { const h = hp(comte); return [fc(h, 0.2, kf(t, [[10.4, 1.25], [12, 1.05]], lin), 0, 0.02), dn(h, 0.02)]; } },
  { t0: 12.0, t1: 16.4, sc: 'ext', fov: 46, cam: t => { const z = lerp(52, 47, (t - 12.0) / 4.4); return [[kf(t, [[12, 1.1], [16.4, 0.7]], lin), kf(t, [[12, 0.9], [16.4, 1.3]], lin), z + 5.5], [0, kf(t, [[12, 4.0], [16.4, 5.0]], lin), 0]]; }, sh: 0.006 },
  { t0: 16.4, t1: 19.4, sc: 'cor', fov: 32, cam: t => { const h = hp(sasha); return [fc(h, PI / 2 + 0.15, kf(t, [[16.4, 1.15], [19.4, 1.0]], lin), 0, 0), dn(h, 0.14)]; }, sh: 0.004 },
  { t0: 19.4, t1: 21.8, sc: 'cor', fov: 44, cam: t => [kf(t, [[19.4, [-1.0, 1.5, 4.6]], [21.8, [-1.1, 1.45, 3.9]]], lin), [0.0, 1.2, -6]], sh: 0.004 },
  { t0: 21.8, t1: 24.4, sc: 'cor', fov: 30, cam: t => { const h = hp(victor); return [[h.x + 0.75, h.y - 0.02, h.z + kf(t, [[21.8, 0.75], [24.4, 0.6]], lin)], dn(h, 0.04)]; }, sh: 0.003 },
  { t0: 24.4, t1: 26.4, sc: 'cor', fov: 36, cam: t => { const h = hp(guard); return [[h.x - 0.9, h.y - 0.15, h.z + 1.3], dn(h, 0.18)]; }, sh: 0.004 },
  { t0: 26.4, t1: 31.2, sc: 'gal', fov: 44, cam: t => [kf(t, [[26.4, [0.45, 1.45, 4.6]], [31.2, [0.25, 1.5, 2.2]]], lin), [0.05, 1.4, -6.4]], sh: 0.004 },
  { t0: 31.2, t1: 34.8, sc: 'gal', fov: 34, cam: t => [kf(t, [[31.2, [0.45, 1.75, -4.0]], [34.8, [0.4, 1.72, -4.35]]], lin), [0.1, 1.3, -6.35]], sh: 0.004 },
  { t0: 34.8, t1: 37.4, sc: 'gal', fov: 32, cam: t => { const h = hp(victor); return [fc(h, PI + 0.25, kf(t, [[34.8, 1.3], [37.4, 1.15]], lin), 0, -0.03), dn(h, 0.12)]; }, sh: 0.004 },
  { t0: 37.4, t1: 39.6, sc: 'gal', fov: 40, cam: t => [kf(t, [[37.4, [2.5, 1.45, -4.3]], [39.6, [2.3, 1.4, -4.6]]], lin), [0.9, 1.0, -6.7]], sh: 0.004 },
  { t0: 39.6, t1: 41.8, sc: 'gal', fov: 32, cam: t => { const h = hp(sasha); return [fc(h, PI + 0.3, 1.15, 0, 0), dn(h, 0.12)]; }, sh: 0.008 },
  { t0: 41.8, t1: 45.6, sc: 'gal', fov: 50, cam: t => [kf(t, [[41.8, [0.4, 0.75, -2.6]], [45.6, [0.35, 0.65, -2.9]]], lin), [0.3, 2.1, 6.5]], sh: 0.01 },
  { t0: 45.6, t1: 50.0, sc: 'gal', fov: 36, cam: t => { const v = hp(victor); return [[0.42, 1.62, kf(t, [[45.6, -2.95], [50, -2.8]], lin)], dn(v, 0.06)]; }, sh: 0.004 },
  { t0: 50.0, t1: 55.6, sc: 'gal', fov: 30, cam: t => { const h = hp(camille); return [fc(h, 0.55, kf(t, [[50, 1.15], [55.6, 0.95]], lin), 0, -0.02), dn(h, 0.07)]; }, sh: 0.003 },
  { t0: 55.6, t1: 61, sc: 'none' },
];

const subs = [
  ['SASHA', 'She’s taking it. Tonight.', 3.3, 5.75],
  ['VICTOR', 'Then so are we.', 6.0, 8.35],
  ['LE COMTE', 'Forty-eight hours, Victor.', 8.7, 10.4],
  ['LE COMTE', 'Or you disappear.', 10.5, 12.0],
  ['SASHA', 'Cameras looped. Forty seconds.', 16.6, 19.35],
  ['GUARD', '…Clear.', 25.0, 26.4],
  ['VICTOR', 'Put it down.', 28.8, 31.15],
  ['???', 'You’re late, Victor.', 32.6, 34.75],
  ['VICTOR', 'Who are you?', 35.1, 37.35],
  ['SASHA', 'She hit the alarm!', 39.9, 41.75],
  ['VICTOR', '…Camille.', 48.6, 50.0],
  ['CAMILLE', 'Hello, partner.', 50.8, 52.95],
  ['CAMILLE', 'Now nobody leaves.', 53.2, 55.55],
];
const subColor = { VICTOR: '#f5c04a', SASHA: '#ff6fae', MARCO: '#4fd1c5', GUARD: '#9fb8ff', 'LE COMTE': '#d8b46a', '???': '#ff4a4a', CAMILLE: '#ff4a4a' };

// ---------------------------------------------------------------- overlays
const $ = id => document.getElementById(id);
const grainCtx = $('grain').getContext('2d');
function drawGrain(t) {
  const r = rng(Math.floor(t * 30) * 7 + 1), img = grainCtx.createImageData(270, 480);
  for (let i = 0; i < img.data.length; i += 4) { const v = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  grainCtx.putImageData(img, 0, 0);
}
const pad = n => String(Math.max(0, Math.floor(n))).padStart(2, '0');
let lastSub = '';
const alarmOn = t => t >= 39.5 && t < 55.6;
function overlays(t, shot) {
  const s = subs.find(s => t >= s[2] && t < s[3]);
  if (s) {
    if (s[1] !== lastSub) { $('subText').innerHTML = s[1].split(' ').map(w => `<span class="w">${w}</span>`).join(' '); $('subName').textContent = s[0]; $('subName').style.color = subColor[s[0]]; lastSub = s[1]; }
    const words = $('subText').querySelectorAll('.w'); const dur = Math.min(s[3] - s[2] - 0.4, words.length * 0.2);
    words.forEach((w, i) => { const u = clamp((t - s[2] - (i / words.length) * dur) / 0.16); w.style.opacity = u; w.style.transform = `translateY(${(1 - easeOut(u)) * 10}px)`; });
    $('sub').style.opacity = clamp((s[3] - t) / 0.15);
  } else $('sub').style.opacity = 0;
  $('prev').style.opacity = t < 2.9 ? clamp((t - 0.15) / 0.3) : 0;
  const ti = clamp((t - 12.6) / 0.5), to = clamp((16.1 - t) / 0.4);
  $('title').style.opacity = Math.min(ti, to); $('title').style.transform = `scale(${1.08 - 0.08 * easeOut(ti)})`;
  $('titleSub').style.opacity = clamp((t - 13.2) / 0.5) * to;
  $('loc').textContent = 'MUSÉE DU LOUVRE  ·  01:58';
  $('loc').style.opacity = t > 12.0 && t < 16.4 ? clamp((t - 12.2) / 0.4) * clamp((16.3 - t) / 0.3) : 0;
  $('earlier').style.opacity = shot.flashback ? clamp((t - 8.5) / 0.3) : 0;
  $('badge').style.opacity = t < 55.6 && !shot.flashback ? 1 : 0;
  const left = 41 * 3600 + 58 * 60 + 7 - Math.max(0, t - 12.0);
  $('clockT').textContent = `${pad(left / 3600)}:${pad((left / 60) % 60)}:${pad(left % 60)}`;
  $('clock').style.opacity = t >= 12.0 && t < 55.6 && !shot.flashback ? clamp((t - 12.0) / 0.5) : 0;
  const op = 40 - (Math.min(t, 39.5) - 19.3);
  $('timer').textContent = `00:${pad(op)}`;
  $('timer').style.opacity = t >= 19.3 && t < 45.6 ? (alarmOn(t) ? (Math.floor(t * 3) % 2 ? 1 : 0.25) : clamp((t - 19.3) / 0.2) * 0.95) : 0;
  $('timer').style.color = alarmOn(t) ? '#ff3030' : (op <= 25 ? '#ffb040' : '#ffffff');
  const pulse = alarmOn(t) ? 0.5 + 0.5 * Math.cos(((t * 1.6) % 1) * 2 * PI) : 0;
  $('alarm').style.opacity = alarmOn(t) ? 0.12 + 0.25 * pulse : 0;
  $('alarmTxt').style.opacity = t >= 39.5 && t < 41.5 && Math.floor(t * 3) % 2 === 0 ? 1 : 0;
  $('cctv').style.display = shot.cctv ? 'block' : 'none'; $('scan').style.opacity = shot.cctv ? 0.5 : 0;
  if (shot.cctv) { $('cctvTime').textContent = `11/08  02:14:${pad(17 + t)}`; $('rec').style.opacity = Math.floor(t * 2) % 2 ? 1 : 0.2; }
  const stage = $('stage');
  stage.style.filter = shot.cctv ? 'grayscale(1) sepia(0.35) hue-rotate(55deg) saturate(1.5) contrast(1.3) brightness(1.35) blur(0.6px)'
    : shot.flashback ? 'sepia(0.55) saturate(0.75) contrast(1.15) brightness(0.95)'
      : (alarmOn(t) ? 'contrast(1.1) saturate(1.1)' : 'contrast(1.05) saturate(0.95)');
  const gl = (t > 2.7 && t < 3.0) ? 0.8 : (t > 55.3 && t < 55.6 ? 1 : 0);
  if (gl > 0) {
    const r = rng(Math.floor(t * 30) + 99);
    $('glitch').style.display = 'block';
    $('glitch').innerHTML = Array.from({ length: Math.floor(3 + gl * 10) }, () => `<div style="top:${r() * 100}%;height:${4 + r() * 60 * gl}px;background:${['#fff', '#f00', '#000'][Math.floor(r() * 3)]};opacity:${0.3 + r() * 0.5}"></div>`).join('');
    stage.style.transform = `translateX(${(r() - 0.5) * 60 * gl}px)`;
  } else { $('glitch').style.display = 'none'; stage.style.transform = ''; }
  $('flash').style.opacity = (t > 8.4 && t < 8.55) ? (8.55 - t) * 3 : (t > 45.2 && t < 45.35 ? 0.35 : 0);
  const e = t - 55.6;
  $('black').style.opacity = t >= 55.6 ? 1 : 0;
  $('end').style.opacity = e > 0 ? 1 : 0;
  $('endShow').style.opacity = clamp((e - 0.4) / 0.4);
  $('endEp').style.opacity = clamp((e - 0.8) / 0.4);
  $('endTitle').style.opacity = clamp((e - 1.1) / 0.3);
  $('endTitle').style.transform = `scale(${1.1 - 0.1 * easeOut(clamp((e - 1.1) / 0.5))})`;
  $('endFollow').style.opacity = clamp((e - 2.0) / 0.4);
  $('vig').style.opacity = t >= 55.6 ? 0 : 1;
}

function drawLaptop(t) { // rooftop laptop: the feed died
  const tex = roof.screenTex, g = tex.userData.ctx, w = 512, h = 340;
  const r = rng(Math.floor(t * 20) + 5), img = g.createImageData(w, h);
  for (let i = 0; i < img.data.length; i += 4) { const v = r() * 140; img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v + 20; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(96, 140, 320, 60); g.fillStyle = '#ff4040'; g.font = '700 30px monospace'; g.textAlign = 'center'; g.fillText('SIGNAL LOST', w / 2, 181); g.textAlign = 'left';
  tex.needsUpdate = true;
}

// ---------------------------------------------------------------- render
window.renderAt = function (t) {
  const shot = shots.find(s => t >= s.t0 && t < s.t1) || shots[shots.length - 1];
  drawGrain(t); overlays(t, shot);
  if (shot.sc === 'none') { renderer.setClearColor(0x000000); renderer.clear(); return; }
  const set = SC[shot.sc];
  const P = poses(t);
  for (const [name, person] of Object.entries(C)) {
    if (P[name]) { set.scene.add(person.root); person.apply(P[name]); person.root.visible = true; }
    else person.root.visible = false;
  }
  if (shot.sc === 'ext') ext.updateRain(t);
  if (shot.sc === 'roof') { drawLaptop(t); roof.beacon.rotation.y = t * 0.55; }
  const shu = kf(t, [[41.8, 0], [45.2, 1]], easeIn);
  gal.shutter.position.y = lerp(9, 3, shu) + (t > 45.2 && t < 45.5 ? Math.sin((t - 45.2) * 40) * 0.03 : 0);
  gal.alarmBtn.material.emissiveIntensity = t > 39.4 ? 2.5 + 1.5 * Math.sin(t * 12) : 0.4;
  const pulse = 0.5 + 0.5 * Math.cos(((t * 1.6) % 1) * 2 * PI);
  gal.alarms.forEach(l => l.intensity = alarmOn(t) ? 120 * pulse : 0);
  gal.fill.intensity = alarmOn(t) ? 22 : 40;
  emerg.intensity = alarmOn(t) ? 30 : 0;
  set.scene.updateMatrixWorld();
  let [p, l] = shot.cam(t);
  if (window.OVR && window.OVR.cam) [p, l] = window.OVR.cam;
  camera.fov = shot.fov; camera.updateProjectionMatrix();
  camera.position.set(...p); if (shot.sh) camera.position.add(shake(t, shot.sh));
  camera.lookAt(...l); camera.updateMatrixWorld();
  const kl = set.keyL; kl.intensity = shot.fov < 45 && !shot.cctv ? (shot.flashback ? 0.25 : 0.9) : 0;
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  kl.position.copy(camera.position).addScaledVector(right, -1.2).add(V3(0, 1.0, 0));
  kl.target.position.set(...l); kl.target.updateMatrixWorld();
  const focus = camera.position.distanceTo(V3(...l));
  post.render(set.scene, camera, focus, shot.cctv ? 0 : (shot.fov <= 36 ? 0.006 : 0.0025));
};
window.DURATION = 60.0;
await document.fonts.ready;
window.READY = true;
