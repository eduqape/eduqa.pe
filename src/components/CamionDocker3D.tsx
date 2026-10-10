"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Paso } from "./Reproductor3D";
import { arbol, caja, material, montarEscena, persona } from "./lowpoly";

/**
 * Prueba de concepto: un camión de Docker se arma junto a la PC local, capa por
 * capa, y lleva la imagen hasta Docker Hub (push). Allí un segundo camión
 * recoge las capas (pull) y las lleva a la torre del servidor, donde el
 * contenedor arranca.
 *
 * Toda la escena es función pura del tiempo `t` (`aplicar`), así que la barra
 * de abajo puede pausar, adelantar o rebobinar sin estados intermedios.
 */

// Trazo oficial de Docker según Simple Icons (el mismo que exporta `SiDocker`
// de react-icons), en una caja de 24×24.
const BALLENA =
  "M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.184-.186h-2.12a.186.186 0 00-.186.186v1.887c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.082.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288Z";


const AZUL_DOCKER = 0x2496ed;
const FONDO = 0xe2eee3;
const ASFALTO = 0xd9dcd6;
const BORDILLO = 0xc4ccc0;

const CAPAS = [
  "FROM node:22-alpine",
  "WORKDIR /app",
  "COPY package*.json ./",
  "RUN npm ci",
  "COPY . .",
  'CMD ["npm", "start"]',
];

// Fases en segundos. A es el camión de la PC al hub; B, el del hub al servidor.
const F = {
  chasis: [0, 0.8],
  ruedas: [0.8, 1.6],
  cabina: [1.6, 2.3],
  capas: [2.4, 2.4 + CAPAS.length * 0.45],
  caja: [5.2, 6.0],
  viajeA: [6.6, 10.4],
  apareceB: [8.0, 8.8],
  aperturaA: [10.6, 11.0],
  subida: [11.0, 13.1],
  bajada: [13.4, 15.5],
  cajaB: [15.6, 16.4],
  viajeB: [16.8, 20.6],
  aperturaB: [20.8, 21.2],
  descarga: [21.2, 23.3],
  arranque: [23.3, 24.3],
  disuelve: [26.0, 26.6],
} as const;
export const DURACION = 27.2;
const ESCALONADO = 0.3;
const VUELO = 0.55;

export const REGISTRO: Paso[] = [
  { t: 0, comando: "docker build -t eduqa/app .", detalle: "Se arma el camión junto a la PC local" },
  ...CAPAS.map((capa, i) => ({
    t: F.capas[0] + i * 0.45,
    comando: `Capa ${i + 1}/${CAPAS.length}`,
    detalle: capa,
  })),
  { t: F.caja[0], comando: "Imagen lista", detalle: `eduqa/app:latest · ${CAPAS.length} capas` },
  { t: F.viajeA[0], comando: "docker push eduqa/app:latest", detalle: "El primer camión lleva la imagen a Docker Hub" },
  { t: F.subida[0], comando: "Subiendo capas", detalle: "Docker Hub guarda cada capa en el registro" },
  { t: F.bajada[0], comando: "docker pull eduqa/app:latest", detalle: "El servidor pide la imagen; el segundo camión la recoge" },
  { t: F.viajeB[0], comando: "Descargando", detalle: "La imagen viaja de Docker Hub al servidor" },
  { t: F.descarga[0], comando: "Extrayendo capas", detalle: "El servidor guarda la imagen en su disco" },
  { t: F.arranque[0], comando: "docker run -d -p 80:3000 eduqa/app", detalle: "Contenedor en marcha en el servidor" },
];

const fase = (t: number, [a, b]: readonly [number, number]) => THREE.MathUtils.clamp((t - a) / (b - a), 0, 1);
const vuelo = (t: number, inicio: number, i: number) =>
  salidaCubica(fase(t, [inicio + i * ESCALONADO, inicio + i * ESCALONADO + VUELO]));
const salidaCubica = (x: number) => 1 - (1 - x) ** 3;
const salidaRebote = (x: number) => {
  const n = 7.5625;
  const d = 2.75;
  if (x < 1 / d) return n * x * x;
  if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
  if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
  return n * (x -= 2.625 / d) * x + 0.984375;
};
const salidaRetroceso = (x: number) => {
  const c = 1.9;
  return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2;
};
const sinusoidal = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

