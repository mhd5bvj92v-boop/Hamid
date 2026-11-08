// THE PARIS JOB — Episode 1 "The Plan". Deterministic timeline: window.renderAt(t).
import * as THREE from 'three';
import { makePerson, M, kf, talk, blinkAt, walk, clamp, smooth, easeOut, lerp } from './person.js';
import { buildRooftop, buildGallery, rng } from './world.js';

const W = 1080, H = 1920;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(50, W / H, 0.05, 2000);

const roof = buildRooftop();
const gal = buildGallery();

// ---------------------------------------------------------------- cast
const victor = makePerson({ skin: 0xc8977c, shirt: 0x17171c, collar: 0x17171c, pants: 0x2c2f36, hair: 0x16110d, hairStyle: 'slick', eye: 0x3b2a1a, lip: 0xa0705f, browThick: 1.2 });
const sasha = makePerson({ skin: 0x87583f, shirt: 0x5b3fa0, hood: true, pants: 0x1c1c22, shoes: 0xeeeeee, hair: 0x15100c, hairStyle: 'curlyBun', glasses: true, earrings: true, lashes: true, lip: 0x6e3530, eye: 0x24160c, scale: 0.93 });
const marco = makePerson({ skin: 0xdcb09a, shirt: 0x5a3420, jacketFront: 0xe9e6df, pants: 0x2e4a78, shoes: 0x3a2414, hairStyle: 'beanie', beanie: 0xb3261e, hair: 0x6a3418, beard: 0x8a4a22, brow: 0x6a3418, eye: 0x3a6a8a, lip: 0xb8706a, scale: 1.06, build: 1.22 });
const masked = makePerson({ skin: 0x101012, mask: true, hairStyle: 'hood', shirt: 0x0d0d10, pants: 0x0d0d10, gloves: 0x0a0a0a, shoes: 0x050505 });
roof.scene.add(victor.root, sasha.root, marco.root);
gal.scene.add(masked.root);

// props
const sandwich = new THREE.Group();
{
  const lay = (h, c, y, wv = 1) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.17 * wv, h, 0.1), M(c, { r: 0.8 })); b.position.y = y; b.castShadow = true; sandwich.add(b); };
  lay(0.03, 0xd9a35c, 0); lay(0.012, 0x5fb43a, 0.02, 1.08); lay(0.01, 0xe23b2e, 0.031); lay(0.008, 0xf5c842, 0.04, 1.05); lay(0.012, 0xe48a8a, 0.05); lay(0.035, 0xd9a35c, 0.072);
  const bite = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), M(0xf2e2c4, { r: 0.9 })); bite.position.set(0.085, 0.04, 0.0); sandwich.add(bite);
  sandwich.rotation.set(0, 0, Math.PI / 2); sandwich.position.set(0.0, -0.07, 0.04);
}
marco.arms[0].hand.add(sandwich);
const biteSandwich = sandwich.clone();
biteSandwich.rotation.set(0.15, 0.45, 0.05); biteSandwich.position.set(-0.07, -0.12, 0.2); biteSandwich.scale.setScalar(0.8); biteSandwich.visible = false;
marco.head.add(biteSandwich);

const magnet = new THREE.Group();
{
  const c = document.createElement('canvas'); c.width = 256; c.height = 220; const g = c.getContext('2d');
  g.fillStyle = '#e2283a'; g.beginPath(); g.moveTo(128, 210); g.bezierCurveTo(-60, 90, 40, -40, 128, 50); g.bezierCurveTo(216, -40, 316, 90, 128, 210); g.fill();
  g.fillStyle = '#fff'; g.font = '900 40px Inter'; g.textAlign = 'center'; g.fillText('I ♥', 128, 105); g.fillText('PARIS', 128, 148);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const p = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.095), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.4, side: THREE.DoubleSide }));
  magnet.add(p); magnet.position.set(0, -0.09, 0.05); magnet.rotation.set(0, 0, 0);
}
sasha.arms[1].hand.add(magnet);

const bubble = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), new THREE.MeshStandardMaterial({ color: 0xff7bb8, roughness: 0.25, transparent: true, opacity: 0.88 }));
bubble.position.set(0, -0.085, 0.13); sasha.head.add(bubble);
const smear = new THREE.Group();
{
  const pm = M(0xff7bb8, { r: 0.3 });
  [[0, -0.02, 0.15, 0.03], [-0.05, -0.04, 0.125, 0.022], [0.05, -0.035, 0.127, 0.024], [0.0, 0.03, 0.15, 0.018]].forEach(([x, y, z, r]) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), pm); b.scale.set(0.85, 0.6, 0.3); b.position.set(x, y, z); smear.add(b);
  });
}
sasha.head.add(smear);

