'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

/** Levanta una instancia nueva (con su propio contador de límites) en un puerto libre. */
async function iniciar(overrides = {}) {
  const app = createApp({ nodeEnv: 'test', redisUrl: '', ...overrides });
  const server = await new Promise((ok) => { const s = app.listen(0, () => ok(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const pedir = (ruta, opciones = {}) => fetch(base + ruta, {
    ...opciones,
    headers: { 'content-type': 'application/json', ...(opciones.headers || {}) },
    body: opciones.body && typeof opciones.body !== 'string' ? JSON.stringify(opciones.body) : opciones.body,
  });
  return { pedir, cerrar: () => new Promise((ok) => server.close(ok)) };
}

//  02: evidencia/pruebas de aceptación de salud, Helmet, errores uniformes, validación y límite de intentos
test('GET /api/health responde 200 con el estado del servicio', async () => {
  const { pedir, cerrar } = await iniciar();
  const res = await pedir('/api/health');
  const json = await res.json();
  assert.equal(res.status, 200);
  assert.equal(json.estado, 'ok');
  assert.equal(json.servicio, 'biblioteca-api');
  assert.equal(json.redis, 'no configurado'); // en pruebas no se usa Redis
  assert.ok(res.headers.get('x-request-id'));
  await cerrar();
});

test('Helmet agrega cabeceras de seguridad y oculta X-Powered-By', async () => {
  const { pedir, cerrar } = await iniciar();
  const res = await pedir('/api/health');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(res.headers.get('content-security-policy').includes("default-src 'self'"));
  assert.equal(res.headers.get('x-powered-by'), null);
  await cerrar();
});

test('Una ruta inexistente responde 404 con el formato uniforme de error', async () => {
  const { pedir, cerrar } = await iniciar();
  const res = await pedir('/api/no-existe');
  const json = await res.json();
  assert.equal(res.status, 404);
  assert.equal(json.error.code, 'RUTA_NO_ENCONTRADA');
  assert.equal(json.error.requestId, res.headers.get('x-request-id'));
  await cerrar();
});

test('Un JSON mal formado responde 400 JSON_INVALIDO', async () => {
  const { pedir, cerrar } = await iniciar();
  const res = await pedir('/api/auth/login', { method: 'POST', body: '{"email": ' });
  const json = await res.json();
  assert.equal(res.status, 400);
  assert.equal(json.error.code, 'JSON_INVALIDO');
  await cerrar();
});

test('La validación rechaza datos incorrectos y lista los campos', async () => {
  const { pedir, cerrar } = await iniciar();
  const res = await pedir('/api/auth/registro', {
    method: 'POST', body: { nombre: 'A', email: 'correo-sin-arroba', password: '123' },
  });
  const json = await res.json();
  assert.equal(res.status, 400);
  assert.equal(json.error.code, 'VALIDACION');
  const campos = json.error.details.map((d) => d.campo).sort();
  assert.deepEqual(campos, ['body.email', 'body.nombre', 'body.password']);
  await cerrar();
});

test('La validación rechaza campos que no están en el contrato', async () => {
  const { pedir, cerrar } = await iniciar();
  const res = await pedir('/api/auth/login', {
    method: 'POST', body: { email: 'ana@correo.com', password: 'secreta1', rol: 'admin' },
  });
  assert.equal(res.status, 400);
  await cerrar();
});

test('Datos válidos llegan al endpoint (501 mientras no esté implementado)', async () => {
  const { pedir, cerrar } = await iniciar();
  const res = await pedir('/api/auth/login', {
    method: 'POST', body: { email: 'Ana@Correo.com', password: 'secreta1' },
  });
  const json = await res.json();
  assert.equal(res.status, 501);
  assert.equal(json.error.code, 'NO_IMPLEMENTADO');
  await cerrar();
});

test('Los parámetros de ruta se validan', async () => {
  const { pedir, cerrar } = await iniciar();
  const mala = await pedir('/api/areas/ABC_%21');
  assert.equal(mala.status, 400);
  assert.equal((await mala.json()).error.details[0].campo, 'params.id');
  const buena = await pedir('/api/areas/sala-de-lectura');
  assert.equal(buena.status, 501);
  await cerrar();
});

test('El límite de intentos de acceso responde 429 y no bloquea la ruta de salud', async () => {
  const { pedir, cerrar } = await iniciar({ rateAuthMax: 3 });
  const intento = () => pedir('/api/auth/login', { method: 'POST', body: { email: 'mala', password: 'x' } });
  for (let i = 0; i < 3; i += 1) assert.equal((await intento()).status, 400);
  const bloqueado = await intento();
  const json = await bloqueado.json();
  assert.equal(bloqueado.status, 429);
  assert.equal(json.error.code, 'DEMASIADOS_INTENTOS');
  assert.ok(bloqueado.headers.get('retry-after'));
  assert.equal((await pedir('/api/health')).status, 200);
  await cerrar();
});

test('El límite global de la API responde 429 al excederse', async () => {
  const { pedir, cerrar } = await iniciar({ rateGlobalMax: 5 });
  for (let i = 0; i < 5; i += 1) assert.equal((await pedir('/api/areas')).status, 501);
  const res = await pedir('/api/areas');
  assert.equal(res.status, 429);
  assert.equal((await res.json()).error.code, 'DEMASIADOS_INTENTOS');
  await cerrar();
});

test('El frontend se sirve desde / con sus módulos ES y la misma política de seguridad', async () => {
  const { pedir, cerrar } = await iniciar();
  const pagina = await pedir('/');
  const htmlTexto = await pagina.text();
  assert.equal(pagina.status, 200);
  assert.match(pagina.headers.get('content-type'), /text\/html/);
  assert.match(htmlTexto, /<script type="module" src="js\/main.js"><\/script>/);
  assert.ok(pagina.headers.get('content-security-policy').includes("script-src 'self'"));

  const modulo = await pedir('/js/main.js');
  assert.equal(modulo.status, 200);
  assert.match(modulo.headers.get('content-type'), /javascript/);

  for (const pagina of ['areas', 'area', 'acceso', 'preferencias', 'cuenta', 'registro']) {
    const res = await pedir(`/${pagina}.html`);
    assert.equal(res.status, 200, `${pagina}.html`);
    assert.match(await res.text(), new RegExp(`data-vista="${pagina}"`));
  }
  await cerrar();
});
