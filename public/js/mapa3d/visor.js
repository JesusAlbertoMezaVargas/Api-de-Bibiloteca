// Visor de la maqueta 3D: render, cámara y marcadores. Tiene tres modos, como un recorrido
// virtual: maqueta (casa de muñecas), planta (vista cenital) y recorrer (a la altura de los ojos).
// Solo dibuja cuando algo cambia, para no gastar la batería del teléfono.
import * as THREE from '../../vendor/three.bundle.js';
import { EffectComposer, GTAOPass, OrbitControls, OutputPass, RenderPass } from '../../vendor/three.bundle.js';
import { construirMaqueta } from './construir.js';
import { ALTO_TAPANCO, ANCHO, FONDO, PUNTOS, ZONAS_EXTRA, p } from './distribucion.js';
import { jardin } from './texturas.js';

const OJOS = 1.6;
const ENFOQUE = new THREE.Vector3(0, 0.6, 0.4);

const movimientoReducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const suavizar = (t) => t * t * (3 - 2 * t);

/** Ambiente para reflejos: cielo claro con franja verde, como lo que entra por los cristales. */
function crearAmbiente(renderer) {
  const escena = new THREE.Scene();
  const domo = new THREE.Mesh(
    new THREE.SphereGeometry(50, 24, 12),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: 'varying vec3 d; void main(){ d = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec3 d;
        void main(){
          vec3 cielo = mix(vec3(1.5, 1.55, 1.6), vec3(0.75, 1.05, 1.5), smoothstep(0.1, 0.8, d.y));
          vec3 jardin = vec3(0.34, 0.5, 0.28);
          vec3 suelo = vec3(0.5, 0.49, 0.47);
          vec3 c = mix(jardin, cielo, smoothstep(0.0, 0.22, d.y));
          c = mix(suelo, c, smoothstep(-0.12, 0.0, d.y));
          gl_FragColor = vec4(c, 1.0);
        }`,
    }),
  );
  escena.add(domo);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const mapa = pmrem.fromScene(escena, 0.03).texture;
  pmrem.dispose();
  return mapa;
}

function crearLuces(escena, tamSombra) {
  escena.add(new THREE.HemisphereLight('#fbfaf5', '#a8a196', 0.5));

  const sol = new THREE.DirectionalLight('#ffe9c9', 3.6);
  sol.position.set(34, 19, 26);
  sol.castShadow = true;
  sol.shadow.mapSize.set(tamSombra, tamSombra);
  sol.shadow.bias = -0.0004;
  sol.shadow.normalBias = 0.02;
  sol.shadow.radius = 3;
  const cam = sol.shadow.camera;
  cam.left = -36; cam.right = 36; cam.top = 30; cam.bottom = -30;
  cam.near = 5; cam.far = 95;
  escena.add(sol);

  // Luz cenital suave: hace las veces de las lámparas y marca el volumen de los muebles.
  const cenital = new THREE.DirectionalLight('#ffffff', 0.32);
  cenital.position.set(-6, 30, 8);
  escena.add(cenital);
}

/**
 * Reflejo del piso pulido: copia invertida de la maqueta, recortada con el stencil a la huella
 * del piso. Orden de dibujo: base del piso (marca el stencil) → reflejo → piso semitransparente.
 */
function crearReflejo(escena, maqueta) {
  const fuerza = 0.15;
  const copiaMaterial = new Map();
  const copiar = (material) => {
    if (material.transparent) return null;
    if (!copiaMaterial.has(material)) {
      const c = material.clone();
      c.stencilWrite = true;
      c.stencilRef = 1;
      c.stencilFunc = THREE.EqualStencilFunc;
      copiaMaterial.set(material, c);
    }
    return copiaMaterial.get(material);
  };

  const invertido = new THREE.Group();
  invertido.scale.y = -1;
  invertido.userData.sinOclusion = true;
  escena.add(invertido);
  const pares = [maqueta.baja, maqueta.alta, maqueta.techo, ...Object.values(maqueta.lados)].map((original) => {
    const copia = new THREE.Group();
    original.traverse((o) => {
      if (!o.isMesh) return;
      const materiales = Array.isArray(o.material) ? o.material.map(copiar) : copiar(o.material);
      if (!materiales || (Array.isArray(materiales) && materiales.includes(null))) return;
      const espejo = new THREE.Mesh(o.geometry, materiales);
      espejo.position.copy(o.position);
      espejo.quaternion.copy(o.quaternion);
      espejo.renderOrder = -2;
      copia.add(espejo);
    });
    invertido.add(copia);
    return [original, copia];
  });

  for (const piso of maqueta.pisos) {
    const base = new THREE.Mesh(piso.geometry, piso.material.clone());
    Object.assign(base.material, {
      depthWrite: false, stencilWrite: true, stencilRef: 1, stencilZPass: THREE.ReplaceStencilOp,
    });
    base.renderOrder = -3;
    base.receiveShadow = true;
    base.userData.sinOclusion = true;
    escena.add(base);
    piso.material.transparent = true;
    piso.material.opacity = 1 - fuerza;
  }
  return () => pares.forEach(([original, copia]) => { copia.visible = original.visible; });
}

function crearJardin(escena) {
  const grupo = new THREE.Group();
  const fondo = new THREE.Mesh(
    new THREE.CylinderGeometry(64, 64, 30, 48, 1, true),
    new THREE.MeshBasicMaterial({ map: jardin(), side: THREE.BackSide, toneMapped: false }),
  );
  fondo.position.y = 13;
  const pasto = new THREE.Mesh(new THREE.CircleGeometry(64, 48), new THREE.MeshBasicMaterial({ color: '#6f9e50' }));
  pasto.rotation.x = -Math.PI / 2;
  pasto.position.y = -0.55;
  grupo.add(fondo, pasto);
  grupo.traverse((o) => { o.userData.sinOclusion = true; });
  grupo.visible = false;
  escena.add(grupo);
  return grupo;
}

/** Mayor calidad solo donde sobra GPU: en teléfonos se apaga la oclusión en tiempo real. */
function perfilDeCalidad() {
  const movil = matchMedia('(pointer: coarse)').matches;
  return {
    oclusion: !movil,
    reflejo: !movil,
    tamSombra: movil ? 2048 : 4096,
    pixeles: Math.min(window.devicePixelRatio || 1, movil ? 1.5 : 2),
  };
}

/**
 * Monta la maqueta en `contenedor`.
 * opciones: servicios (id → datos) y avisos alSeleccionar, alCambiarModo y alCambiarAlta.
 */
export function crearVisor(contenedor, capaMarcadores, { servicios, alSeleccionar, alCambiarModo, alCambiarAlta }) {
  const calidad = perfilDeCalidad();
  const renderer = new THREE.WebGLRenderer({ antialias: true, stencil: calidad.reflejo, powerPreference: 'high-performance' });
  renderer.setPixelRatio(calidad.pixeles);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false; // el edificio no se mueve: la sombra se hornea una vez
  renderer.domElement.setAttribute('aria-hidden', 'true');
  contenedor.prepend(renderer.domElement);

  const escena = new THREE.Scene();
  escena.background = new THREE.Color('#14171b');
  escena.environment = crearAmbiente(renderer);
  escena.environmentIntensity = 0.42;
  crearLuces(escena, calidad.tamSombra);
  const maqueta = construirMaqueta(escena);
  maqueta.techo.visible = false;
  const sincronizarReflejo = calidad.reflejo ? crearReflejo(escena, maqueta) : () => {};
  const exterior = crearJardin(escena);

  const camara = new THREE.PerspectiveCamera(32, 1, 0.1, 400);
  const controles = new OrbitControls(camara, renderer.domElement);
  controles.enableDamping = true;
  controles.dampingFactor = 0.09;
  controles.maxPolarAngle = 1.42;
  controles.minDistance = 6;
  controles.maxDistance = 140;
  controles.target.copy(ENFOQUE);

  let compositor = null;
  if (calidad.oclusion) {
    const objetivo = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4, stencilBuffer: true });
    compositor = new EffectComposer(renderer, objetivo);
    compositor.addPass(new RenderPass(escena, camara));
    const ao = new GTAOPass(escena, camara, 1, 1);
    ao.updateGtaoMaterial({ radius: 0.55, distanceExponent: 1.4, thickness: 1.2, scale: 1.25, samples: 16, screenSpaceRadius: false });
    ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
    ao.blendIntensity = 1;
    // Cristal y paisaje no deben contar como superficies para la oclusión.
    const ocultarOriginal = ao._overrideVisibility.bind(ao);
    const ocultos = [];
    ao._overrideVisibility = () => {
      ocultarOriginal();
      escena.traverse((o) => { if (o.userData.sinOclusion && o.visible) { o.visible = false; ocultos.push(o); } });
    };
    const restaurarOriginal = ao._restoreVisibility.bind(ao);
    ao._restoreVisibility = () => {
      restaurarOriginal();
      ocultos.splice(0).forEach((o) => { o.visible = true; });
    };
    compositor.addPass(ao);
    compositor.addPass(new OutputPass());
  }

  // Anillo que señala el lugar elegido
  const anillo = new THREE.Mesh(
    new THREE.RingGeometry(0.62, 0.78, 48),
    new THREE.MeshBasicMaterial({ color: '#19c2c9', transparent: true, opacity: 0.9, depthWrite: false }),
  );
  anillo.rotation.x = -Math.PI / 2;
  anillo.visible = false;
  anillo.userData.sinOclusion = true;
  escena.add(anillo);

  let modo = 'maqueta';
  let altaVisible = true;
  let seleccion = null;
  let vuelo = null;
  let pendiente = false;
  let ancho = 1;
  let alto = 1;
  let sombraLista = false;
  const mirada = { yaw: 0, pitch: 0 };

  function hornearSombras() {
    const techoAntes = maqueta.techo.visible;
    maqueta.techo.visible = true; // el techo debe tapar el sol aunque no se dibuje
    renderer.shadowMap.needsUpdate = true;
    renderer.render(escena, camara);
    maqueta.techo.visible = techoAntes;
    sombraLista = true;
  }

  function pedirCuadro() {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(dibujar);
  }

  // Lados que se quitan para ver adentro: los que dan a la cámara.
  function ajustarLados() {
    const adentro = modo === 'recorrer';
    const d = camara.position;
    const umbral = (lado) => (adentro ? true : lado);
    const dominante = Math.max(Math.abs(d.x) / ANCHO, Math.abs(d.z) / FONDO) || 1;
    maqueta.lados.sur.visible = umbral(!(d.z > FONDO / 2 && d.z / FONDO > dominante * 0.45));
    maqueta.lados.norte.visible = umbral(!(d.z < -FONDO / 2 && -d.z / FONDO > dominante * 0.45));
    maqueta.lados.este.visible = umbral(!(d.x > ANCHO / 2 && d.x / ANCHO > dominante * 0.45));
    maqueta.lados.oeste.visible = umbral(!(d.x < -ANCHO / 2 && -d.x / ANCHO > dominante * 0.45));
  }

  function dibujar(ahora) {
    pendiente = false;
    let sigue = false;
    if (vuelo) sigue = avanzarVuelo(ahora) || sigue;
    if (modo !== 'recorrer' && controles.enabled) {
      // update() regresa true mientras el amortiguamiento sigue moviendo la cámara
      if (controles.update()) sigue = true;
    }
    ajustarLados();
    if (!sombraLista) hornearSombras();
    sincronizarReflejo();
    if (compositor) compositor.render();
    else renderer.render(escena, camara);
    colocarMarcadores();
    if (sigue) pedirCuadro();
  }

  function avanzarVuelo(ahora) {
    vuelo.inicio ??= ahora;
    const t = Math.min(1, (ahora - vuelo.inicio) / vuelo.duracion);
    const k = suavizar(t);
    camara.position.lerpVectors(vuelo.desdePos, vuelo.aPos, k);
    if (vuelo.aMira) {
      controles.target.lerpVectors(vuelo.desdeMira, vuelo.aMira, k);
      camara.lookAt(controles.target);
    } else {
      mirada.yaw = vuelo.desdeYaw + (vuelo.aYaw - vuelo.desdeYaw) * k;
      mirada.pitch = vuelo.desdePitch + (vuelo.aPitch - vuelo.desdePitch) * k;
      aplicarMirada();
    }
    if (t >= 1) {
      const fin = vuelo.alTerminar;
      vuelo = null;
      fin?.();
      return false;
    }
    return true;
  }

  function aplicarMirada() {
    camara.rotation.set(mirada.pitch, mirada.yaw, 0, 'YXZ');
  }

  function volarA(aPos, aMira, duracion = 900, alTerminar) {
    if (movimientoReducido()) duracion = 1;
    vuelo = {
      desdePos: camara.position.clone(), aPos, desdeMira: controles.target.clone(), aMira, duracion, alTerminar,
    };
    pedirCuadro();
  }

  function caminarA(aPos, yaw = mirada.yaw, pitch = mirada.pitch, duracion = 700) {
    if (movimientoReducido()) duracion = 1;
    let destino = yaw;
    // Gira por el camino corto
    while (destino - mirada.yaw > Math.PI) destino -= Math.PI * 2;
    while (destino - mirada.yaw < -Math.PI) destino += Math.PI * 2;
    vuelo = {
      desdePos: camara.position.clone(), aPos, duracion, desdeYaw: mirada.yaw, aYaw: destino, desdePitch: mirada.pitch, aPitch: pitch,
    };
    pedirCuadro();
  }

  // En pantalla vertical la cámara se pone de lado: el largo del edificio llena la altura.
  const vertical = () => ancho / alto < 0.8;

  // Distancia para que toda la planta quepa, sea cual sea la proporción de la pantalla.
  function distanciaGeneral(margen = 1.12) {
    const radioV = Math.tan(THREE.MathUtils.degToRad(camara.fov / 2));
    const [enAncho, enAlto] = vertical() ? [FONDO, ANCHO] : [ANCHO, FONDO];
    const porAncho = (enAncho * margen) / 2 / (radioV * (ancho / alto));
    const porAlto = (enAlto * margen) / 2 / radioV;
    return Math.max(porAncho, porAlto) * 1.05;
  }

  const posicionGeneral = () => {
    const d = distanciaGeneral();
    const lado = vertical()
      ? new THREE.Vector3(d * 0.74, d * 0.72, d * 0.1)
      : new THREE.Vector3(-d * 0.16, d * 0.68, d * 0.76);
    return lado.add(ENFOQUE);
  };
  const desfaseCenital = () => (vertical() ? new THREE.Vector3(0.01, 0, 0) : new THREE.Vector3(0, 0, 0.01));
  const posicionPlanta = () => desfaseCenital().setY(distanciaGeneral(1.06) * 1.02);

  function cambiarModo(nuevo) {
    const antes = modo;
    modo = nuevo;
    alCambiarModo?.(nuevo);
    maqueta.techo.visible = nuevo === 'recorrer';
    exterior.visible = nuevo === 'recorrer';
    escena.environmentIntensity = nuevo === 'recorrer' ? 0.6 : 0.42;
    renderer.domElement.dataset.modo = nuevo;
    capaMarcadores.dataset.modo = nuevo;
    controles.enabled = nuevo !== 'recorrer';
    controles.enableRotate = nuevo === 'maqueta';
    controles.screenSpacePanning = nuevo === 'planta';
    controles.touches.ONE = nuevo === 'planta' ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
    controles.mouseButtons.LEFT = nuevo === 'planta' ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    if (nuevo === 'recorrer') {
      const lugar = seleccion ? puntoDe(seleccion) : null;
      if (lugar) { mirarDesde(lugar); } else {
        const entrada = p(705, 800);
        camara.position.set(entrada.x, OJOS, entrada.z);
        mirada.yaw = 0;
        mirada.pitch = -0.04;
        aplicarMirada();
      }
    } else {
      controles.minPolarAngle = 0;
      controles.maxPolarAngle = nuevo === 'planta' ? 0.001 : 1.42;
      const mira = new THREE.Vector3(0, 0, 0);
      if (antes === 'recorrer') { // salir del recorrido sin cruzar paredes
        camara.position.copy(nuevo === 'planta' ? posicionPlanta() : posicionGeneral());
        controles.target.copy(nuevo === 'planta' ? mira : ENFOQUE);
        camara.lookAt(controles.target);
      } else if (nuevo === 'planta') {
        volarA(posicionPlanta(), mira);
      } else {
        volarA(posicionGeneral(), ENFOQUE.clone());
      }
    }
    pedirCuadro();
  }

  const puntoDe = (id) => PUNTOS.find((q) => q.id === id);

  function mirarDesde(punto) {
    const q = p(punto.px, punto.py);
    const nivel = punto.nivel === 'alta' ? ALTO_TAPANCO : 0;
    // Se para en `desde` si el punto lo trae; si no, a unos metros del lado de la entrada.
    const origen = punto.desde ? p(...punto.desde) : { x: q.x, z: q.z + 3.2 };
    const pie = new THREE.Vector3(origen.x, nivel + OJOS, origen.z);
    pie.x = THREE.MathUtils.clamp(pie.x, -ANCHO / 2 + 1, ANCHO / 2 - 1);
    pie.z = THREE.MathUtils.clamp(pie.z, -FONDO / 2 + 1, FONDO / 2 - 1);
    caminarA(pie, Math.atan2(pie.x - q.x, pie.z - q.z), -0.05, 900);
  }

  function seleccionar(id) {
    seleccion = id;
    for (const m of marcadores) {
      const activo = m.punto.id === id;
      m.boton.classList.toggle('marcador--activo', activo);
      m.boton.setAttribute('aria-pressed', String(activo));
    }
    const punto = id ? puntoDe(id) : null;
    anillo.visible = Boolean(punto);
    if (punto) {
      if (punto.nivel === 'alta' && !altaVisible) ponerAlta(true);
      const q = p(punto.px, punto.py);
      anillo.position.set(q.x, (punto.nivel === 'alta' ? ALTO_TAPANCO : 0) + 0.03, q.z);
      if (modo === 'recorrer') {
        mirarDesde(punto);
      } else {
        const mira = new THREE.Vector3(q.x, punto.y * 0.5, q.z);
        const salto = modo === 'planta'
          ? desfaseCenital().setY(distanciaGeneral() * 0.5)
          : (vertical() ? new THREE.Vector3(18, 19, 3) : new THREE.Vector3(-3, 14, 16));
        volarA(mira.clone().add(salto), mira);
      }
    }
    alSeleccionar?.(id);
    pedirCuadro();
  }

  function ponerAlta(visible) {
    altaVisible = visible;
    maqueta.alta.visible = visible;
    sombraLista = false;
    alCambiarAlta?.(visible);
    pedirCuadro();
  }

  // --- Marcadores ------------------------------------------------------------------------
  const marcadores = [...PUNTOS].sort((a, b) => a.orden - b.orden).map((punto) => {
    const s = servicios(punto.id);
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = `marcador marcador--${s.categoria}`;
    boton.setAttribute('aria-label', `${s.nombre}: ${s.detalle}`);
    boton.setAttribute('aria-pressed', 'false');
    const nombre = document.createElement('span');
    nombre.className = 'marcador__nombre';
    nombre.textContent = s.nombre;
    boton.append(nombre);
    boton.addEventListener('click', () => seleccionar(punto.id));
    capaMarcadores.append(boton);
    const q = p(punto.px, punto.py);
    return { punto, boton, posicion: new THREE.Vector3(q.x, punto.y, q.z) };
  });

  const auxiliar = new THREE.Vector3();
  const SEPARACION = 40;

  function colocarMarcadores() {
    const puestos = [];
    // El elegido siempre se queda; los demás, por orden, si no se enciman.
    const enOrden = [...marcadores].sort((a, b) => (b.punto.id === seleccion) - (a.punto.id === seleccion));
    for (const m of enOrden) {
      const oculto = (m.punto.nivel === 'alta' && !altaVisible) ? true : !marcadorCabe(m, puestos);
      m.boton.hidden = oculto;
    }
  }

  function marcadorCabe(m, puestos) {
    auxiliar.copy(m.posicion).project(camara);
    if (auxiliar.z > 1) return false;
    const x = (auxiliar.x * 0.5 + 0.5) * ancho;
    const y = (-auxiliar.y * 0.5 + 0.5) * alto;
    if (x < 8 || y < 8 || x > ancho - 8 || y > alto - 8) return false;
    if (modo === 'recorrer' && m.posicion.distanceTo(camara.position) > 16) return false;
    if (modo === 'recorrer' && Math.abs(m.posicion.y - camara.position.y) > 3) return false;
    const separa = m.punto.id === seleccion ? 0 : SEPARACION;
    if (puestos.some((c) => Math.hypot(c[0] - x, c[1] - y) < separa)) return false;
    puestos.push([x, y]);
    m.boton.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    return true;
  }

  // --- Toques sobre la maqueta -----------------------------------------------------------
  const rayo = new THREE.Raycaster();
  const puntero = new THREE.Vector2();
  const zonas = [...PUNTOS, ...ZONAS_EXTRA].map((z) => {
    const a = p(z.zona[0], z.zona[1]);
    const b = p(z.zona[2], z.zona[3]);
    const alta = z.nivel === 'alta';
    return {
      id: z.id,
      alta,
      area: (b.x - a.x) * (b.z - a.z),
      caja: new THREE.Box3(
        new THREE.Vector3(a.x, alta ? ALTO_TAPANCO : 0, a.z),
        new THREE.Vector3(b.x, alta ? ALTO_TAPANCO + 1.2 : 2.4, b.z),
      ),
    };
  }).sort((x, y) => y.alta - x.alta || x.area - y.area); // el tapanco tapa lo de abajo; luego gana la zona más chica

  function zonaBajoPuntero() {
    for (const z of zonas) {
      if (z.alta && !altaVisible) continue;
      if (rayo.ray.intersectsBox(z.caja)) return z.id;
    }
    return null;
  }

  function tocarPiso() {
    const nivel = camara.position.y - OJOS;
    const plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), -nivel);
    const q = rayo.ray.intersectPlane(plano, new THREE.Vector3());
    if (!q || q.distanceTo(camara.position) > 22) return;
    const margen = 0.6;
    q.x = THREE.MathUtils.clamp(q.x, -ANCHO / 2 + margen, ANCHO / 2 - margen);
    q.z = THREE.MathUtils.clamp(q.z, -FONDO / 2 + margen, FONDO / 2 - margen);
    const choca = maqueta.solidos.some((s) => q.x > s.x1 - 0.3 && q.x < s.x2 + 0.3 && q.z > s.z1 - 0.3 && q.z < s.z2 + 0.3);
    if (choca) return;
    caminarA(new THREE.Vector3(q.x, nivel + OJOS, q.z));
  }

  const lienzo = renderer.domElement;
  let arrastre = null;

  lienzo.addEventListener('pointerdown', (e) => {
    arrastre = { x: e.clientX, y: e.clientY, inicioX: e.clientX, inicioY: e.clientY, movio: false };
    if (modo === 'recorrer') lienzo.setPointerCapture(e.pointerId);
  });
  lienzo.addEventListener('pointermove', (e) => {
    if (!arrastre) return;
    if (Math.hypot(e.clientX - arrastre.inicioX, e.clientY - arrastre.inicioY) > 8) arrastre.movio = true;
    if (modo === 'recorrer' && arrastre.movio) {
      mirada.yaw += (e.clientX - arrastre.x) * 0.0042;
      mirada.pitch = THREE.MathUtils.clamp(mirada.pitch + (e.clientY - arrastre.y) * 0.0042, -1.25, 1.25);
      vuelo = null;
      aplicarMirada();
      pedirCuadro();
    }
    arrastre.x = e.clientX;
    arrastre.y = e.clientY;
  });
  lienzo.addEventListener('pointerup', (e) => {
    const toque = arrastre && !arrastre.movio;
    arrastre = null;
    if (!toque) return;
    const r = lienzo.getBoundingClientRect();
    puntero.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    rayo.setFromCamera(puntero, camara);
    if (modo === 'recorrer') { tocarPiso(); return; }
    const id = zonaBajoPuntero();
    if (id) seleccionar(id);
    else if (seleccion) seleccionar(null);
  });
  lienzo.addEventListener('pointercancel', () => { arrastre = null; });

  // Rueda: en el recorrido acerca la vista; en maqueta ya la atienden los controles.
  lienzo.addEventListener('wheel', (e) => {
    if (modo !== 'recorrer') return;
    e.preventDefault();
    camara.fov = THREE.MathUtils.clamp(camara.fov + Math.sign(e.deltaY) * 4, 34, 80);
    camara.updateProjectionMatrix();
    pedirCuadro();
  }, { passive: false });

  controles.addEventListener('change', pedirCuadro);

  function ajustarTamano() {
    ancho = contenedor.clientWidth || 1;
    alto = contenedor.clientHeight || 1;
    camara.aspect = ancho / alto;
    camara.fov = modo === 'recorrer' ? (ancho / alto < 1 ? 74 : 62) : 32;
    camara.updateProjectionMatrix();
    renderer.setSize(ancho, alto);
    if (compositor) {
      compositor.setPixelRatio(calidad.pixeles);
      compositor.setSize(ancho, alto);
    }
    pedirCuadro();
  }

  lienzo.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    contenedor.dispatchEvent(new CustomEvent('maqueta-perdida'));
  });

  new ResizeObserver(() => {
    const yaHabia = ancho > 1;
    ajustarTamano();
    if (!yaHabia) {
      camara.position.copy(posicionGeneral());
      controles.update();
    }
  }).observe(contenedor);

  return {
    seleccionar,
    limpiar: () => seleccionar(null),
    get modo() { return modo; },
    set modo(nuevo) {
      if (nuevo === modo) return;
      cambiarModo(nuevo);
      ajustarTamano();
    },
    get altaVisible() { return altaVisible; },
    set altaVisible(v) { ponerAlta(v); },
  };
}