// ---------------------------------------------------------------- acting
const PI = Math.PI;
const V0 = [0, 0, -3.7];
function victorPose(t) {
  const P = { x: 0, z: -3.7, ry: PI, blink: blinkAt(t, 1), arms: [[0.05, 0.1, 0, 0.2], [0.05, 0.1, 0, 0.2]] };
  P.lean = 0.01 * Math.sin(t * 1.3);
  if (t < 6.4) {
    P.hp = -0.12; P.arms = [[-0.25, 0.12, 0, 0.5], [-0.25, 0.12, 0, 0.5]]; // hands behind back
  } else if (t < 14.2) {
    P.ry = kf(t, [[6.4, PI], [7.15, 0.12]]);
    P.hy = kf(t, [[6.4, 0.5], [6.9, 0.0], [10, 0], [10.6, 0.5], [13.8, 0.5], [14.1, 0]]);
    P.hp = kf(t, [[6.4, -0.12], [7.0, 0.04]]);
    P.arms = [[-0.25, 0.12, 0, 0.5], [-0.25, 0.12, 0, 0.5]];
    const g = kf(t, [[8.0, 0], [8.5, 1], [9.6, 1], [10.2, 0]]);
    P.arms[0] = lerp(P.arms[0], [0.75, 0.25, 0.4, 1.1], g);
    P.mouth = talk(t, 6.9, 9.8, 1);
    P.smirk = kf(t, [[6.4, 0], [7.2, 0.35], [9.9, 0.35], [10.5, 0.1]]);
    P.browL = kf(t, [[8.4, 0], [8.8, 0.7], [9.8, 0.7], [10.2, 0]]);
    P.lid = kf(t, [[10, 0], [10.5, 0.35]]);
    P.ex = kf(t, [[10, 0], [10.6, 0.5]]);
  } else if (t < 19) {
    const u = clamp((t - 14.2) / 1.4);
    P.z = lerp(-3.7, -2.9, smooth(u)); P.ry = 0.05;
    if (u < 1) walk(P, (t - 14.2) * 7.5, Math.sin(u * PI) * 1.0);
    P.mouth = talk(t, 14.4, 16.3, 3);
    P.smirk = 0.45; P.smile = 0.1; P.browL = kf(t, [[15, 0], [15.4, 0.6]]);
    P.hp = -0.05;
    if (t > 16.4) { P.arms = [[-0.12, 0.06, 0, 0.25], [-0.12, 0.06, 0, 0.25]]; P.hp = -0.18; P.hy = -0.25; P.smirk = 0.6; P.browR = 0.3; P.lid = 0.2; }
  } else if (t < 37.2) {
    P.x = 0; P.z = -1.38; P.ry = 0;
    // hand slam
    const raise = kf(t, [[23.3, 0], [23.75, 1]]);
    const slam = kf(t, [[23.8, 0], [23.9, 1]], easeOut);
    P.lean = kf(t, [[23.6, 0.05], [23.9, 0.38], [31.4, 0.38], [31.8, 0.08]]);
    P.arms = [[lerp(lerp(0.1, 1.9, raise), 0.62, slam), 0.15, 0, lerp(lerp(0.2, 0.8, raise), 0.1, slam)], [lerp(0.1, 0.62, kf(t, [[24.2, 0], [24.6, 1]])), 0.15, 0, 0.1]];
    P.hp = kf(t, [[23.9, 0.35], [24.4, 0.1], [25.8, 0.1], [26.3, 0.35]]);
    P.mouth = talk(t, 24.3, 25.9, 5) + talk(t, 31.7, 34.3, 6);
    P.furrow = kf(t, [[24, 0.3], [27, 0.3], [31.5, 0.6]]);
    P.smirk = kf(t, [[24, 0.2], [25.8, 0.3], [28, 0]]);
    // look at Marco during his line and after
    P.hy = kf(t, [[28.4, 0], [28.8, -0.75], [31.5, -0.75], [31.8, -0.45], [34.5, -0.45], [34.7, -0.8]]);
    P.ex = kf(t, [[28.4, 0], [28.8, -0.6]]);
    if (t > 31.5) {
      const pt = kf(t, [[31.6, 0], [32.0, 1], [34.0, 1], [34.4, 0]]);
      P.arms[0] = lerp(P.arms[0], [1.15, 0.05, 0, 0.05], pt);
      P.arms[1] = lerp(P.arms[1], [0.0, 0.12, 0, 0.3], clamp((t - 31.5) / 0.4));
      P.hp = kf(t, [[31.6, 0.3], [32.0, 0.05]]);
    }
    if (t > 34.5) { P.lid = 0.45; P.browL = 0.2; P.mouth = 0; P.smirk = 0; }
  } else {
    // behind Sasha, looking at the city, then whip to the screen
    P.x = 2.75; P.z = 0.5; P.ry = PI * 0.9;
    P.arms = [[-0.25, 0.12, 0, 0.5], [-0.25, 0.12, 0, 0.5]];
    P.hp = -0.05;
    const wh = kf(t, [[47.65, 0], [47.95, 1]], easeOut);
    P.ry = lerp(PI * 0.9, -PI / 2 - 0.35, wh);
    P.x = lerp(2.75, 2.65, wh); P.z = lerp(0.5, 0.3, wh);
    P.lean = kf(t, [[47.8, 0], [48.3, 0.5]]);
    P.hp = kf(t, [[47.8, -0.05], [48.3, 0.2]]);
    P.hy = kf(t, [[47.8, 0], [48.3, 0.15]]);
    P.browL = P.browR = kf(t, [[47.8, 0], [48.1, 0.6], [49.5, 0.6], [50, -0.2]]);
    P.furrow = kf(t, [[49.5, 0], [50.2, 0.6]]);
    P.lid = kf(t, [[47.8, 0], [48, -0.2]]);
    P.arms = lerp(P.arms, [[0.4, 0.15, 0, 0.5], [0.6, 0.1, 0, 1.4]], wh);
  }
  return P;
}

