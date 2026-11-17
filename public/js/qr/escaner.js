// Lector de códigos QR con la cámara del dispositivo.
//
// - Usa la API nativa BarcodeDetector cuando el navegador la tiene y sabe leer QR (Chrome en
//   Android, macOS y ChromeOS). Es rápida y no descarga nada.
// - Si no, usa jsQR (public/vendor/jsqr.bundle.js), que se descarga solo en ese momento:
//   Safari en iPhone, Firefox y Chrome de escritorio en Windows/Linux.
// - En celular pide la cámara trasera; si no existe, usa la que haya.
// - Al leer un código, o al detenerlo, apaga la cámara por completo (el indicador se apaga).

const INTERVALO_MS = 120;   // cada cuánto se revisa un cuadro del video
const LADO_MAX = 800;       // jsQR trabaja sobre una copia reducida del cuadro: más rápido

/** Error de cámara con un código estable y un mensaje listo para mostrar. */
export class ErrorCamara extends Error {
  constructor(codigo, mensaje, causa) {
    super(mensaje);
    this.name = 'ErrorCamara';
    this.codigo = codigo;
    this.causa = causa;
  }
}

const A_MANO = 'Mientras tanto, puedes escribir el código a mano.';
const MENSAJES = {
  SIN_HTTPS: `La cámara solo funciona si la página se abre con HTTPS (o en localhost). ${A_MANO}`,
  NO_SOPORTADO: `Este navegador no permite usar la cámara. Actualízalo o prueba con Chrome o Safari. ${A_MANO}`,
  PERMISO_NEGADO: 'No se dio permiso para usar la cámara. Para activarlo, toca el candado o el icono de '
    + `la cámara junto a la dirección de la página, permite la cámara y vuelve a intentarlo. ${A_MANO}`,
  SIN_CAMARA: `No encontramos una cámara en este dispositivo. ${A_MANO}`,
  CAMARA_OCUPADA: 'La cámara está ocupada por otra aplicación o no respondió. Ciérrala y vuelve a '
    + `intentarlo. ${A_MANO}`,
  SIN_LECTOR: `No se pudo cargar el lector de códigos QR. Revisa tu conexión y vuelve a intentarlo. ${A_MANO}`,
  DESCONOCIDO: `No se pudo abrir la cámara. ${A_MANO}`,
};

const error = (codigo, causa) => new ErrorCamara(codigo, MENSAJES[codigo], causa);

/** Traduce los errores de getUserMedia a uno de los casos de arriba. */
function traducirError(e) {
  switch (e?.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return error('PERMISO_NEGADO', e);
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return error('SIN_CAMARA', e);
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return error('CAMARA_OCUPADA', e);
    case 'TypeError':
      return error('NO_SOPORTADO', e);
    default:
      return error('DESCONOCIDO', e);
  }
}

/**
 * Revisa antes de pedir la cámara si se puede usar en esta página.
 * Devuelve null si todo está bien, o un ErrorCamara que explica qué falta.
 */
export function problemaDeSoporte() {
  // Sin HTTPS el navegador ni siquiera expone navigator.mediaDevices: se revisa primero para
  // dar el mensaje correcto en lugar de "no soportado".
  if (!window.isSecureContext) return error('SIN_HTTPS');
  if (!navigator.mediaDevices?.getUserMedia) return error('NO_SOPORTADO');
  return null;
}

async function abrirCamara() {
  const ideal = {
    audio: false,
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
  };
  try {
    return await navigator.mediaDevices.getUserMedia(ideal);
  } catch (e) {
    // Algunas cámaras de computadora rechazan la resolución pedida: se reintenta con cualquiera.
    if (e?.name === 'OverconstrainedError') {
      try {
        return await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      } catch (e2) {
        throw traducirError(e2);
      }
    }
    throw traducirError(e);
  }
}

/** Devuelve una función que busca un QR en el cuadro actual del video y regresa su texto o null. */
async function crearLector(video) {
  if ('BarcodeDetector' in window) {
    try {
      const formatos = await window.BarcodeDetector.getSupportedFormats();
      if (formatos.includes('qr_code')) {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        return async () => {
          const [codigo] = await detector.detect(video);
          return codigo?.rawValue ?? null;
        };
      }
    } catch { /* el detector nativo falló: se usa jsQR */ }
  }

  let jsQR;
  try {
    ({ default: jsQR } = await import('../../vendor/jsqr.bundle.js'));
  } catch (e) {
    throw error('SIN_LECTOR', e);
  }
  const lienzo = document.createElement('canvas');
  const ctx = lienzo.getContext('2d', { willReadFrequently: true });
  return async () => {
    const escala = Math.min(1, LADO_MAX / Math.max(video.videoWidth, video.videoHeight));
    const ancho = Math.round(video.videoWidth * escala);
    const alto = Math.round(video.videoHeight * escala);
    if (!ancho || !alto) return null;
    lienzo.width = ancho;
    lienzo.height = alto;
    ctx.drawImage(video, 0, 0, ancho, alto);
    const { data } = ctx.getImageData(0, 0, ancho, alto);
    return jsQR(data, ancho, alto, { inversionAttempts: 'dontInvert' })?.data ?? null;
  };
}

/**
 * Crea un escáner sobre un <video>.
 * @param {HTMLVideoElement} video
 * @param {{ alLeer: (texto: string) => void }} opciones  alLeer se llama una vez, con la cámara ya apagada
 */
export function crearEscanerQr(video, { alLeer }) {
  let stream = null;
  let temporizador = null;
  let sesion = 0; // cambia al detener: invalida lo que venga de un intento anterior

  function detener() {
    sesion += 1;
    clearTimeout(temporizador);
    temporizador = null;
    stream?.getTracks().forEach((pista) => pista.stop());
    stream = null;
    video.pause();
    video.srcObject = null;
  }

  async function iniciar() {
    detener();
    const actual = sesion;
    const problema = problemaDeSoporte();
    if (problema) throw problema;

    const nuevo = await abrirCamara();
    if (actual !== sesion) { // se canceló mientras se pedía el permiso
      nuevo.getTracks().forEach((pista) => pista.stop());
      return;
    }
    stream = nuevo;
    // iPhone: sin playsinline el video se abre a pantalla completa; sin muted no arranca solo.
    video.setAttribute('playsinline', '');
    video.muted = true;
    video.srcObject = stream;
    try {
      await video.play();
    } catch { /* algunos navegadores rechazan play() aunque el video sí se muestra */ }

    let leer;
    try {
      leer = await crearLector(video);
    } catch (e) {
      detener();
      throw e;
    }
    if (actual !== sesion) return;

    const revisar = async () => {
      if (actual !== sesion) return;
      let texto = null;
      if (video.readyState >= 2) {
        try { texto = await leer(); } catch { /* cuadro sin datos todavía: se intenta en el siguiente */ }
      }
      if (actual !== sesion) return;
      if (texto) {
        detener();
        alLeer(texto);
        return;
      }
      temporizador = setTimeout(revisar, INTERVALO_MS);
    };
    revisar();
  }

  return {
    iniciar,
    detener,
    get activo() { return stream !== null; },
  };
}
