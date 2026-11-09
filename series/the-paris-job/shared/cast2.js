// Cast for Part 2+ (serious version): realistic option + heist outfits.
import { makePerson } from './person.js';
export function makeCast() {
  return {
    victor: makePerson({ real: true, skin: 0xbb8a70, shirt: 0x1a1a1e, collar: 0x1a1a1e, coat: 0x141418, pants: 0x1c1c22, gloves: 0x111111, hair: 0x16110d, hairStyle: 'slick', eye: 0x3b2a1a, lip: 0x9a6656, browThick: 1.15 }),
    sasha: makePerson({ real: true, skin: 0x87583f, shirt: 0x2e2838, hood: true, pants: 0x18181c, shoes: 0x2a2a2a, gloves: 0x111111, hair: 0x15100c, hairStyle: 'curlyBun', glasses: true, earrings: true, lashes: true, lip: 0x5e2e2a, eye: 0x24160c, scale: 0.94 }),
    marco: makePerson({ real: true, skin: 0xcc9f88, shirt: 0x2a2522, jacketFront: 0x3a3a3c, pants: 0x1e2430, shoes: 0x2a1c12, gloves: 0x111111, hairStyle: 'beanie', beanie: 0x232427, hair: 0x6a3418, beard: 0x6e3a1c, brow: 0x5a2e14, eye: 0x3a6a8a, lip: 0xa86a5e, scale: 1.05, build: 1.18 }),
    masked: makePerson({ skin: 0x101012, mask: true, hairStyle: 'hood', shirt: 0x0d0d10, pants: 0x0d0d10, gloves: 0x0a0a0a, shoes: 0x050505, scale: 0.96 }),
    camille: makePerson({ real: true, skin: 0xe2b49a, hairStyle: 'ponytail', hair: 0xa02a18, shirt: 0x0d0d10, collar: 0x0d0d10, pants: 0x0d0d10, gloves: 0x0a0a0a, shoes: 0x050505, lashes: true, lip: 0x9a2232, eye: 0x3a7a4a, scale: 0.96 }),
    guard: makePerson({ real: true, skin: 0xcf9f86, shirt: 0x1e2a48, pants: 0x161c30, hairStyle: 'guardcap', hair: 0x4a3828, mustache: 0x3e2a1c, brow: 0x3e2a1c, eye: 0x4a3a2a, lip: 0xa0645a, scale: 1.03, build: 1.18 }),
    comte: makePerson({ real: true, skin: 0xcaa48c, shirt: 0x26262b, jacketFront: 0xe8e6e0, pants: 0x26262b, shoes: 0x0a0a0a, hair: 0x8a8a8a, hairStyle: 'slick', ring: true, eye: 0x5a6a7a, lip: 0x9a6a60, scale: 1.02, build: 1.08 }),
  };
}
