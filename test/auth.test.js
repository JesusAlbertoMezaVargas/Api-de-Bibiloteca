'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const RedisMock = require('ioredis-mock');
const { createApp } = require('../src/app');

/**
 * Levanta la API con un Redis simulado y limpio. Con TEST_REDIS_URL se prueba contra un Redis real
 * (por ejemplo: TEST_REDIS_URL=redis://127.0.0.1:6379/15 npm test); esa base se vacía en cada prueba.
 */
async function iniciar(overrides = {}) {
  let redis;
  if (process.env.TEST_REDIS_URL) {
    const Redis = require('ioredis');
    redis = new Redis(process.env.TEST_REDIS_URL);
    await redis.flushdb();
  } else {
    redis = new RedisMock();
    await redis.flushall();
  }
  const app = createApp({ nodeEnv: 'test', redisUrl: '', ...overrides }, { redis });
  const server = await new Promise((ok) => { const s = app.listen(0, () => ok(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const pedir = (ruta, { method = 'GET', body, cookie } = {}) => fetch(base + ruta, {
    method,
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const cerrar = async () => {
    await new Promise((ok) => server.close(ok));
    redis.disconnect();
  };
  return { pedir, cerrar, redis };
}

const ANA = { nombre: 'Ana López', email: 'Ana@Correo.com', password: 'Segura#123' };
const cookieDe = (res) => (res.headers.get('set-cookie') || '').split(';')[0];

test('Registro exitoso: 201, usuario sin hash y cookie de sesión HttpOnly', async () => {
  const { pedir, cerrar } = await iniciar();
  const res = await pedir('/api/auth/registro', { method: 'POST', body: ANA });
  const json = await res.json();
  assert.equal(res.status, 201);
  assert.deepEqual(Object.keys(json.usuario).sort(), ['email', 'id', 'nombre']);
  assert.equal(json.usuario.email, 'ana@correo.com'); // el correo se guarda en minúsculas
  const cookie = res.headers.get('set-cookie');
  assert.match(cookie, /^app\.sid=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Max-Age=1800/);
  await cerrar();
});

test('Un correo ya registrado responde 409 CUENTA_EXISTENTE', async () => {
  const { pedir, cerrar } = await iniciar();
  await pedir('/api/auth/registro', { method: 'POST', body: ANA });
  const res = await pedir('/api/auth/registro', { method: 'POST', body: { ...ANA, email: 'ana@correo.com' } });
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error.code, 'CUENTA_EXISTENTE');
  await cerrar();
});

test('El registro valida los datos y responde 400 con el detalle de cada campo', async () => {
  const { pedir, cerrar } = await iniciar();
  const casos = [
    ['corta', 'Usa al menos 8 caracteres.'],
    ['Muy#Larga12345678', 'Usa máximo 15 caracteres.'],
    ['sinmayuscula#1', 'Incluye mayúscula, minúscula, número y un carácter especial (*, # o @).'],
    ['SinEspecial123', 'Incluye mayúscula, minúscula, número y un carácter especial (*, # o @).'],
  ];
  for (const [password, mensaje] of casos) {
    const res = await pedir('/api/auth/registro', { method: 'POST', body: { ...ANA, password } });
    const json = await res.json();
    assert.equal(res.status, 400, password);
    assert.equal(json.error.code, 'VALIDACION');
    assert.deepEqual(json.error.details, [{ campo: 'body.password', mensaje }]);
  }
  const extra = await pedir('/api/auth/registro', { method: 'POST', body: { ...ANA, rol: 'admin' } });
  assert.equal(extra.status, 400);
  await cerrar();
});

test('Login correcto inicia sesión; uno incorrecto responde 401 con mensaje genérico', async () => {
  const { pedir, cerrar } = await iniciar();
  await pedir('/api/auth/registro', { method: 'POST', body: ANA });

  const bien = await pedir('/api/auth/login', { method: 'POST', body: { email: 'ANA@correo.com', password: ANA.password } });
  assert.equal(bien.status, 200);
  assert.equal((await bien.json()).usuario.nombre, 'Ana López');
  assert.match(bien.headers.get('set-cookie'), /HttpOnly/);

  const claveMala = await pedir('/api/auth/login', { method: 'POST', body: { email: ANA.email, password: 'Otra#1234' } });
  const sinCuenta = await pedir('/api/auth/login', { method: 'POST', body: { email: 'nadie@correo.com', password: ANA.password } });
  const [a, b] = [await claveMala.json(), await sinCuenta.json()];
  assert.equal(claveMala.status, 401);
  assert.equal(sinCuenta.status, 401);
  // Mismo código y mensaje: no se revela si el correo tiene cuenta
  assert.equal(a.error.code, 'CREDENCIALES_INVALIDAS');
  assert.equal(a.error.message, b.error.message);
  await cerrar();
});

test('/auth/yo sin cookie responde 401 SESION_REQUERIDA y con cookie válida devuelve el usuario', async () => {
  const { pedir, cerrar } = await iniciar();
  const sin = await pedir('/api/auth/yo');
  assert.equal(sin.status, 401);
  assert.equal((await sin.json()).error.code, 'SESION_REQUERIDA');

  const registro = await pedir('/api/auth/registro', { method: 'POST', body: ANA });
  const con = await pedir('/api/auth/yo', { cookie: cookieDe(registro) });
  assert.equal(con.status, 200);
  assert.equal((await con.json()).usuario.email, 'ana@correo.com');

  const inventada = await pedir('/api/auth/yo', { cookie: 'app.sid=token-que-no-existe' });
  assert.equal(inventada.status, 401);
  assert.equal((await inventada.json()).error.code, 'SESION_EXPIRADA');
  await cerrar();
});

test('Logout responde 204 y después /auth/yo ya no reconoce la sesión', async () => {
  const { pedir, cerrar } = await iniciar();
  const registro = await pedir('/api/auth/registro', { method: 'POST', body: ANA });
  const cookie = cookieDe(registro);
  const salir = await pedir('/api/auth/logout', { method: 'POST', cookie });
  assert.equal(salir.status, 204);
  assert.match(salir.headers.get('set-cookie'), /app\.sid=;/);
  const despues = await pedir('/api/auth/yo', { cookie });
  assert.equal(despues.status, 401);
  await cerrar();
});

test('Redis guarda el hash scrypt y la sesión sin el token ni el correo en claro', async () => {
  const { pedir, cerrar, redis } = await iniciar();
  const registro = await pedir('/api/auth/registro', { method: 'POST', body: ANA });
  const { usuario } = await registro.json();
  const token = cookieDe(registro).slice('app.sid='.length);

  const guardado = await redis.hgetall(`app:v1:usuario:${usuario.id}`);
  assert.match(guardado.password_hash, /^scrypt\$32768\$8\$1\$/);
  assert.notEqual(guardado.password_hash, ANA.password);

  const claves = await redis.keys('app:v1:*');
  const sesiones = claves.filter((k) => k.startsWith('app:v1:sesion:'));
  assert.equal(sesiones.length, 1);
  assert.ok(claves.every((k) => !k.includes(token) && !k.includes('ana@correo.com')));
  const vigencia = await redis.ttl(sesiones[0]);
  assert.ok(vigencia > 0 && vigencia <= 1800);
  await cerrar();
});

test('Los ajustes de lectura se leen y se guardan en la cuenta', async () => {
  const { pedir, cerrar, redis } = await iniciar();
  const sinSesion = await pedir('/api/preferencias');
  assert.equal(sinSesion.status, 401);
  assert.equal((await sinSesion.json()).error.code, 'SESION_REQUERIDA');

  const registro = await pedir('/api/auth/registro', { method: 'POST', body: ANA });
  const cookie = cookieDe(registro);
  const { usuario } = await registro.json();

  const iniciales = await pedir('/api/preferencias', { cookie });
  assert.equal(iniciales.status, 200);
  assert.deepEqual((await iniciales.json()).preferencias,
    { tamanoLetra: 'normal', tema: 'claro', audioAutomatico: false, velocidadVoz: 1 });

  const nuevas = { tamanoLetra: 'muy_grande', tema: 'oscuro', audioAutomatico: true, velocidadVoz: 1.25 };
  const guardar = await pedir('/api/preferencias', { method: 'PUT', body: nuevas, cookie });
  assert.equal(guardar.status, 200);
  assert.deepEqual((await guardar.json()).preferencias, nuevas);

  // Otra sesión de la misma cuenta (otro teléfono) recibe los mismos ajustes
  const login = await pedir('/api/auth/login', { method: 'POST', body: { email: ANA.email, password: ANA.password } });
  const enOtroTelefono = await pedir('/api/preferencias', { cookie: cookieDe(login) });
  assert.deepEqual((await enOtroTelefono.json()).preferencias, nuevas);
  assert.equal(await redis.hget(`app:v1:preferencias:${usuario.id}`, 'tema'), 'oscuro');

  const invalidas = await pedir('/api/preferencias', { method: 'PUT', body: { ...nuevas, tema: 'rosa' }, cookie });
  assert.equal(invalidas.status, 400);
  assert.equal((await invalidas.json()).error.details[0].campo, 'body.tema');
  await cerrar();
});

test('Sin almacén disponible las rutas de cuenta responden 503 ALMACEN_NO_DISPONIBLE', async () => {
  const app = createApp({ nodeEnv: 'test', redisUrl: '' }, { redis: null });
  const server = await new Promise((ok) => { const s = app.listen(0, () => ok(s)); });
  const res = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: ANA.email, password: ANA.password }),
  });
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error.code, 'ALMACEN_NO_DISPONIBLE');
  await new Promise((ok) => server.close(ok));
});
