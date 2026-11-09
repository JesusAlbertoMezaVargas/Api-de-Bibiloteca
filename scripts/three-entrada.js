// Entrada del paquete public/vendor/three.bundle.js (npm run build:three).
// Se empaqueta porque la CSP (script-src 'self') no permite el importmap en línea que
// necesitarían los módulos de three/addons.
export * from 'three';
export { OrbitControls } from 'three/addons/controls/OrbitControls.js';
export { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
export { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
export { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
export { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
