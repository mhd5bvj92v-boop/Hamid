// CAMERA 6 — Part 1/5 "03:17". Deterministic timeline: window.renderAt(t).
import * as THREE from 'three';
import { makePerson, kf, blinkAt, clamp, smooth, easeOut, lerp } from '../../../the-paris-job/shared/person.js';
import { buildStreet, buildBedroom, buildHall, buildLanding, buildGarden, makeFigure, glow, rng } from '../../shared/sets.js';
import { makeLook } from '../../shared/look.js';

const W = 1080, H = 1920, PI = Math.PI, lin = u => u;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(40, W / H, 0.02, 400);
const look = makeLook(renderer, W, H);

const street = buildStreet(), bed = buildBedroom(), hall = buildHall(), land = buildLanding(), garden = buildGarden();
const SC = { street, bed, hall, land, garden };
const fig = makeFigure();
const irL = new THREE.PointLight(0xffffff, 0, 16, 1.2);

// Noor, lying on her right side, facing the room; phone in front of her face
const noor = makePerson({ real: true, skin: 0xc48e6c, hairStyle: 'ponytail', hair: 0x17100b, shirt: 0x8d97a8, collar: 0x8d97a8, pants: 0x5a6070, lashes: true, lip: 0x9a5a56, eye: 0x2e1c10, browThick: 0.9, scale: 0.95 });
bed.scene.add(noor.root);
const HEAD = V3(-1.42, 0.74, -0.92);
const phone = new THREE.Group(); bed.scene.add(phone);
{ const b = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.155, 0.009), new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.3, metalness: 0.6 })); phone.add(b);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.068, 0.146), new THREE.MeshBasicMaterial({ color: 0xb8d4ff })); scr.position.z = -0.005; scr.rotation.y = PI; phone.add(scr);
  const hand = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.07, 6, 12), new THREE.MeshStandardMaterial({ color: 0xc48e6c, roughness: 0.6 })); hand.rotation.z = PI / 2; hand.position.set(0, -0.06, 0.02); phone.add(hand);
  const pl = new THREE.PointLight(0xa8c8ff, 1.0, 1.2, 1.6); pl.position.z = -0.12; phone.add(pl); phone.userData.light = pl; phone.userData.scr = scr; }
phone.position.set(-1.36, 1.06, -0.86); phone.lookAt(HEAD.clone().add(V3(0.05, 0, 0.0))); // back of phone faces away from her; screen (-z side) faces her
const doorEyes = [0, 1].map(i => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.set(0.035, 0.035, 1); s.position.set(1.92, 1.78, 1.1 + i * 0.07); bed.scene.add(s); return s; });

// ---------------------------------------------------------------- cameras of the house
const DOORBELL = V3(1.12, 1.38, 0.3);
const FIG = { far: [1.9, 41.6], mid: [-2.2, 26.8], gate: [0.2, 6.35] };
const camLook = { street: [DOORBELL, V3(0.3, 1.6, 30)] };
const devFeed = (o = {}) => ({ fish: 0.55, mono: 0, sat: 0.55, noise: 0.07, pix: 1.6, chroma: 0.6, vig: 0.55, lift: 0.006, ...o });
const IR = (o = {}) => devFeed({ mono: 1, sat: 0, noise: 0.09, fish: 0.4, lift: 0.012, ...o });
const CINE = { fish: 0, mono: 0, sat: 0.92, noise: 0.035, pix: 1, chroma: 0.25, vig: 0.4, lift: 0 };