function sashaPose(t) {
  const sit = { x: 2.15, z: -0.1, y: 0.5 - 0.92 * 0.93, ry: -PI / 2 };
  const P = { ...sit, legs: [[1.45, 1.35], [1.45, 1.3]], blink: blinkAt(t, 2), lean: 0.18 };
  const typing = (amt) => {
    const a = Math.sin(t * 22) * 0.06 * amt, b = Math.sin(t * 19 + 1.3) * 0.06 * amt;
    return [[0.95 + a, 0.05, 0.3, 1.0 + b], [0.95 + b, 0.05, 0.3, 1.0 + a]];
  };
  P.arms = typing(t < 10 ? 1 : 0.3);
  P.hp = 0.32; P.ey = -0.5; P.lid = 0.2;
  // chewing gum (mouth small, rhythmic)
  const chew = (t < 44 ? 1 : 0) * (0.08 + 0.08 * Math.max(0, Math.sin(t * 7)));
  P.mouth = chew;
  if (t >= 10 && t < 16.6) {
    P.twist = kf(t, [[10.0, 0], [10.3, -0.35]]);
    P.hy = kf(t, [[10.0, 0], [10.35, -0.6]]);
    P.hp = kf(t, [[10.0, 0.32], [10.35, -0.08]]);
    P.ey = kf(t, [[10.0, -0.5], [10.35, 0.15]]); P.ex = -0.5;
    P.lid = 0.42; P.browL = kf(t, [[10.5, 0], [10.9, 0.9]]); P.browR = -0.15;
    P.mouth = Math.max(talk(t, 10.3, 13.8, 2) * 0.8, chew);
    const lift = kf(t, [[11.7, 0], [12.2, 1], [13.7, 1], [14.2, 0]]);
    P.arms = lerp(typing(0.3), [[0.95, 0.05, 0.3, 1.0], [1.3, 0.25, 0.9, 1.75]], lift);
    P.arms[0] = typing(0.3)[0];
    P.hr = 0.08;
  }
  magnet.visible = t > 11.6 && t < 14.3;
  // bubble for freeze frame
  let br = 0;
  if (t >= 19 && t < 21.4) { br = kf(t, [[19.0, 0.01], [19.45, 0.075]]); P.lid = 0.45; P.hp = 0.0; P.hy = -0.35; P.ex = -0.6; P.browL = 0.5; P.arms = typing(0); }
  if (t >= 37.2 && t < 44) {
    P.arms = typing(t < 41 ? 1.3 : 0.2);
    P.mouth = Math.max(talk(t, 37.7, 40.6, 4) * 0.8, chew);
    P.smile = kf(t, [[37.6, 0], [38.2, 0.45], [41, 0.45], [41.5, 0]]);
    P.lid = kf(t, [[37.6, 0.2], [38.2, 0.35]]);
    P.browL = kf(t, [[37.6, 0], [38.2, 0.5]]);
  }
  if (t >= 44 && t < 47.6) {
    P.arms = typing(0);
    br = t < 45.1 ? kf(t, [[44.2, 0.0], [45.1, 0.105]], u => u) : 0;
    P.lid = kf(t, [[44.0, 0.2], [44.8, -0.25]]);
    P.browL = P.browR = kf(t, [[44.2, 0], [44.9, 0.9]]);
    P.blink = t > 45.1 && t < 45.25 ? 1 : 0;
    P.mouth = t < 45.1 ? 0.12 : talk(t, 45.6, 47.3, 7) * 0.5;
    P.hp = 0.25; P.ey = -0.3;
  }
  if (t >= 47.6) {
    P.arms = typing(0);
    P.lid = -0.25; P.browL = P.browR = 0.7; P.furrow = -0.6;
    P.mouth = talk(t, 48.1, 50.4, 8) * 0.7;
    P.hp = 0.12; P.ey = -0.05;
    P.hy = kf(t, [[49.6, 0], [50.1, 0.35]]); P.ex = kf(t, [[49.6, 0], [50, 0.8]]);
    P.lean = 0.22;
  }
  bubble.visible = br > 0.004;
  bubble.scale.setScalar(Math.max(br, 0.001));
  bubble.position.set(0, -0.085, 0.13 + br * 0.9);
  smear.visible = t >= 45.1;
  return P;
}

