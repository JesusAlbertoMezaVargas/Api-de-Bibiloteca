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

### Abrir desde otros dispositivos de la misma red

El servidor escucha en todas las interfaces (`HOST=0.0.0.0`); no hace falta pasar `-- -h 0.0.0.0`. En esta computadora ejecuta `npm run dev`. En la consola aparecerán varias direcciones: usa la IPv4 del adaptador Wi-Fi o Ethernet conectado a la misma red que el otro dispositivo. Puedes identificarla con `ipconfig` (busca «Dirección IPv4» bajo el adaptador conectado). Abre en el otro dispositivo `http://ESA-IP:3000`. No uses `localhost`, porque en el teléfono apuntaría al propio teléfono.

Ambos dispositivos deben estar en la misma red; algunas redes de invitados aíslan sus dispositivos. Si la página no abre, permite el puerto TCP 3000 en el firewall de Windows desde la red local. Abre PowerShell como administrador y ejecuta:

```powershell
New-NetFirewallRule -DisplayName "Biblioteca API red local (TCP 3000)" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -RemoteAddress LocalSubnet -Profile Private,Public
```

El HTML, CSS, JavaScript, imágenes y maqueta 3D se sirven desde el mismo sitio. Para comprobar el CSS desde el otro dispositivo, abre también `http://ESA-IP:3000/css/styles.css`; debe aparecer una hoja de estilos, no un error ni una página HTML. Si esa URL abre pero la página sigue sin estilos, recarga la página y revisa la consola del navegador; si no abre, el problema está en la dirección, la red o el firewall.

Para usar HTTPS directamente en la red local, crea un certificado para la IP Wi-Fi actual de esta computadora. Identifícala con `ipconfig` en Windows (IPv4 del adaptador Wi-Fi). No uses las direcciones de `vEthernet`/WSL, como `172.31.240.1`: son adaptadores virtuales y otros dispositivos no pueden acceder a ellos. Si `mkcert` está instalado en WSL y el proyecto está en el disco `C:`, ejecuta en WSL:

```bash
cd "/mnt/c/Users/Cesar Rosas/Desktop/ESCUELITA/TdFS/Api-de-Bibiloteca"
mkdir -p certs
mkcert -install
mkcert -key-file certs/lan-key.pem -cert-file certs/lan-cert.pem IP-WIFI localhost 127.0.0.1
cp "$(mkcert -CAROOT)/rootCA.pem" certs/rootCA.pem
```

En `.env`, configura las rutas de ambos archivos. Las rutas relativas funcionan al ejecutar `npm run dev` desde la carpeta del proyecto, tanto en Windows como en WSL:

```dotenv
TLS_KEY_PATH=certs/lan-key.pem
TLS_CERT_PATH=certs/lan-cert.pem
```

`mkcert -install` en WSL instala la CA en WSL, no en Windows. Para que Edge/Chrome de Windows confíe en el certificado, abre `certmgr.msc` en Windows e importa `certs/rootCA.pem` en **Certificados - usuario actual > Entidades de certificación raíz de confianza > Certificados**. Inicia o reinicia `npm run dev` y entra exclusivamente por `https://IP-WIFI:3000`. La consola del servidor indica el nombre del adaptador junto a cada URL y marca las interfaces virtuales para no confundirlas con la Wi-Fi. El HTML y `/css/styles.css` se sirven bajo el mismo origen HTTPS. Para abrirlo en un teléfono, instala también en ese dispositivo el certificado raíz público `certs/rootCA.pem`; nunca copies ni compartas `rootCA-key.pem`. Confía esa CA solo en dispositivos que controles. Si cambia la IP Wi-Fi, vuelve a generar el certificado con la IP nueva. Si no configuraste los archivos TLS, el servidor seguirá usando HTTP y debes abrir `http://IP-WIFI:3000`; HTTP y HTTPS no se pueden mezclar dentro de una misma página.

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

## Maqueta 3D

`areas.html` muestra la biblioteca en 3D con [Three.js](https://threejs.org/), con vistas de maqueta, planta y recorrido. El código está en `public/js/mapa3d/`: `distribucion.js` tiene las medidas del croquis, `construir.js` arma el edificio y los muebles, `texturas.js` dibuja los acabados y `visor.js` maneja la cámara y los marcadores. Si el equipo no tiene WebGL se muestra el plano 2D.

La CSP no permite importmaps en línea, así que Three.js se empaqueta en `public/vendor/three.bundle.js`. Ese archivo se versiona; solo hay que regenerarlo al actualizar Three.js o al usar otro módulo de `three/addons`:

```bash
npm run build:three
```
