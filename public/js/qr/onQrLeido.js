// =======================================================================================
//  PUNTO DE ENLACE: qué hacer con el texto de un QR recién leído
// =======================================================================================
// La página de Acceso QR (js/vistas/acceso.js) llama a esta función cada vez que la cámara
// lee un código. Para entonces la cámara ya se apagó, el texto ya se muestra en pantalla y
// ya está escrito en el campo "Código de acceso" del formulario.
//
// PENDIENTE (compañero): aquí va la redirección a las áreas. Por ahora solo se registra el
// texto en la consola. 

/** @param {string} texto contenido del QR, tal cual lo leyó la cámara */
export function onQrLeido(texto) {
  console.log('[Acceso QR] Código leído:', texto);
}
