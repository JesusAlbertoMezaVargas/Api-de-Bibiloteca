'use strict';
const { z } = require('zod');

const email = z.string({ required_error: 'El correo es obligatorio.' })
  .trim().toLowerCase().max(254, 'El correo es demasiado largo.')
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Escribe un correo completo, por ejemplo nombre@correo.com.');

// El límite conserva el contrato del formulario y acota el costo de procesamiento.
const passwordNueva = z.string({ required_error: 'La contraseña es obligatoria.' })
  .min(6, 'Usa al menos 6 caracteres.').max(72, 'Usa máximo 72 caracteres.');

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
      altoContraste: z.boolean(),
      audioAutomatico: z.boolean(),
      velocidadVoz: z.union([z.literal(0.8), z.literal(1), z.literal(1.25)]),
    }).strict(),
  },
  usoGuia: { body: z.object({ areaId: slug }).strict() },
  usoServicioOpcional: {
    body: z.object({ servicioId: slug.optional() }).strict(),
  },
};
