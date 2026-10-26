# biblioteca-api

API REST y sitio web de la Guía de servicios de la Biblioteca de la Alameda (Taller Full Stack, Instituto Tecnológico de Tepic).

## Cómo ejecutarlo

Requisitos: Node.js 20 o superior y Redis disponible en `127.0.0.1:6379`.

```powershell
npm install
Copy-Item .env.example .env
npm run seed
npm run dev
```

`npm run seed` carga o actualiza los datos de prueba sin duplicarlos. Incluye 5 áreas, 23 servicios, 69 pasos y el mapa (98 hashes en total). Abre <http://localhost:3000/> y revisa <http://localhost:3000/api/health>.

Para crear el secreto de la aplicación, ejecuta `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` y pega el resultado en `JWT_SECRET` dentro de `.env`. Define también `QR_ACCESS_CODE` si vas a probar el acceso QR. No uses valores de desarrollo en producción.

```powershell
npm test
```

Las pruebas de endpoints sin base de datos no requieren Redis; las pruebas de integración de autenticación se omiten si Redis no está disponible.

## Redis

Redis es el almacén principal de cuentas, sesiones, preferencias, guías, eventos y métricas, además de los contadores de intentos. Sin Redis, las rutas que necesitan persistencia responden `503` explícitamente; el sitio informativo estático sigue disponible.

En local, `REDIS_URL=redis://127.0.0.1:6379`. En producción, habilita autenticación y TLS (`rediss://`), limita Redis a una red privada, configura persistencia y respaldos, y nunca publiques el puerto 6379 en Internet. El servidor web debe publicarse únicamente por HTTPS; marca `TRUST_PROXY=true` solo cuando haya un proxy inverso confiable delante.

## Datos e índices

Todos los nombres de clave usan el prefijo `alameda:v1:`. El esquema en Redis sigue el diagrama:

- `mapa:principal`, `area:<id>`, `servicio:<id>` y `paso:<id>` son hashes.
- `areas`, `servicios`, `area:<id>:servicios` y `servicio:<id>:pasos` son conjuntos ordenados.
- `usuario:<id>` y `preferencias:<usuario_id>` son hashes. `indice:correo:<digest>` indexa el correo normalizado sin guardarlo como clave.
- `sesion:<token_hash>` almacena únicamente el identificador de usuario y la hora de creación; Redis lo elimina con TTL de 30 minutos de inactividad.
- `eventos:uso` es un stream acotado a 100 000 eventos. La escritura del evento y el incremento diario se hacen en una sola operación Lua, dentro de `metricas:AAAA-MM-DD` (UTC).

Las contraseñas se derivan con scrypt y una sal aleatoria; la cookie de sesión es aleatoria, `HttpOnly`, `SameSite=Strict`, y `Secure` en producción. El código de acceso QR no está habilitado hasta configurar `QR_ACCESS_CODE`.

El script de semilla solo reemplaza las claves de datos de prueba que él mismo registró; no elimina usuarios, sesiones ni eventos.

## Estructura

```text
src/
  server.js              arranque y cierre ordenado
  app.js                 arma la aplicación: Helmet, JSON, límites, rutas y errores
  config.js              variables de entorno y vigencias
  auth.js                contraseñas scrypt y tokens de sesión
  repository.js          claves Redis, sesiones, preferencias e índices
  middleware/            request id, validación, límites y errores
  routes/                salud, autenticación, áreas y uso
  data/
    datosPrueba.js       dataset de demostración
    seed.js              carga idempotente de datos en Redis
public/                  frontend HTML, CSS y JavaScript sin compilación
test/api.test.js         pruebas de aceptación e integración
```

El frontend se abre en <http://localhost:3000/>. El sitio informativo puede consultarse como invitado; las cuentas sincronizan ajustes y el uso de guías se registra cuando Redis está disponible.

## Endpoints implementados

- `POST /api/auth/registro`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/yo`
- `GET /api/areas`, `GET /api/areas/:id`
- `GET /api/preferencias`, `PUT /api/preferencias` (requieren sesión)
- `POST /api/qr/validar` (requiere `QR_ACCESS_CODE`)
- `POST /api/uso/guias`, `POST /api/uso/audio`, `POST /api/uso/finalizaciones`

La métrica de finalizaciones se incrementa al usar el botón “Marcar guía como terminada”. Los eventos son anónimos y solo contienen tipo, fecha y, cuando aplica, identificador del servicio.

## Formato de error

```json
{ "error": { "code": "VALIDACION", "message": "Los datos enviados no son válidos.",
             "details": [{ "campo": "body.email", "mensaje": "Escribe un correo completo..." }],
             "requestId": "3f1c..." } }
```

## Seguridad

- No subas `.env` a GitHub (está en `.gitignore`).
- En producción `JWT_SECRET` debe ser aleatorio y tener 32 caracteres o más; `QR_ACCESS_CODE` debe tener 16 caracteres o más.
- Protege Redis con contraseña, TLS y acceso de red privado. Usa HTTPS para todo el sitio.
