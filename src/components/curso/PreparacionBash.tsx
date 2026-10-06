"use client";

import { useEffect, useSyncExternalStore } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { estadoBash, prepararBash, suscribirseBash } from '@/lib/bash-web';

const CLAVE_RECARGA = 'eduqa:bash-recarga';

/**
 * Las cabeceras COOP y COEP solo surten efecto al cargar el documento. Si se
 * llegó a la lección navegando dentro de la aplicación, la página sigue sin
 * aislar y Bash no puede arrancar: se recarga una vez. Si tras recargar el
 * navegador sigue sin aislarla (Safari no admite COEP `credentialless`), no
 * se insiste y el bloque conserva su salida de referencia.
 */
function recargarSiHaceFalta(): boolean {
  try {
    if (window.crossOriginIsolated) {
      sessionStorage.removeItem(CLAVE_RECARGA);
      return false;
    }
    if (sessionStorage.getItem(CLAVE_RECARGA) === location.pathname) return false;
    sessionStorage.setItem(CLAVE_RECARGA, location.pathname);
  } catch {
    return false;
  }
  location.reload();
  return true;
}

export function PreparacionBash() {
  const estado = useSyncExternalStore(suscribirseBash, estadoBash, () => 'sin-empezar' as const);
  useEffect(() => {
    if (!recargarSiHaceFalta()) void prepararBash();
  }, []);

  return <div role="status" aria-live="polite" data-preparacion-bash={estado} className="mt-4 flex flex-wrap items-center gap-2 text-xs text-texto-suave">
    {estado === 'no-disponible' ? <span>Este navegador no permite ejecutar Bash aquí. Cada bloque muestra su salida de referencia; para ejecutarlos, abre la lección en Chrome, Edge o Firefox.</span>
    : estado === 'error' ? <>
      <span>No pudimos preparar Bash.</span>
      <button type="button" onClick={() => void prepararBash()} className="font-medium text-rojo-acento underline">Reintentar</button>
    </> : estado === 'listo' ? <>
      <Check size={14} aria-hidden="true" className="text-exito" />Bash listo para ejecutar
    </> : <>
      <Loader2 size={14} aria-hidden="true" className="animate-spin" />Preparando Bash… Puedes seguir leyendo.
    </>}
  </div>;
}
