// Sets/props for the serious episodes: Le Comte's warehouse, flashlight with visible beam.
import * as THREE from 'three';
import { M } from './person.js';
import { canvasTex, rng } from './world.js';

const beamAlpha = canvasTex(4, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#fff'); gr.addColorStop(0.6, '#333'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, false);

export function makeBeam(len, angle, color = 0xfff1d6, opacity = 0.09) {
  const r = Math.tan(angle) * len;
  const g = new THREE.ConeGeometry(r, len, 32, 1, true); g.translate(0, -len / 2, 0); g.rotateX(-Math.PI / 2); // apex at origin, pointing +z
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, alphaMap: beamAlpha, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
}

export function makeFlashlight() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.22, 12), M(0x1a1a1a, { r: 0.4, m: 0.6 })); body.rotation.x = Math.PI / 2; g.add(body);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.028, 16), new THREE.MeshBasicMaterial({ color: 0xfff6e0 })); lens.position.z = 0.111; g.add(lens);
  const spot = new THREE.SpotLight(0xfff1d6, 14, 12, 0.3, 0.45, 1.4); spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024);
  spot.position.z = 0.12; g.add(spot); const tgt = new THREE.Object3D(); tgt.position.set(0, 0, 5); g.add(tgt); spot.target = tgt;
  const beam = makeBeam(7, 0.3); beam.position.z = 0.12; g.add(beam);
  return g;
}

export function buildWarehouse() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020203);
  scene.fog = new THREE.Fog(0x020203, 3, 12);
  scene.add(new THREE.HemisphereLight(0x303848, 0x0a0806, 0.25));
  const conc = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#3a3a3c'; g.fillRect(0, 0, w, h); const r = rng(9); for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.12})`; g.fillRect(r() * w, r() * h, 4, 4); } });
  conc.wrapS = conc.wrapT = THREE.RepeatWrapping; conc.repeat.set(6, 6);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ map: conc, roughness: 0.7, metalness: 0.1 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  // table + chair
  const metal = M(0x2a2a2c, { r: 0.4, m: 0.7 }), wood = M(0x3a2618, { r: 0.55 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.8), wood); top.position.set(0, 0.76, 0); top.castShadow = top.receiveShadow = true; scene.add(top);
  for (const [x, z] of [[-0.65, -0.35], [0.65, -0.35], [-0.65, 0.35], [0.65, 0.35]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.74, 0.05), metal); l.position.set(x, 0.37, z); scene.add(l); }
  const chair = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.48, 0.5), metal); chair.position.set(0, 0.24, -0.75); scene.add(chair);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.06), metal); back.position.set(0, 0.85, -1.0); scene.add(back);
  // hanging lamp with visible cone
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.18, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x1c2a22, side: THREE.DoubleSide, roughness: 0.4, metalness: 0.5 })); shade.position.set(0, 2.05, -0.1); scene.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffe2b0 })); bulb.position.set(0, 1.98, -0.1); scene.add(bulb);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 2, 6), metal); cord.position.set(0, 3.1, -0.1); scene.add(cord);
  const lamp = new THREE.SpotLight(0xffd9a0, 9, 8, 0.6, 0.5, 1.3); lamp.position.set(0, 1.97, -0.1); lamp.target.position.set(0, 0, 0); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); scene.add(lamp, lamp.target);
  const cone = makeBeam(2.2, 0.55, 0xffd9a0, 0.035); cone.position.set(0, 1.97, -0.1); cone.rotation.x = Math.PI / 2; scene.add(cone);
  // photo of the painting on the table
  const photoTex = canvasTex(256, 320, (g, w, h) => {
    g.fillStyle = '#b8b2a4'; g.fillRect(0, 0, w, h);
    const bg = g.createLinearGradient(0, 0, 0, 260); bg.addColorStop(0, '#5f6a4a'); bg.addColorStop(1, '#2c2a1c'); g.fillStyle = bg; g.fillRect(16, 16, 224, 250);
    g.fillStyle = '#1e1810'; g.beginPath(); g.ellipse(128, 110, 45, 60, 0, 0, 7); g.fill(); g.fillStyle = '#d6a96e'; g.beginPath(); g.ellipse(128, 108, 29, 38, 0, 0, 7); g.fill();
    g.fillStyle = '#1e1810'; g.beginPath(); g.moveTo(50, 266); g.quadraticCurveTo(60, 160, 128, 150); g.quadraticCurveTo(196, 160, 206, 266); g.fill();
    g.fillStyle = '#7a1010'; g.font = '700 26px Inter'; g.textAlign = 'center'; g.fillText('48H', 128, 300);
  });
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.2), new THREE.MeshStandardMaterial({ map: photoTex, roughness: 0.5 }));
  photo.rotation.x = -Math.PI / 2; photo.position.set(0.08, 0.79, -0.15); photo.receiveShadow = true; scene.add(photo);
  // glass of whisky + clock
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.09, 16), new THREE.MeshStandardMaterial({ color: 0xc8742a, transparent: true, opacity: 0.6, roughness: 0.05 })); glass.position.set(-0.4, 0.83, -0.1); scene.add(glass);
  const keyL = new THREE.DirectionalLight(0xffe6d2, 0); scene.add(keyL, keyL.target);
  return { scene, keyL, photo };
}
