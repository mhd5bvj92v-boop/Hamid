// Rigged characters (Mixamo rigs from the three.js example models): Noor (Michelle.glb) and the figure (Xbot.glb, stretched, matte black).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { glow } from './sets.js';

const loader = new GLTFLoader();
const B = (root, n) => root.getObjectByName('mixamorig' + n) || root.getObjectByName('mixamorig:' + n);
const wp = o => o.getWorldPosition(new THREE.Vector3());

// rotate `bone` so that the direction bone -> child points along world direction `dir`
export function aim(bone, child, dir) {
  bone.updateWorldMatrix(true, true);
  const cur = wp(child).sub(wp(bone)).normalize();
  const dq = new THREE.Quaternion().setFromUnitVectors(cur, dir.clone().normalize());
  const wq = bone.getWorldQuaternion(new THREE.Quaternion());
  const pq = bone.parent.getWorldQuaternion(new THREE.Quaternion());
  bone.quaternion.copy(pq.invert().multiply(dq.multiply(wq)));
  bone.updateWorldMatrix(false, true);
}

export async function loadNoor(url) {
  const g = await loader.loadAsync(url);
  const root = g.scene;
  root.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.frustumCulled = false; if (o.material) { o.material.roughness = 0.75; o.material.metalness = 0; } } });
  // remove the baked-in sunglasses + headphones: collapse every vertex whose texel is the accessories' pure red
  root.traverse(o => {
    if (!o.isSkinnedMesh || !o.material.map) return;
    const img = o.material.map.image, c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0); const px = g.getImageData(0, 0, c.width, c.height).data;
    const uv = o.geometry.attributes.uv, pos = o.geometry.attributes.position, idx = o.geometry.index;
    const bad = new Uint8Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const x = Math.min(c.width - 1, Math.max(0, Math.floor(uv.getX(i) * c.width))), y = Math.min(c.height - 1, Math.max(0, Math.floor(uv.getY(i) * c.height)));
      const k = (y * c.width + x) * 4, r = px[k], gg = px[k + 1], bl = px[k + 2];
      const face = x > 395 && y > 38 && y < 150; if (!face && ((y < 175 && (r + gg + bl > 200 || r > 120)) || (r > 150 && gg < 70 && bl < 70))) bad[i] = 1;
    }
    // grow over whole triangles: if 2 of 3 corners are bad, the triangle goes
    const tri = idx.array; const kill = new Uint8Array(pos.count);
    for (let t = 0; t < tri.length; t += 3) { const n = bad[tri[t]] + bad[tri[t + 1]] + bad[tri[t + 2]]; if (n >= 1) { tri[t + 1] = tri[t]; tri[t + 2] = tri[t]; } }
    idx.needsUpdate = true;
  });
  const bones = {}; for (const n of ['Hips', 'Spine', 'Spine2', 'Neck', 'Head', 'HeadTop_End', 'RightArm', 'RightForeArm', 'RightHand', 'RightHandMiddle1', 'LeftArm', 'LeftForeArm', 'LeftHand', 'LeftHandMiddle1', 'LeftUpLeg', 'RightUpLeg']) bones[n] = B(root, n);
  const rest = new Map(); root.traverse(o => { if (o.isBone) rest.set(o, o.quaternion.clone()); });
  const reset = () => rest.forEach((q, b) => b.quaternion.copy(q));
  return { root, bones, reset };
}

export async function loadFigure(url) {
  const g = await loader.loadAsync(url);
  const root = g.scene;
  const black = new THREE.MeshStandardMaterial({ color: 0x040405, roughness: 0.92, metalness: 0 });
  root.traverse(o => { if (o.isMesh) { o.material = black; o.castShadow = true; o.frustumCulled = false; } });
  const mixer = new THREE.AnimationMixer(root);
  const clip = g.animations.find(a => a.name === (window.FIGCLIP || 'idle')) || g.animations[0];
  const act = mixer.clipAction(clip); act.play(); mixer.setTime(0.2);
  const bones = {}; for (const n of ['Head', 'Neck', 'Spine2', 'LeftForeArm', 'RightForeArm', 'LeftHand', 'RightHand', 'LeftArm', 'RightArm']) bones[n] = B(root, n);
  // uncanny proportions: longer forearms and fingers
  for (const n of ['LeftForeArm', 'RightForeArm']) bones[n].scale.set(1, 1.35, 1);
  for (const n of ['LeftHand', 'RightHand']) bones[n].scale.set(0.9, 1.3, 0.9);
  const wrap = new THREE.Group(); wrap.add(root); root.scale.set(0.92, 1.16, 0.92);
  const eyes = [-1, 1].map(s => { const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); e.scale.set(0.035, 0.035, 1); bones.Head.add(e); e.position.set(s * 3.2, 9, 9.5); return e; });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.35, 8, 20), new THREE.MeshStandardMaterial({ color: 0xd8b060, metalness: 1, roughness: 0.25 }));
  const fing = B(root, 'LeftHandRing1'); if (fing) { fing.add(ring); ring.rotation.x = Math.PI / 2; }
  const base = new Map(); root.traverse(o => { if (o.isBone) base.set(o, o.quaternion.clone()); });
  wrap.userData.pose = ({ tilt = 0.25, up = 0, eyes: eo = false } = {}) => {
    base.forEach((q, b) => b.quaternion.copy(q));
    bones.Head.rotateZ(-tilt); bones.Head.rotateX(-up * 1.2); bones.Neck.rotateX(-up * 0.4);
    eyes.forEach(e => e.visible = eo);
  };
  wrap.userData.pose({});
  eyes.forEach(e => e.visible = false); wrap.updateMatrixWorld(true);
  let bb = new THREE.Box3().setFromObject(root, true); root.scale.multiplyScalar(2.12 / (bb.max.y - bb.min.y));
  wrap.updateMatrixWorld(true); bb = new THREE.Box3().setFromObject(root, true); root.position.y -= bb.min.y;
  return wrap;
}
