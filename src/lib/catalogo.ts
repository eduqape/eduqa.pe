import type { IconoNombre } from "@/components/Iconos";

// Catálogo EDUQA.PE — tomado de la hoja CURSOS STD del Excel.
// Todos los cursos son de 4 horas en vivo salvo los EXPRESS.

export const marca = {
  nombre: "EDUQA.PE",
  lema: "Democratizando la educación en tecnología",
  gancho:
    "Cursos cortos de tecnología dictados en directo, en español y desde Perú. Nada pregrabado, nada de ver videos solo a las once de la noche.",
  precio: 20,
  moneda: "S/",
  ciudad: "Lima, Perú",
};

export const promesas = [
  {
    titulo: "Nunca vamos a ser pregrabados",
    texto:
      "No es una limitación de arranque, es la decisión de fondo. Si algo no se entiende, se explica ahí mismo. Un video no hace eso.",
  },
  {
    titulo: "Nichos que nadie dicta acá",
    texto:
      "Visión por computadora, MLOps, ingeniería de datos, despliegue real. No otro curso de Excel avanzado.",
  },
  {
    titulo: "Quien dicta construye esto en producción",
    texto:
      "Los ejemplos salen de sistemas que corren de verdad, no de un notebook armado para la clase.",
  },
  {
    titulo: "Precio de acá, pago de acá",
    texto:
      "Veinte soles por curso. Se paga por Yape o Plin, sin tarjeta internacional ni suscripción que se renueva sola.",
  },
];

export type Nivel = "INTRODUCCIÓN" | "INTERMEDIO" | "AVANZADO" | "HARDMODE";

export type Curso = {
  id: string;
  nombre: string;
  nivel: Nivel;
  horas: number;
  express?: boolean;
  /** Icono obligatorio para cada curso del catálogo. */
  icono: IconoNombre;
};

export type Area = {
  id: string;
  nombre: string;
  descripcion: string;
  cursos: Curso[];
};

export const areas: Area[] = [
  {
    id: "IA",
    nombre: "Inteligencia Artificial",
    descripcion: "De usar un chatbot a montar sistemas que razonan sobre tus datos.",
    cursos: [
      { id: "IA01A", nombre: "Introducción a NotebookLM", nivel: "INTRODUCCIÓN", horas: 2, express: true, icono: "notebooklm" },
      { id: "IA01", nombre: "Introducción a la IA Generativa", nivel: "INTRODUCCIÓN", horas: 4, icono: "gemini" },
      { id: "IA02", nombre: "IA Generativa intermedio", nivel: "INTERMEDIO", horas: 4, icono: "gemini" },
      { id: "IA03", nombre: "IA Generativa avanzada", nivel: "AVANZADO", horas: 4, icono: "gemini" },
      { id: "IA04", nombre: "IA Generativa nivel PhD", nivel: "HARDMODE", horas: 4, icono: "gemini" },
    ],
  },
  {
    id: "ML",
    nombre: "Machine Learning",
    descripcion: "Modelos que funcionan fuera del notebook.",
    cursos: [
      { id: "ML01", nombre: "Fundamentos de Machine Learning", nivel: "INTRODUCCIÓN", horas: 4, icono: "scikitlearn" },
      { id: "ML02", nombre: "Machine Learning intermedio", nivel: "INTERMEDIO", horas: 4, icono: "scikitlearn" },
      { id: "ML03", nombre: "Machine Learning avanzado", nivel: "AVANZADO", horas: 4, icono: "pytorch" },
    ],
  },
  {
    id: "DEVOPS",
    nombre: "DevOps",
    descripcion: "Que lo que escribiste llegue a un servidor y no se caiga.",
    cursos: [
      { id: "DK01", nombre: "Introducción a Docker", nivel: "INTRODUCCIÓN", horas: 4, icono: "docker" },
      { id: "DK02", nombre: "Docker intermedio", nivel: "INTERMEDIO", horas: 4, icono: "docker" },
      { id: "DK03", nombre: "Docker avanzado", nivel: "AVANZADO", horas: 4, icono: "docker" },
      { id: "GA01A", nombre: "GitHub Actions", nivel: "INTERMEDIO", horas: 3, express: true, icono: "githubactions" },
      { id: "DP01", nombre: "Despliegue de aplicaciones", nivel: "INTERMEDIO", horas: 4, icono: "nube" },
      { id: "DP02", nombre: "Despliegue de aplicaciones avanzado", nivel: "AVANZADO", horas: 4, icono: "nube" },
    ],
  },
  {
    id: "DATA",
    nombre: "Ingeniería de Datos",
    descripcion: "Mover datos de un lado a otro sin que se rompa a las 3 de la mañana.",
    cursos: [
      { id: "DE01", nombre: "Fundamentos de ETL", nivel: "INTRODUCCIÓN", horas: 4, icono: "datos" },
      { id: "DE02", nombre: "ETL intermedio", nivel: "INTERMEDIO", horas: 4, icono: "pandas" },
      { id: "DE03", nombre: "ETL avanzado", nivel: "AVANZADO", horas: 4, icono: "datos" },
    ],
  },
  {
    id: "LENG",
    nombre: "Lenguajes",
    descripcion: "Python, de cero hasta escribir código que otro puede mantener.",
    cursos: [
      { id: "PY01", nombre: "Fundamentos de Python", nivel: "INTRODUCCIÓN", horas: 4, icono: "python" },
      { id: "PY02", nombre: "Python intermedio", nivel: "INTERMEDIO", horas: 4, icono: "python" },
      { id: "PY03", nombre: "Python avanzado", nivel: "AVANZADO", horas: 4, icono: "python" },
    ],
  },
  {
    id: "BACK",
    nombre: "Backend",
    descripcion: "APIs que aguantan usuarios reales.",
    cursos: [
      { id: "FS01", nombre: "Introducción a FastAPI", nivel: "INTRODUCCIÓN", horas: 4, icono: "fastapi" },
      { id: "FS02", nombre: "FastAPI intermedio", nivel: "INTERMEDIO", horas: 4, icono: "fastapi" },
      { id: "FS03", nombre: "FastAPI avanzado", nivel: "AVANZADO", horas: 4, icono: "fastapi" },
    ],
  },
  {
    id: "BBDD",
    nombre: "Bases de Datos",
    descripcion: "SQL y modelado, que es donde se cae la mitad de los proyectos.",
    cursos: [
      { id: "BD01", nombre: "Fundamentos de SQL", nivel: "INTRODUCCIÓN", horas: 4, icono: "postgresql" },
      { id: "BD02", nombre: "SQL intermedio", nivel: "INTERMEDIO", horas: 4, icono: "postgresql" },
      { id: "BD03", nombre: "SQL avanzado", nivel: "AVANZADO", horas: 4, icono: "postgresql" },
      { id: "BD04", nombre: "Modelado entidad-relación", nivel: "INTERMEDIO", horas: 2, express: true, icono: "postgresql" },
    ],
  },
];

