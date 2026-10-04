/**
 * Roles del equipo y cómo se agrupan.
 *
 * Se guardan como una lista en `personas_roles` y no como una columna porque
 * una persona puede tener varios: quien da clase y además desarrolla es las dos
 * cosas a la vez, y un único campo obligaría a elegir una.
 *
 * Los nombres son deliberadamente neutros ("trabajador", no "empleado"): el
 * mismo rol cubre a quien está en planilla y a quien disfruta de la freedom
 * Contracting que ya usa el equipo.
 */
export const ROLES_PERSONA = [
  "trabajador",
  "profesor",
  "ingeniero_software",
  "practicante",
  "director",
  "ponente",
  "invitado",
] as const;

export type RolPersona = (typeof ROLES_PERSONA)[number];

export const ETIQUETA_ROL: Record<RolPersona, string> = {
  trabajador: "Trabajador",
  profesor: "Profesor",
  ingeniero_software: "Ingeniero de software",
  practicante: "Practicante",
  director: "Director",
  ponente: "Ponente",
  invitado: "Invitado",
};

/**
 * Planta y huéspedes no se gestionan igual: los primeros tienen continuidad y
 * dependen de la empresa, los segundos aparecen por un evento y se retiran
 * solos. En la web se muestran en secciones distintas por eso.
 */
export const GRUPOS_PERSONA = {
  interna: ["trabajador", "profesor", "ingeniero_software", "practicante", "director"],
  huesped: ["ponente", "invitado"],
} as const satisfies Record<string, readonly RolPersona[]>;

export type GrupoPersona = keyof typeof GRUPOS_PERSONA;

export const ETIQUETA_GRUPO: Record<GrupoPersona, string> = {
  interna: "Equipo",
  huesped: "Ponentes e invitados",
};

/**
 * Quién aparece en la sección "Quién enseña" de la portada.
 *
 * No sale todo el mundo: un practicante o un invitado sin clases no tiene por
 * qué encabezar la web. Quien solo tenga un rol fuera de esta lista sigue
 * apareciendo en /equipo, que sí es el listado completo.
 */
export const ROLES_ENSENAN: readonly RolPersona[] = [
  "profesor",
  "ingeniero_software",
  "director",
];

export function esRolPersona(valor: unknown): valor is RolPersona {
  return typeof valor === "string" && (ROLES_PERSONA as readonly string[]).includes(valor);
}

export function esGrupoPersona(valor: unknown): valor is GrupoPersona {
  return valor === "interna" || valor === "huesped";
}

/** A qué grupo pertenece un rol. Los huéspedes mandan sobre la planta. */
export function grupoDeRol(rol: RolPersona): GrupoPersona {
  return (GRUPOS_PERSONA.huesped as readonly RolPersona[]).includes(rol) ? "huesped" : "interna";
}

/** Un rol de la lista que sigue a `preferido`, o el propio si no hay ninguno. */
export function rolPrincipal(
  roles: readonly RolPersona[],
  preferido: readonly RolPersona[],
): RolPersona | null {
  for (const rol of preferido) {
    if (roles.includes(rol)) return rol;
  }
  return roles[0] ?? null;
}

/**
 * En qué situación está una ficha, como un solo valor.
 *
 * La base guarda dos banderas (`visible` es editorial, `activo` es laboral),
 * pero en el panel se elegían por separado y permitían combinaciones que nadie
 * entendía: "visible" e "inactiva" a la vez no sale en la web, aunque la casilla
 * dijera lo contrario. Se presentan como tres estados excluyentes.
 */
export const ESTADOS_FICHA = ["publicada", "oculta", "baja"] as const;

export type EstadoFicha = (typeof ESTADOS_FICHA)[number];

export const ETIQUETA_ESTADO_FICHA: Record<EstadoFicha, string> = {
  publicada: "Publicada",
  oculta: "Sin publicar",
  baja: "De baja",
};

export const AYUDA_ESTADO_FICHA: Record<EstadoFicha, string> = {
  publicada: "Sale en /equipo y, si enseña, en la portada.",
  oculta: "Solo la ve el panel. Útil mientras completas la ficha.",
  baja: "Ya no forma parte del equipo. Se conserva la ficha, fuera de la web.",
};

export function esEstadoFicha(valor: unknown): valor is EstadoFicha {
  return typeof valor === "string" && (ESTADOS_FICHA as readonly string[]).includes(valor);
}

export function estadoFicha(persona: { visible: boolean; activo: boolean }): EstadoFicha {
  if (!persona.activo) return "baja";
  return persona.visible ? "publicada" : "oculta";
}

export function banderasDeEstado(estado: EstadoFicha): { visible: boolean; activo: boolean } {
  if (estado === "publicada") return { visible: true, activo: true };
  if (estado === "oculta") return { visible: false, activo: true };
  return { visible: false, activo: false };
}

/** Las iniciales que ocupan el lugar de la foto mientras no haya una. */
export function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Lo que le falta a una ficha para verse completa en la web.
 *
 * No impide publicar: una persona recién llegada puede salir sin foto. Sirve
 * para que el panel diga qué completar en vez de que haya que adivinarlo
 * comparando tarjetas.
 */
export function faltantesFicha(persona: {
  foto_url: string | null;
  titulo_profesional: string | null;
  biografia: string | null;
  redes: readonly unknown[];
}): string[] {
  const faltan: string[] = [];
  if (!persona.foto_url) faltan.push("foto");
  if (!persona.titulo_profesional) faltan.push("título");
  if (!persona.biografia) faltan.push("biografía");
  if (persona.redes.length === 0) faltan.push("redes");
  return faltan;
}

/** Lo que acepta el bucket `personas-fotos`; el panel lo comprueba antes de subir. */
export const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp"] as const;
export const PESO_MAXIMO_FOTO = 2 * 1024 * 1024;
