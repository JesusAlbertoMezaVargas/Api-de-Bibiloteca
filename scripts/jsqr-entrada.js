// Entrada del paquete public/vendor/jsqr.bundle.js (npm run build:jsqr).
// jsQR lee códigos QR a partir de los píxeles de un cuadro de video. Es el respaldo del lector
// de la página de Acceso QR para los navegadores sin BarcodeDetector (Safari, Firefox y Chrome
// de escritorio en Windows/Linux). Se empaqueta como módulo ES porque la CSP solo permite
// scripts del mismo origen.
export { default } from 'jsqr';
