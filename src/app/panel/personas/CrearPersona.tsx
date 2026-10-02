"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { FormularioPersona } from "./FormularioPersona";

/**
 * Alta de una persona.
 *
 * Va detrás de un botón y no desplegado: dar de alta gente es lo que menos se
 * hace en esta pantalla, y tenerlo siempre abierto empuja hacia abajo lo que sí
 * se consulta a diario, que es el censo.
 */
export function CrearPersona() {
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-borde-fuerte bg-fondo px-4 py-2.5 text-sm font-medium text-texto transition-colors hover:border-rojo-acento hover:text-rojo-acento focus-visible:outline-2 focus-visible:outline-rojo-acento"
      >
        <Plus size={15} aria-hidden="true" />
        Dar de alta a alguien
      </button>
    );
  }

  return (
    <div className="rounded-xl bg-superficie p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-texto">Nueva persona</h3>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="text-xs text-texto-suave transition-colors hover:text-texto"
        >
          Cerrar
        </button>
      </div>

      <FormularioPersona alGuardar={() => setAbierto(false)} />
    </div>
  );
}