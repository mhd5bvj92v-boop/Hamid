// Louvre exterior (courtyard + glass pyramid) and an interior corridor with the guard desk.
import * as THREE from 'three';
import { M } from './person.js';
import { rng, canvasTex, glowTex } from './world.js';

function sky(scene, horizon = [0.55, 0.30, 0.30]) {
  const s = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vP; void main(){ float h = vP.y;
      vec3 zen = vec3(0.02,0.03,0.10), mid = vec3(0.08,0.09,0.24), hor = vec3(${horizon.join(',')});
      vec3 c = mix(mid, zen, smoothstep(0.05, 0.6, h)); c = mix(hor, c, smoothstep(-0.05, 0.16, h));
      gl_FragColor = vec4(c,1.); }`,
  }));
  scene.add(s);
  const r = rng(12), pos = [];
  for (let i = 0; i < 700; i++) { const u = r() * 6.283, v = 0.15 + r() * 0.8; pos.push(Math.cos(u) * Math.cos(v) * 800, Math.sin(v) * 800, Math.sin(u) * Math.cos(v) * 800); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, color: 0xcfd8ff, fog: false, transparent: true, opacity: 0.75 })));
}

// ---------------------------------------------------------------- EXTERIOR
export function buildExterior() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x161a38, 0.006);
  sky(scene);
  scene.add(new THREE.HemisphereLight(0x5a6aa8, 0x221a14, 0.8));
  const moon = new THREE.DirectionalLight(0xa9b8ff, 0.9); moon.position.set(-30, 60, 40); scene.add(moon);

  // wet stone paving
  const pave = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#3a3f4c'; g.fillRect(0, 0, w, h);
    const r = rng(2);
    for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) { g.fillStyle = `hsl(225,10%,${22 + r() * 8}%)`; g.fillRect(x + 2, y + 2, 60, 60); }
  });
  pave.wrapS = pave.wrapT = THREE.RepeatWrapping; pave.repeat.set(60, 60);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ map: pave, roughness: 0.25, metalness: 0.35 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  // glass pyramid: lattice emissive texture
  const lattice = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#1a2436'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#d8b07a'; g.lineWidth = 2.5;
    for (let i = -w; i < 2 * w; i += 22) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke();
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i - h, h); g.stroke();
    }
  });
  const pyrMat = new THREE.MeshStandardMaterial({ color: 0x8fb6e8, emissive: 0xffffff, emissiveMap: lattice, emissiveIntensity: 0.55, roughness: 0.1, metalness: 0.6, transparent: true, opacity: 0.82, side: THREE.DoubleSide });
  const pyrGeo = new THREE.ConeGeometry(35 / Math.SQRT2, 21.6, 4, 1, true); pyrGeo.rotateY(Math.PI / 4); pyrGeo.translate(0, 10.8, 0);
  const pyr = new THREE.Mesh(pyrGeo, pyrMat); scene.add(pyr);
  const inner = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffb060, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
  inner.position.set(0, 8, 0); inner.scale.set(50, 30, 1); scene.add(inner);
  const pyrL = new THREE.PointLight(0xffc27a, 900, 70, 1.6); pyrL.position.set(0, 6, 0); scene.add(pyrL);
  for (const [x, z] of [[-30, 22], [30, 22], [0, -30]]) {
    const g = new THREE.ConeGeometry(5, 5, 4, 1, true); g.rotateY(Math.PI / 4); g.translate(x, 2.5, z);
    scene.add(new THREE.Mesh(g, pyrMat));
  }
  // fountain basins
  const water = new THREE.MeshStandardMaterial({ color: 0x0b1530, roughness: 0.05, metalness: 0.95 });
  const rim = M(0xb9ab8d, { r: 0.8 });
  for (const [x, z, w, d] of [[-34, 0, 18, 26], [34, 0, 18, 26]]) {
    const wt = new THREE.Mesh(new THREE.PlaneGeometry(w, d), water); wt.rotation.x = -Math.PI / 2; wt.position.set(x, 0.35, z); scene.add(wt);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w + 1, 0.4, d + 1), rim); b.position.set(x, 0.15, z); scene.add(b);
  }
  // palace wings (U shape) with lit windows
  const facade = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#c9b48c'; g.fillRect(0, 0, w, h);
    for (let c = 0; c < 8; c++) {
      for (let f = 0; f < 2; f++) { g.fillStyle = '#2c2a30'; g.fillRect(18 + c * 62, 40 + f * 110, 26, 70); g.beginPath(); g.arc(31 + c * 62, 40 + f * 110, 13, Math.PI, 0); g.fill(); }
      g.fillStyle = '#b09c76'; g.fillRect(4 + c * 62, 0, 8, h);
    }
    g.fillStyle = '#a8946e'; g.fillRect(0, 120, w, 8);
  });
  const facadeE = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    const r = rng(8);
    for (let c = 0; c < 8; c++) for (let f = 0; f < 2; f++) if (r() < 0.55) { g.fillStyle = '#ffc57a'; g.fillRect(18 + c * 62, 40 + f * 110, 26, 70); g.beginPath(); g.arc(31 + c * 62, 40 + f * 110, 13, Math.PI, 0); g.fill(); }
    const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, 'rgba(255,190,110,0.55)'); gr.addColorStop(0.6, 'rgba(255,190,110,0.05)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const wing = (x, z, len, rotY) => {
    const fm = facade.clone(); fm.needsUpdate = true; fm.wrapS = THREE.RepeatWrapping; fm.repeat.set(len / 30, 1);
    const fe = facadeE.clone(); fe.needsUpdate = true; fe.wrapS = THREE.RepeatWrapping; fe.repeat.set(len / 30, 1);
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; scene.add(g);
    const body = new THREE.Mesh(new THREE.BoxGeometry(len, 20, 18), new THREE.MeshStandardMaterial({ map: fm, emissive: 0xffffff, emissiveMap: fe, emissiveIntensity: 1.0, roughness: 0.9 }));
    body.position.y = 10; g.add(body);
    const roofG = new THREE.CylinderGeometry(0.62, 1, 1, 4, 1); roofG.rotateY(Math.PI / 4); roofG.scale(1 / Math.SQRT2, 1, 1 / Math.SQRT2);
    const roof = new THREE.Mesh(roofG, new THREE.MeshStandardMaterial({ color: 0x4a5468, roughness: 0.5, metalness: 0.4 }));
    roof.scale.set(len, 6, 18); roof.position.y = 23; g.add(roof);
    for (let i = -2; i <= 2; i++) { const pav = new THREE.Mesh(new THREE.BoxGeometry(14, 26, 20), new THREE.MeshStandardMaterial({ map: fm, emissive: 0xffffff, emissiveMap: fe, emissiveIntensity: 1.0, roughness: 0.9 })); pav.position.set(i * len / 4.5, 13, 0); g.add(pav); }
  };
  wing(0, -95, 220, 0);
  wing(-100, -10, 170, Math.PI / 2);
  wing(100, -10, 170, -Math.PI / 2);
  // lamp posts along the path
  const lampPos = [];
  for (let z = 30; z < 120; z += 10) for (const x of [-7, 7]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4, 8), M(0x1a1a1a, { r: 0.4, m: 0.6 })); p.position.set(x, 2, z); scene.add(p);
    lampPos.push(x, 4.1, z);
  }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lampPos, 3));
  scene.add(new THREE.Points(lg, new THREE.PointsMaterial({ map: glowTex, size: 2.4, color: 0xffc070, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
  for (let z = 40; z < 80; z += 20) { const l = new THREE.PointLight(0xffb060, 10, 18, 1.5); l.position.set(0, 4, z); scene.add(l); }
  const keyL = new THREE.DirectionalLight(0xffe6d2, 0); scene.add(keyL, keyL.target);
  return { scene, keyL };
}

// ---------------------------------------------------------------- CORRIDOR
export function buildCorridor() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060608);
  scene.fog = new THREE.Fog(0x08080b, 10, 26);
  scene.add(new THREE.HemisphereLight(0x9aa0b8, 0x2a2018, 0.9));
  const marble = canvasTex(512, 512, (g, w, h) => {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? '#d8d2c6' : '#3a3d44'; g.fillRect(x * 64, y * 64, 64, 64); }
    const r = rng(6); g.strokeStyle = 'rgba(120,120,130,0.25)';
    for (let i = 0; i < 60; i++) { g.beginPath(); g.moveTo(r() * w, r() * h); g.bezierCurveTo(r() * w, r() * h, r() * w, r() * h, r() * w, r() * h); g.stroke(); }
  });
  marble.wrapS = marble.wrapT = THREE.RepeatWrapping; marble.repeat.set(2.5, 12);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(5, 26), new THREE.MeshStandardMaterial({ map: marble, roughness: 0.18, metalness: 0.15 }));
  floor.rotation.x = -Math.PI / 2; floor.position.z = -3.6; floor.receiveShadow = true; scene.add(floor);
  const wallM = M(0xcfc3a8, { r: 0.85 }), pil = M(0xe2d8c2, { r: 0.7 });
  for (const sx of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5.5, 24), wallM); w.position.set(sx * 2.6, 2.75, -4); w.receiveShadow = true; scene.add(w);
    for (let z = 6; z > -16; z -= 3) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5.5, 0.5), pil); p.position.set(sx * 2.35, 2.75, z); p.castShadow = true; scene.add(p); }
  }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 24), M(0x8a8070, { r: 1 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 5.5, -4); scene.add(ceil);
  const end = new THREE.Mesh(new THREE.BoxGeometry(5.4, 5.5, 0.3), wallM); end.position.set(0, 2.75, -15.5); scene.add(end);
  const end2 = new THREE.Mesh(new THREE.BoxGeometry(5.4, 5.5, 0.3), wallM); end2.position.set(0, 2.75, 7.9); scene.add(end2);
  const arch = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 3.0), new THREE.MeshBasicMaterial({ color: 0x1a1612 })); arch.position.set(-1.2, 1.5, 7.74); arch.rotation.y = Math.PI; scene.add(arch);
  const bl = new THREE.PointLight(0xffd9a8, 10, 7, 1.4); bl.position.set(0, 4.5, 6.8); scene.add(bl);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 3.2), new THREE.MeshBasicMaterial({ color: 0x0a0a10 })); door.position.set(0, 1.6, -15.34); scene.add(door);
  // busts on pedestals
  const stone = M(0xeeeae2, { r: 0.6 });
  for (let z = 1.5; z > -14; z -= 3) for (const sx of [-1, 1]) {
    if (z < -7 && z > -11 && sx > 0) continue; // space for desk
    const ped = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1, 0.5), stone); ped.position.set(sx * 1.85, 0.55, z); ped.castShadow = true; scene.add(ped);
    const sh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 14), stone); sh.scale.set(1.3, 0.7, 0.8); sh.position.set(sx * 1.85, 1.25, z); scene.add(sh);
    const hd = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 14), stone); hd.scale.set(0.9, 1.1, 1); hd.position.set(sx * 1.85, 1.52, z); hd.rotation.y = -sx * 0.6; scene.add(hd);
  }
  // ceiling lights
  for (let z = 4; z > -14; z -= 4.5) {
    const l = new THREE.PointLight(0xffd9a8, 14, 9, 1.4); l.position.set(0, 4.8, z); scene.add(l);
    const fx = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.06, 16), new THREE.MeshBasicMaterial({ color: 0xffe8c8 })); fx.position.set(0, 5.45, z); scene.add(fx);
  }
  // guard desk + chair + lamp
  const wood = M(0x5a3820, { r: 0.6 });
  const desk = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.78, 0.65), wood); desk.position.set(0.6, 0.39, -9.3); desk.castShadow = true; desk.receiveShadow = true; scene.add(desk);
  const chair = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.48, 0.55), M(0x222226, { r: 0.6 })); chair.position.set(0.6, 0.24, -10.15); scene.add(chair);
  const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.08), M(0x222226, { r: 0.6 })); chairBack.position.set(0.6, 0.8, -10.45); scene.add(chairBack);
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.03, 12), M(0xb8892c, { m: 0.8, r: 0.3 })); lampBase.position.set(1.1, 0.8, -9.25); scene.add(lampBase);
  const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 8), M(0xb8892c, { m: 0.8, r: 0.3 })); lampStem.position.set(1.1, 0.95, -9.25); scene.add(lampStem);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.14, 0.12, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0x1d6b3a, emissive: 0x0a3a1a, side: THREE.DoubleSide, roughness: 0.3 }));
  shade.position.set(1.1, 1.1, -9.25); scene.add(shade);
  const lampL = new THREE.PointLight(0xffd08a, 6, 4, 1.5); lampL.position.set(1.1, 1.02, -9.25); scene.add(lampL);
  const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.05), M(0x111111)); monitor.position.set(0.3, 0.95, -9.45); scene.add(monitor);
  const mscreen = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.26), new THREE.MeshBasicMaterial({ color: 0x5a8a6a })); mscreen.position.set(0.3, 0.95, -9.42); scene.add(mscreen);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.1, 12), M(0xffffff, { r: 0.4 })); cup.position.set(-0.05, 0.83, -9.2); scene.add(cup);
  const keyL = new THREE.DirectionalLight(0xffe6d2, 0); scene.add(keyL, keyL.target);
  return { scene, keyL };
}
