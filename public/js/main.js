// Punto de entrada: aplica preferencias, recupera la sesión y arranca el enrutador.
import { crearRouter } from './router.js';
import { api } from './api.js';
import { cargarPreferencias, establecerUsuario } from './estado.js';

import inicio from './vistas/inicio.js';
import areas from './vistas/areas.js';
import area from './vistas/area.js';
import acceso from './vistas/acceso.js';
import preferencias from './vistas/preferencias.js';
import cuenta from './vistas/cuenta.js';
import registro from './vistas/registro.js';
import noEncontrada from './vistas/noEncontrada.js';

// Primero las preferencias, para que la página no "parpadee" con el tamaño o contraste equivocados.
cargarPreferencias();

const router = crearRouter([
  { patron: '/', vista: inicio },
  { patron: '/areas', vista: areas },
  { patron: '/areas/:id', vista: area },
  { patron: '/acceso', vista: acceso },
  { patron: '/preferencias', vista: preferencias },
  { patron: '/cuenta', vista: cuenta },
  { patron: '/registro', vista: registro },
], {
  contenedor: document.getElementById('contenido'),
  noEncontrada,
});

// Si ya hay sesión (cookie), se recupera el usuario; si no, se sigue como invitado.
api.yo()
  .then((datos) => establecerUsuario(datos?.usuario ?? datos))
  .catch(() => establecerUsuario(null))
  .finally(() => router.iniciar());