function marcoPose(t) {
  let biteOn = false;
  const P = { x: -2.25, z: -0.15, ry: PI / 2 - 0.15, lean: -0.06, blink: blinkAt(t, 3) };
  P.legs = [[0.15, 0.1], [-0.05, 0.05]];
  P.arms = [[0.55, 0.15, 0.3, 1.45], [0.05, 0.12, 0, 0.2]];
  P.hy = 0.25;
  if (t >= 21.4 && t < 24) { // bite
    const b = kf(t, [[21.4, 0], [21.8, 1]]);
    P.arms[0] = lerp(P.arms[0], [1.5, -0.8, 0.5, 2.2], b);
    biteOn = b > 0.8;
    P.mouth = kf(t, [[21.5, 0], [21.85, 0.9]]); P.hy = 0; P.hp = 0.05;
    P.lid = kf(t, [[21.5, 0], [21.85, 0.55]]); P.browL = P.browR = 0.4;
  }
  if (t >= 28.4 && t < 34.5) {
    P.hy = 0.55; P.hp = 0.0;
    P.mouth = talk(t, 28.7, 31.3, 9);
    P.browR = kf(t, [[28.6, 0], [29.0, 1]]); P.browL = kf(t, [[28.6, 0], [29.0, -0.3]]);
    P.hr = kf(t, [[28.6, 0], [29.2, 0.14]]);
    const g = kf(t, [[29.4, 0], [29.9, 1], [31.2, 1], [31.6, 0]]);
    P.arms[0] = lerp(P.arms[0], [0.95, 0.15, 0.3, 1.0], g);
    P.ex = 0.3;
  }
  if (t >= 34.5) {
    P.hy = kf(t, [[34.5, 0.55], [35.0, 0.1], [35.6, 0.1], [35.9, 0.55]]);
    P.hp = kf(t, [[34.5, 0], [35.0, 0.42], [35.6, 0.42], [35.9, -0.02]]);
    P.ey = kf(t, [[34.5, 0], [35.0, -0.8], [35.6, -0.8], [35.9, 0]]);
    const hide = kf(t, [[35.4, 0], [35.95, 1]]);
    P.arms[0] = lerp(P.arms[0], [-0.55, 0.25, -0.2, 0.9], hide);
    P.mouth = talk(t, 35.75, 37.1, 10) * 0.7;
    P.smile = kf(t, [[35.7, 0], [36.1, 0.35]]);
    P.browL = P.browR = kf(t, [[35.6, 0], [36, 0.5]]); P.furrow = kf(t, [[35.6, 0], [36, -0.5]]);
    P.ex = kf(t, [[35.8, 0], [36.1, 0.4]]);
  }
  biteSandwich.visible = biteOn; sandwich.visible = !biteOn;
  return P;
}

const CCTV = new THREE.Vector3(3.3, 3.3, 2.6);
function maskedPose(t) {
  const P = { x: 99, z: 0, ry: 0 };
  if (t >= 42.4 && t < 43.6) {
    const u = (t - 42.4) / 1.2;
    P.x = lerp(-4.5, 4.5, u); P.z = -9.4; P.ry = PI / 2;
    walk(P, t * 11, 1.3);
  } else if (t >= 50.6) {
    const u = clamp((t - 50.6) / 2.8);
    P.x = lerp(1.8, 0.25, u); P.z = lerp(0.2, -4.85, u);
    const dirAng = Math.atan2(-1.55, -5.05);
    const camAng = Math.atan2(CCTV.x - 0.25, CCTV.z + 4.85);
    P.ry = dirAng;
    if (u < 1) walk(P, (t - 50.6) * 8, Math.min(1, Math.sin(u * PI) * 2));
    else P.arms = [[0.05, 0.1, 0, 0.15], [0.05, 0.1, 0, 0.15]];
    const turn = kf(t, [[53.6, 0], [54.7, 1]], smooth);
    const d = camAng - dirAng, diff = (((d + PI) % (2 * PI)) + 2 * PI) % (2 * PI) - PI;
    P.ry = dirAng + diff * turn;
    P.hp = lerp(0, -0.38, turn);
    P.hy = kf(t, [[53.4, 0], [53.8, 0.35], [54.4, 0.0]]);
    const wave = kf(t, [[54.85, 0], [55.15, 1]]);
    if (wave > 0) P.arms[0] = lerp(P.arms[0], [0.2, 2.5 + 0.25 * Math.sin((t - 54.85) * 14), 0, 0.5], wave);
    P.hr = wave * 0.15;
  }
  return P;
}