const shots = [
  { t0: 0.0, t1: 2.1, sc: 'street', fov: 100, dev: devFeed(), app: 'CAM 1', fig: 'far', cam: () => camLook.street },
  { t0: 2.1, t1: 5.0, sc: 'street', fov: 100, dev: devFeed(), app: 'CAM 1', fig: 'far', zoom: true, cam: t => { const z = smooth(clamp((t - 2.25) / 1.6)); const tg = V3(FIG.far[0], 1.25, FIG.far[1]); return [DOORBELL, V3(0.3, 1.6, 30).lerp(tg, z)]; }, fovf: t => lerp(100, 9, easeOut(clamp((t - 2.25) / 1.6))), pixf: t => lerp(1.6, 5, clamp((t - 2.25) / 1.6)) },
  { t0: 5.0, t1: 9.0, sc: 'street', fov: 100, dev: devFeed(), app: 'CAM 1', fig: 'mid', refresh: 5.0, cam: () => camLook.street },
  { t0: 9.0, t1: 11.6, sc: 'bed', fov: 30, dev: CINE, cam: t => [V3(kf(t, [[9, 0.7], [11.6, 0.45]], lin), 1.75, kf(t, [[9, 0.9], [11.6, 0.7]], lin)), V3(-1.3, 0.75, -0.9)], ap: 0.003 },
  { t0: 11.6, t1: 14.0, sc: 'chat' },
  { t0: 14.0, t1: 22.0, sc: 'street', fov: 100, dev: devFeed(), app: 'CAM 1', fig: 'gate', refresh: 14.0, cam: t => { const z = smooth(clamp((t - 16.6) / 5.0)); return [DOORBELL, V3(0.3, 1.6, 30).lerp(V3(0.2, 1.75, 6.35), z)]; }, fovf: t => lerp(100, 42, smooth(clamp((t - 16.6) / 5.0))), zoom: t => t > 16.8 },
  { t0: 22.0, t1: 30.0, sc: 'street', fov: 42, dev: devFeed(), app: 'CAM 1', fig: 'gate', audio: true, cam: () => [DOORBELL, V3(0.2, 1.75, 6.35)], fovf: t => lerp(42, 30, smooth(clamp((t - 22) / 8))), zoom: () => true },
  { t0: 30.0, t1: 32.2, sc: 'garden', fov: 92, dev: IR(), app: 'CAM 2', title: 'Garden', cam: () => [V3(0, 2.6, 2.8), V3(0, 0.9, -5)] },
  { t0: 32.2, t1: 34.0, sc: 'hall', fov: 96, dev: IR(), app: 'CAM 3', title: 'Hallway', cam: () => [V3(-2.2, 2.5, 3.2), V3(-0.1, 0.9, -3.5)] },
  { t0: 34.0, t1: 35.6, sc: 'land', fov: 96, dev: IR(), app: 'CAM 4', title: 'Upstairs', cam: () => [V3(0.85, 2.45, 3.35), V3(0, 0.8, -3.4)] },
  { t0: 35.6, t1: 36.8, sc: 'bed', fov: 96, dev: IR(), app: 'CAM 5', title: 'Bedroom', cam: () => [V3(1.8, 2.4, 2.0), V3(-1.0, 0.6, -0.9)] },
  { t0: 36.8, t1: 41.5, sc: 'street', fov: 100, dev: devFeed(), app: 'CAM 1', fig: null, rain: true, cam: () => camLook.street },
  { t0: 41.5, t1: 46.4, sc: 'hall', fov: 96, dev: IR(), app: 'CAM 3', title: 'Hallway', open: true, cam: t => [V3(-2.2, 2.5, 3.2), V3(-0.1, 0.9, -3.5)] },
  { t0: 46.4, t1: 49.5, sc: 'land', fov: 96, dev: IR(), app: 'CAM 4', title: 'Upstairs', cam: () => [V3(0.85, 2.45, 3.35), V3(0, 0.8, -3.4)] },
  { t0: 49.5, t1: 51.8, sc: 'bed', fov: 28, dev: CINE, cam: t => [V3(kf(t, [[49.5, -0.2], [51.8, -0.4]], lin), 1.05, kf(t, [[49.5, 0.75], [51.8, 0.6]], lin)), V3(-1.3, 0.85, -0.9)], ap: 0.004 },
  { t0: 51.8, t1: 54.0, sc: 'bed', fov: 34, dev: CINE, cam: t => [V3(-1.2, 1.0, -0.55).lerp(V3(0.2, 1.25, 0.3), smooth(clamp((t - 51.8) / 2.2)) * 0.5), V3(1.97, 1.2, 1.0)], ap: 0.003 },
  { t0: 54.0, t1: 57.6, sc: 'none' },
  { t0: 57.6, t1: 61, sc: 'street', fov: 100, dev: devFeed({ noise: 0.05 }), fig: null, end: true, cam: () => camLook.street },
];
const TITLES = { 'CAM 1': 'Front Door', 'CAM 2': 'Garden', 'CAM 3': 'Hallway', 'CAM 4': 'Upstairs', 'CAM 5': 'Bedroom' };

