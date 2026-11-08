'use strict';
const { z } = require('zod');

const email = z.string({ required_error: 'El correo es obligatorio.' })
  .trim().toLowerCase().max(254, 'El correo es demasiado largo.')
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Escribe un correo completo, por ejemplo nombre@correo.com.');

// Contraseña nueva: 8 a 15 caracteres con minúscula, mayúscula, número y un carácter especial.
// Se reporta un solo mensaje (el primero que falla), igual que en public/js/validacion.js.
const COMPLEJIDAD = [/\p{Ll}/u, /\p{Lu}/u, /\d/, /[^\p{L}\p{N}\s]/u];
const passwordNueva = z.string({ required_error: 'La contraseña es obligatoria.' }).superRefine((valor, ctx) => {
  let mensaje = '';
  if (valor.length < 8) mensaje = 'Usa al menos 8 caracteres.';
  else if (valor.length > 15) mensaje = 'Usa máximo 15 caracteres.';
  else if (!COMPLEJIDAD.every((regla) => regla.test(valor))) {
    mensaje = 'Incluye mayúscula, minúscula, número y un carácter especial (*, # o @).';
  }
  if (mensaje) ctx.addIssue({ code: z.ZodIssueCode.custom, message: mensaje });
});

const nombre = z.string({ required_error: 'El nombre es obligatorio.' })
  .trim().min(2, 'Escribe tu nombre.').max(80, 'El nombre es demasiado largo.');

const slug = z.string().regex(/^[a-z0-9-]{2,40}$/, 'El identificador del área no es válido.');

// 02: esquemas de validación de cada endpoint (incluye params.id de /areas/:id)
module.exports = {
  qrValidar: { body: z.object({ codigo: z.string().trim().min(8, 'El código del QR no es válido.').max(200) }).strict() },
  registro: { body: z.object({ nombre, email, password: passwordNueva }).strict() },
  login: { body: z.object({ email, password: z.string().min(1, 'Escribe tu contraseña.').max(72) }).strict() },
  areaId: { params: z.object({ id: slug }).strict() },
  preferencias: {
    body: z.object({
      tamanoLetra: z.enum(['normal', 'grande', 'muy_grande']),
      tema: z.enum(['claro', 'oscuro']),
      audioAutomatico: z.boolean(),
      velocidadVoz: z.union([z.literal(0.8), z.literal(1), z.literal(1.25)]),
    }).strict(),
  },
  usoGuia: { body: z.object({ areaId: slug }).strict() },
};
