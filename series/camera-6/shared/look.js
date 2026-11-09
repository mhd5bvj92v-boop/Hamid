// Post chain: render -> depth of field -> bloom -> DEVICE pass (fisheye / IR / pixelation / noise / glitch) -> output.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const DeviceShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1080, 1920) },
    uFish: { value: 0 }, uPix: { value: 1 }, uMono: { value: 0 }, uNoise: { value: 0.03 }, uChroma: { value: 0 },
    uGlitch: { value: 0 }, uVig: { value: 0.35 }, uLift: { value: 0 }, uTint: { value: new THREE.Color(1, 1, 1) }, uSat: { value: 1 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uFish, uPix, uMono, uNoise, uChroma, uGlitch, uVig, uLift, uSat; uniform vec2 uRes; uniform vec3 uTint;
    varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      // glitch: horizontal band tearing
      if (uGlitch > 0.0) { float band = floor(uv.y * 38.0 + floor(uTime * 24.0) * 7.0); float r = h(vec2(band, floor(uTime*24.0)));
        if (r < uGlitch * 0.55) uv.x += (h(vec2(band, 3.1)) - 0.5) * 0.18 * uGlitch; }
      // fisheye (barrel)
      vec2 d = uv - 0.5; d.x *= uRes.x / uRes.y; float r2 = dot(d, d);
      vec2 fuv = 0.5 + (uv - 0.5) * (1.0 + uFish * r2 * 1.6) / (1.0 + uFish * 0.55);
      uv = mix(uv, fuv, step(0.001, uFish));
      if (uPix > 1.0) { vec2 px = uRes / uPix; uv = (floor(uv * px) + 0.5) / px; }
      vec2 cd = (uv - 0.5) * uChroma * 0.012;
      vec3 col = vec3(texture2D(tDiffuse, uv + cd).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - cd).b);
      float outside = step(1.0, max(abs(uv.x - 0.5), abs(uv.y - 0.5)) * 2.0);
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(lum), col, uSat);
      col = mix(col, vec3(lum) * vec3(0.86, 1.0, 0.92) * 1.15, uMono);
      col = col * uTint + uLift;
      col += (h(vUv * uRes + fract(uTime * 13.0) * 100.0) - 0.5) * uNoise;
      float v = length((vUv - 0.5) * vec2(1.0, 1.25)); col *= 1.0 - uVig * smoothstep(0.35, 0.85, v);
      col *= 1.0 - outside;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export function makeLook(renderer, W, H) {
  const ds = new THREE.Scene(), dc = new THREE.PerspectiveCamera();
  const composer = new EffectComposer(renderer);
  const rp = new RenderPass(ds, dc); composer.addPass(rp);
  const bokeh = new BokehPass(ds, dc, { focus: 2.0, aperture: 0.004, maxblur: 0.01 }); composer.addPass(bokeh);
  const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.6, 0.55, 0.8); composer.addPass(bloom);
  const dev = new ShaderPass(DeviceShader); composer.addPass(dev);
  composer.addPass(new OutputPass());
  return {
    dev: dev.uniforms, bloom,
    render(scene, camera, focus, aperture) {
      rp.scene = bokeh.scene = scene; rp.camera = bokeh.camera = camera;
      bokeh.enabled = aperture > 0;
      Object.assign(bokeh.uniforms.focus, { value: focus }); bokeh.uniforms.aperture.value = aperture;
      bokeh.uniforms.aspect.value = camera.aspect; bokeh.uniforms.nearClip.value = camera.near; bokeh.uniforms.farClip.value = camera.far;
      composer.render();
    },
  };
}
