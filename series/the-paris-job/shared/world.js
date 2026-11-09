// Paris rooftop set + Louvre gallery set.
import * as THREE from 'three';
import { mergeGeometries } from '../node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';
import { M } from './person.js';

export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
export function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.userData.canvas = c; t.userData.ctx = g;
  return t;
}
function m(geo, mat, cast = true, recv = true) {
  const x = new THREE.Mesh(geo, mat); x.castShadow = cast; x.receiveShadow = recv; return x;
}
export const glowTex = canvasTex(64, 64, (g, w, h) => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});

// ---------------------------------------------------------------- ROOFTOP
export function buildRooftop() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x1a2045, 0.0062);

  // sky dome
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {},
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vP; void main(){
      float h = vP.y;
      vec3 zen = vec3(0.025,0.035,0.11);
      vec3 mid = vec3(0.09,0.10,0.26);
      vec3 hor = vec3(0.55,0.30,0.30);
      vec3 c = mix(mid, zen, smoothstep(0.05, 0.6, h));
      c = mix(hor, c, smoothstep(-0.05, 0.16, h));
      gl_FragColor = vec4(c,1.);
    }`,
  }));
  scene.add(sky);
  // stars
  {
    const r = rng(11), pos = [];
    for (let i = 0; i < 900; i++) {
      const u = r() * Math.PI * 2, v = 0.12 + r() * 0.85;
      const y = Math.sin(v), c = Math.cos(v);
      pos.push(Math.cos(u) * c * 800, y * 800, Math.sin(u) * c * 800);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, color: 0xcfd8ff, fog: false, transparent: true, opacity: 0.8 })));
  }
  // moon
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff2d8, fog: false, transparent: true, depthWrite: false }));
  moon.position.set(-260, 330, -620); moon.scale.set(150, 150, 1); scene.add(moon);
  const moonDisc = new THREE.Mesh(new THREE.CircleGeometry(16, 40), new THREE.MeshBasicMaterial({ color: 0xfff6e6, fog: false }));
  moonDisc.position.copy(moon.position); moonDisc.lookAt(0, 0, 0); scene.add(moonDisc);

  // lights
  scene.add(new THREE.HemisphereLight(0x5a6aa8, 0x2a1d18, 0.75));
  const moonL = new THREE.DirectionalLight(0xa9b8ff, 1.1);
  moonL.position.set(-8, 14, 6); moonL.castShadow = true;
  moonL.shadow.mapSize.set(2048, 2048);
  Object.assign(moonL.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  moonL.shadow.bias = -0.0005; moonL.shadow.normalBias = 0.02;
  scene.add(moonL);
  const rim = new THREE.DirectionalLight(0xffb15a, 1.4); rim.position.set(30, 25, -200); scene.add(rim);

  // ---- Paris city blocks (instanced)
  const winTex = [0, 1].map(v => canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = v ? '#cbb994' : '#d6c6a4'; g.fillRect(0, 0, w, h);
    for (let f = 0; f < 6; f++) for (let c = 0; c < 5; c++) {
      g.fillStyle = '#2a2a33'; g.fillRect(14 + c * 48, 18 + f * 40, 22, 28);
    }
    g.fillStyle = '#222'; g.fillRect(0, 96, w, 4); g.fillRect(0, 216, w, 4);
  }));
  const emiTex = [0, 1].map(v => canvasTex(256, 256, (g, w, h) => {
    const r = rng(31 + v * 7);
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    for (let f = 0; f < 6; f++) for (let c = 0; c < 5; c++) {
      if (r() < 0.38) {
        g.fillStyle = r() < 0.8 ? '#ffc070' : '#9fc4ff';
        g.fillRect(14 + c * 48, 18 + f * 40, 22, 28);
      }
    }
  }));
  const R = rng(5);
  const GROUND = -25;
  const bodies = [[], []], roofs = [], chims = [];
  const lamps = [];
  for (let gx = -200; gx <= 200; gx += 17) {
    for (let gz = -340; gz <= 60; gz += 17) {
      // our building + keep corridor to the tower a little clearer
      if (gx > -12 && gx < 12 && gz > -12 && gz < 14) continue;
      for (const sub of [0, 1]) {
        const w = 6 + R() * 1.5, d = 12 + R() * 1.5;
        const h = 15 + R() * 8;
        const x = gx + (sub ? 3.6 : -3.6), z = gz;
        bodies[sub].push([x, GROUND + h / 2, z, w, h, d]);
        roofs.push([x, GROUND + h + 1.4, z, w * 0.98, 2.8, d * 0.98]);
        if (R() < 0.8) chims.push([x + (R() - 0.5) * w * 0.6, GROUND + h + 2.6, z + (R() - 0.5) * d * 0.6, 0.8, 1.6, 2.2]);
      }
      lamps.push([gx + 8.5, GROUND + 4, gz], [gx, GROUND + 4, gz + 8.5]);
    }
  }
  const tmp = new THREE.Object3D();
  const inst = (geo, mat, list, cast = false) => {
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach(([x, y, z, sx, sy, sz], i) => {
      tmp.position.set(x, y, z); tmp.scale.set(sx, sy, sz); tmp.rotation.set(0, 0, 0); tmp.updateMatrix(); im.setMatrixAt(i, tmp.matrix);
    });
    im.castShadow = cast; im.receiveShadow = false; scene.add(im); return im;
  };
  for (const v of [0, 1]) inst(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ map: winTex[v], emissive: 0xffffff, emissiveMap: emiTex[v], emissiveIntensity: 1.2, roughness: 0.9 }), bodies[v]);
  const roofGeo = new THREE.CylinderGeometry(0.62, 1, 1, 4, 1); roofGeo.rotateY(Math.PI / 4); roofGeo.scale(1 / Math.SQRT2, 1, 1 / Math.SQRT2);
  inst(roofGeo, new THREE.MeshStandardMaterial({ color: 0x4f5a6e, roughness: 0.5, metalness: 0.4 }), roofs);
  inst(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x9a5a40, roughness: 0.9 }), chims);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = GROUND; scene.add(ground);
  {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(lamps.flat(), 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex, size: 3.2, color: 0xffb35c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
  }

  // ---- Eiffel Tower (stylized lattice, emissive gold)
  const tower = new THREE.Group();
  const TH = 160, TX = 42, TZ = -265;
  tower.position.set(TX, GROUND, TZ);
  const hw = h => 3.2 + 31 * Math.exp(-h / (0.17 * TH)) - 2.5 * (h / TH);
  const beams = [];
  const beam = (a, b, t) => {
    const len = a.distanceTo(b);
    const g = new THREE.BoxGeometry(t, len, t);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    g.applyQuaternion(q); g.translate(mid.x, mid.y, mid.z); beams.push(g);
  };
  const N = 30, corners = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
  const lvl = i => { const h = TH * 0.93 * Math.pow(i / N, 1.25); return h; };
  for (let i = 0; i < N; i++) {
    const h0 = lvl(i), h1 = lvl(i + 1), w0 = hw(h0), w1 = hw(h1);
    const th = 1.6 * (1 - i / N) + 0.35;
    for (let c = 0; c < 4; c++) {
      const [sx, sz] = corners[c], [nx, nz] = corners[(c + 1) % 4];
      const A = new THREE.Vector3(sx * w0, h0, sz * w0), B = new THREE.Vector3(sx * w1, h1, sz * w1);
      beam(A, B, th);
      if (h0 > TH * 0.08) {
        const C = new THREE.Vector3(nx * w0, h0, nz * w0), D = new THREE.Vector3(nx * w1, h1, nz * w1);
        beam(A, D, th * 0.35); beam(C, B, th * 0.35);
        if (i % 3 === 0) beam(A, C, th * 0.5);
      }
    }
  }
  // arches
  for (let c = 0; c < 4; c++) {
    const [sx, sz] = corners[c], [nx, nz] = corners[(c + 1) % 4];
    const h0 = TH * 0.04, ha = TH * 0.17, wa = hw(h0) * 0.82;
    let prev = null;
    for (let k = 0; k <= 16; k++) {
      const u = k / 16, a = Math.PI * u;
      const px = sx + (nx - sx) * u, pz = sz + (nz - sz) * u;
      const pt = new THREE.Vector3(px * wa, h0 + Math.sin(a) * (ha - h0) * 0.85, pz * wa);
      if (prev) beam(prev, pt, 0.9);
      prev = pt;
    }
  }
  const towerGeo = mergeGeometries(beams);
  const towerMat = new THREE.MeshBasicMaterial({ color: 0xffa640, fog: false });
  tower.add(new THREE.Mesh(towerGeo, towerMat));
  // platforms
  for (const [hf, ext] of [[0.19, 1.15], [0.37, 1.12], [0.82, 1.3]]) {
    const h = TH * 0.93 * hf, w = hw(h) * ext * 2;
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, 1.6, w), new THREE.MeshBasicMaterial({ color: 0xffc46a, fog: false }));
    p.position.y = h; tower.add(p);
  }
  // top + antenna
  const topH = TH * 0.93;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 5), new THREE.MeshBasicMaterial({ color: 0xffd38a, fog: false })); cab.position.y = topH + 2; tower.add(cab);
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.9, 14, 8), new THREE.MeshBasicMaterial({ color: 0xffc070, fog: false })); ant.position.y = topH + 11; tower.add(ant);
  // tower glow
  const tg = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff9a3c, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  tg.position.y = TH * 0.4; tg.scale.set(160, 220, 1); tower.add(tg);
  // sparkle points
  const sparkPos = [];
  { const r = rng(77); for (let i = 0; i < 420; i++) { const h = Math.pow(r(), 1.2) * topH; const w = hw(h); const c = corners[Math.floor(r() * 4)]; const u = r() * 2 - 1; const onX = r() < 0.5; sparkPos.push(onX ? u * w : c[0] * w, h, onX ? c[1] * w : u * w); } }
  const sparkGeo = new THREE.BufferGeometry(); sparkGeo.setAttribute('position', new THREE.Float32BufferAttribute(sparkPos, 3));
  const sparkCol = new Float32Array(sparkPos.length); sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkCol, 3));
  const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ map: glowTex, size: 7, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  tower.add(sparks);
  // beacon beams
  const beacon = new THREE.Group(); beacon.position.y = topH + 4; tower.add(beacon);
  const beamAlpha = canvasTex(4, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#fff'); gr.addColorStop(0.5, '#555'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, false);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff1c9, alphaMap: beamAlpha, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  for (const dir of [1, -1]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(18, 420, 24, 1, true), beamMat);
    cone.geometry.translate(0, -210, 0); cone.rotation.z = dir * Math.PI / 2 + dir * 0.03; beacon.add(cone);
  }
  scene.add(tower);

  // ---- Our building + rooftop
  const zincTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#5e6676'; g.fillRect(0, 0, w, h);
    const r = rng(3);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? 255 : 0},${r() < 0.5 ? 255 : 0},255,${r() * 0.04})`; g.fillRect(r() * w, r() * h, 3, 3); }
    g.strokeStyle = 'rgba(20,24,32,0.55)'; g.lineWidth = 4;
    for (let x = 0; x <= w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    g.strokeStyle = 'rgba(200,210,230,0.15)'; g.lineWidth = 2;
    for (let x = 4; x <= w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  });
  zincTex.wrapS = zincTex.wrapT = THREE.RepeatWrapping; zincTex.repeat.set(4, 4);
  const roof = m(new THREE.BoxGeometry(15, 0.3, 13), new THREE.MeshStandardMaterial({ map: zincTex, roughness: 0.55, metalness: 0.35 }), false, true);
  roof.position.set(0, -0.15, 1.7); scene.add(roof);
  const bldTex = winTex[0].clone(); bldTex.needsUpdate = true; bldTex.wrapS = bldTex.wrapT = THREE.RepeatWrapping; bldTex.repeat.set(2, 3);
  const bldE = emiTex[1].clone(); bldE.needsUpdate = true; bldE.wrapS = bldE.wrapT = THREE.RepeatWrapping; bldE.repeat.set(2, 3);
  const bld = m(new THREE.BoxGeometry(15, 25, 13), new THREE.MeshStandardMaterial({ map: bldTex, emissive: 0xffffff, emissiveMap: bldE, emissiveIntensity: 1, roughness: 0.9 }), false, false);
  bld.position.set(0, -12.8, 1.7); scene.add(bld);
  // parapet + railing at the front edge (z=-4.8) and sides
  const stone = M(0xb9ab8d, { r: 0.9 }), iron = M(0x1c1c1f, { r: 0.4, m: 0.6 });
  const par = m(new THREE.BoxGeometry(15, 0.32, 0.3), stone); par.position.set(0, 0.16, -4.65); scene.add(par);
  for (const sx of [-1, 1]) { const p = m(new THREE.BoxGeometry(0.3, 0.32, 13), stone); p.position.set(sx * 7.35, 0.16, 1.7); scene.add(p); }
  const railG = [];
  for (let x = -7.3; x <= 7.3; x += 0.32) { const g = new THREE.CylinderGeometry(0.018, 0.018, 0.75, 6); g.translate(x, 0.7, -4.65); railG.push(g); }
  { const g = new THREE.BoxGeometry(14.8, 0.05, 0.06); g.translate(0, 1.08, -4.65); railG.push(g); }
  { const g = new THREE.BoxGeometry(14.8, 0.03, 0.04); g.translate(0, 0.42, -4.65); railG.push(g); }
  scene.add(m(mergeGeometries(railG), iron));

  // brick chimney stacks
  const brickTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#5a2a1e'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? -16 : 0; x < w; x += 32) {
      g.fillStyle = `hsl(${12 + Math.random() * 8},45%,${30 + Math.random() * 10}%)`; g.fillRect(x + 1, y + 1, 30, 14);
    }
  });
  const pot = M(0xb5643c, { r: 0.85 });
  const chimney = (x, z, w, h, d, n) => {
    const c = m(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.95 })); c.position.set(x, h / 2, z); scene.add(c);
    const capS = m(new THREE.BoxGeometry(w + 0.1, 0.1, d + 0.1), stone); capS.position.set(x, h + 0.05, z); scene.add(capS);
    for (let i = 0; i < n; i++) { const p = m(new THREE.CylinderGeometry(0.1, 0.13, 0.4, 14), pot); p.position.set(x - w / 2 + (i + 0.5) * w / n, h + 0.3, z); scene.add(p); }
  };
  chimney(-3.0, 0.0, 0.7, 1.7, 1.3, 3);
  chimney(4.6, -3.0, 1.2, 1.4, 0.6, 3);
  chimney(-5.5, 5.5, 1.0, 1.5, 0.6, 2);
  // antenna pole
  const pole = m(new THREE.CylinderGeometry(0.03, 0.04, 3.2, 8), iron); pole.position.set(4.2, 1.6, 2.4); scene.add(pole);
  const tv = m(new THREE.BoxGeometry(1.2, 0.03, 0.03), iron); tv.position.set(4.2, 2.9, 2.4); scene.add(tv);
  // skylight dormer
  const sky1 = m(new THREE.BoxGeometry(1.4, 0.5, 1.0), M(0x3a4150, { r: 0.6, m: 0.3 })); sky1.position.set(4.4, 0.25, 4.5); scene.add(sky1);
  const skyGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.85), new THREE.MeshBasicMaterial({ color: 0xffc27a })); skyGlass.rotation.x = -Math.PI / 2; skyGlass.position.set(4.4, 0.51, 4.5); scene.add(skyGlass);

  // string lights (catenary)
  const bulbs = [];
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd28a });
  const cable = [];
  const string = (a, b, sag, n) => {
    let prev = null;
    for (let i = 0; i <= n; i++) {
      const u = i / n; const p = a.clone().lerp(b, u); p.y -= Math.sin(Math.PI * u) * sag;
      if (prev) { const len = prev.distanceTo(p); const g = new THREE.CylinderGeometry(0.008, 0.008, len, 4); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.clone().sub(prev).normalize())); const mid = prev.clone().add(p).multiplyScalar(0.5); g.translate(mid.x, mid.y, mid.z); cable.push(g); }
      if (i % 2 === 1) { const bl = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), bulbMat); bl.position.copy(p).add(new THREE.Vector3(0, -0.06, 0)); scene.add(bl); bulbs.push(bl.position.clone()); }
      prev = p;
    }
  };
  string(new THREE.Vector3(-3.0, 2.75, 0.3), new THREE.Vector3(4.2, 2.8, 2.4), 0.35, 26);
  string(new THREE.Vector3(4.2, 2.8, 2.4), new THREE.Vector3(4.6, 1.5, -3.0), 0.35, 18);
  string(new THREE.Vector3(-3.0, 2.75, 0.3), new THREE.Vector3(-5.5, 1.6, 5.5), 0.4, 18);
  { const pl = m(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 6), iron); pl.position.set(-3.0, 2.25, 0.3); scene.add(pl); }
  scene.add(m(mergeGeometries(cable), iron, false, false));
  {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(bulbs.flatMap(v => [v.x, v.y, v.z]), 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex, size: 0.55, color: 0xffb860, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending })));
  }
  const warm1 = new THREE.PointLight(0xffc48a, 4, 9, 1.6); warm1.position.set(0.5, 2.3, 1.0); scene.add(warm1);
  const warm2 = new THREE.PointLight(0xffa050, 3, 7, 1.6); warm2.position.set(3.5, 2.2, -1.5); scene.add(warm2);

  // crates / table
  const woodTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#7a5434'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 64) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, y, w, 4); }
    const r = rng(9);
    for (let i = 0; i < 160; i++) { g.strokeStyle = `rgba(40,20,8,${r() * 0.3})`; g.beginPath(); const y = r() * h; g.moveTo(0, y); g.bezierCurveTo(w / 3, y + r() * 6, w * 2 / 3, y - r() * 6, w, y); g.stroke(); }
    g.strokeStyle = 'rgba(30,15,5,0.6)'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
  });
  const wood = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.85 });
  const crate = (x, y, z, sx, sy, sz, ry = 0) => { const c = m(new THREE.BoxGeometry(sx, sy, sz), wood); c.position.set(x, y + sy / 2, z); c.rotation.y = ry; scene.add(c); return c; };
  crate(-0.45, 0, -0.6, 0.78, 0.78, 0.9);
  crate(0.45, 0, -0.6, 0.78, 0.78, 0.9, 0.05);
  const plank = m(new THREE.BoxGeometry(1.9, 0.06, 1.15), wood); plank.position.set(0, 0.81, -0.6); scene.add(plank);
  crate(2.15, 0, -0.1, 0.55, 0.47, 0.55, 0.1);   // Sasha seat
  crate(1.6, 0, -0.1, 0.45, 0.55, 0.45, -0.12);   // laptop stand
  crate(-5.0, 0, 1.5, 0.7, 0.7, 0.7, 0.4); crate(-5.0, 0.7, 1.5, 0.55, 0.55, 0.55, 0.9);

  // the plan: blueprint + polaroids
  const mapTex = canvasTex(1024, 640, (g, w, h) => {
    g.fillStyle = '#1d4e89'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 1;
    for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.strokeStyle = '#e8f1ff'; g.lineWidth = 6;
    // U-shaped Louvre
    g.strokeRect(160, 110, 700, 90); g.strokeRect(160, 110, 110, 430); g.strokeRect(750, 110, 110, 430);
    g.strokeRect(160, 450, 700, 90);
    // pyramid
    g.beginPath(); g.moveTo(510, 260); g.lineTo(580, 380); g.lineTo(440, 380); g.closePath(); g.stroke();
    g.font = 'bold 30px Inter'; g.fillStyle = '#e8f1ff'; g.fillText('MUSÉE DU LOUVRE', 30, 60);
    g.font = 'bold 22px Inter'; g.fillText('DENON WING', 190, 520); g.fillText('ENTRY', 470, 420);
    // route
    g.strokeStyle = '#ff3b3b'; g.lineWidth = 7; g.setLineDash([18, 12]);
    g.beginPath(); g.moveTo(510, 600); g.lineTo(510, 400); g.lineTo(300, 400); g.lineTo(215, 480); g.stroke(); g.setLineDash([]);
    g.lineWidth = 9; g.beginPath(); g.moveTo(190, 455); g.lineTo(240, 505); g.moveTo(240, 455); g.lineTo(190, 505); g.stroke();
    g.fillStyle = '#ff3b3b'; g.font = 'bold 26px Inter'; g.fillText('TARGET', 140, 600);
    g.beginPath(); g.arc(300, 400, 14, 0, Math.PI * 2); g.fill(); g.fillText('GUARD', 320, 370);
  });
  const mapMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), new THREE.MeshStandardMaterial({ map: mapTex, roughness: 0.9 }));
  mapMesh.rotation.x = -Math.PI / 2; mapMesh.position.set(0, 0.842, -0.6); mapMesh.receiveShadow = true; scene.add(mapMesh);
  const polaroid = (draw, caption, x, z, rot) => {
    const t = canvasTex(320, 380, (g, w, h) => {
      g.fillStyle = '#f4f1e8'; g.fillRect(0, 0, w, h);
      g.save(); g.beginPath(); g.rect(20, 20, 280, 270); g.clip(); draw(g); g.restore();
      g.fillStyle = '#222'; g.font = 'bold 34px Inter'; g.textAlign = 'center'; g.fillText(caption, w / 2, 340);
    });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.38), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }));
    p.rotation.set(-Math.PI / 2, 0, rot); p.position.set(x, 0.846, z); p.receiveShadow = true; scene.add(p);
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), M(0xd61f1f, { r: 0.3 })); pin.position.set(x, 0.86, z - 0.14); scene.add(pin);
    return p;
  };
  polaroid(g => { g.fillStyle = '#3b4a5c'; g.fillRect(0, 0, 320, 320); g.fillStyle = '#e0b48f'; g.beginPath(); g.ellipse(160, 160, 62, 76, 0, 0, 7); g.fill(); g.fillStyle = '#1b2533'; g.fillRect(90, 70, 140, 40); g.fillRect(70, 100, 180, 14); g.fillStyle = '#222'; g.beginPath(); g.arc(135, 160, 7, 0, 7); g.arc(185, 160, 7, 0, 7); g.fill(); g.fillStyle = '#7a3b2a'; g.fillRect(130, 200, 60, 10); g.fillStyle = '#1b2533'; g.fillRect(60, 240, 200, 100); }, 'GUARD', -0.6, -0.95, 0.12);
  polaroid(g => { g.fillStyle = '#2d2a1c'; g.fillRect(0, 0, 320, 320); g.fillStyle = '#b8892c'; g.fillRect(70, 40, 180, 240); g.fillStyle = '#56603a'; g.fillRect(85, 55, 150, 210); g.fillStyle = '#2a2016'; g.beginPath(); g.ellipse(160, 140, 40, 55, 0, 0, 7); g.fill(); g.fillStyle = '#d9a873'; g.beginPath(); g.ellipse(160, 135, 26, 34, 0, 0, 7); g.fill(); g.fillStyle = '#2a2016'; g.fillRect(115, 190, 90, 75); }, 'TARGET', 0.55, -0.95, -0.1);
  const sandwichPolaroid = polaroid(g => {
    g.fillStyle = '#e9d8c0'; g.fillRect(0, 0, 320, 320);
    g.fillStyle = '#d9a35c'; g.beginPath(); g.ellipse(160, 120, 120, 40, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#5fb43a'; for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(50 + i * 20, 135, 14, 0, Math.PI); g.fill(); }
    g.fillStyle = '#e23b2e'; g.fillRect(48, 140, 224, 18);
    g.fillStyle = '#f5c842'; g.fillRect(44, 158, 232, 14);
    g.fillStyle = '#e48a8a'; g.fillRect(50, 172, 220, 16);
    g.fillStyle = '#d9a35c'; g.fillRect(40, 188, 240, 34);
  }, 'STEP 1', 0.05, -0.32, 0.06);

  // lantern on table
  const lantern = new THREE.Group(); lantern.position.set(-0.65, 0.84, -0.35); scene.add(lantern);
  lantern.add(m(new THREE.CylinderGeometry(0.08, 0.09, 0.03, 12), iron));
  const lglass = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 12), new THREE.MeshBasicMaterial({ color: 0xffcf7a })); lglass.position.y = 0.1; lantern.add(lglass);
  const ltop = m(new THREE.ConeGeometry(0.09, 0.07, 12), iron); ltop.position.y = 0.215; lantern.add(ltop);
  const lanternL = new THREE.PointLight(0xffaa55, 2.6, 3.5, 1.5); lanternL.position.set(-0.65, 1.05, -0.35); scene.add(lanternL);

  // laptop
  const laptop = new THREE.Group(); laptop.position.set(1.6, 0.56, -0.1); laptop.rotation.y = Math.PI / 2; scene.add(laptop);
  laptop.add(m(new THREE.BoxGeometry(0.36, 0.02, 0.25), M(0x2b2d33, { r: 0.4, m: 0.6 })));
  const lid = new THREE.Group(); lid.position.set(0, 0.01, -0.125); lid.rotation.x = -0.25; laptop.add(lid);
  const lidBack = m(new THREE.BoxGeometry(0.36, 0.24, 0.012), M(0x2b2d33, { r: 0.4, m: 0.6 })); lidBack.position.set(0, 0.12, -0.006); lid.add(lidBack);
  const sticker = new THREE.Mesh(new THREE.CircleGeometry(0.035, 20), new THREE.MeshBasicMaterial({ color: 0xff5fa2 })); sticker.position.set(0.05, 0.13, -0.0125); sticker.rotation.y = Math.PI; lid.add(sticker);
  const screenTex = canvasTex(512, 340, () => { });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.33, 0.215), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
  screen.position.set(0, 0.12, 0.001); lid.add(screen);
  const screenL = new THREE.PointLight(0x6fb6ff, 0.9, 1.4, 1.5); screenL.position.set(1.75, 0.95, -0.1); scene.add(screenL);

  const keyL = new THREE.DirectionalLight(0xffe6d2, 0); scene.add(keyL, keyL.target);
  return { scene, tower, beacon, sparks, sparkCol, screenTex, screenL, sandwichPolaroid, warm1, keyL };
}

