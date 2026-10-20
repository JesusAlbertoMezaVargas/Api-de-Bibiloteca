# biblioteca-api

API REST de la Guía de servicios de la Biblioteca de la Alameda (Taller Full Stack, Instituto Tecnológico de Tepic).
Esta primera versión deja listo el **esqueleto del servidor**: ruta de salud, errores uniformes, Helmet,
validación de datos y límite de intentos. Los endpoints del contrato ya existen y responden `501` hasta implementarse.

## Cómo ejecutarlo

Requisitos: Node.js 20 o superior.

```bash
npm install
cp .env.example .env      # en Windows: copy .env.example .env
npm run dev               # o: npm start
```

Prueba que funciona: abre <http://localhost:3000/api/health> (el campo `redis` dice si la caché está conectada).

```bash
npm test                  # pruebas con el ejecutor de Node (no necesita librerías extra)
```

## Redis (opcional)

Redis guarda la caché de áreas y guías, los contadores del límite de intentos y los tokens de sesiones cerradas.
- Sin `REDIS_URL` en el `.env`, la API funciona igual y usa la memoria local (así corren las pruebas).
- Con `REDIS_URL=redis://:contraseña@127.0.0.1:6379` se activa. Si Redis se cae, la API sigue respondiendo con la base de datos.
- Redis corre de forma nativa en Linux. En Windows se ejecuta con Docker (`docker run -p 127.0.0.1:6379:6379 redis`) o con WSL.

## Estructura

```
src/
  server.js              arranque y cierre ordenado
  app.js                 arma la aplicación: Helmet, JSON, límites, rutas y errores
  config.js              variables de entorno (.env) y vigencias
  errors.js              AppError (código HTTP + código estable)
  middleware/
    requestId.js         identificador por petición (X-Request-Id)
    errorHandler.js      404 y formato único de error
    validate.js          validación de params, query y body con zod
    rateLimit.js         límite global y límite estricto para acceso
    asyncHandler.js      captura errores de funciones async
  routes/
    health.js            GET /api/health
    api.js               contrato de endpoints (501 hasta implementar)
  redis.js               conexión opcional a Redis y estado para /api/health
  schemas/index.js       esquemas de validación de cada endpoint
test/api.test.js         pruebas de aceptación del esqueleto
```

## Formato de error (todas las respuestas de error)

```json
{ "error": { "code": "VALIDACION", "message": "Los datos enviados no son válidos.",
             "details": [{ "campo": "body.email", "mensaje": "Escribe un correo completo..." }],
             "requestId": "3f1c..." } }
```

## Siguiente paso

Implementar, en este orden: conexión a la base de datos, `auth` (bcrypt + JWT en cookie HttpOnly),
`qr/validar` (pase de acceso), `areas`, `preferencias` y `uso`. Para cada uno, reemplaza
`pendiente('...')` en `src/routes/api.js` por su controlador y agrega su prueba.

## Seguridad

- No subas `.env` a GitHub (ya está en `.gitignore`).
- En producción `JWT_SECRET` es obligatorio (32 caracteres o más) y el servidor no arranca sin él.
