# biblioteca-api

API REST de la Guía de servicios de la Biblioteca de la Alameda (Taller Full Stack, Instituto Tecnológico de Tepic).
Incluye ruta de salud, errores uniformes, Helmet, validación de datos, límite de intentos y **cuentas con sesión**
(crear cuenta, iniciar y cerrar sesión, "quién soy"). Los demás endpoints del contrato responden `501` hasta implementarse.

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

## Redis

Redis guarda las cuentas, las sesiones y los contadores del límite de intentos.
- En desarrollo, sin `REDIS_URL`, se conecta a `redis://127.0.0.1:6379`. En producción `REDIS_URL` es obligatorio.
- Si Redis se cae, la API sigue respondiendo; las rutas de cuenta responden `503 ALMACEN_NO_DISPONIBLE` hasta que vuelve.
- Las pruebas usan un Redis simulado (`ioredis-mock`). Para probar contra uno real: `TEST_REDIS_URL=redis://127.0.0.1:6379/15 npm test` (vacía esa base).
- Redis corre de forma nativa en Linux. En Windows se ejecuta con Docker (`docker run -p 127.0.0.1:6379:6379 redis`) o con WSL.

## Estructura

```
src/
  server.js              arranque y cierre ordenado
  app.js                 arma la aplicación: Helmet, JSON, límites, rutas y errores
  config.js              variables de entorno (.env) y vigencias
  errors.js              AppError (código HTTP + código estable)
  auth.js                hash de contraseñas (scrypt), token de sesión y digests (SHA-256 / HMAC)
  almacen.js             cuentas y sesiones en Redis (registro atómico con un script Lua)
  middleware/
    requestId.js         identificador por petición (X-Request-Id)
    errorHandler.js      404 y formato único de error
    validate.js          validación de params, query y body con zod
    rateLimit.js         límite global y límite estricto para acceso
    asyncHandler.js      captura errores de funciones async
    sesion.js            cookie de sesión y requerirSesion para rutas privadas
  routes/
    health.js            GET /api/health
    api.js               contrato de endpoints (501 hasta implementar)
    auth.js              POST registro, login, logout y GET yo
  redis.js               conexión opcional a Redis y estado para /api/health
  schemas/index.js       esquemas de validación de cada endpoint
public/                  frontend (HTML5, CSS3 y JavaScript con módulos ES, sin compilador)
  index.html             inicio; cada pantalla es su propio .html con la misma estructura base
  areas.html             maqueta 3D de la biblioteca (plano 2D si no hay WebGL)
  servicio.html          guía de un servicio (servicio.html?id=...)
  acceso.html            acceso QR (acceso.html?codigo=... valida directo)
  preferencias.html, cuenta.html, registro.html
  css/styles.css         diseño móvil primero; barra inferior en móvil y menú superior en escritorio
  js/main.js             punto de entrada de cada página: preferencias, sesión y la vista de data-vista
  js/api.js              cliente de la API con el formato uniforme de error
  js/estado.js           preferencias de accesibilidad y usuario en sesión
  js/ui.js, html.js      plantillas seguras, avisos y errores de formulario
  js/validacion.js       mismas reglas que src/schemas en el navegador
  js/datos/servicios.js  áreas y guías de cada servicio (hasta que lleguen de la API)
  js/mapa3d/             maqueta 3D (ver abajo)
  js/vistas/             inicio, áreas, guía del servicio, acceso QR, ajustes, cuenta, registro, 404
test/api.test.js         pruebas de aceptación del esqueleto
test/auth.test.js        pruebas de cuentas y sesiones
```

El frontend se abre en <http://localhost:3000/>. Mientras un endpoint responda `501`, su vista muestra
"Esta sección todavía está en construcción" en lugar de fallar.

## Formato de error (todas las respuestas de error)

```json
{ "error": { "code": "VALIDACION", "message": "Los datos enviados no son válidos.",
             "details": [{ "campo": "body.email", "mensaje": "Escribe un correo completo..." }],
             "requestId": "3f1c..." } }
```

## Siguiente paso

Implementar, en este orden: `qr/validar` (pase de acceso), `areas`, `preferencias` y `uso`.
Las rutas privadas usan el middleware `requerirSesion` (deja el usuario en `req.usuario`). Para cada uno, reemplaza
`pendiente('...')` en `src/routes/api.js` por su controlador y agrega su prueba.

## Seguridad

- No subas `.env` a GitHub (ya está en `.gitignore`).
- En producción `JWT_SECRET` (32 caracteres o más) y `REDIS_URL` son obligatorios; el servidor no arranca sin ellos.
- Contraseñas con scrypt; la sesión es un token aleatorio en una cookie HttpOnly, SameSite=Strict, que dura 30 minutos
  y se renueva con cada uso. En Redis solo se guarda el SHA-256 del token y el HMAC del correo.
- Registro e inicio de sesión tienen un límite estricto de intentos fallidos.

## Maqueta 3D

`areas.html` muestra la biblioteca en 3D con [Three.js](https://threejs.org/), con vistas de maqueta y planta. El recorrido a la altura de los ojos está programado pero desactivado (`RECORRIDO_ACTIVO` en `js/vistas/areas.js`). El código está en `public/js/mapa3d/`: `distribucion.js` tiene las medidas del croquis, `construir.js` arma el edificio y los muebles, `texturas.js` dibuja los acabados y `visor.js` maneja la cámara y los marcadores. Si el equipo no tiene WebGL se muestra el plano 2D.

La CSP no permite importmaps en línea, así que Three.js se empaqueta en `public/vendor/three.bundle.js`. Ese archivo se versiona; solo hay que regenerarlo al actualizar Three.js o al usar otro módulo de `three/addons`:

```bash
npm run build:three
```