/** Costado del contenedor: fondo azul, ballena y nombre en blanco. */
function texturaLogo() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 544;
  const g = c.getContext("2d")!;
  g.fillStyle = "#2496ed";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "rgba(255,255,255,0.12)";
  for (let x = 40; x < c.width; x += 64) g.fillRect(x, 0, 6, c.height);
  g.save();
  g.translate(70, 92);
  g.scale(15, 15);
  g.fillStyle = "#ffffff";
  g.fill(new Path2D(BALLENA));
  g.restore();
  g.fillStyle = "#ffffff";
  g.font = "800 150px ui-sans-serif, system-ui, sans-serif";
  g.textBaseline = "middle";
  g.fillText("docker", 450, 290);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Pantalla del monitor: la terminal escribe una línea por capa. */
function pantalla() {
  const c = document.createElement("canvas");
  c.width = 640;
  c.height = 400;
  const g = c.getContext("2d")!;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  let ultimo = -1;
  return {
    tex,
    dibujar(lineas: number, lista: boolean) {
      const clave = lineas * 2 + (lista ? 1 : 0);
      if (clave === ultimo) return;
      ultimo = clave;
      g.fillStyle = "#14202f";
      g.fillRect(0, 0, c.width, c.height);
      g.font = "600 30px ui-monospace, monospace";
      g.fillStyle = "#7fc8ff";
      g.fillText("$ docker build -t eduqa/app .", 28, 52);
      g.font = "26px ui-monospace, monospace";
      for (let i = 0; i < lineas; i++) {
        g.fillStyle = "#9fb3c8";
        g.fillText(`#${i + 1} ${CAPAS[i]}`, 28, 100 + i * 38);
      }
      if (lista) {
        g.fillStyle = "#8be28b";
        g.fillText("✔ eduqa/app:latest", 28, 100 + CAPAS.length * 38 + 10);
      }
      tex.needsUpdate = true;
    },
  };
}

function rectanguloRedondeado(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return new THREE.ShapeGeometry(s, 6);
}

/**
 * Explanada pavimentada delante de un edificio. Las calles entran en ella: el
 * bordillo queda por debajo del asfalto de la calle y el asfalto de la
 * explanada tapa el final de la calle, así que la unión no deja costura.
 */
function explanada(padre: THREE.Object3D, x: number, z: number, w: number, h: number) {
  const capa = (ancho: number, alto: number, y: number, color: number) => {
    const m = new THREE.Mesh(rectanguloRedondeado(ancho, alto, 0.45), material(color, { flatShading: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    m.receiveShadow = true;
    padre.add(m);
  };
  capa(w + 0.35, h + 0.35, 0.02, BORDILLO);
  capa(w, h, 0.04, ASFALTO);
  const p = new THREE.Vector3();
  return (mundo: THREE.Vector3, margen = 0) => {
    padre.worldToLocal(p.copy(mundo));
    return Math.abs(p.x - x) < w / 2 + margen && Math.abs(p.z - z) < h / 2 + margen;
  };
}

/** Camión de Docker. Mira hacia +Z; X es el ancho. */
function crearCamion(colorCabina: number, logo: THREE.Texture) {
  const grupo = new THREE.Group();
  const chasis = new THREE.Group();
  grupo.add(chasis);
  chasis.add(caja(1.2, 0.18, 3.6, material(0x27313f), 0, 0.55, 0));
  chasis.add(caja(1.3, 0.16, 0.18, material(0x9aa4b1), 0, 0.5, 1.82));
  const ruedas: THREE.Group[] = [];
  for (const z of [1.15, -0.95, -1.35]) {
    for (const x of [0.66, -0.66]) {
      const eje = new THREE.Group();
      eje.position.set(x, 0.32, z);
      const llanta = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.24, 10), material(0x1d2129));
      llanta.rotation.z = Math.PI / 2;
      llanta.castShadow = true;
      const tapa = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.26, 8), material(0xcfd5dc));
      tapa.rotation.z = Math.PI / 2;
      eje.add(llanta, tapa);
      grupo.add(eje);
      ruedas.push(eje);
    }
  }
  const cabina = new THREE.Group();
  grupo.add(cabina);
  const cristal = material(0xbfe6ff, { roughness: 0.3 });
  cabina.add(caja(1.3, 1.05, 1.05, material(colorCabina), 0, 1.17, 1.25));
  cabina.add(caja(1.32, 0.12, 1.07, material(0xffffff), 0, 1.72, 1.25));
  cabina.add(caja(1.1, 0.45, 0.04, cristal, 0, 1.35, 1.78));
  cabina.add(caja(0.04, 0.38, 0.55, cristal, 0.66, 1.37, 1.35));
  cabina.add(caja(0.04, 0.38, 0.55, cristal, -0.66, 1.37, 1.35));
  for (const x of [0.45, -0.45]) {
    const faro = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.04), new THREE.MeshBasicMaterial({ color: 0xfff1b8 }));
    faro.position.set(x, 0.85, 1.79);
    cabina.add(faro);
  }
  cabina.add(caja(0.09, 1.2, 0.09, material(0x9aa4b1), 0.56, 1.3, 0.66));

  const caraLogo = new THREE.MeshStandardMaterial({ map: logo, roughness: 0.7 });
  const caraAzul = material(0x1f86d4, { flatShading: false });
  const techo = material(0xf2f6fa, { flatShading: false });
  const casco = caja(1.36, 1.3, 2.45, [caraLogo, caraLogo, techo, caraAzul, caraAzul, caraAzul], 0, 0.65, 0);
  const carga = new THREE.Group();
  carga.position.set(0, 0.64, -0.52);
  carga.add(casco);
  grupo.add(carga);
  return { grupo, chasis, ruedas, cabina, casco };
}
type Camion = ReturnType<typeof crearCamion>;

