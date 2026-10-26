'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

async function iniciar() {
  const app = createApp({
    usersFile: null, // usuarios solo en memoria
    bcryptRounds: 4, // rápido en pruebas
    redisUrl: '',
    rateAuthMax: 1000,
    rateGlobalMax: 10000,
  });
  const server = await new Promise((ok) => { const s = app.listen(0, () => ok(s)); });
  const base = `http://127.0.0.1:${server.address().port}/api`;

  const pedir = async (ruta, { metodo = 'GET', cuerpo, cookie } = {}) => {
    const res = await fetch(base + ruta, {
      method: metodo,
      headers: { ...(cuerpo ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    const texto = await res.text();
    return {
      status: res.status,
      datos: texto ? JSON.parse(texto) : null,
      cookie: res.headers.getSetCookie()[0]?.split(';')[0],
    };
  };
  return { pedir, cerrar: () => new Promise((ok) => server.close(ok)) };
}

const VALIDO = { nombre: 'Ana Pérez', email: 'ana@correo.com', password: 'Lectura2026x' };
const campos = (r) => (r.datos.error.details || []).map((d) => d.campo);

test('registro, sesión, logout', async (t) => {
  const { pedir, cerrar } = await iniciar();
  t.after(cerrar);

  const reg = await pedir('/auth/registro', { metodo: 'POST', cuerpo: VALIDO });
  assert.equal(reg.status, 201);
  assert.equal(reg.datos.usuario.email, 'ana@correo.com');
  assert.equal(reg.datos.usuario.passwordHash, undefined);
  assert.ok(reg.cookie?.startsWith('sesion='));

  const yo = await pedir('/auth/yo', { cookie: reg.cookie });
  assert.equal(yo.status, 200);
  assert.equal(yo.datos.usuario.nombre, 'Ana Pérez');

  assert.equal((await pedir('/auth/logout', { metodo: 'POST', cookie: reg.cookie })).status, 204);
  assert.equal((await pedir('/auth/yo', { cookie: reg.cookie })).status, 401);
});

test('yo sin sesión responde 401', async (t) => {
  const { pedir, cerrar } = await iniciar();
  t.after(cerrar);
  assert.equal((await pedir('/auth/yo')).status, 401);
});

test('contraseñas débiles se rechazan con 400 en el campo password', async (t) => {
  const { pedir, cerrar } = await iniciar();
  t.after(cerrar);
  for (const password of ['abc123', 'abcdefgh', '12345678', 'password1', 'Ana2026!ana', ' Lectura2026x']) {
    const r = await pedir('/auth/registro', { metodo: 'POST', cuerpo: { ...VALIDO, password } });
    assert.equal(r.status, 400, `debía rechazar "${password}"`);
    assert.ok(campos(r).some((c) => c.endsWith('password')));
  }
});

test('rechaza campos extra y nombres con símbolos', async (t) => {
  const { pedir, cerrar } = await iniciar();
  t.after(cerrar);
  assert.equal((await pedir('/auth/registro', { metodo: 'POST', cuerpo: { ...VALIDO, rol: 'admin' } })).status, 400);
  assert.equal((await pedir('/auth/registro', { metodo: 'POST', cuerpo: { ...VALIDO, nombre: 'Ana<script>' } })).status, 400);
});

test('correo repetido (aunque cambien mayúsculas) responde 409', async (t) => {
  const { pedir, cerrar } = await iniciar();
  t.after(cerrar);
  await pedir('/auth/registro', { metodo: 'POST', cuerpo: VALIDO });
  const r = await pedir('/auth/registro', { metodo: 'POST', cuerpo: { ...VALIDO, email: 'ANA@Correo.com' } });
  assert.equal(r.status, 409);
  assert.ok(campos(r).includes('body.email'));
});

test('login: correcto, y mismo error si falla la contraseña o el correo', async (t) => {
  const { pedir, cerrar } = await iniciar();
  t.after(cerrar);
  await pedir('/auth/registro', { metodo: 'POST', cuerpo: VALIDO });

  const ok = await pedir('/auth/login', { metodo: 'POST', cuerpo: { email: 'Ana@correo.com', password: VALIDO.password } });
  assert.equal(ok.status, 200);
  assert.ok(ok.cookie);

  const malaClave = await pedir('/auth/login', { metodo: 'POST', cuerpo: { email: VALIDO.email, password: 'otra-clave-1' } });
  const malCorreo = await pedir('/auth/login', { metodo: 'POST', cuerpo: { email: 'nadie@correo.com', password: 'otra-clave-1' } });
  assert.equal(malaClave.status, 401);
  assert.equal(malCorreo.status, 401);
  assert.equal(malaClave.datos.error.message, malCorreo.datos.error.message);
});