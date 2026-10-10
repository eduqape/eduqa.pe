import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/** Piezas comunes de las escenas low-poly: sombreado plano y sombras suaves. */

export function material(color: number, extra: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, ...extra });
}

export function caja(w: number, h: number, d: number, mat: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function arbol(rand: () => number) {
  const g = new THREE.Group();
  const tronco = caja(0.14, 0.5, 0.14, material(0x9a7b5f), 0, 0.25, 0);
  g.add(tronco);
  const verde = [0xb9d7a8, 0xa7cc98, 0xc6dfb4][Math.floor(rand() * 3)];
  if (rand() < 0.5) {
    const copa = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.3, 6), material(verde));
    copa.position.y = 1.05;
    copa.castShadow = true;
    g.add(copa);
  } else {
    const copa = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), material(verde));
    copa.position.y = 0.95;
    copa.castShadow = true;
    g.add(copa);
  }
  g.scale.setScalar(0.8 + rand() * 0.7);
  g.rotation.y = rand() * Math.PI;
  return g;
}

export function persona(color: number) {
  const g = new THREE.Group();
  const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.5, 8), material(color));
  cuerpo.position.y = 0.25;
  cuerpo.castShadow = true;
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), material(0xf1d2b6));
  cabeza.position.y = 0.62;
  cabeza.castShadow = true;
  g.add(cuerpo, cabeza);
  return g;
}


/** Ancho por debajo del cual se ocultan las etiquetas secundarias. */
const ANGOSTO = 520;

type Montaje = {
  raiz: HTMLDivElement;
  capa: HTMLDivElement;
  fondo: number;
  /**
   * Encuadre. Con `caja`, la cámara se aleja lo justo para que toda la caja
   * quepa en cualquier proporción: nada queda recortado. Sin ella, se usa un
   * objetivo y una distancia fijos que se alejan en pantallas angostas.
   */
  caja?: THREE.Box3;
  objetivo?: THREE.Vector3;
  distancia?: number;
  niebla: [number, number];
  /** Medio ancho y medio fondo que cubren las sombras del sol. */
  sombra: [number, number];
  /** Color que la luz ambiente toma del suelo. */
  luzSuelo?: number;
  /**
   * Dentro de una página de lectura la rueda sola desplaza la página y solo
   * acerca con Ctrl (o Cmd); en pantallas táctiles, deslizar en vertical
   * desplaza y en horizontal gira.
   */
  dentroDePagina?: boolean;
};

/**
 * Escena low-poly lista para animar: cámara elevada con órbita, sol con
 * sombras, suelo del color de fondo y etiquetas HTML ancladas a puntos 3D.
 * `iniciar` dibuja cada cuadro llamando a `aplicar` con el tiempo actual.
 */