// ---------------------------------------------------------------- screens & tower fx
function drawScreen(t) {
  const tex = roof.screenTex, g = tex.userData.ctx, w = 512, h = 340;
  g.fillStyle = '#05080f'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#1b2a44'; g.fillRect(0, 0, w, 28);
  g.fillStyle = '#9fd3ff'; g.font = '700 16px Inter'; g.fillText('LOUVRE // SECURITY NETWORK', 12, 19);
  if (t < 39.4) {
    g.font = '600 15px monospace'; g.fillStyle = '#5cff9a';
    const lines = ['> ssh admin@louvre-sec', '> bypass firewall --quiet', '> decrypt cams 01-24', '> override motion_alarm', '> inject loop.mp4', '> ...'];
    const n = Math.floor(clamp((t - 36.8) / 2.4) * lines.length * 1.0) + 2;
    lines.slice(0, n).forEach((l, i) => g.fillText(l, 16, 60 + i * 26));
    if (Math.floor(t * 4) % 2) g.fillRect(16, 60 + Math.min(n, lines.length) * 26 - 12, 10, 16);
  } else if (t < 41.2) {
    g.fillStyle = '#103a22'; g.fillRect(56, 120, 400, 100);
    g.strokeStyle = '#5cff9a'; g.lineWidth = 3; g.strokeRect(56, 120, 400, 100);
    g.fillStyle = '#5cff9a'; g.font = '900 38px Inter'; g.textAlign = 'center'; g.fillText('ACCESS GRANTED', w / 2, 183); g.textAlign = 'left';
  } else {
    for (let i = 0; i < 4; i++) {
      const x = 14 + (i % 2) * 248, y = 40 + Math.floor(i / 2) * 148;
      g.fillStyle = '#1a1f1a'; g.fillRect(x, y, 236, 136);
      g.fillStyle = '#2c352c'; g.fillRect(x + 20, y + 60, 196, 60);
      g.fillStyle = '#d0d0d0'; g.font = '700 13px monospace'; g.fillText(`CAM 0${[3, 5, 7, 9][i]}`, x + 8, y + 18);
      if (i === 2 && t > 47.4) { g.strokeStyle = Math.floor(t * 6) % 2 ? '#ff2a2a' : '#7a0000'; g.lineWidth = 4; g.strokeRect(x, y, 236, 136); g.fillStyle = '#ff3b3b'; g.fillText('MOTION', x + 160, y + 18); g.fillStyle = '#000'; g.fillRect(x + 110, y + 50, 14, 40); }
    }
  }
  tex.needsUpdate = true;
}
function towerFx(t) {
  roof.beacon.rotation.y = t * 0.55;
  const sparkOn = t < 10.5 ? 1 : 0;
  const c = roof.sparkCol; const r = rng(Math.floor(t * 20) + 3);
  for (let i = 0; i < c.length; i += 3) { const v = r() < 0.18 ? sparkOn * (0.6 + r() * 0.8) : 0; c[i] = v; c[i + 1] = v; c[i + 2] = v * 0.95; }
  roof.sparks.geometry.attributes.color.needsUpdate = true;
}

