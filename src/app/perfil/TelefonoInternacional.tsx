"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { PAISES, paisPorCodigo, paisPorTelefono, urlBandera } from "@/lib/paises";

function Bandera({ codigo }: { codigo: string }) {
  return (
    <img
      src={urlBandera(codigo)}
      alt=""
      width={24}
      height={18}
      loading="lazy"
      className="h-[15px] w-5 shrink-0 rounded-[2px] object-cover shadow-[0_0_0_1px_rgba(127,127,127,0.2)]"
      aria-hidden="true"
    />
  );
}

export function TelefonoInternacional({
  telefonoInicial,
  paisInicial,
  nombrePais = "pais",
  idNumero,
  invalido,
  descritoPor,
  alCambiar,
  contenedorLista,
}: {
  telefonoInicial?: string | null;
  paisInicial?: string | null;
  /** `null` omite el campo oculto del país, para formularios que ya tienen uno. */
  nombrePais?: string | null;
  idNumero?: string;
  invalido?: boolean;
  descritoPor?: string;
  /** Avisa del teléfono completo cada vez que cambia el país o el número. */
  alCambiar?: (telefono: string, codigoPais: string) => void;
  /**
   * Dónde montar la lista de países. Dentro de un `<dialog>` modal tiene que
   * ser un nodo del propio diálogo: montada en `body` queda debajo de la capa
   * superior del diálogo, invisible e inerte.
   */
  contenedorLista?: HTMLElement | null;
}) {
  const paisDetectado =
    paisPorCodigo(paisInicial) ??
    paisPorTelefono(telefonoInicial) ??
    paisPorCodigo("PE")!;

  const [codigoPais, setCodigoPais] = useState(paisDetectado.codigo);

  const numeroInicial = useMemo(() => {
    const digitos = (telefonoInicial ?? "").replace(/\D/g, "");
    if (!digitos) return "";

    const prefijo = paisDetectado.prefijo.replace(/\D/g, "");
    return digitos.startsWith(prefijo) ? digitos.slice(prefijo.length) : digitos;
  }, [telefonoInicial, paisDetectado.prefijo]);

  const [numero, setNumero] = useState(numeroInicial);
  const pais = paisPorCodigo(codigoPais) ?? paisDetectado;
  const digitos = numero.replace(/\D/g, "");
  const prefijo = pais.prefijo.replace(/\D/g, "");
  const telefonoCompleto = digitos ? `+${prefijo}${digitos}` : "";

  const avisar = (codigo: string, valor: string) => {
    if (!alCambiar) return;
    const elegido = paisPorCodigo(codigo) ?? pais;
    const soloDigitos = valor.replace(/\D/g, "");
    alCambiar(soloDigitos ? `+${elegido.prefijo.replace(/\D/g, "")}${soloDigitos}` : "", elegido.codigo);
  };

  return (
    <div>
      {nombrePais && <input type="hidden" name={nombrePais} value={pais.codigo} />}
      <input type="hidden" name="telefono" value={telefonoCompleto} />

      <div className="flex w-full overflow-hidden rounded-lg border border-borde-fuerte bg-fondo transition-colors focus-within:border-rojo-acento focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-rojo-acento">
        <Select.Root
          value={codigoPais}
          onValueChange={(codigo) => {
            setCodigoPais(codigo);
            avisar(codigo, numero);
          }}
        >
          <Select.Trigger
            aria-label="País del teléfono"
            className="flex shrink-0 items-center gap-2 border-r border-borde-fuerte px-3 py-2.5 text-sm text-texto outline-none transition-colors hover:bg-superficie"
          >
            <Bandera codigo={pais.codigo} />
            <span className="font-medium">{pais.prefijo}</span>
            <Select.Icon>
              <ChevronDown size={14} className="text-texto-tenue" aria-hidden="true" />
            </Select.Icon>
          </Select.Trigger>

          <Select.Portal container={contenedorLista ?? undefined}>
            <Select.Content
              position="popper"
              sideOffset={6}
              collisionPadding={12}
              className="z-50 max-h-[min(24rem,var(--radix-select-content-available-height))] min-w-72 overflow-hidden rounded-xl border border-borde bg-fondo shadow-xl"
            >
              <Select.ScrollUpButton className="flex h-8 cursor-default items-center justify-center bg-fondo text-texto-tenue">
                <ChevronUp size={15} aria-hidden="true" />
              </Select.ScrollUpButton>

              <Select.Viewport className="p-1">
                {PAISES.map((opcion) => (
                  <Select.Item
                    key={opcion.codigo}
                    value={opcion.codigo}
                    textValue={`${opcion.nombre} ${opcion.prefijo}`}
                    className="relative flex cursor-pointer select-none items-center gap-2.5 rounded-lg py-2 pl-3 pr-9 text-sm text-texto-suave outline-none data-[highlighted]:bg-superficie data-[highlighted]:text-texto data-[state=checked]:font-medium data-[state=checked]:text-rojo-acento"
                  >
                    <Bandera codigo={opcion.codigo} />
                    <Select.ItemText>
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate">{opcion.nombre}</span>
                        <span className="shrink-0 text-texto-tenue">{opcion.prefijo}</span>
                      </span>
                    </Select.ItemText>
                    <Select.ItemIndicator className="absolute right-3 inline-flex items-center">
                      <Check size={14} aria-hidden="true" />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.Viewport>

              <Select.ScrollDownButton className="flex h-8 cursor-default items-center justify-center bg-fondo text-texto-tenue">
                <ChevronDown size={15} aria-hidden="true" />
              </Select.ScrollDownButton>
            </Select.Content>
          </Select.Portal>
        </Select.Root>

        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={numero}
          id={idNumero}
          aria-invalid={invalido || undefined}
          aria-describedby={descritoPor}
          onChange={(event) => {
            setNumero(event.target.value);
            avisar(codigoPais, event.target.value);
          }}
          maxLength={20}
          placeholder="987 654 321"
          aria-label="Número de teléfono"
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-texto outline-none placeholder:text-texto-tenue"
        />
      </div>
    </div>
  );
}
