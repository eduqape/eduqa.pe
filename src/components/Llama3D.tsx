"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Llama pastando en volumen.
 *
 * Nada de la forma se modela aquí; se parte de recursos CC0 y se retocan:
 * - `public/modelos/llama.glb`: "Alpaca" de Quaternius (poly.pizza/m/bCVFD48i2l).
 * - `public/modelos/pasto.glb`: "Grass" de Quaternius (poly.pizza/m/UGTOzcO3P2).
 * - `public/texturas/lana-*.jpg`: color y relieve de Carpet016 de ambientCG.
 */

// Hocico, ojos y pezuñas en negro. El resto del cuerpo es lana blanca, como la
// llama de pie del hero sobre el rojo de marca.
const NEGRO: Record<string, number> = {
  Muzzle: 0x111113,
  Hooves: 0x1b1b1d,
  Eyes_Black: 0x000000,
  Eyes_White: 0xffffff,
};
const LANA = ["Main", "Main_Light", "Main_Dark"];

/**
 * Retoques sobre el esqueleto para que la alpaca se lea como llama: orejas
 * largas en forma de plátano, cuello más fino y algo más largo, patas más
 * largas y cola más gruesa.
 *
 * `escala` va en los ejes locales del hueso (Y es el largo, X y Z el grosor) y
 * se hereda hacia los hijos: por eso la cabeza deshace el adelgazamiento del
 * cuello. `giro` (radianes, X/Y/Z) se suma encima de la animación en cada
 * cuadro, porque la animación reescribe las rotaciones pero no las escalas.
 */
const RETOQUES: Record<string, { escala?: [number, number, number]; giro?: [number, number, number] }> = {
  "Ear1.L": { escala: [1, 1.45, 1] },
  "Ear1.R": { escala: [1, 1.45, 1] },
  "Ear2.L": { giro: [0, 0, 0.22] },
  "Ear2.R": { giro: [0, 0, -0.22] },
  "Ear3.L": { giro: [0, 0, 0.3] },
  "Ear3.R": { giro: [0, 0, -0.3] },
  Neck1: { escala: [0.72, 1.05, 0.72] },
  Neck2: { escala: [1, 1.04, 1] },
  Head: { escala: [1.39, 1, 1.39] },
  "FrontUpperLeg.L": { escala: [1, 1.1, 1] },
  "FrontUpperLeg.R": { escala: [1, 1.1, 1] },
  "BackUpperLeg.L": { escala: [1, 1.1, 1] },
  "BackUpperLeg.R": { escala: [1, 1.1, 1] },
  Tail1: { escala: [1.4, 1.2, 1.4] },
};

/**
 * Pezuñas de llama en vez de cascos de caballo: la base se ensancha y se abre
 * una muesca delante que separa los dos dedos. El borde de arriba no se toca:
 * es el que cierra contra la pata, y moverlo deja ver el fondo por la rendija.
 * Se edita la malla en la pose de reposo, donde Z es la altura y la cabeza mira
 * hacia -Y.
 */
function pezunasDeLlama(geometria: THREE.BufferGeometry) {
  const pos = geometria.attributes.position as THREE.BufferAttribute;
  const grupos = new Map<string, number[]>();
  for (let i = 0; i < pos.count; i++) {
    const clave = `${Math.sign(pos.getX(i))}${Math.sign(pos.getY(i))}`;
    grupos.set(clave, [...(grupos.get(clave) ?? []), i]);
  }
  for (const indices of grupos.values()) {
    const caja = new THREE.Box3();
    for (const i of indices) caja.expandByPoint(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)));
    const centro = caja.getCenter(new THREE.Vector3());
    const medioAncho = (caja.max.x - caja.min.x) / 2;
    for (const i of indices) {
      // 1 en el suelo, 0 en el borde de arriba.
      const base = 1 - (pos.getZ(i) - caja.min.z) / (caja.max.z - caja.min.z);
      const dx = pos.getX(i) - centro.x;
      let y = pos.getY(i);
      const cercania = 1 - Math.abs(dx) / (medioAncho * 0.4);
      if (y < centro.y && cercania > 0) y += (centro.y - y) * 0.55 * cercania * base;
      pos.setXYZ(
        i,
        centro.x + dx * (1 + 0.3 * base),
        centro.y + (y - centro.y) * (1 + 0.12 * base),
        pos.getZ(i),
      );
    }
  }
  pos.needsUpdate = true;
  geometria.computeVertexNormals();
}