// ---------------------------------------------------------------- overlays
const $ = id => document.getElementById(id);
const show = (id, on) => $(id).classList.toggle('hide', !on);
$('audio').children[0].textContent = '●';
$('wave').innerHTML = Array.from({ length: 14 }, () => '<i></i>').join('');
$('kb').innerHTML = Array.from({ length: 30 }, (_, i) => { const row = Math.floor(i / 10), col = i % 10; const L = 'QWERTYUIOPASDFGHJKL ZXCVBNM   '[i]; return `<div style="left:${12 + col * 106 + row * 30}px;top:${30 + row * 150}px;width:92px;color:#fff;font-size:44px;display:flex;align-items:center;justify-content:center">${L.trim() ? L : ''}</div>`; }).join('') + '<div style="left:250px;top:480px;width:580px"></div>';
const pad = n => String(Math.floor(n)).padStart(2, '0');
const notes = [ // [t, message, detail]
  [0.25, 'Motion detected', 'Front Door · CAM 1'],
  [46.2, 'Motion detected', 'Upstairs · CAM 4'],
];
const taps = [[2.1, 540, 150], [5.0, 760, 1720 - 120 - 66], [14.0, 760, 1720 - 120 - 66], [30.0, 299, 1600 - 320 + 30], [32.2, 504, 1600 - 320 + 30], [34.0, 709, 1600 - 320 + 30], [35.6, 914, 1600 - 320 + 30], [36.8, 94, 1600 - 320 + 30], [41.5, 504, 1600 - 320 + 30], [46.4, 540, 150]];
const msg = 'someone’s outside my house';
function overlays(t, shot) {
  const app = !!shot.app;
  show('app', app); show('chat', shot.sc === 'chat');
  if (app) {
    $('camTitle').textContent = shot.title || TITLES[shot.app]; $('camSub').textContent = `${shot.app} · HOMEWATCH`;
    const s = 2 + t; $('stamp').innerHTML = `${shot.app} · ${(shot.title || TITLES[shot.app]).toUpperCase()}<br>2026-11-09  03:17:${pad(s % 60)}`;
    [...$('tabs').children].forEach(d => d.classList.toggle('on', d.textContent === shot.app));
    const z = typeof shot.zoom === 'function' ? shot.zoom(t) : shot.zoom;
    show('zoom', !!z && t > shot.t0 + 0.3); if (shot.fovf) $('zoom').textContent = `${(100 / shot.fovf(t)).toFixed(1)}×`;
    const sp = shot.refresh != null && t < shot.refresh + 0.55; show('spin', sp); if (sp) $('spin').style.transform = `rotate(${t * 900}deg)`;
    show('audio', !!shot.audio && t > 22.25); $('bMic').classList.toggle('red', !!shot.audio && t > 22.25);
    if (shot.audio) [...$('wave').children].forEach((b, i) => { const v = (t > 24.5 && t < 26.1) ? 0.35 + 0.65 * Math.abs(Math.sin(t * 23 + i * 1.7) * Math.sin(t * 7 + i)) : 0.12 + 0.12 * Math.abs(Math.sin(t * 11 + i * 2.3)); b.style.height = `${6 + v * 30}px`; });
    $('rec').style.opacity = Math.floor(t * 2) % 2 ? 1 : 0.25;
  }
  // banner
  const n = notes.find(n => t >= n[0] && t < n[0] + 2.4);
  if (n) { $('bMsg').textContent = n[1]; $('bDet').textContent = n[2]; const u = t - n[0]; const y = u < 0.35 ? -260 + 260 * easeOut(u / 0.35) : (u > 2.0 ? -260 * clamp((u - 2.0) / 0.3) : 0); $('banner').style.transform = `translateY(${y}px)`; show('banner', true); }
  else show('banner', false);
  // taps
  const tp = taps.find(p => t >= p[0] - 0.12 && t < p[0] + 0.25);
  if (tp) { const u = clamp((t - tp[0] + 0.12) / 0.37); show('ripple', true); Object.assign($('ripple').style, { left: tp[1] + 'px', top: tp[2] + 'px', opacity: 1 - u, transform: `scale(${0.5 + u})` }); } else show('ripple', false);
  // chat
  if (shot.sc === 'chat') {
    const k = Math.floor(clamp((t - 11.85) / 1.15) * msg.length);
    const sent = t > 13.1;
    $('typed').textContent = sent ? '' : msg.slice(0, k);
    $('caret').style.opacity = Math.floor(t * 3) % 2 ? 1 : 0;
    $('bub').style.display = sent ? 'block' : 'none'; $('bub').textContent = msg;
    $('bub').style.transform = sent ? `translateY(${(1 - easeOut(clamp((t - 13.1) / 0.2))) * 60}px)` : '';
    $('read').style.display = t > 13.55 ? 'block' : 'none'; $('read').textContent = t > 13.55 ? 'Read 3:17 AM' : '';
  }
  show('cc', t > 24.5 && t < 26.4);
  $('black').style.opacity = shot.sc === 'none' ? 1 : 0;
  show('night', shot.sc === 'none' && t > 54.25); $('night').style.opacity = clamp((t - 54.25) / 0.5) * clamp((57.4 - t) / 0.4);
  show('end', !!shot.end); $('end').style.opacity = clamp((t - 57.6) / 0.4);
  $('vig').style.opacity = shot.dev === CINE ? 1 : 0.3;
}

