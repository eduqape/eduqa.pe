import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ScrollText } from "lucide-react";
import { marca } from "@/lib/catalogo";
import { LIMITE_PLAN_GRATIS } from "@/lib/matriculas";

export const metadata: Metadata = {
  title: `Términos del servicio — ${marca.nombre}`,
  description:
    "Las condiciones para usar EDUQA.PE: cuentas, cursos gratuitos y de pago, pagos, constancias, propiedad intelectual y reclamos.",
  alternates: { canonical: "/terminos" },
};

/*
 * Términos del servicio (#105).
 *
 * Como la política de privacidad, describe lo que hace el código y no una
 * plantilla: el límite de cursos gratis sale de `LIMITE_PLAN_GRATIS`, el pago
 * con QR de Niubiz y su vigencia de un día de `src/app/pagar`, y la constancia
 * de `Certificado.tsx`. Si cambia una de esas reglas, hay que actualizar esta
 * página y la fecha. Google los pide en la marca de OAuth (#107).
 */
const ACTUALIZADA = "10 de octubre de 2026";
const CORREO = "alejandroseminariomedina@gmail.com";

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold tracking-tight text-texto">{titulo}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-texto-suave">{children}</div>
    </section>
  );
}

const enlace = "font-medium text-texto underline underline-offset-4 hover:text-rojo-acento";

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-14">
      <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight">
        <ScrollText size={28} className="text-rojo-acento" aria-hidden="true" />
        Términos del servicio
      </h1>
      <p className="mt-3 text-sm text-texto-tenue">Última actualización: {ACTUALIZADA}</p>
      <p className="mt-4 text-sm leading-relaxed text-texto-suave">
        Estos términos regulan el uso de {marca.nombre}, una plataforma de cursos de
        tecnología en línea. Al crear una cuenta o usar el sitio los aceptas. Cómo tratamos
        tus datos personales se explica aparte, en la{" "}
        <Link href="/privacidad" className={enlace}>
          Política de privacidad
        </Link>
        .
      </p>

      <Seccion titulo="1. Quién presta el servicio">
        <p>
          {marca.nombre} está a cargo de Alejandro Valentino Seminario Medina, en el Perú.
          Para cualquier consulta escribe a{" "}
          <a href={`mailto:${CORREO}`} className={enlace}>
            {CORREO}
          </a>
          .
        </p>
      </Seccion>

      <Seccion titulo="2. Qué ofrecemos">
        <p>
          Cursos libres de capacitación en tecnología, con lecciones, ejercicios y, al
          terminarlos, una constancia de participación. Son cursos de formación continua:
          no forman parte de la educación formal, no otorgan grados ni títulos y no están
          reconocidos por el Ministerio de Educación ni por la SUNEDU.
        </p>
      </Seccion>

      <Seccion titulo="3. Tu cuenta">
        <p>
          Puedes entrar con Google, con correo y contraseña o con un código que te enviamos
          por correo. La cuenta es personal: no la compartas ni dejes que otra persona curse
          con ella. Eres responsable de lo que se haga con tu cuenta y de mantener tus datos
          al día.
        </p>
        <p>
          Si tienes menos de 14 años, necesitas que tu padre, madre o apoderado te autorice
          a crear la cuenta.
        </p>
      </Seccion>

      <Seccion titulo="4. Cursos gratuitos y de pago">
        <p>
          Puedes tener hasta {LIMITE_PLAN_GRATIS} cursos gratuitos activos a la vez, con todo
          su material. Los demás se compran uno por uno, al precio en soles que muestra cada
          curso antes de pagar. Un curso comprado no ocupa ninguno de los espacios gratuitos.
        </p>
        <p>
          Al comprar un curso obtienes acceso a su material dentro de la plataforma mientras
          {` ${marca.nombre}`} siga en funcionamiento. Podemos corregir y mejorar el contenido
          de un curso; si lo retiramos, mantendremos el acceso de quienes ya lo compraron o
          te ofreceremos una solución equivalente.
        </p>
      </Seccion>

      <Seccion titulo="5. Pagos">
        <p>
          Los pagos se hacen con un código QR de Niubiz, que vence a las 24 horas de
          generarse. {marca.nombre} no recibe ni guarda datos de tarjetas ni claves
          bancarias. El acceso al curso se activa cuando se confirma el pago.
        </p>
      </Seccion>

      <Seccion titulo="6. Devoluciones">
        <p>
          Si pagaste y no recibiste acceso al curso, o el pago se cobró dos veces, escríbenos
          a{" "}
          <a href={`mailto:${CORREO}`} className={enlace}>
            {CORREO}
          </a>{" "}
          con el número de operación: activaremos el curso o te devolveremos el importe. Para
          cualquier otra disconformidad puedes usar el{" "}
          <Link href="/reclamaciones" className={enlace}>
            Libro de reclamaciones
          </Link>
          , que respondemos en un plazo máximo de 15 días hábiles.
        </p>
      </Seccion>

      <Seccion titulo="7. Constancias">
        <p>
          Al completar un curso puedes recibir una constancia de participación con tu nombre,
          el curso, sus horas y un código. Cualquiera puede comprobar que es auténtica con ese
          código en la página de verificación. La constancia acredita que seguiste el curso;
          no es un título ni un grado académico.
        </p>
      </Seccion>

      <Seccion titulo="8. Propiedad intelectual">
        <p>
          Los cursos, textos, ejercicios, animaciones y diseños de {marca.nombre} son nuestros
          o de sus autores. Puedes usarlos para aprender, pero no copiarlos, revenderlos ni
          publicarlos en otro sitio sin permiso. El código que escribas en los ejercicios es
          tuyo.
        </p>
        <p>
          Los nombres y logotipos de tecnologías de terceros (por ejemplo, Python o Docker) se
          usan solo para identificarlas y pertenecen a sus dueños; no implican que nos
          respalden.
        </p>
      </Seccion>

      <Seccion titulo="9. Uso aceptable">
        <p>
          No uses la plataforma para atacar o sobrecargar el sitio, saltarte los controles de
          acceso, suplantar a otra persona ni publicar contenido ilegal u ofensivo en
          valoraciones o reportes. Si ocurre, podemos suspender o cerrar la cuenta, y te lo
          comunicaremos indicando el motivo.
        </p>
      </Seccion>

      <Seccion titulo="10. Responsabilidad">
        <p>
          Ponemos cuidado en que los cursos sean correctos y en que el sitio funcione, pero
          puede haber errores o interrupciones. Los cursos son material de formación: aplicar
          lo aprendido en tus proyectos queda bajo tu criterio. Nada de esto limita los
          derechos que te reconoce el Código de Protección y Defensa del Consumidor.
        </p>
      </Seccion>

      <Seccion titulo="11. Ley aplicable y reclamos">
        <p>
          Estos términos se rigen por las leyes del Perú. Puedes presentar reclamos o quejas
          en nuestro{" "}
          <Link href="/reclamaciones" className={enlace}>
            Libro de reclamaciones
          </Link>{" "}
          y acudir al Indecopi si lo consideras necesario.
        </p>
      </Seccion>

      <Seccion titulo="12. Cambios a estos términos">
        <p>
          Si cambiamos estos términos, actualizaremos la fecha de arriba y, si el cambio es
          importante, te avisaremos por correo o en la plataforma antes de que se aplique.
        </p>
      </Seccion>
    </div>
  );
}