export function montarEscena({ raiz, capa, fondo, caja: encuadre, objetivo = new THREE.Vector3(), distancia = 20, niebla, sombra, luzSuelo = 0xb7c8b9, dentroDePagina = false }: Montaje) {
  const escena = new THREE.Scene();
  escena.background = new THREE.Color(fondo);
  escena.fog = new THREE.Fog(fondo, ...niebla);

  const camara = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  const direccion = new THREE.Vector3(-0.05, 0.62, 0.78).normalize();

  const render = new THREE.WebGLRenderer({ antialias: true });
  render.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  render.shadowMap.enabled = true;
  render.shadowMap.type = THREE.PCFSoftShadowMap;
  render.outputColorSpace = THREE.SRGBColorSpace;
  raiz.appendChild(render.domElement);

  const controles = new OrbitControls(camara, render.domElement);
  controles.target.copy(objetivo);
  controles.enableDamping = true;
  controles.maxPolarAngle = 1.25;
  controles.enablePan = false;
  if (dentroDePagina) {
    render.domElement.style.touchAction = "pan-y";
    // La captura en el contenedor llega antes que OrbitControls, que escucha
    // en el lienzo: sin Ctrl, la rueda no le llega y la página se desplaza.
    raiz.addEventListener(
      "wheel",
      (e) => {
        if (!e.ctrlKey && !e.metaKey) e.stopPropagation();
      },
      { capture: true },
    );
  }

  escena.add(new THREE.HemisphereLight(0xffffff, luzSuelo, 1.9));
  const sol = new THREE.DirectionalLight(0xffffff, 2.1);
  sol.position.set(-8, 16, 10);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  const [sx, sz] = sombra;
  Object.assign(sol.shadow.camera, { left: -sx, right: sx, top: sz, bottom: -sz, near: 1, far: 50 });
  sol.shadow.bias = -0.0005;
  sol.shadow.radius = 4;
  escena.add(sol);

  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), material(fondo, { flatShading: false }));
  suelo.rotation.x = -Math.PI / 2;
  suelo.receiveShadow = true;
  escena.add(suelo);

  const etiquetas: { el: HTMLDivElement; pos: THREE.Vector3; secundaria: boolean; debajo: boolean }[] = [];
  /**
   * Cartel con título y una línea que la animación puede cambiar. `clase` le
   * da fondo y tinta. Una etiqueta `secundaria` solo explica y se oculta en
   * contenedores angostos, donde taparía la escena. Por omisión el cartel
   * queda encima del punto; con `debajo`, colgando de él.
   */
  const etiqueta = (
    titulo: string,
    pos: THREE.Vector3,
    clase: string,
    { secundaria = false, debajo = false }: { secundaria?: boolean; debajo?: boolean } = {},
  ) => {
    const el = document.createElement("div");
    el.className = `absolute left-0 top-0 whitespace-nowrap rounded-md px-2.5 py-1 font-mono shadow-md ${clase}`;
    const t = document.createElement("strong");
    t.className = "block text-[11px] font-black uppercase tracking-[0.12em]";
    t.textContent = titulo;
    const sub = document.createElement("span");
    sub.className = "block text-[10px] opacity-80";
    el.append(t, sub);
    capa.appendChild(el);
    etiquetas.push({ el, pos, secundaria, debajo });
    return sub;
  };

  // Distancia a la que toda la caja cabe en el cuadro, con un margen. Para
  // cada esquina, su desvío lateral y vertical respecto del eje de la cámara
  // tiene que caber en la apertura a la profundidad a la que queda.
  const distanciaQueEncaja = (caja: THREE.Box3, centro: THREE.Vector3) => {
    const delante = direccion.clone().negate();
    const derecha = new THREE.Vector3().crossVectors(delante, camara.up).normalize();
    const arriba = new THREE.Vector3().crossVectors(derecha, delante);
    const tanV = Math.tan(THREE.MathUtils.degToRad(camara.fov / 2)) * 0.9;
    const tanH = tanV * camara.aspect;
    let d = 0;
    for (const x of [caja.min.x, caja.max.x])
      for (const y of [caja.min.y, caja.max.y])
        for (const z of [caja.min.z, caja.max.z]) {
          const rel = new THREE.Vector3(x, y, z).sub(centro);
          const prof = rel.dot(direccion);
          d = Math.max(d, prof + Math.abs(rel.dot(derecha)) / tanH, prof + Math.abs(rel.dot(arriba)) / tanV);
        }
    return d;
  };

  // Vuelve a la vista inicial: la que encaja la escena entera.
  const recentrar = () => {
    // Sin amortiguación, `update` aplica de una vez la inercia pendiente y la
    // descarta; si no, la cámara seguiría girando después de volver.
    controles.enableDamping = false;
    controles.update();
    controles.enableDamping = true;
    const foco = encuadre ? encuadre.getCenter(new THREE.Vector3()) : objetivo;
    const d = encuadre ? distanciaQueEncaja(encuadre, foco) : distancia * Math.max(1, 1.7 / camara.aspect) ** 0.85;
    controles.target.copy(foco);
    camara.position.copy(foco).addScaledVector(direccion, d);
    controles.minDistance = d * 0.4;
    controles.maxDistance = d * 1.8;
    controles.update();
  };

  /** Acerca (`factor` < 1) o aleja (> 1) sin salir de los límites de la órbita. */
  const acercar = (factor: number) => {
    const desvio = camara.position.clone().sub(controles.target);
    const largo = THREE.MathUtils.clamp(desvio.length() * factor, controles.minDistance, controles.maxDistance);
    camara.position.copy(controles.target).addScaledVector(desvio.normalize(), largo);
    controles.update();
  };

  const ajustar = () => {
    const w = raiz.clientWidth;
    const h = raiz.clientHeight;
    if (!w || !h) return;
    render.setSize(w, h);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
    recentrar();
  };
  const observador = new ResizeObserver(ajustar);
  observador.observe(raiz);
  ajustar();

  // Fuera de pantalla no se dibuja: la lección sigue leyéndose sin gastar GPU.
  let visible = true;
  const vigia = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
  vigia.observe(raiz);

  let cuadro = 0;
  const v = new THREE.Vector3();
  const iniciar = (aplicar: (t: number) => void, tiempo: { current: number | null }) => {
    const bucle = () => {
      cuadro = requestAnimationFrame(bucle);
      if (!visible) return;
      aplicar(tiempo.current ?? 0);
      controles.update();
      render.render(escena, camara);
      const w = raiz.clientWidth;
      const h = raiz.clientHeight;
      for (const e of etiquetas) {
        v.copy(e.pos).project(camara);
        e.el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, ${e.debajo ? "0" : "-100%"})`;
        e.el.style.display = v.z < 1 && !(e.secundaria && w < ANGOSTO) ? "" : "none";
      }
    };
    bucle();
  };

  const destruir = () => {
    cancelAnimationFrame(cuadro);
    observador.disconnect();
    vigia.disconnect();
    controles.dispose();
    escena.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        for (const m of [o.material].flat()) {
          (m as THREE.MeshStandardMaterial).map?.dispose();
          m.dispose();
        }
      }
    });
    render.dispose();
    render.domElement.remove();
    capa.replaceChildren();
  };

  return { escena, etiqueta, iniciar, destruir, acercar, recentrar };
}

/** Lienzo de texto como textura, para rotular caras de cajas y carteles. */
export function texturaLienzo(ancho: number, alto: number, dibujar: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = ancho;
  c.height = alto;
  dibujar(c.getContext("2d")!);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
