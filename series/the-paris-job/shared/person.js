// Stylized 3D human built from primitives, with a small facial rig.
import * as THREE from 'three';

export function M(color, o = {}) {
  return new THREE.MeshStandardMaterial({
    color, roughness: o.r ?? 0.7, metalness: o.m ?? 0,
    emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 1,
    ...(o.extra || {}),
  });
}
function mesh(geo, mat, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = shadow; m.receiveShadow = shadow;
  return m;
}
const cap = (r, len, mat) => mesh(new THREE.CapsuleGeometry(r, len, 8, 20), mat);
const sph = (r, mat, seg = 28) => mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), mat);
const box = (x, y, z, mat) => mesh(new THREE.BoxGeometry(x, y, z), mat);

const R = 0.15, SX = 0.88, SY = 1.08, SZ = 0.97; // head ellipsoid
const HC = 0.15; // head center height inside head pivot
function surfZ(dx, dy) {
  const v = 1 - (dx / (SX * R)) ** 2 - (dy / (SY * R)) ** 2;
  return SZ * R * Math.sqrt(Math.max(v, 0));
}

export function makePerson(cfg) {
  const s = cfg.scale ?? 1, w = cfg.build ?? 1;
  const RL = !!cfg.real;
  const root = new THREE.Group();
  const body = new THREE.Group(); body.scale.setScalar(s); root.add(body);

  const skin = RL ? new THREE.MeshPhysicalMaterial({ color: cfg.skin, roughness: 0.58, sheen: 0.12, sheenColor: new THREE.Color(0xb08070), sheenRoughness: 0.7 }) : M(cfg.skin, { r: 0.68 });
  const shirt = M(cfg.shirt, { r: 0.85 });
  const pants = M(cfg.pants, { r: 0.85 });
  const shoes = M(cfg.shoes ?? 0x161616, { r: 0.45 });
  const hairM = M(cfg.hair ?? 0x1a1410, { r: 0.6 });
  const sleeveM = cfg.sleeve ? M(cfg.sleeve, { r: 0.8 }) : shirt;

  const hips = new THREE.Group(); hips.position.y = 0.92; body.add(hips);
  const pelvis = sph(0.16, pants); pelvis.scale.set(w, 0.62, 0.72 * w); pelvis.position.y = 0.02; hips.add(pelvis);

  // legs
  const legs = [];
  for (const side of [-1, 1]) {
    const thigh = new THREE.Group(); thigh.position.set(side * 0.095 * w, 0, 0); hips.add(thigh);
    const th = cap(0.078 * w, 0.3, pants); th.position.y = -0.22; thigh.add(th);
    const knee = new THREE.Group(); knee.position.y = -0.44; thigh.add(knee);
    const sh = cap(0.066 * w, 0.3, pants); sh.position.y = -0.2; knee.add(sh);
    const foot = new THREE.Group(); foot.position.y = -0.41; knee.add(foot);
    const shoe = box(0.115 * w, 0.085, 0.28, shoes); shoe.position.set(0, -0.025, 0.05); foot.add(shoe);
    const toe = sph(0.06 * w, shoes); toe.scale.set(1, 0.7, 1); toe.position.set(0, -0.03, 0.18); foot.add(toe);
    legs.push({ thigh, knee, foot });
  }

  // torso
  const spine = new THREE.Group(); spine.position.y = 0.02; hips.add(spine);
  const prof = [[0, -0.02], [0.15, -0.02], [0.158, 0.08], [0.148, 0.2], [0.168, 0.33], [0.19, 0.44], [0.185, 0.5], [0.15, 0.56], [0.08, 0.6], [0.0, 0.61]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const torso = mesh(new THREE.LatheGeometry(prof, 32), shirt);
  torso.scale.set(w, 1, 0.64 * w); spine.add(torso);
  if (cfg.jacketFront) { // open jacket: show inner shirt strip
    const strip = box(0.08 * w, 0.4, 0.02, M(cfg.jacketFront, { r: 0.9 }));
    strip.position.set(0, 0.32, 0.13 * w); spine.add(strip);
  }
  if (cfg.coat) { // long coat skirt from the waist
    const cprof = [[0.17, 0.12], [0.2, -0.05], [0.23, -0.3], [0.26, -0.52], [0.255, -0.54]].map(([x, y]) => new THREE.Vector2(x, y));
    const skirt = mesh(new THREE.LatheGeometry(cprof, 32), M(cfg.coat, { r: 0.75 }));
    skirt.material.side = THREE.DoubleSide; skirt.scale.set(w, 1, 0.75 * w); spine.add(skirt);
    for (const side of [-1, 1]) { const lap = box(0.07, 0.3, 0.02, M(cfg.coat, { r: 0.6 })); lap.position.set(side * 0.07 * w, 0.45, 0.115 * w); lap.rotation.z = side * 0.35; spine.add(lap); }
  }
  if (cfg.collar) { // turtleneck / hoodie collar
    const c = mesh(new THREE.CylinderGeometry(0.068, 0.085, 0.12, 24), M(cfg.collar, { r: 0.9 }));
    c.position.y = 0.6; spine.add(c);
  }
  if (cfg.hood) {
    const hd = mesh(new THREE.TorusGeometry(0.1, 0.045, 12, 24), shirt);
    hd.rotation.x = Math.PI / 2 + 0.5; hd.position.set(0, 0.57, -0.06); hd.scale.set(1.2 * w, 1, 1); spine.add(hd);
  }

  // arms
  const arms = [];
  for (const side of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(side * 0.2 * w, 0.5, 0); spine.add(sh);
    const shoulderBall = sph((RL ? 0.062 : 0.07) * w, sleeveM); sh.add(shoulderBall);
    const up = cap(0.06 * w, 0.2, sleeveM); up.position.y = -0.14; sh.add(up);
    const el = new THREE.Group(); el.position.y = -0.29; sh.add(el);
    const fo = cap(0.052 * w, 0.19, sleeveM); fo.position.y = -0.13; el.add(fo);
    const hand = new THREE.Group(); hand.position.y = -0.275; el.add(hand);
    const handM = cfg.gloves ? M(cfg.gloves, { r: 0.6 }) : skin;
    const palm = sph(0.048, handM); palm.scale.set(0.8, 1.1, 0.55); palm.position.y = -0.03; hand.add(palm);
    const thumb = cap(0.016, 0.03, handM); thumb.position.set(-side * 0.03, -0.02, 0.02); thumb.rotation.z = side * 0.6; hand.add(thumb);
    if (cfg.ring && side < 0) { const rg = mesh(new THREE.TorusGeometry(0.02, 0.008, 10, 24), M(0xffc845, { r: 0.18, m: 1 })); rg.position.set(0.012, -0.07, 0.0); rg.rotation.y = Math.PI / 2; hand.add(rg); const gem = sph(0.009, M(0x8a0010, { r: 0.1, m: 0.3 })); gem.position.set(0.012, -0.07, 0.03); hand.add(gem); }
    arms.push({ sh, el, hand, side });
  }

  // neck + head
  const neck = mesh(new THREE.CylinderGeometry(0.052, 0.058, 0.13, 20), skin); neck.position.y = 0.62; spine.add(neck);
  const headPivot = new THREE.Group(); headPivot.position.y = 0.66; spine.add(headPivot);
  if (RL) { headPivot.scale.setScalar(0.86); headPivot.position.y = 0.635; neck.scale.set(1.12, 0.8, 1.12); neck.position.y = 0.61; }
  const head = new THREE.Group(); head.position.y = HC; headPivot.add(head);
  const skull = sph(R, cfg.mask ? M(0x101012, { r: 0.8 }) : skin, 40); skull.scale.set(SX, SY, SZ); head.add(skull);
  const jaw = sph(R * 0.82, cfg.mask ? M(0x101012, { r: 0.8 }) : skin, 32); jaw.scale.set(SX * 0.98, 0.8, SZ * 0.95); jaw.position.set(0, -0.05, 0.004); head.add(jaw);

  const face = {};
  if (cfg.mask) {
    const maskM = M(0xf2efe8, { r: 0.35 });
    const mk = sph(R * 0.9, maskM, 40); mk.scale.set(0.82, 1.1, 0.62); mk.position.set(0, -0.005, 0.072); head.add(mk);
    face.eyes = [];
    for (const side of [-1, 1]) {
      const hole = sph(0.024, M(0x000000, { r: 1 })); hole.scale.set(1.3, 0.7, 0.4);
      hole.position.set(side * 0.048, 0.02, 0.157); hole.rotation.z = side * 0.25; head.add(hole);
    }
  } else {
    // ears
    for (const side of [-1, 1]) {
      const ear = sph(0.036, skin); ear.scale.set(0.42, 1, 0.75); ear.position.set(side * 0.128, 0.0, -0.005); head.add(ear);
      if (cfg.earrings) {
        const ring = mesh(new THREE.TorusGeometry(0.022, 0.004, 8, 20), M(0xffcf4a, { r: 0.25, m: 0.9 }));
        ring.position.set(side * 0.135, -0.05, 0.0); ring.rotation.y = Math.PI / 2; head.add(ring);
      }
    }
    // eyes
    face.eyes = [];
    const white = M(0xf7f3ee, { r: 0.25 });
    const irisM = M(cfg.eye ?? 0x4a3020, { r: 0.3 });
    const black = M(0x050505, { r: 0.2 });
    const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const lidM = cfg.lidColor ? M(cfg.lidColor, { r: 0.5 }) : skin;
    for (const side of [-1, 1]) {
      const ex = side * (RL ? 0.049 : 0.052), ey = 0.012;
      const eg = new THREE.Group(); eg.position.set(ex, ey, surfZ(ex, ey) - (RL ? 0.019 : 0.017)); head.add(eg);
      if (RL) eg.scale.setScalar(0.84);
      const ew = sph(0.031, white); ew.scale.set(1, 1, 0.7); eg.add(ew);
      const irisG = new THREE.Group(); eg.add(irisG);
      const iris = sph(0.0185, irisM); iris.scale.set(1, 1, 0.45); iris.position.z = 0.0175; irisG.add(iris);
      const pup = sph(0.0095, black); pup.scale.set(1, 1, 0.4); pup.position.z = 0.0225; irisG.add(pup);
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.0042, 10, 8), shine); hl.position.set(0.006, 0.007, 0.0245); irisG.add(hl);
      const lid = mesh(new THREE.SphereGeometry(0.0335, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), lidM, false);
      lid.scale.set(1.04, 1.04, 0.76); eg.add(lid);
      const lowLid = mesh(new THREE.SphereGeometry(0.033, 24, 10, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38), lidM, false);
      lowLid.scale.set(1.03, 1.03, 0.74); eg.add(lowLid);
      if (cfg.lashes) {
        const lash = box(0.05, 0.006, 0.012, black); lash.position.set(side * 0.006, 0.027, 0.017); lash.rotation.z = -side * 0.15;
        eg.add(lash);
      }
      face.eyes.push({ eg, irisG, lid, side });
    }
    // brows
    face.brows = [];
    const browM = M(cfg.brow ?? cfg.hair ?? 0x1a1410, { r: 0.7 });
    for (const side of [-1, 1]) {
      const bx = side * 0.055, by = RL ? 0.055 : 0.066;
      const bg = new THREE.Group(); bg.position.set(bx, by, surfZ(bx, by) + 0.002); head.add(bg);
      const b = cap((RL ? 0.0062 : 0.0085) * (cfg.browThick ?? 1), RL ? 0.055 : 0.05, browM); b.rotation.z = Math.PI / 2; b.scale.set(1, 1, 0.7); bg.add(b);
      bg.rotation.y = side * 0.35;
      face.brows.push({ bg, side, by });
    }
    // nose
    if (RL) {
      const bridge = cap(0.0105, 0.042, skin); bridge.scale.set(0.85, 1, 1); bridge.position.set(0, -0.014, surfZ(0, -0.014) + 0.0); bridge.rotation.x = -0.38; head.add(bridge);
      const tip = sph(0.0155, skin); tip.scale.set(1, 0.85, 0.9); tip.position.set(0, -0.04, surfZ(0, -0.04) + 0.012); head.add(tip);
      for (const sd of [-1, 1]) { const wing = sph(0.011, skin); wing.position.set(sd * 0.015, -0.045, surfZ(sd * 0.015, -0.045) + 0.004); head.add(wing); }
      const chin = sph(0.032, skin); chin.scale.set(1.2, 0.75, 0.7); chin.position.set(0, -0.112, surfZ(0, -0.112) - 0.02); head.add(chin);
    } else {
    const nose = sph(0.02, skin); nose.scale.set(0.9, 1.1, 1.0);
    nose.position.set(0, -0.03, surfZ(0, -0.03) + 0.004); head.add(nose);
    const bridge = cap(0.009, 0.03, skin); bridge.position.set(0, -0.005, surfZ(0, -0.005) - 0.004); head.add(bridge);
    }
    // beard (behind mouth)
    if (cfg.beard) {
      const bm = M(cfg.beard, { r: 0.95 });
      const bd = mesh(new THREE.SphereGeometry(R * 0.9, 32, 20, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), bm);
      bd.scale.set(SX * 1.06, 1.05, SZ * 1.07); bd.position.set(0, -0.062, 0.004); head.add(bd);
      for (const side of [-1, 1]) { const sb = cap(0.016, 0.05, bm); sb.position.set(side * 0.118, -0.03, 0.03); head.add(sb); }
      const mus = cap(0.014, 0.05, bm); mus.rotation.z = Math.PI / 2; mus.position.set(0, -0.058, surfZ(0, -0.058) + 0.022); head.add(mus);
      face.mustache = mus;
    }
    if (cfg.mustache) {
      const mm = M(cfg.mustache, { r: 0.9 });
      for (const side of [-1, 1]) {
        const mu = cap(0.017, 0.045, mm); mu.position.set(side * 0.026, -0.06, surfZ(side * 0.026, -0.06) + 0.012);
        mu.rotation.z = side * (Math.PI / 2 - 0.45); head.add(mu);
      }
    }
    if (cfg.stubble) {
      const sm = new THREE.MeshStandardMaterial({ color: cfg.stubble, roughness: 1, transparent: true, opacity: 0.35 });
      const st = mesh(new THREE.SphereGeometry(R * 0.86, 32, 20, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), sm, false);
      st.scale.set(SX * 1.03, 1.0, SZ * 1.04); st.position.set(0, -0.03, 0.006); head.add(st);
    }
    // mouth
    const mz = cfg.beard ? 0.022 : 0.004;
    const mg = new THREE.Group(); mg.position.set(0, -0.083, surfZ(0, -0.083) + mz); head.add(mg);
    const inner = sph(0.024, M(0x1e0608, { r: 0.8 })); inner.scale.set(RL ? 0.85 : 1, 0.2, 0.35); mg.add(inner);
    const teeth = box(0.026, 0.006, 0.005, M(0xf4f0e6, { r: 0.3 })); teeth.position.set(0, 0.002, 0.006); mg.add(teeth);
    const lipM = RL ? M(new THREE.Color(cfg.lip ?? 0xa85a52).lerp(new THREE.Color(cfg.skin), 0.45).getHex(), { r: 0.42 }) : M(cfg.lip ?? 0xa85a52, { r: 0.45 });
    const upper = cap(RL ? 0.0038 : 0.0048, 0.032, lipM); upper.rotation.z = Math.PI / 2; mg.add(upper);
    const lower = cap(RL ? 0.005 : 0.0058, 0.028, lipM); lower.rotation.z = Math.PI / 2; mg.add(lower);
    const corners = [];
    for (const side of [-1, 1]) {
      const cg = new THREE.Group(); cg.position.x = side * 0.019; mg.add(cg);
      const c = cap(RL ? 0.0038 : 0.0058, 0.012, lipM); c.rotation.z = Math.PI / 2; c.position.x = side * 0.007; cg.add(c);
      corners.push({ cg, side });
    }
    face.mouth = { mg, inner, teeth, upper, lower, corners };
  }

  // hair styles
  const hs = cfg.hairStyle;
  if (hs === 'slick') {
    const cap1 = mesh(new THREE.SphereGeometry(R * 1.04, 36, 20, 0, Math.PI * 2, 0, Math.PI * 0.52), hairM);
    cap1.scale.set(SX * 1.03, SY * 1.0, SZ * 1.05); cap1.rotation.x = -0.72; cap1.position.set(0, 0.006, -0.008); head.add(cap1);
    const back = sph(R * 0.95, hairM, 28); back.scale.set(SX, 0.85, 0.8); back.position.set(0, 0.0, -0.045); head.add(back);
    const quiff = cap(0.03, 0.1, hairM); quiff.rotation.z = Math.PI / 2; quiff.position.set(0.012, 0.142, 0.055); head.add(quiff);
    for (const side of [-1, 1]) {
      const sb = cap(0.009, 0.035, hairM); sb.position.set(side * 0.124, 0.035, 0.03); head.add(sb);
    }
  } else if (hs === 'curlyBun') {
    const cap1 = mesh(new THREE.SphereGeometry(R * 1.05, 36, 20, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM);
    cap1.scale.set(SX * 1.04, SY * 1.02, SZ * 1.05); cap1.rotation.x = -0.62; head.add(cap1);
    const back = sph(R * 0.97, hairM, 28); back.scale.set(SX * 1.03, 0.92, 0.85); back.position.set(0, -0.005, -0.04); head.add(back);
    // curly puff bun: cluster of spheres
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    { const rot = new THREE.Euler(-0.62, 0, 0); let sd = 3; const rr = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 150; i++) {
        const th = Math.acos(1 - rr() * 0.98), ph = rr() * Math.PI * 2;
        const v = new THREE.Vector3(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)).applyEuler(rot);
        const c = sph(0.017 + rr() * 0.008, hairM, 10);
        c.position.set(v.x * R * SX * 1.06, v.y * R * SY * 1.04, v.z * R * SZ * 1.06); head.add(c);
      } }
    const bun = new THREE.Group(); bun.position.set(0, 0.175, -0.07); head.add(bun);
    for (let i = 0; i < 70; i++) {
      const u = rnd() * Math.PI * 2, v = Math.acos(2 * rnd() - 1);
      const rr = 0.052 + rnd() * 0.01;
      const b = sph(0.02 + rnd() * 0.008, hairM, 12);
      b.position.set(Math.sin(v) * Math.cos(u) * rr, Math.cos(v) * rr * 0.85, Math.sin(v) * Math.sin(u) * rr);
      bun.add(b);
    }
  } else if (hs === 'beanie') {
    const bm = M(cfg.beanie ?? 0xb3261e, { r: 0.95 });
    const top = mesh(new THREE.SphereGeometry(R * 1.1, 36, 20, 0, Math.PI * 2, 0, Math.PI * 0.5), bm);
    top.scale.set(SX * 1.04, SY * 1.05, SZ * 1.05); top.position.y = 0.02; top.rotation.x = -0.12; head.add(top);
    const band = mesh(new THREE.CylinderGeometry(R * 1.0, R * 1.0, 0.055, 36, 1, true), bm);
    band.scale.set(SX * 1.08, 1, SZ * 1.08); band.position.set(0, 0.035, -0.004); band.rotation.x = -0.12; head.add(band);
    const back = sph(R * 0.9, hairM, 24); back.scale.set(SX, 0.7, 0.8); back.position.set(0, -0.02, -0.05); head.add(back);
  } else if (hs === 'ponytail') {
    const cap1 = mesh(new THREE.SphereGeometry(R * 1.05, 36, 20, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM);
    cap1.scale.set(SX * 1.04, SY * 1.02, SZ * 1.05); cap1.rotation.x = -0.62; head.add(cap1);
    const back = sph(R * 0.97, hairM, 28); back.scale.set(SX * 1.03, 0.95, 0.85); back.position.set(0, -0.005, -0.04); head.add(back);
    const knot = sph(0.045, hairM); knot.position.set(0, 0.08, -0.15); head.add(knot);
    const tie = mesh(new THREE.TorusGeometry(0.03, 0.009, 8, 20), M(0x111111, { r: 0.4 })); tie.position.set(0, 0.07, -0.175); tie.rotation.x = 0.9; head.add(tie);
    const tail = cap(0.038, 0.2, hairM); tail.position.set(0, -0.05, -0.2); tail.rotation.x = 0.28; head.add(tail);
    const tip = sph(0.03, hairM); tip.position.set(0, -0.19, -0.24); head.add(tip);
  } else if (hs === 'guardcap') {
    const cm = M(cfg.capColor ?? 0x1c2a4a, { r: 0.6 });
    const back = sph(R * 0.95, hairM, 24); back.scale.set(SX, 0.75, 0.82); back.position.set(0, -0.01, -0.045); head.add(back);
    const crown = mesh(new THREE.CylinderGeometry(R * 1.12, R * 1.0, 0.09, 36), cm); crown.scale.set(SX * 1.06, 1, SZ * 1.08); crown.position.set(0, 0.11, -0.005); crown.rotation.x = -0.08; head.add(crown);
    const band = mesh(new THREE.CylinderGeometry(R * 1.005, R * 1.005, 0.03, 36), M(0x111111, { r: 0.4 })); band.scale.set(SX * 1.06, 1, SZ * 1.08); band.position.set(0, 0.075, -0.003); head.add(band);
    const visor = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.01, 24, 1, false, -Math.PI / 2, Math.PI), M(0x0a0a0a, { r: 0.2, m: 0.3 }));
    visor.scale.set(0.95, 1, 0.75); visor.position.set(0, 0.068, 0.095); visor.rotation.x = 0.22; head.add(visor);
    const badge = sph(0.018, M(0xffcf4a, { r: 0.25, m: 0.9 })); badge.scale.set(1, 1.2, 0.4); badge.position.set(0, 0.115, 0.152); head.add(badge);
  } else if (hs === 'hood') {
    const hm = M(0x0d0d10, { r: 0.9 });
    const hood = mesh(new THREE.SphereGeometry(R * 1.25, 36, 24, 0, Math.PI * 2, 0, Math.PI * 0.8), hm);
    hood.scale.set(0.95, 1.08, 1.0); hood.position.set(0, 0.01, -0.06); hood.rotation.x = -1.05; head.add(hood);
  }

  if (cfg.glasses) {
    const gm = M(0x111111, { r: 0.3, m: 0.4 });
    for (const side of [-1, 1]) {
      const ring = mesh(new THREE.TorusGeometry(0.036, 0.0045, 8, 28), gm, false);
      ring.position.set(side * 0.053, 0.012, surfZ(side * 0.052, 0.012) + 0.022); head.add(ring);
      const arm = box(0.004, 0.004, 0.12, gm); arm.position.set(side * 0.112, 0.016, 0.06); head.add(arm);
    }
    const br = box(0.03, 0.004, 0.004, gm); br.position.set(0, 0.02, surfZ(0, 0.02) + 0.02); head.add(br);
  }

  const P0 = {
    x: 0, y: 0, z: 0, ry: 0, lean: 0, twist: 0, side: 0, bob: 0,
    hp: 0, hy: 0, hr: 0, ex: 0, ey: 0, blink: 0, lid: 0,
    browL: 0, browR: 0, furrow: 0, mouth: 0, smile: 0, smirk: 0,
    arms: [[0.05, 0.1, 0, 0.15], [0.05, 0.1, 0, 0.15]],
    legs: [[0, 0], [0, 0]],
  };

  function apply(P) {
    P = { ...P0, ...P };
    root.position.set(P.x, P.y, P.z); root.rotation.set(P.rx ?? 0, P.ry, P.rz ?? 0, 'YXZ');
    hips.position.y = 0.92 + P.bob;
    spine.rotation.set(P.lean, P.twist, P.side);
    headPivot.rotation.set(P.hp, P.hy, P.hr, 'YXZ');
    for (let i = 0; i < 2; i++) {
      const a = arms[i], [fwd, out, tw, elb] = P.arms[i];
      a.sh.rotation.set(-fwd, -a.side * tw, a.side * out, 'XZY');
      a.el.rotation.x = -elb;
      const [hf, kn] = P.legs[i]; const L = legs[i];
      L.thigh.rotation.x = -hf; L.knee.rotation.x = kn; L.foot.rotation.x = hf - kn;
    }
    if (face.eyes && face.eyes.length && face.eyes[0].irisG) {
      const close = Math.min(1, Math.max(P.blink, P.lid, -0.12));
      for (const e of face.eyes) {
        e.irisG.position.set(P.ex * 0.0095, P.ey * 0.007, 0);
        e.lid.rotation.x = -1.3 + close * 2.7;
      }
    }
    if (face.brows) {
      for (const b of face.brows) {
        const raise = b.side < 0 ? P.browR : P.browL;
        b.bg.position.y = b.by + raise * 0.022 - P.furrow * 0.006;
        b.bg.rotation.z = b.side * P.furrow * 0.35 + b.side * raise * -0.12;
      }
    }
    if (face.mouth) {
      const m = face.mouth, o = P.mouth;
      m.inner.scale.set(1 - o * 0.15, 0.2 + o * 1.0, 0.35);
      m.inner.position.y = -o * 0.008;
      m.teeth.visible = o > 0.3; m.teeth.position.y = 0.004 - o * 0.002;
      m.upper.position.y = 0.006 + o * 0.002;
      m.lower.position.y = -0.007 - o * 0.019;
      for (const c of m.corners) {
        const sm = P.smile + (c.side > 0 ? P.smirk : 0);
        c.cg.rotation.z = c.side * sm * 0.6;
        c.cg.position.y = sm * 0.004 - o * 0.006;
      }
      if (face.mustache) face.mustache.position.y = -0.058 + o * 0.004;
    }
  }
  apply({});
  return { root, apply, arms, legs, head, headPivot, spine, hips, scale: s };
}