export const comoFunciona = [
  {
    titulo: "Cuatro horas, un sábado",
    texto:
      "Una sola sesión en vivo, casi siempre por Google Meet. Entras, sales sabiendo hacer algo.",
  },
  {
    titulo: "Veinte soles",
    texto: "El mismo precio para todo el catálogo. Se paga por Yape o Plin.",
  },
  {
    titulo: "Con grabación",
    texto: "Queda grabado 30 días por si te lo perdiste o quieres repasar.",
  },
  {
    titulo: "Repositorio incluido",
    texto: "Todo el código de la sesión en un repo de GitHub que te llevas.",
  },
];

/*
 * Quien integra el equipo ya no vive aquí.
 *
 * Antes esta constante era `instructor`, con nombre, título, biografía y redes
 * escritas a mano, y la portada las pintaba directamente. Ahora todo eso está
 * en la tabla `personas`, que se gestiona en /panel/personas, así que añadir o
 * retirar a alguien del equipo no obliga a tocar TypeScript ni redesplegar.
 *
 * Lo que queda en este archivo es copy de marca: textos que no son el registro
 * de nadie. La llamada a dictar es una de ellos y por eso sigue aquí, y no como
 * una fila más de `personas`: no es una persona, es un hueco por llenar.
 */

export const plazaLibre = {
  titulo: "Estamos buscando más docentes",
  texto: "Este espacio es para el siguiente. Si crees que es el tuyo, escríbenos.",
  correo: "docentes@eduqa.pe",
};

export const faq = [
  {
    p: "¿Por qué todo cuesta lo mismo?",
    r: "Porque el precio no debería decidir qué aprendes. Veinte soles por cualquier curso del catálogo, sea introducción o el más difícil.",
  },
  {
    p: "¿De verdad nunca van a vender cursos grabados?",
    r: "No. La grabación es un respaldo para quien ya compró la sesión en vivo, no un producto aparte.",
  },
  {
    p: "¿Necesito saber programar?",
    r: "Depende del curso. Cada uno dice su nivel: introducción no asume nada, avanzado sí.",
  },
  {
    p: "¿Tengo que pagar para empezar?",
    r: "No. Con la cuenta gratuita puedes estar matriculado en dos cursos a la vez y ver todo su material. Recién cuando quieres un tercero al mismo tiempo se paga ese curso.",
  },
  {
    p: "¿Cómo se paga?",
    r: "La plataforma genera un código QR y lo escaneas con Yape o Plin desde el celular. El acceso se abre cuando el pago se confirma, sin que tengas que mandar el número de operación a nadie.",
  },
  {
    p: "¿Dan certificado?",
    r: "Constancia de participación con tu nombre, las horas cursadas y un código de emisión. No es un título universitario y no te lo vamos a vender como tal.",
  },
];