// ---------------------------------------------------------------- shots
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const shake = (t, a) => V(Math.sin(t * 1.7) * a + Math.sin(t * 3.9) * a * 0.4, Math.sin(t * 2.3 + 1) * a * 0.7, Math.sin(t * 1.1 + 2) * a * 0.5);
const HEAD = { v: victor, s: sasha, m: marco };
const hp = k => HEAD[k].head.getWorldPosition(new THREE.Vector3());
const fc = (h, ry, dist, side = 0, dy = 0) => [h.x + Math.sin(ry) * dist + Math.cos(ry) * side, h.y + dy, h.z + Math.cos(ry) * dist - Math.sin(ry) * side];
const dn = (h, d) => [h.x, h.y - d, h.z];
const lin = u => u;
const shots = [
  { t0: 0, t1: 3.6, scene: 'roof', fov: 52, cam: t => [kf(t, [[0, [-34, 9, 58]], [3.6, [-13, 5.0, 21]]], lin), kf(t, [[0, [42, 45, -265]], [3.6, [34, 34, -250]]], lin)] },
  { t0: 3.6, t1: 6.2, scene: 'roof', fov: 50, cam: t => [kf(t, [[3.6, [-0.75, 1.25, 0.2]], [6.2, [-0.3, 1.5, -1.55]]], lin), kf(t, [[3.6, [42, 38, -265]], [6.2, [42, 42, -265]]], lin)] },
  { t0: 6.2, t1: 10.0, scene: 'roof', fov: 36, cam: t => { const h = hp('v'); return [fc(h, 0.12, kf(t, [[6.2, 1.55], [10, 1.25]], lin), -0.3, -0.06), dn(h, 0.16)]; }, sh: 0.006 },
  { t0: 10.0, t1: 14.2, scene: 'roof', fov: 36, cam: t => { const h = hp('s'); return [fc(h, -2.25, kf(t, [[10, 1.35], [14.2, 1.25]], lin), 0, 0.0), dn(h, 0.2)]; }, sh: 0.004 },
  { t0: 14.2, t1: 16.6, scene: 'roof', fov: 38, cam: t => { const h = hp('v'); return [fc(h, 0.05, 1.7, -0.35, -0.08), dn(h, 0.2)]; }, sh: 0.006 },
  { t0: 16.6, t1: 19.0, scene: 'roof', fov: 42, freeze: 17.05, card: 0, cam: t => { const h = hp('v'); return [fc(h, kf(t, [[16.6, -0.75], [17.05, -0.4]], easeOut), kf(t, [[16.6, 2.1], [17.05, 1.7]], easeOut), 0, -0.6), dn(h, 0.28)]; } },
  { t0: 19.0, t1: 21.4, scene: 'roof', fov: 36, freeze: 19.45, card: 1, cam: t => { const h = hp('s'); return [fc(h, kf(t, [[19, -1.3], [19.45, -1.55]], easeOut), kf(t, [[19, 1.1], [19.45, 0.85]], easeOut), 0, 0.02), dn(h, 0.14)]; } },
  { t0: 21.4, t1: 23.8, scene: 'roof', fov: 38, freeze: 21.88, card: 2, cam: t => { const h = hp('m'); return [fc(h, kf(t, [[21.4, 1.05], [21.88, 1.3]], easeOut), kf(t, [[21.4, 1.9], [21.88, 1.55]], easeOut), 0, -0.1), dn(h, 0.3)]; } },
  { t0: 23.8, t1: 28.5, scene: 'roof', fov: 46, cam: t => [kf(t, [[23.8, [0.35, 2.05, 0.9]], [25.6, [0.3, 2.1, 0.75]], [28.5, [0.12, 1.42, 0.2]]]), kf(t, [[23.8, [0, 1.15, -1.25]], [25.6, [0, 1.0, -1.0]], [28.5, [0.05, 0.84, -0.33]]])], sh: 0.004 },
  { t0: 28.5, t1: 31.5, scene: 'roof', fov: 36, cam: t => { const h = hp('m'); return [fc(h, 1.5, kf(t, [[28.5, 2.15], [31.5, 2.0]], lin), 0, -0.12), dn(h, 0.3)]; }, sh: 0.005 },
  { t0: 31.5, t1: 34.5, scene: 'roof', fov: 34, cam: t => { const h = hp('v'); return [fc(h, -0.4, kf(t, [[31.5, 1.3], [34.5, 1.2]], lin), 0, -0.05), dn(h, 0.18)]; }, sh: 0.005 },
  { t0: 34.5, t1: 37.2, scene: 'roof', fov: 38, cam: t => { const h = hp('m'); return [fc(h, 1.45, 2.1, 0, -0.15), dn(h, kf(t, [[34.5, 0.3], [35.1, 0.42], [35.8, 0.28]]))]; }, sh: 0.004 },
  { t0: 37.2, t1: 39.1, scene: 'roof', fov: 40, cam: t => [kf(t, [[37.2, [2.75, 1.4, 0.4]], [39.1, [2.6, 1.32, 0.3]]], lin), [1.6, 0.72, -0.12]], sh: 0.003 },
  { t0: 39.1, t1: 41.0, scene: 'roof', fov: 34, cam: t => { const h = hp('s'); return [fc(h, -1.25, kf(t, [[39.1, 0.95], [41, 0.85]], lin), 0, -0.02), dn(h, 0.14)]; }, sh: 0.004 },
  { t0: 41.0, t1: 44.0, scene: 'gal', fov: 62, cctv: true, cam: () => [CCTV.toArray(), [-0.4, 1.0, -6.0]] },
  { t0: 44.0, t1: 47.6, scene: 'roof', fov: 30, cam: t => { const h = hp('s'); return [fc(h, -1.42, kf(t, [[44, 0.85], [47.6, 0.62]], lin), 0, -0.01), dn(h, 0.08)]; }, sh: 0.003 },
  { t0: 47.6, t1: 50.6, scene: 'roof', fov: 42, cam: t => { const a = hp('s'), b = hp('v'); const m = a.clone().lerp(b, 0.5); return [fc(a, -1.8, kf(t, [[47.6, 2.0], [50.6, 1.85]], lin), 0.15, 0.0), dn(a, 0.2)]; }, sh: 0.006 },
  { t0: 50.6, t1: 56.0, scene: 'gal', fov: 62, cctv: true, cam: () => [CCTV.toArray(), [-0.4, 1.0, -6.0]] },
  { t0: 56.0, t1: 61.0, scene: 'none' },
];

