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