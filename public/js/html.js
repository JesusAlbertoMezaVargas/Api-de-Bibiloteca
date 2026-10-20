// Plantillas HTML seguras: todo valor interpolado se escapa salvo que ya sea HTML seguro.
// Así los datos que llegan de la API nunca se interpretan como código.

class HtmlSeguro {
  constructor(texto) { this.texto = texto; }
  toString() { return this.texto; }
}

const ENTIDADES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapar(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (c) => ENTIDADES[c]);
}

function convertir(valor) {
  if (valor instanceof HtmlSeguro) return valor.texto;
  if (Array.isArray(valor)) return valor.map(convertir).join('');
  if (valor === false || valor === null || valor === undefined) return '';
  return escapar(valor);
}

/** Uso: html`<p>${texto}</p>` */
export function html(partes, ...valores) {
  return new HtmlSeguro(partes.reduce((acc, parte, i) => acc + parte + (i < valores.length ? convertir(valores[i]) : ''), ''));
}

/** Reemplaza el contenido de un elemento con una plantilla html``. */
export function pintar(elemento, plantilla) {
  elemento.innerHTML = String(plantilla);
}