export function makeMask() {
  const g = new THREE.Group();
  const mk = new THREE.Mesh(new THREE.SphereGeometry(0.135, 32, 20, 0, Math.PI * 2, 0, Math.PI), M(0xf2efe8, { r: 0.35 }));
  mk.scale.set(0.82, 1.1, 0.35); g.add(mk);
  for (const side of [-1, 1]) {
    const hole = new THREE.Mesh(new THREE.SphereGeometry(0.024, 16, 12), M(0x000000, { r: 1 })); hole.scale.set(1.3, 0.7, 0.4);
    hole.position.set(side * 0.048, 0.02, 0.042); hole.rotation.z = side * 0.25; g.add(hole);
  }
  return g;
}

// --- animation helpers ---
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = u => u * u * (3 - 2 * u);
export const easeOut = u => 1 - (1 - u) ** 3;
export const easeIn = u => u * u * u;
export function lerp(a, b, u) {
  if (Array.isArray(a)) return a.map((v, i) => lerp(v, b[i], u));
  return a + (b - a) * u;
}
export function kf(t, keys, ease = smooth) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i], [t1, v1] = keys[i + 1];
    if (t < t1) return lerp(v0, v1, ease((t - t0) / (t1 - t0)));
  }
  return keys[keys.length - 1][1];
}
export function talk(t, t0, t1, seed = 0) {
  if (t < t0 || t > t1) return 0;
  const env = clamp((t - t0) / 0.08) * clamp((t1 - t) / 0.12);
  const v = 0.5 + 0.5 * Math.sin(t * 17 + seed) * Math.sin(t * 7.3 + seed * 2.1);
  const gap = Math.sin(t * 3.1 + seed) > 0.75 ? 0.25 : 1;
  return env * gap * (0.18 + 0.62 * Math.abs(v));
}
export function blinkAt(t, seed = 0) {
  const period = 3.1 + (seed % 3) * 0.6;
  const ph = ((t + seed * 1.37) % period) / period;
  const d = 0.05;
  return ph < d ? Math.sin((ph / d) * Math.PI) : 0;
}
export function walk(P, phase, amt) {
  const s = Math.sin(phase);
  P.legs = [
    [s * 0.42 * amt, Math.max(0, -Math.sin(phase - 0.6)) * 0.7 * amt + 0.05],
    [-s * 0.42 * amt, Math.max(0, Math.sin(phase - 0.6)) * 0.7 * amt + 0.05],
  ];
  P.arms = [
    [-s * 0.32 * amt + 0.05, 0.08, 0, 0.25],
    [s * 0.32 * amt + 0.05, 0.08, 0, 0.25],
  ];
  P.bob = -Math.abs(Math.cos(phase)) * 0.03 * amt;
  return P;
}
