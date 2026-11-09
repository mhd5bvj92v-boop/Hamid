// Cinematic post: depth of field + bloom, then tone mapping (OutputPass).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
export function makePost(renderer, W, H) {
  const dummyScene = new THREE.Scene(), dummyCam = new THREE.PerspectiveCamera();
  const composer = new EffectComposer(renderer);
  const rp = new RenderPass(dummyScene, dummyCam); composer.addPass(rp);
  const bokeh = new BokehPass(dummyScene, dummyCam, { focus: 2.0, aperture: 0.004, maxblur: 0.008 }); composer.addPass(bokeh);
  const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.45, 0.6, 0.82); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  return {
    composer, bloom, bokeh,
    render(scene, camera, focusDist, aperture = 0.004) {
      rp.scene = scene; rp.camera = camera; bokeh.scene = scene; bokeh.camera = camera;
      bokeh.uniforms.focus.value = focusDist; bokeh.uniforms.aperture.value = aperture;
      bokeh.uniforms.aspect.value = camera.aspect; bokeh.uniforms.nearClip.value = camera.near; bokeh.uniforms.farClip.value = camera.far;
      composer.render();
    },
  };
}