const subs = [
  ['VICTOR', 'In 48 hours… we steal the Mona Lisa.', 6.9, 9.9],
  ['SASHA', 'Last time you said that, we stole a fridge magnet.', 10.3, 13.9],
  ['VICTOR', 'This time is different.', 14.4, 16.4],
  ['VICTOR', 'Here’s the plan.', 24.3, 26.2],
  ['MARCO', 'Why is there a picture of a sandwich?', 28.7, 31.4],
  ['VICTOR', 'Step one. Distract the guard.', 31.7, 34.4],
  ['MARCO', '…not with this one.', 35.75, 37.2],
  ['SASHA', 'I’m in. Louvre cameras.', 37.7, 40.8],
  ['SASHA', '…Victor.', 45.6, 47.5],
  ['SASHA', 'Someone else is already inside.', 48.1, 50.55],
];
const subColor = { VICTOR: '#f5c04a', SASHA: '#ff6fae', MARCO: '#4fd1c5' };
const cards = [
  ['VICTOR', 'The Brain', '(allegedly)', '#f5c04a'],
  ['SASHA', 'The Hacker', '(actually the brain)', '#ff6fae'],
  ['MARCO', 'The Driver', '(no license)', '#4fd1c5'],
];

// ---------------------------------------------------------------- DOM overlays
const $ = id => document.getElementById(id);
const el = { stage: $('stage'), sub: $('sub'), subName: $('subName'), subText: $('subText'), title: $('title'), loc: $('loc'), card: $('card'), cardName: $('cardName'), cardRole: $('cardRole'), cardNote: $('cardNote'), tint: $('tint'), flash: $('flash'), cctv: $('cctv'), cctvTime: $('cctvTime'), rec: $('rec'), end: $('end'), black: $('black'), glitch: $('glitch'), grain: $('grain'), scan: $('scan'), vig: $('vig') };
const grainCtx = el.grain.getContext('2d');
function drawGrain(t) {
  const r = rng(Math.floor(t * 30) * 7 + 1), img = grainCtx.createImageData(270, 480);
  for (let i = 0; i < img.data.length; i += 4) { const v = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  grainCtx.putImageData(img, 0, 0);
}
let lastSub = '';
function overlays(t, shot) {
  // subtitles with word pop
  const s = subs.find(s => t >= s[2] && t < s[3]);
  if (s) {
    const key = s[1];
    if (key !== lastSub) {
      el.subText.innerHTML = s[1].split(' ').map(w => `<span class="w">${w}</span>`).join(' ');
      el.subName.textContent = s[0]; el.subName.style.color = subColor[s[0]]; lastSub = key;
    }
    const words = el.subText.querySelectorAll('.w');
    const dur = Math.min(s[3] - s[2] - 0.4, words.length * 0.22);
    words.forEach((w, i) => {
      const u = clamp((t - s[2] - (i / words.length) * dur) / 0.14);
      w.style.opacity = u; w.style.transform = `translateY(${(1 - easeOut(u)) * 14}px) scale(${0.9 + 0.1 * easeOut(u)})`;
    });
    el.sub.style.opacity = clamp((s[3] - t) / 0.15);
    el.subName.style.opacity = clamp((t - s[2]) / 0.12);
  } else el.sub.style.opacity = 0;

  // location tag
  const locTxt = 'PARIS, FRANCE  ·  00:00';
  const n = Math.floor(clamp((t - 0.5) / 1.4) * locTxt.length);
  el.loc.textContent = locTxt.slice(0, n) + (t < 3.4 && Math.floor(t * 3) % 2 ? '▌' : '');
  el.loc.style.opacity = clamp((3.5 - t) / 0.3);

  // title
  const ti = clamp((t - 3.75) / 0.35), to = clamp((6.1 - t) / 0.35);
  el.title.style.opacity = Math.min(ti, to);
  el.title.style.transform = `scale(${1.25 - 0.25 * easeOut(ti) + (t - 3.75) * 0.015})`;
  $('titleSub').style.opacity = clamp((t - 4.35) / 0.4) * to;
  $('titleSub').style.letterSpacing = `${0.32 + 0.08 * clamp((t - 4.35) / 2)}em`;

  // freeze card
  if (shot.card !== undefined && t >= shot.freeze) {
    const c = cards[shot.card], u = t - shot.freeze;
    el.card.style.display = 'block';
    el.cardName.textContent = c[0]; el.cardName.style.color = c[3];
    el.cardRole.textContent = c[1]; el.cardNote.textContent = c[2];
    el.cardName.style.transform = `translateX(${(1 - easeOut(clamp(u / 0.3))) * -500}px) skewX(-6deg)`;
    $('cardRoleWrap').style.transform = `translateX(${(1 - easeOut(clamp((u - 0.12) / 0.3))) * -700}px)`;
    el.cardNote.style.opacity = clamp((u - 0.55) / 0.2);
    el.card.style.opacity = clamp((shot.t1 - t) / 0.12);
    el.tint.style.opacity = 0.5; el.tint.style.background = c[3];
    el.flash.style.opacity = Math.max(0, 0.85 - u * 4);
    el.stage.style.filter = 'grayscale(0.9) contrast(1.25) brightness(1.15)';
  } else {
    el.card.style.display = 'none'; el.tint.style.opacity = 0; el.flash.style.opacity = 0;
    el.stage.style.filter = shot.cctv ? 'grayscale(1) sepia(0.35) hue-rotate(55deg) saturate(1.5) contrast(1.3) brightness(1.35) blur(0.6px)' : 'contrast(1.06) saturate(1.12)';
  }

  // CCTV UI
  el.cctv.style.display = shot.cctv ? 'block' : 'none';
  el.scan.style.opacity = shot.cctv ? 0.5 : 0;
  if (shot.cctv) {
    const base = 2 * 3600 + 14 * 60 + 3 + Math.floor(t - 41);
    const hh = String(Math.floor(base / 3600)).padStart(2, '0'), mm = String(Math.floor(base / 60) % 60).padStart(2, '0'), ss = String(base % 60).padStart(2, '0');
    el.cctvTime.textContent = `11/08  ${hh}:${mm}:${ss}`;
    el.rec.style.opacity = Math.floor(t * 2) % 2 ? 1 : 0.2;
  }
  // glitch near the end of CCTV
  const gl = t > 55.0 && t < 56 ? clamp((t - 55.0) / 0.9) : (t > 41 && t < 41.12 ? 0.6 : (t > 50.6 && t < 50.72 ? 0.6 : 0));
  if (gl > 0) {
    const r = rng(Math.floor(t * 30) + 99);
    el.glitch.style.display = 'block';
    el.glitch.innerHTML = Array.from({ length: Math.floor(3 + gl * 10) }, () => `<div style="top:${r() * 100}%;height:${4 + r() * 60 * gl}px;background:${['#fff', '#0f0', '#f0f', '#000'][Math.floor(r() * 4)]};opacity:${0.3 + r() * 0.5}"></div>`).join('');
    el.stage.style.transform = `translateX(${(r() - 0.5) * 80 * gl}px)`;
  } else { el.glitch.style.display = 'none'; el.stage.style.transform = ''; }

  // end card
  const e = t - 56.0;
  el.black.style.opacity = t >= 56 ? 1 : 0;
  el.end.style.opacity = e > 0 ? 1 : 0;
  $('endEp').style.opacity = clamp((e - 0.5) / 0.4);
  $('endTitle').style.opacity = clamp((e - 0.9) / 0.25);
  $('endTitle').style.transform = `scale(${1.15 - 0.15 * easeOut(clamp((e - 0.9) / 0.4))})`;
  $('endFollow').style.opacity = clamp((e - 2.0) / 0.4);
  $('endShow').style.opacity = clamp((e - 0.2) / 0.4);
  el.vig.style.opacity = t >= 56 ? 0 : 1;
}

// ---------------------------------------------------------------- render
window.renderAt = function (t) {
  const shot = shots.find(s => t >= s.t0 && t < s.t1) || shots[shots.length - 1];
  const ts = shot.freeze !== undefined ? Math.min(t, shot.freeze) : t;
  drawGrain(t);
  overlays(t, shot);
  if (shot.scene === 'none') { renderer.setClearColor(0x000000); renderer.clear(); return; }
  const mp = marcoPose(ts); if (window.OVR && window.OVR.marcoArm) mp.arms[0] = window.OVR.marcoArm;
  victor.apply(victorPose(ts)); sasha.apply(sashaPose(ts)); marco.apply(mp); masked.apply(maskedPose(ts));
  towerFx(ts); drawScreen(ts);
  roof.screenL.intensity = 1.3 + 0.3 * Math.sin(ts * 9) * Math.sin(ts * 3.3);
  roof.scene.updateMatrixWorld(); gal.scene.updateMatrixWorld();
  let [p, l] = shot.cam(ts); if (window.OVR && window.OVR.cam) [p, l] = window.OVR.cam;
  camera.fov = shot.fov; camera.updateProjectionMatrix();
  camera.position.set(...p);
  if (shot.sh) camera.position.add(shake(ts, shot.sh * 1.0));
  camera.lookAt(...l);
  // soft key light from camera side for faces
  const kl = roof.keyL; kl.intensity = shot.scene === 'roof' && shot.fov < 47 ? 1.25 : 0;
  camera.updateMatrixWorld();
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  kl.position.copy(camera.position).addScaledVector(right, -1.2).add(new THREE.Vector3(0, 1.0, 0));
  kl.target.position.set(...l); kl.target.updateMatrixWorld();
  renderer.render(shot.scene === 'gal' ? gal.scene : roof.scene, camera);
};
window.DURATION = 61.0;
await document.fonts.ready;
window.READY = true;
