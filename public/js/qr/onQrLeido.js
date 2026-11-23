// =======================================================================================
//  PUNTO DE ENLACE: qué hacer con el texto de un QR recién leído
// =======================================================================================
import { buscarServicio, buscarServicioPorCodigo } from '../datos/servicios.js';

/**
 * Convierte un contenido QR o una URL de área en la ruta de su guía.
 * Se aceptan: area:<id>, un id conocido, y enlaces relativo/absoluto a servicio.html.
 */
export function resolverCodigoArea(texto) {
  if (typeof texto !== 'string') return null;
  let valor = texto.trim();
  if (!valor) return null;

  const porCodigo = buscarServicioPorCodigo(valor);
  if (porCodigo) return `servicio.html?id=${encodeURIComponent(porCodigo.id)}`;

  valor = valor.replace(/^biblioteca:area:/i, 'area:');
  if (/^area:/i.test(valor)) {
    valor = valor.replace(/^area:/i, '');
  } else {
    try {
      const origen = typeof location === 'undefined' ? 'http://localhost' : (location.origin || 'http://localhost');
      const url = new URL(valor, origen);
      const id = url.searchParams.get('id') || url.searchParams.get('area');
      if (id) valor = id;
    } catch { /* el valor puede ser solo un identificador */ }
  }

  try {
    valor = decodeURIComponent(valor).trim();
  } catch {
    valor = valor.trim();
  }
  const servicio = buscarServicio(valor);
  return servicio ? `servicio.html?id=${encodeURIComponent(servicio.id)}` : null;
}

/** @param {string} texto contenido del QR, tal cual lo leyó la cámara */
export function onQrLeido(texto) {
  const destino = resolverCodigoArea(texto);
  if (destino) {
    location.assign(destino);
    return true;
  }
  console.log('[Acceso QR] Código leído:', texto);
  return false;
}