// ---------------------------------------------------------------- LOUVRE GALLERY
export function buildGallery() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b0b0e, 8, 30);
  scene.background = new THREE.Color(0x050506);
  scene.add(new THREE.HemisphereLight(0x8a8aa0, 0x2a2018, 1.6));

  const parquet = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#6a4526'; g.fillRect(0, 0, w, h);
    const r = rng(4);
    for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 128) {
      g.fillStyle = `hsl(28,${40 + r() * 15}%,${22 + r() * 10}%)`;
      const o = ((y / 32) % 2) * 64; g.fillRect(x + o + 1, y + 1, 126, 30);
    }
  });
  parquet.wrapS = parquet.wrapT = THREE.RepeatWrapping; parquet.repeat.set(4, 6);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 22), new THREE.MeshStandardMaterial({ map: parquet, roughness: 0.35, metalness: 0.1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.z = -1; floor.receiveShadow = true; scene.add(floor);
  const wallM = M(0x3d4a63, { r: 0.9 });
  for (const sx of [-1, 1]) { const wl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6, 22), wallM); wl.position.set(sx * 5, 3, -1); wl.receiveShadow = true; scene.add(wl); }
  const back = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 0.3), wallM); back.position.set(0, 3, -11.5); scene.add(back);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(10, 22), M(0x2a2a30, { r: 1 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 6, -1); scene.add(ceil);
  const skyl = new THREE.Mesh(new THREE.PlaneGeometry(4, 16), new THREE.MeshBasicMaterial({ color: 0x3a4a66 })); skyl.rotation.x = Math.PI / 2; skyl.position.set(0, 5.98, -1); scene.add(skyl);

  // side paintings
  const gold = M(0xb8892c, { r: 0.35, m: 0.8 });
  const r = rng(21);
  const pal = [['#3c5a3a', '#a8b37a', '#d8c08a'], ['#2a3550', '#8aa0c8', '#e8d0a0'], ['#5a3a2a', '#c08050', '#f0d8a0'], ['#30302a', '#8a7a5a', '#c8b890']];
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) {
    const pw = 1.6 + r() * 0.8, ph = 1.2 + r() * 0.6;
    const p = pal[Math.floor(r() * pal.length)];
    const t = canvasTex(256, 200, (g, w, h) => {
      g.fillStyle = p[0]; g.fillRect(0, 0, w, h);
      g.fillStyle = p[1]; g.fillRect(0, h * 0.55, w, h * 0.45);
      g.fillStyle = p[2]; g.beginPath(); g.arc(w * (0.2 + r() * 0.6), h * 0.3, 20, 0, 7); g.fill();
      for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(0,0,0,${r() * 0.15})`; g.fillRect(r() * w, r() * h, 20, 8); }
    });
    const z = 4 - i * 4.2;
    const fr = new THREE.Mesh(new THREE.BoxGeometry(0.08, ph + 0.18, pw + 0.18), gold); fr.position.set(sx * 4.82, 2.4, z); scene.add(fr);
    const pt = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }));
    pt.position.set(sx * 4.77, 2.4, z); pt.rotation.y = -sx * Math.PI / 2; scene.add(pt);
    const sp = new THREE.SpotLight(0xfff0d0, 60, 8, 0.55, 0.6); sp.position.set(sx * 3.2, 5.5, z); sp.target.position.set(sx * 4.8, 2.4, z); scene.add(sp, sp.target);
  }
  // the central free-standing wall + small famous portrait
  const pwall = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.6, 0.4), M(0x6e6a62, { r: 0.85 })); pwall.position.set(0, 1.8, -7.2); pwall.castShadow = true; pwall.receiveShadow = true; scene.add(pwall);
  const portrait = canvasTex(256, 360, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#5f6a4a'); bg.addColorStop(0.5, '#4a5238'); bg.addColorStop(1, '#2c2a1c');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = '#7a8a6a'; g.beginPath(); g.moveTo(0, 140); g.bezierCurveTo(60, 110, 120, 150, 256, 120); g.lineTo(256, 180); g.lineTo(0, 190); g.fill();
    g.fillStyle = '#1e1810'; g.beginPath(); g.ellipse(128, 130, 56, 76, 0, 0, 7); g.fill();
    g.fillStyle = '#d6a96e'; g.beginPath(); g.ellipse(128, 128, 36, 47, 0, 0, 7); g.fill();
    g.fillStyle = '#1e1810'; g.beginPath(); g.moveTo(40, 360); g.quadraticCurveTo(50, 200, 128, 185); g.quadraticCurveTo(206, 200, 216, 360); g.fill();
    g.fillStyle = '#d6a96e'; g.beginPath(); g.ellipse(128, 300, 50, 16, 0, 0, 7); g.fill();
    g.strokeStyle = '#6a3a22'; g.lineWidth = 3; g.beginPath(); g.arc(128, 140, 12, 0.3, Math.PI - 0.3); g.stroke();
    g.fillStyle = '#2a1a10'; g.beginPath(); g.arc(114, 120, 4, 0, 7); g.arc(142, 120, 4, 0, 7); g.fill();
  });
  const painting = new THREE.Group(); painting.position.set(0, 1.75, -6.95); scene.add(painting);
  const pf = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.98, 0.06), gold); pf.castShadow = true; painting.add(pf);
  const pp = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.85), new THREE.MeshStandardMaterial({ map: portrait, roughness: 0.7 })); pp.position.z = 0.035; painting.add(pp);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.25, 0.25), new THREE.MeshStandardMaterial({ color: 0xaaccdd, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.5 })); glass.position.set(0, 1.75, -6.85); scene.add(glass);
  const alarmBtn = new THREE.Group(); alarmBtn.position.set(1.65, 1.3, -6.99); scene.add(alarmBtn);
  alarmBtn.add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.04), M(0xcc1111, { r: 0.4 })));
  const btnGlass = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.02), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xff3030, emissiveIntensity: 0.4 })); btnGlass.position.z = 0.03; alarmBtn.add(btnGlass);
  const shutterTex = canvasTex(256, 256, (g, w, h) => { for (let y = 0; y < h; y += 16) { const gr = g.createLinearGradient(0, y, 0, y + 16); gr.addColorStop(0, '#9aa0a8'); gr.addColorStop(0.5, '#5a6068'); gr.addColorStop(1, '#2a2e34'); g.fillStyle = gr; g.fillRect(0, y, w, 16); } });
  shutterTex.wrapS = shutterTex.wrapT = THREE.RepeatWrapping; shutterTex.repeat.set(4, 4);
  const shutter = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 0.12), new THREE.MeshStandardMaterial({ map: shutterTex, roughness: 0.45, metalness: 0.7 })); shutter.position.set(0, 9, 6.5); shutter.castShadow = true; scene.add(shutter);
  const spot = new THREE.SpotLight(0xfff2d6, 140, 12, 0.4, 0.5); spot.position.set(0, 5.2, -3.5); spot.target.position.set(0, 1.75, -7); spot.castShadow = true; scene.add(spot, spot.target);
  // rope barrier
  const brass = M(0xc8a040, { r: 0.3, m: 0.9 }), velvet = M(0x8a1020, { r: 0.8 });
  const posts = [-1.8, -0.6, 0.6, 1.8];
  const postPivots = [], ropes = [];
  for (const x of posts) {
    const pv = new THREE.Group(); pv.position.set(x, 0, -5.6); scene.add(pv);
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.12, 0.95, 12), brass); p.position.y = 0.475; p.castShadow = true; pv.add(p);
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), brass); top.position.y = 0.97; pv.add(top);
    postPivots.push(pv);
  }
  for (let i = 0; i < 3; i++) {
    const a = new THREE.Vector3(posts[i], 0.9, -5.6), b = new THREE.Vector3(posts[i + 1], 0.9, -5.6);
    const curve = new THREE.QuadraticBezierCurve3(a, new THREE.Vector3((a.x + b.x) / 2, 0.6, -5.6), b);
    const rope = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.025, 8), velvet); scene.add(rope); ropes.push(rope);
  }
  const figL = new THREE.SpotLight(0xd8e0ff, 50, 14, 0.35, 0.7); figL.position.set(3.0, 3.6, 2.0); figL.target.position.set(0.3, 1.2, -4.8); scene.add(figL, figL.target);
  const bench = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.45, 0.6), M(0x2a2a2e, { r: 0.6 })); bench.position.set(0, 0.225, 0.5); bench.castShadow = true; scene.add(bench);
  const fill = new THREE.PointLight(0x8899cc, 45, 18, 1.2); fill.position.set(2, 4.5, 4); scene.add(fill);
  const alarms = [[-4, 5.2, 2], [4, 5.2, -4], [0, 5.2, 6]].map(([x, y, z]) => { const l = new THREE.PointLight(0xff1a1a, 0, 22, 1.2); l.position.set(x, y, z); scene.add(l); return l; });
  const keyL = new THREE.DirectionalLight(0xffe6d2, 0); scene.add(keyL, keyL.target);
  return { scene, posts: postPivots, ropes, alarms, fill, keyL, painting, alarmBtn: btnGlass, shutter };
}