const ESCALA = 0.66;
// Huecos de las capas sobre la plataforma, en coordenadas del camión.
const RANURAS = CAPAS.map(
  (_, i) => new THREE.Vector3(0, i % 2 === 0 ? 0.94 : 1.54, -1.33 + Math.floor(i / 2) * 0.81 - 0.52),
);
const ESCAPE = new THREE.Vector3(0.56, 1.95, 0.66);

export function CamionDocker3D({ tiempo }: { tiempo: React.RefObject<number> }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const capaEtiquetas = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raiz = contenedor.current!;
    const capa = capaEtiquetas.current!;

    const { escena, etiqueta, iniciar, destruir } = montarEscena({
      raiz,
      capa,
      fondo: FONDO,
      objetivo: new THREE.Vector3(0.2, 1.2, 0.6),
      distancia: 34,
      niebla: [36, 64],
      sombra: [22, 16],
    });

    const plastico = material(0xf3f4f2);
    const oscuro = material(0x2b3442);

    // PC local: monitor grande, torre y teclado, a escala de juguete.
    const pc = new THREE.Group();
    pc.position.set(-9.6, 0, 0.2);
    pc.rotation.y = 0.15;
    escena.add(pc);
    pc.add(caja(5.6, 0.12, 2.6, material(0xcfdccf), 0.4, 0.06, -0.1));
    pc.add(caja(1.6, 0.14, 0.9, plastico, 0, 0.19, 0));
    pc.add(caja(0.32, 1.1, 0.24, plastico, 0, 0.8, -0.1));
    pc.add(caja(3.4, 2.2, 0.26, oscuro, 0, 2.3, 0));
    const terminal = pantalla();
    const vidrio = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 1.94), new THREE.MeshBasicMaterial({ map: terminal.tex }));
    vidrio.position.set(0, 2.3, 0.135);
    pc.add(vidrio);
    pc.add(caja(1.0, 2.0, 1.8, plastico, 2.4, 1.12, -0.1));
    const ledPc = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.02), new THREE.MeshBasicMaterial({ color: AZUL_DOCKER }));
    ledPc.position.set(2.4, 1.85, 0.81);
    pc.add(ledPc);
    for (let i = 0; i < 4; i++) pc.add(caja(0.7, 0.05, 0.02, material(0xd6d9dc), 2.4, 0.5 + i * 0.16, 0.81));
    pc.add(caja(2.0, 0.1, 0.65, material(0xe3e6e3), -0.2, 0.17, 0.85));
    const p1 = persona(0xe96a5a);
    p1.position.set(-1.9, 0.12, 0.8);
    pc.add(p1);

    // Docker Hub: depósito en el centro, con una sola bahía de carga.
    const hub = new THREE.Group();
    hub.position.set(0, 0, -0.5);
    escena.add(hub);
    hub.add(caja(3.8, 1.9, 2.0, material(0xf5f3ee), 0, 0.95, 0));
    hub.add(caja(4.1, 0.24, 2.3, material(AZUL_DOCKER), 0, 2.02, 0));
    const bahiaHub = caja(1.5, 1.0, 0.06, material(0x1d2430), 0, 0.55, 1.02);
    hub.add(bahiaHub);
    for (const x of [-1.35, 1.35]) hub.add(caja(0.7, 0.45, 0.04, material(0xbfe3ff), x, 1.25, 1.01));
    hub.add(caja(0.06, 0.9, 0.06, oscuro, 1.4, 2.55, -0.4));
    const faroHub = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: AZUL_DOCKER }));
    faroHub.position.set(1.4, 3.05, -0.4);
    hub.add(faroHub);
    const p3 = persona(0xf2a541);
    p3.position.set(-2.5, 0, 0.7);
    hub.add(p3);

    // Torre del servidor.
    const torre = new THREE.Group();
    torre.position.set(10.0, 0, -0.9);
    torre.rotation.y = -0.15;
    escena.add(torre);
    torre.add(caja(2.6, 5.4, 2.2, material(0x3a4352), 0, 2.72, 0));
    torre.add(caja(2.8, 0.2, 2.4, material(0x2c3340), 0, 5.5, 0));
    const leds: THREE.Mesh[] = [];
    const bahias = 7;
    for (let i = 0; i < bahias; i++) {
      const y = 1.15 + i * 0.6;
      torre.add(caja(2.3, 0.46, 0.06, material(0x4c5668), 0, y, 1.11));
      for (let k = 0; k < 4; k++) {
        const led = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.04), new THREE.MeshBasicMaterial({ color: 0xffb547 }));
        led.position.set(-0.95 + k * 0.18, y, 1.16);
        torre.add(led);
        leds.push(led);
      }
      for (let k = 0; k < 5; k++) torre.add(caja(0.08, 0.3, 0.02, material(0x5d687b), 0.15 + k * 0.17, y, 1.15));
    }
    const puerta = caja(1.3, 0.75, 0.08, material(0x1d2430), -0.1, 0.42, 1.12);
    torre.add(puerta);
    const baliza = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), new THREE.MeshBasicMaterial({ color: 0x5b6577 }));
    baliza.position.set(0.8, 5.8, 0.6);
    torre.add(baliza);
    const p2 = persona(0x3f6fb5);
    p2.position.set(1.7, 0, 1.6);
    torre.add(p2);

    // Las posiciones del mundo (bocas, etiquetas, explanadas) necesitan las matrices al día.
    escena.updateMatrixWorld();
    const bocaHub = hub.localToWorld(new THREE.Vector3(0, 0.6, 1.1));
    const bocaTorre = torre.localToWorld(new THREE.Vector3(-0.1, 0.45, 1.2));

    // Bahías de carga: donde se arma A, la explanada del hub (A llega por el
    // oeste, B sale por el este) y la entrada del servidor.
    const plazas = [
      explanada(escena, -6.6, 2.4, 3.4, 1.9),
      explanada(escena, 0, 1.55, 7.4, 2.1),
      explanada(escena, 7.4, 1.0, 3.4, 1.9),
    ];

    // Calles: PC → Docker Hub y Docker Hub → servidor. Empiezan y terminan
    // dentro de las explanadas, rectas al entrar. Las curvas son abiertas: con
    // un radio menor que media calle, la cinta se dobla sobre sí misma.
    const rutaA = new THREE.CatmullRomCurve3(
      [[-6.6, 2.4], [-5.5, 2.4], [-3.3, 1.6], [-2.2, 1.6]].map(([x, z]) => new THREE.Vector3(x, 0, z)),
      false,
      "centripetal",
    );
    const rutaB = new THREE.CatmullRomCurve3(
      [[2.2, 1.6], [3.3, 1.6], [6.1, 1.0], [7.2, 1.0]].map(([x, z]) => new THREE.Vector3(x, 0, z)),
      false,
      "centripetal",
    );
    const raya = material(0xffffff, { flatShading: false });
    const calle = (ruta: THREE.CatmullRomCurve3) => {
      const largo = ruta.getLength();
      const cinta = (ancho: number, y: number, color: number) => {
        const N = 120;
        const pos: number[] = [];
        const idx: number[] = [];
        for (let i = 0; i <= N; i++) {
          const p = ruta.getPointAt(i / N);
          const tg = ruta.getTangentAt(i / N);
          const lado = new THREE.Vector3(-tg.z, 0, tg.x).normalize().multiplyScalar(ancho / 2);
          pos.push(p.x + lado.x, y, p.z + lado.z, p.x - lado.x, y, p.z - lado.z);
          if (i < N) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        const m = new THREE.Mesh(geo, material(color, { flatShading: false, side: THREE.DoubleSide }));
        m.receiveShadow = true;
        escena.add(m);
      };
      cinta(1.85, 0.01, BORDILLO);
      cinta(1.5, 0.03, ASFALTO);
      // La raya central se corta antes de entrar a las explanadas.
      for (let s = 0.45; s < largo; s += 0.9) {
        const u = s / largo;
        const p = ruta.getPointAt(u);
        if (plazas.some((dentro) => dentro(p, 0.35))) continue;
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.42), raya);
        m.position.set(p.x, 0.05, p.z);
        m.lookAt(p.clone().add(ruta.getTangentAt(u)).setY(0.05));
        m.receiveShadow = true;
        escena.add(m);
      }
      return largo;
    };
    const largoA = calle(rutaA);
    const largoB = calle(rutaB);

    // Árboles, lejos de las calles y de las explanadas.
    let semilla = 7;
    const rand = () => ((semilla = (semilla * 16807) % 2147483647) - 1) / 2147483646;
    const muestras = [rutaA, rutaB].flatMap((r) => Array.from({ length: 40 }, (_, i) => r.getPointAt(i / 39)));
    for (let i = 0, puestos = 0; i < 800 && puestos < 70; i++) {
      const p = new THREE.Vector3((rand() - 0.5) * 46, 0, (rand() - 0.5) * 30 - 3);
      if (muestras.some((m) => m.distanceTo(p) < 2.2)) continue;
      if (plazas.some((dentro) => dentro(p, 1.2))) continue;
      if (hub.position.distanceTo(p) < 3.2 || torre.position.distanceTo(p) < 2.6 || pc.position.distanceTo(p) < 3.6) continue;
      const a = arbol(rand);
      a.position.copy(p);
      escena.add(a);
      puestos++;
    }

    const logo = texturaLogo();
    const camionA = crearCamion(AZUL_DOCKER, logo);
    const camionB = crearCamion(0x1d63ed, logo);
    escena.add(camionA.grupo, camionB.grupo);

    const tonos = [0x2496ed, 0x3aa3f0, 0x1b7fd0, 0x5ab4f4, 0x2a8de0, 0x0f6cbd];
    const capasCarga = CAPAS.map((_, i) => {
      const m = caja(1.18, 0.56, 0.76, material(tonos[i]));
      escena.add(m);
      return m;
    });

    const nube = () =>
      Array.from({ length: 8 }, () => {
        const m = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.2, 0),
          new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, roughness: 1, flatShading: true }),
        );
        escena.add(m);
        return m;
      });
    const humoA = nube();
    const humoB = nube();

    // Etiquetas HTML, como los carteles del tablero.
    const subPc = etiqueta("PC local", pc.localToWorld(new THREE.Vector3(0, 3.8, 0)), "bg-[#1f2a44] text-white");
    const subHub = etiqueta("Docker Hub", hub.localToWorld(new THREE.Vector3(0, 3.1, 0)), "bg-[#1d63ed] text-white");
    const subTorre = etiqueta("Servidor", torre.localToWorld(new THREE.Vector3(0, 6.4, 0)), "bg-[#1f2a44] text-white");

    const fantasma = new THREE.Object3D();
    const pose = (ruta: THREE.CatmullRomCurve3, viaje: readonly [number, number], t: number) => {
      const u = sinusoidal(fase(t, viaje));
      const p = ruta.getPointAt(u);
      fantasma.position.copy(p);
      fantasma.lookAt(p.clone().add(ruta.getTangentAt(u)));
      return { u, pos: p, quat: fantasma.quaternion.clone() };
    };

    const colocar = (c: Camion, ruta: THREE.CatmullRomCurve3, viaje: readonly [number, number], largo: number, t: number, escala: number) => {
      const { u, pos, quat } = pose(ruta, viaje, t);
      c.grupo.position.copy(pos);
      c.grupo.quaternion.copy(quat);
      c.grupo.scale.setScalar(ESCALA * Math.max(escala, 0.0001));
      c.grupo.visible = escala > 0.001;
      c.ruedas.forEach((r) => (r.rotation.x = (u * largo) / (0.32 * ESCALA)));
      c.grupo.updateMatrixWorld();
    };

    const cascoAltura = (c: Camion, altura: number) => {
      const a = Math.max(altura, 0.001);
      c.casco.scale.set(1, a, 1);
      c.casco.position.y = 0.65 * a;
      c.casco.visible = a > 0.002;
    };

    const humear = (humo: THREE.Mesh[], ruta: THREE.CatmullRomCurve3, viaje: readonly [number, number], t: number) => {
      const paso = 0.17;
      const ultimo = Math.floor(t / paso) * paso;
      humo.forEach((h, k) => {
        const te = ultimo - k * paso;
        const edad = t - te;
        h.visible = te > viaje[0] + 0.05 && te < viaje[1] - 0.2 && edad < 1.2;
        if (!h.visible) return;
        const pe = pose(ruta, viaje, te);
        h.position.copy(ESCAPE).multiplyScalar(ESCALA).applyQuaternion(pe.quat).add(pe.pos);
        h.position.y += edad * 1.3;
        h.position.x += Math.sin(te * 13) * 0.25 * edad;
        h.scale.setScalar(0.35 + edad * 0.75);
        (h.material as THREE.MeshStandardMaterial).opacity = 0.7 * (1 - edad / 1.2);
      });
    };

    const arco = (desde: THREE.Vector3, hasta: THREE.Vector3, k: number, destino: THREE.Vector3) =>
      destino.lerpVectors(desde, hasta, k).setY(destino.y + Math.sin(k * Math.PI) * 2.2);

    const aplicar = (t: number) => {
      const disuelve = 1 - salidaCubica(fase(t, F.disuelve));

      // Camión A: se arma en la PC y lleva las capas al hub.
      colocar(camionA, rutaA, F.viajeA, largoA, t, t > 0.001 ? disuelve : 0);
      const pChasis = Math.max(salidaRetroceso(fase(t, F.chasis)), 0.001);
      camionA.chasis.scale.set(pChasis, 1, pChasis);
      camionA.ruedas.forEach((r, i) => {
        const p = salidaRetroceso(fase(t, [F.ruedas[0] + i * 0.12, F.ruedas[0] + i * 0.12 + 0.3]));
        r.scale.setScalar(Math.max(p, 0.001));
      });
      const pCabina = fase(t, F.cabina);
      camionA.cabina.visible = pCabina > 0;
      camionA.cabina.position.y = (1 - salidaRebote(pCabina)) * 4;
      cascoAltura(camionA, salidaCubica(fase(t, F.caja)) * (1 - salidaCubica(fase(t, F.aperturaA))));

      // Camión B: espera vacío en el hub y lleva las capas al servidor.
      colocar(camionB, rutaB, F.viajeB, largoB, t, salidaRetroceso(fase(t, F.apareceB)) * disuelve);
      cascoAltura(camionB, salidaCubica(fase(t, F.cajaB)) * (1 - salidaCubica(fase(t, F.aperturaB))));

      // Capas: caen sobre A, suben al hub, bajan a B y entran en la torre.
      capasCarga.forEach((m, i) => {
        const cae = fase(t, [F.capas[0] + i * 0.45, F.capas[0] + i * 0.45 + 0.42]);
        const sube = vuelo(t, F.subida[0], i);
        const baja = vuelo(t, F.bajada[0], i);
        const entra = vuelo(t, F.descarga[0], i);
        const enA = camionA.grupo.localToWorld(RANURAS[i].clone());
        const enB = camionB.grupo.localToWorld(RANURAS[i].clone());
        m.visible = disuelve > 0.5;
        if (baja === 0) {
          enA.y += (1 - salidaRebote(cae)) * 5 * ESCALA;
          arco(enA, bocaHub, sube, m.position);
          m.quaternion.copy(camionA.grupo.quaternion);
          m.scale.setScalar(ESCALA * (1 - sube * 0.7));
          m.visible &&= cae > 0 && sube < 1;
        } else if (entra === 0) {
          arco(bocaHub, enB, baja, m.position);
          m.quaternion.copy(camionB.grupo.quaternion);
          m.scale.setScalar(ESCALA * (0.3 + baja * 0.7));
        } else {
          arco(enB, bocaTorre, entra, m.position);
          m.quaternion.copy(camionB.grupo.quaternion);
          m.scale.setScalar(ESCALA * (1 - entra * 0.7));
          m.visible &&= entra < 1;
        }
      });

      humear(humoA, rutaA, F.viajeA, t);
      humear(humoB, rutaB, F.viajeB, t);

      // Monitor.
      const lineas = CAPAS.filter((_, i) => t >= F.capas[0] + i * 0.45 + 0.3).length;
      terminal.dibujar(lineas, t >= F.caja[1]);
      (ledPc.material as THREE.MeshBasicMaterial).color.setHex(
        t < F.caja[1] && Math.sin(t * 18) > 0 ? 0xffffff : AZUL_DOCKER,
      );

      // Docker Hub: la bahía se ilumina mientras entran o salen capas.
      const subiendo = t >= F.aperturaA[0] && t < F.subida[1];
      const bajando = t >= F.bajada[0] && t < F.bajada[1];
      const guardada = t >= F.subida[1];
      (bahiaHub.material as THREE.MeshStandardMaterial).color.setHex(subiendo || bajando ? AZUL_DOCKER : 0x1d2430);
      (faroHub.material as THREE.MeshBasicMaterial).color.setHex(
        (subiendo || bajando) && Math.sin(t * 14) > 0 ? 0xffffff : AZUL_DOCKER,
      );

      // Torre: ámbar en espera, verde cuando el contenedor arranca.
      const enciende = fase(t, F.arranque);
      leds.forEach((led, i) => {
        const fila = Math.floor(i / 4);
        const verde = enciende * bahias > fila;
        const h = Math.sin(i * 12.9898 + Math.floor(t * 6) * 78.233) * 43758.5453;
        const titila = h - Math.floor(h) > 0.55;
        (led.material as THREE.MeshBasicMaterial).color.setHex(
          verde ? (titila ? 0x9cf09c : 0x3ccf6b) : titila ? 0xffcf7a : 0x6b5530,
        );
      });
      const corre = t >= F.arranque[0];
      (baliza.material as THREE.MeshBasicMaterial).color.setHex(
        corre ? (Math.sin(t * 5) > -0.2 ? AZUL_DOCKER : 0x9fd4ff) : 0x5b6577,
      );
      const descargando = t >= F.aperturaB[0] && t < F.arranque[0];
      (puerta.material as THREE.MeshStandardMaterial).color.setHex(descargando ? AZUL_DOCKER : 0x1d2430);

      subPc.textContent = t < F.caja[1] ? `construyendo · capa ${lineas}/${CAPAS.length}` : "imagen eduqa/app:latest";
      subHub.textContent = subiendo
        ? "docker push · recibiendo capas"
        : bajando
          ? "docker pull · entregando capas"
          : guardada
            ? `eduqa/app:latest · ${CAPAS.length} capas`
            : "registro de imágenes";
      subTorre.textContent = corre
        ? "1 contenedor en marcha · :80"
        : descargando
          ? "extrayendo capas…"
          : t >= F.bajada[0]
            ? "docker pull en curso"
            : "esperando imagen";
    };

    iniciar(aplicar, tiempo);
    return destruir;
  }, [tiempo]);

  return (
    <div ref={contenedor} className="relative h-full w-full cursor-grab overflow-hidden active:cursor-grabbing">
      <div ref={capaEtiquetas} className="pointer-events-none absolute inset-0" />
    </div>
  );
}
