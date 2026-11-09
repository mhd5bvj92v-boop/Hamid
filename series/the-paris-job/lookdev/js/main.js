import * as THREE from 'three';
import { makeCast } from '../../shared/cast2.js';
import { buildGallery } from '../../shared/world.js';
import { makePost } from '../../shared/post.js';
const W = 1080, H = 1920;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const cam = new THREE.PerspectiveCamera(40, W / H, 0.05, 200);
const gal = buildGallery(); const C = makeCast();
const order = ['victor', 'sasha', 'marco', 'camille', 'guard', 'comte'];
order.forEach((k, i) => { gal.scene.add(C[k].root); C[k].apply({ x: (i - 2.5) * 0.85, z: -2.2, ry: 0, lid: 0.12, arms: [[0.05, 0.1, 0, 0.2], [0.05, 0.1, 0, 0.2]] }); });
const post = makePost(renderer, W, H);
const key = new THREE.DirectionalLight(0xffe6d2, 1.4); gal.scene.add(key, key.target);
window.renderAt = t => {
  ['grain', 'cctv'].forEach(() => 0);
  document.getElementById('badge').style.display = 'none';
  const i = Math.round(t);
  let p, l, f;
  if (i === 0) { p = [0, 1.5, 3.4]; l = [0, 1.25, -2.2]; f = 5.6; cam.fov = 40; }
  else { const k = order[i - 1]; const h = C[k].head.getWorldPosition(new THREE.Vector3()); p = [h.x + 0.15, h.y - 0.02, h.z + 1.0]; l = [h.x, h.y - 0.06, h.z]; f = 1.0; cam.fov = 30; }
  cam.updateProjectionMatrix(); cam.position.set(...p); cam.lookAt(...l); cam.updateMatrixWorld();
  key.position.copy(cam.position).add(new THREE.Vector3(-1.2, 1.0, 0)); key.target.position.set(...l); key.target.updateMatrixWorld();
  post.render(gal.scene, cam, f, i === 0 ? 0.002 : 0.006);
};
await document.fonts.ready; window.READY = true;
