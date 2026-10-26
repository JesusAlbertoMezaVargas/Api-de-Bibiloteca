'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

/**
 * Almacén de usuarios. Con cfg.usersFile = null trabaja solo en memoria (pruebas).
 * Por defecto guarda en data/usuarios.json.
 */
function createUserStore(cfg) {
  const archivo = cfg.usersFile === undefined
    ? path.join(__dirname, '..', '..', 'data', 'usuarios.json')
    : cfg.usersFile;
  const porId = new Map();
  const porEmail = new Map();

  if (archivo && fs.existsSync(archivo)) {
    let lista;
    try {
      lista = JSON.parse(fs.readFileSync(archivo, 'utf8'));
    } catch (e) {
      throw new Error(`No se pudo leer ${archivo}: ${e.message}`);
    }
    for (const u of lista) { porId.set(u.id, u); porEmail.set(u.email, u); }
  }

  function guardar() {
    if (!archivo) return;
    fs.mkdirSync(path.dirname(archivo), { recursive: true });
    const temporal = `${archivo}.tmp`;
    fs.writeFileSync(temporal, JSON.stringify([...porId.values()], null, 2));
    fs.renameSync(temporal, archivo);
  }

  return {
    buscarPorEmail: (email) => porEmail.get(email) || null,
    buscarPorId: (id) => porId.get(id) || null,
    /** Devuelve null si el correo ya existe. */
    crear({ nombre, email, passwordHash }) {
      if (porEmail.has(email)) return null;
      const usuario = { id: crypto.randomUUID(), nombre, email, passwordHash, creadoEn: new Date().toISOString() };
      porId.set(usuario.id, usuario);
      porEmail.set(email, usuario);
      guardar();
      return usuario;
    },
  };
}

module.exports = { createUserStore };