/**
 * Lana: color y relieve de la textura proyectados desde los tres ejes, porque
 * el modelo no trae coordenadas UV. Se proyecta sobre la posición de reposo,
 * así la lana se mueve con el cuerpo en vez de deslizarse por encima.
 */
function materialLana(color: THREE.Texture, altura: THREE.Texture) {
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    metalness: 0,
    // Si queda alguna rendija entre piezas, se ve lana por dentro y no el fondo.
    side: THREE.DoubleSide,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.lanaColor = { value: color };
    shader.uniforms.lanaAltura = { value: altura };
    shader.uniforms.lanaEscala = { value: 170 };
    shader.uniforms.lanaRelieve = { value: 1.6 };

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float lanaEscala;\nvarying vec3 vLanaPos;\nvarying vec3 vLanaNormal;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLanaPos = position * lanaEscala;\nvLanaNormal = normal;");

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform sampler2D lanaColor;
uniform sampler2D lanaAltura;
uniform float lanaRelieve;
varying vec3 vLanaPos;
varying vec3 vLanaNormal;
vec4 triplanar(sampler2D t) {
  vec3 w = pow(abs(normalize(vLanaNormal)), vec3(4.0));
  w /= w.x + w.y + w.z;
  return texture2D(t, vLanaPos.yz) * w.x + texture2D(t, vLanaPos.xz) * w.y + texture2D(t, vLanaPos.xy) * w.z;
}
vec3 relieveLana(vec3 posicion, vec3 normal, vec2 dH, float cara) {
  vec3 sx = normalize(dFdx(posicion));
  vec3 sy = normalize(dFdy(posicion));
  vec3 r1 = cross(sy, normal);
  vec3 r2 = cross(normal, sx);
  float det = dot(sx, r1) * cara;
  vec3 grad = sign(det) * (dH.x * r1 + dH.y * r2);
  return normalize(abs(det) * normal - grad);
}`,
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
float lanaLuz = dot(triplanar(lanaColor).rgb, vec3(0.299, 0.587, 0.114));
diffuseColor.rgb *= clamp(lanaLuz * 1.45, 0.0, 1.0);`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
float lanaH = triplanar(lanaAltura).r * lanaRelieve;
normal = relieveLana(-vViewPosition, normal, vec2(dFdx(lanaH), dFdy(lanaH)), faceDirection);`,
      );
  };
  return material;
}

/** Aleatorio con semilla: el pasto sale igual en cada carga. */
function aleatorio(semilla: number) {
  return () => {
    semilla = (semilla + 0x6d2b79f5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function Llama3D() {
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raiz = contenedor.current;
    if (!raiz) return;

    const escena = new THREE.Scene();
    const camara = new THREE.PerspectiveCamera(32, 1, 0.01, 100);

    const render = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    render.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    render.shadowMap.enabled = true;
    render.shadowMap.type = THREE.PCFShadowMap;
    render.toneMapping = THREE.ACESFilmicToneMapping;
    raiz.appendChild(render.domElement);

    escena.add(new THREE.HemisphereLight(0xffffff, 0x8c8c90, 1.6));
    const sol = new THREE.DirectionalLight(0xffffff, 2.4);
    sol.castShadow = true;
    sol.shadow.mapSize.set(2048, 2048);
    escena.add(sol, sol.target);
    const contra = new THREE.DirectionalLight(0xffd6dc, 1);
    escena.add(contra);

    const suelo = new THREE.Mesh(
      new THREE.CircleGeometry(1, 64),
      new THREE.ShadowMaterial({ opacity: 0.3 }),
    );
    suelo.rotation.x = -Math.PI / 2;
    suelo.receiveShadow = true;
    escena.add(suelo);

    const controles = new OrbitControls(camara, render.domElement);
    controles.enableDamping = true;
    controles.enablePan = false;
    controles.maxPolarAngle = Math.PI / 2 - 0.05;

    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    controles.autoRotate = !quieto;
    controles.autoRotateSpeed = 0.8;

    let mezclador: THREE.AnimationMixer | null = null;
    let girarHuesos = () => {};
    let encuadre = { centroY: 1, radio: 1 };

    // La cámara se aleja lo justo para que la escena entera quepa, sea cual sea
    // la proporción del contenedor.
    const encuadrar = () => {
      const vertical = THREE.MathUtils.degToRad(camara.fov) / 2;
      const horizontal = Math.atan(Math.tan(vertical) * camara.aspect);
      const distancia = (encuadre.radio * 1.05) / Math.sin(Math.min(vertical, horizontal));
      const direccion = new THREE.Vector3(1, 0.3, 0.9).normalize();
      controles.target.set(0, encuadre.centroY, 0);
      camara.position.copy(direccion.multiplyScalar(distancia)).add(controles.target);
      camara.near = distancia / 100;
      camara.far = distancia * 10;
      camara.updateProjectionMatrix();
      controles.minDistance = distancia * 0.4;
      controles.maxDistance = distancia * 2;
    };

    let cancelado = false;
    const gltf = new GLTFLoader();
    const texturas = new THREE.TextureLoader();
    Promise.all([
      gltf.loadAsync("/modelos/llama.glb"),
      gltf.loadAsync("/modelos/pasto.glb"),
      texturas.loadAsync("/texturas/lana-color.jpg"),
      texturas.loadAsync("/texturas/lana-altura.jpg"),
    ]).then(([modelo, pasto, lanaColor, lanaAltura]) => {
      if (cancelado) return;
      const llama = modelo.scene;

      for (const t of [lanaColor, lanaAltura]) {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = render.capabilities.getMaxAnisotropy();
      }
      lanaColor.colorSpace = THREE.SRGBColorSpace;

      // El cuerpo viene en tres mallas (una por tono). Se unen en una sola y
      // se suavizan las normales: sin costuras entre tonos y sin caras planas.
      const partesLana: THREE.SkinnedMesh[] = [];
      llama.traverse((nodo) => {
        if (!(nodo instanceof THREE.SkinnedMesh)) return;
        nodo.castShadow = true;
        nodo.receiveShadow = true;
        const material = nodo.material as THREE.MeshStandardMaterial;
        if (LANA.includes(material.name)) partesLana.push(nodo);
        else if (material.name in NEGRO) {
          material.color.set(NEGRO[material.name]);
          material.side = THREE.DoubleSide;
        }
        if (material.name === "Hooves") pezunasDeLlama(nodo.geometry);
      });
      if (partesLana.length > 0) {
        const unidas = mergeGeometries(partesLana.map((m) => m.geometry.clone()));
        unidas.deleteAttribute("normal");
        const suave = mergeVertices(unidas, 1e-5);
        suave.computeVertexNormals();
        const cuerpo = new THREE.SkinnedMesh(suave, materialLana(lanaColor, lanaAltura));
        cuerpo.castShadow = true;
        cuerpo.receiveShadow = true;
        const base = partesLana[0];
        base.parent?.add(cuerpo);
        cuerpo.position.copy(base.position);
        cuerpo.quaternion.copy(base.quaternion);
        cuerpo.scale.copy(base.scale);
        cuerpo.bind(base.skeleton, base.bindMatrix);
        for (const parte of partesLana) parte.removeFromParent();
      }

      const huesos: { hueso: THREE.Bone; giro: THREE.Quaternion }[] = [];
      llama.traverse((nodo) => {
        const retoque = nodo instanceof THREE.Bone ? RETOQUES[nodo.name] : undefined;
        if (!retoque) return;
        if (retoque.escala) nodo.scale.multiply(new THREE.Vector3(...retoque.escala));
        if (retoque.giro) {
          huesos.push({
            hueso: nodo as THREE.Bone,
            giro: new THREE.Quaternion().setFromEuler(new THREE.Euler(...retoque.giro)),
          });
        }
      });
      girarHuesos = () => {
        for (const { hueso, giro } of huesos) hueso.quaternion.multiply(giro);
      };

      // De la animación "Eating" solo se usa el tramo con la cabeza abajo
      // (segundos 1 a 5, a 30 cuadros por segundo) y se reproduce de ida y
      // vuelta: así no levanta la cabeza ni salta al reiniciar el bucle.
      const comer = modelo.animations.find((a) => a.name === "Eating");
      if (comer) {
        const pastando = THREE.AnimationUtils.subclip(comer, "Pastando", 30, 150, 30);
        mezclador = new THREE.AnimationMixer(llama);
        mezclador.clipAction(pastando).setLoop(THREE.LoopPingPong, Infinity).play();
        mezclador.setTime(quieto ? 2.25 : 0);
      }
      girarHuesos();
      llama.updateMatrixWorld(true);

      // Pies en el suelo y el cuerpo centrado sobre el eje de giro. La caja se
      // mide ya deformada: en una malla con esqueleto, `setFromObject` aplica
      // los huesos si se le pide precisión.
      const caja = new THREE.Box3().setFromObject(llama, true);
      const centro = caja.getCenter(new THREE.Vector3());
      llama.position.set(-centro.x, -caja.min.y, -centro.z);
      escena.add(llama);
      llama.updateMatrixWorld(true);

      const tamano = caja.getSize(new THREE.Vector3());
      encuadre = { centroY: tamano.y / 2, radio: tamano.length() / 2 };
      encuadrar();

      // Pasto: las dos matas del modelo, repartidas bajo el hocico y alrededor
      // de las patas. Cada mata se lleva a su base en el origen y se escala a
      // la altura de la llama.
      const matas: THREE.BufferGeometry[] = [];
      let materialPasto: THREE.Material | null = null;
      pasto.scene.updateMatrixWorld(true);
      pasto.scene.traverse((nodo) => {
        if (!(nodo instanceof THREE.Mesh)) return;
        const g = nodo.geometry.clone().applyMatrix4(nodo.matrixWorld);
        g.computeBoundingBox();
        const b = g.boundingBox!;
        g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
        const k = (tamano.y * 0.16) / (b.max.y - b.min.y);
        g.scale(k, k, k);
        matas.push(g);
        materialPasto = nodo.material as THREE.Material;
      });

      const hocico = new THREE.Vector3();
      llama.traverse((nodo) => {
        if (nodo instanceof THREE.Mesh && (nodo.material as THREE.Material).name === "Muzzle") {
          new THREE.Box3().setFromObject(nodo, true).getCenter(hocico);
        }
      });

      const azar = aleatorio(7);
      const prado = new THREE.Group();
      const sembrar = (x: number, z: number, escala: number) => {
        if (!materialPasto) return;
        const mata = new THREE.Mesh(matas[Math.floor(azar() * matas.length)], materialPasto);
        mata.position.set(x, 0, z);
        mata.rotation.y = azar() * Math.PI * 2;
        mata.scale.setScalar(escala);
        mata.castShadow = true;
        mata.receiveShadow = true;
        prado.add(mata);
      };
      const r = encuadre.radio;
      if (matas.length > 0) {
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2 + azar();
          const d = r * (0.04 + azar() * 0.1);
          sembrar(hocico.x + Math.cos(a) * d, hocico.z + Math.sin(a) * d, 0.8 + azar() * 0.5);
        }
        for (let i = 0; i < 26; i++) {
          const a = azar() * Math.PI * 2;
          const d = r * (0.3 + azar() * 0.8);
          sembrar(Math.cos(a) * d, Math.sin(a) * d, 0.6 + azar() * 0.6);
        }
      }
      escena.add(prado);

      // Suelo, luces y sombra a la escala del modelo.
      suelo.scale.setScalar(r * 3);
      sol.position.set(r * 0.8, r * 5, r * 1);
      contra.position.set(-r * 1.5, r, -r * 1.8);
      Object.assign(sol.shadow.camera, { left: -r * 2.5, right: r * 2.5, top: r * 3, bottom: -r * 2.5, near: 0.01, far: r * 8 });
      sol.shadow.camera.updateProjectionMatrix();
    });

    const ajustar = () => {
      const { clientWidth: ancho, clientHeight: alto } = raiz;
      render.setSize(ancho, alto);
      camara.aspect = ancho / alto;
      encuadrar();
    };
    ajustar();
    const observador = new ResizeObserver(ajustar);
    observador.observe(raiz);

    const reloj = new THREE.Timer();
    render.setAnimationLoop(() => {
      reloj.update();
      const delta = reloj.getDelta();
      if (mezclador && !quieto) {
        mezclador.update(delta);
        girarHuesos();
      }
      controles.update(delta);
      render.render(escena, camara);
    });

    return () => {
      cancelado = true;
      observador.disconnect();
      render.setAnimationLoop(null);
      controles.dispose();
      render.dispose();
      raiz.removeChild(render.domElement);
    };
  }, []);

  return <div ref={contenedor} className="size-full cursor-grab active:cursor-grabbing" />;
}
