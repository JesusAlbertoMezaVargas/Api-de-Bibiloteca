// Iconos SVG definidos en cada página .html (<symbol id="i-...">).
// Son decorativos: el texto que los acompaña es el que describe la acción.
import { html } from './html.js';

export const icono = (nombre) => html`<svg class="icono" aria-hidden="true"><use href="#i-${nombre}"></use></svg>`;
