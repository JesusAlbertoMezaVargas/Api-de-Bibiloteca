'use strict';
const { z } = require('zod');

const LETRAS = /[A-Za-zÁÉÍÓÚáéíóúÑñ]/;
// Misma lista que public/js/validacion.js
const COMUNES = ['12345678', '123456789', 'password', 'contraseña', 'qwertyui', '11111111', 'abcd1234', 'biblioteca'];

/** Devuelve el primer problema de la contraseña, o '' si es válida. */
function errorDePassword(p) {
  if (!p) return 'La contraseña es obligatoria.';
  if (p.length < 8) return 'Usa al menos 8 caracteres.';
  // bcrypt solo usa los primeros 72 bytes (una "ñ" ocupa 2).
  if (p.length > 72 || Buffer.byteLength(p, 'utf8') > 72) return 'Usa máximo 72 caracteres.';
  if (p !== p.trim()) return 'No puede empezar ni terminar con espacios.';
  if (!LETRAS.test(p) || !/\d/.test(p)) return 'Incluye al menos una letra y un número.';
  if (COMUNES.some((c) => p.toLowerCase().includes(c))) return 'Es una contraseña muy común. Elige otra.';
  return '';
}

const email = z.string({ required_error: 'El correo es obligatorio.' })
  .trim().toLowerCase().max(254, 'El correo es demasiado largo.')
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Escribe un correo completo, por ejemplo nombre@correo.com.');

// Solo se reporta UN mensaje (el primero que falle), igual que en el navegador.
const passwordNueva = z.string({ required_error: 'La contraseña es obligatoria.' })
  .superRefine((p, ctx) => {
    const mensaje = errorDePassword(p);
    if (mensaje) ctx.addIssue({ code: 'custom', message: mensaje });
  });

const nombre = z.string({ required_error: 'El nombre es obligatorio.' })
  .trim().min(2, 'Escribe tu nombre.').max(80, 'El nombre es demasiado largo.')
  .regex(/^\p{L}[\p{L}\s'’-]*$/u, 'Usa solo letras, espacios, guion o apóstrofe.');

const slug = z.string().regex(/^[a-z0-9-]{2,40}$/, 'El identificador del área no es válido.');

// 02: esquemas de validación de cada endpoint (incluye params.id de /areas/:id)
module.exports = {
  qrValidar: { body: z.object({ codigo: z.string().trim().min(8, 'El código del QR no es válido.').max(200) }).strict() },
  registro: {
    body: z.object({ nombre, email, password: passwordNueva }).strict().superRefine((d, ctx) => {
      if (errorDePassword(d.password)) return; // ya se reportó
      const bajas = d.password.toLowerCase();
      const usuarioCorreo = d.email.split('@')[0];
      if (usuarioCorreo.length >= 3 && bajas.includes(usuarioCorreo)) {
        ctx.addIssue({ code: 'custom', path: ['password'], message: 'No uses tu correo dentro de la contraseña.' });
      } else if (d.nombre.length >= 3 && bajas.includes(d.nombre.toLowerCase())) {
        ctx.addIssue({ code: 'custom', path: ['password'], message: 'No uses tu nombre dentro de la contraseña.' });
      }
    }),
  },
  // En el login NO se aplican reglas de fuerza: solo que no esté vacía.
  login: { body: z.object({ email, password: z.string().min(1, 'Escribe tu contraseña.').max(72) }).strict() },
  areaId: { params: z.object({ id: slug }).strict() },
  preferencias: {
    body: z.object({
      tamanoLetra: z.enum(['normal', 'grande', 'muy_grande']),
      altoContraste: z.boolean(),
      audioAutomatico: z.boolean(),
      velocidadVoz: z.union([z.literal(0.8), z.literal(1), z.literal(1.25)]),
    }).strict(),
  },
  usoGuia: { body: z.object({ areaId: slug }).strict() },
};