// ---------------------------------------------------------------- render
window.renderAt = function (t) {
  const shot = shots.find(s => t >= s.t0 && t < s.t1) || shots[shots.length - 1];
  overlays(t, shot);
  if (shot.sc === 'none' || shot.sc === 'chat') { renderer.setClearColor(0x000000); renderer.clear(); return; }
  const set = SC[shot.sc];
  // figure
  if (shot.sc === 'street' && shot.fig) {
    street.scene.add(fig); fig.visible = true;
    const [x, z] = FIG[shot.fig]; fig.position.set(x, 0, z); fig.rotation.y = Math.atan2(DOORBELL.x - x, DOORBELL.z - z);
    fig.userData.pose(shot.fig === 'gate' ? { tilt: 0.3, up: 0.42, eyes: true } : { tilt: 0.22, up: 0, eyes: shot.fig === 'far' });
  } else fig.visible = false;
  if (shot.sc === 'street') street.update(t, { flicker: !shot.rain, raining: !!shot.rain || t > 36 });
  if (shot.sc === 'hall') hall.update(t, !!shot.open);
  if (shot.sc === 'garden') garden.update(t);
  if (shot.sc === 'land') { land.doors[2].rotation.y = -0.35 + (t > 46.4 ? -0.18 * smooth(clamp((t - 47.2) / 2.0)) : 0); }
  if (shot.sc === 'bed') {
    const s = 0.95;
    const P = { x: HEAD.x + 1.55 * s, y: HEAD.y - 0.04, z: HEAD.z, ry: PI / 2, rx: -PI / 2, blink: blinkAt(t, 3), lid: 0.12, furrow: 0.35, hp: 0.15, arms: [[0.05, 0.1, 0, 0.2], [0.05, 0.1, 0, 0.2]] };
    if (t > 49.5) { P.ex = kf(t, [[50.4, 0], [51.0, 0.9]]); P.ey = kf(t, [[50.4, 0], [51.0, 0.3]]); P.browL = P.browR = kf(t, [[50.2, 0], [50.8, 0.5]]); P.lid = kf(t, [[50.2, 0.12], [50.8, -0.1]]); P.blink = 0; P.mouth = kf(t, [[50.6, 0], [51.0, 0.15]]); }
    noor.apply(P);
    phone.visible = true; phone.userData.light.intensity = shot.dev === CINE ? 1.0 : 0.6;
    const fl = t > 51.8 ? (t < 53.3 ? (Math.sin(t * 40) > -0.3 && Math.sin(t * 9) > -0.8 ? 1 : 0.15) : 0) : 1; bed.landing.intensity = 2.2 * fl; bed.gap.material.color.setRGB(0.16 * fl, 0.2 * fl, 0.28 * fl);
    if (t > 50.3) { const dn = smooth(clamp((t - 50.3) / 0.8)); phone.position.set(-1.36 + 0.1 * dn, 1.06 - 0.2 * dn, -0.86 + 0.15 * dn); phone.lookAt(HEAD); } else { phone.position.set(-1.36, 1.06, -0.86); phone.lookAt(HEAD.clone().add(V3(0.05, 0, 0))); }
    doorEyes.forEach(e => e.visible = t > 53.35 && t < 53.75);
  }
  let [p, l] = shot.cam(t);
  set.scene.add(irL); irL.position.copy(p); irL.intensity = shot.dev.mono ? 9 : 0;
  set.scene.updateMatrixWorld();
  if (window.OVR && window.OVR.cam) { p = V3(...window.OVR.cam[0]); l = V3(...window.OVR.cam[1]); }
  camera.fov = shot.fovf ? shot.fovf(t) : shot.fov; camera.updateProjectionMatrix();
  camera.position.copy(p);
  if (shot.dev === CINE) camera.position.add(V3(Math.sin(t * 0.9) * 0.004, Math.sin(t * 1.3) * 0.003, 0));
  camera.lookAt(l); camera.updateMatrixWorld();
  // device look
  const d = shot.dev, u = look.dev;
  const glitch = (shot.refresh != null && t < shot.refresh + 0.45) || (Math.abs(t - shot.t0) < 0.12 && shot.app) || (t > 28.4 && t < 28.7) ? 0.9 : 0;
  u.uTime.value = t; u.uTint.value.setScalar(d === CINE ? 1 : (d.mono ? 2.4 : 2.0)); u.uFish.value = d.fish; u.uMono.value = d.mono; u.uSat.value = d.sat; u.uNoise.value = d.noise; u.uChroma.value = d.chroma; u.uVig.value = d.vig; u.uLift.value = d.lift;
  u.uPix.value = shot.pixf ? shot.pixf(t) : (shot.zoom && (typeof shot.zoom !== 'function' || shot.zoom(t)) ? 3.2 : d.pix); u.uGlitch.value = glitch;
  if (shot.refresh != null && t < shot.refresh + 0.3) u.uPix.value = 14;
  look.bloom.strength = d === CINE ? 0.5 : 0.75;
  // AI "person" detection box (inverse of the fisheye in the device shader)
  const showDet = shot.sc === 'street' && shot.fig && !shot.end && !(shot.refresh != null && t < shot.refresh + 0.6);
  $('det').classList.toggle('hide', !showDet);
  if (showDet) {
    const toScr = v => { const n = v.clone().project(camera); let tu = [(n.x + 1) / 2, (n.y + 1) / 2]; const k = d.fish; let uv = [...tu];
      for (let i = 0; i < 12; i++) { const dx = (uv[0] - 0.5) * W / H, dy = uv[1] - 0.5, r2 = dx * dx + dy * dy, sc = (1 + k * 0.55) / (1 + k * r2 * 1.6); uv = [0.5 + (tu[0] - 0.5) * sc, 0.5 + (tu[1] - 0.5) * sc]; }
      return [uv[0] * W, (1 - uv[1]) * H]; };
    const [fx, fz] = FIG[shot.fig]; const a = toScr(V3(fx, 2.35, fz)), b = toScr(V3(fx, 0, fz));
    const h = Math.min(Math.max(30, b[1] - a[1]), 1330 - a[1]), w = Math.max(30, (b[1] - a[1]) * 0.42);
    Object.assign($('det').style, { left: `${a[0] - w / 2}px`, top: `${a[1] - 6}px`, width: `${w}px`, height: `${h + 12}px` });
    $('det').firstChild.textContent = `PERSON ${(0.86 + 0.08 * Math.abs(Math.sin(t * 3.1))).toFixed(2)}`;
  }
  look.render(set.scene, camera, camera.position.distanceTo(l), shot.ap ?? 0);
};
window.DURATION = 60.0;
await document.fonts.ready;
window.READY = true;
