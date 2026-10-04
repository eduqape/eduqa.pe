import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { marca } from "@/lib/catalogo";

export const metadata: Metadata = {
  title: `Política de privacidad — ${marca.nombre}`,
  description:
    "Qué datos personales recoge EDUQA.PE, para qué los usa, con quién los comparte y cómo ejercer tus derechos.",
  alternates: { canonical: "/privacidad" },
};

/**
 * Política de privacidad (#104).
 *
 * Describe lo que hace el código, no una plantilla: cada dato y cada servicio
 * de la lista se comprobó en la base y en las integraciones. Si se suma una
 * tabla con datos personales o un proveedor nuevo, hay que actualizar esta
 * página y la fecha de abajo. Google la exige para publicar el acceso con
 * Google (marca de OAuth, #107).
 */
const ACTUALIZADA = "4 de octubre de 2026";
const CORREO = "alejandroseminariomedina@gmail.com";

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold tracking-tight text-texto">{titulo}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-texto-suave">{children}</div>
    </section>
  );
}

function Dato({ nombre, children }: { nombre: string; children: ReactNode }) {
  return (
    <div className="border-t border-borde py-3 first:border-t-0 first:pt-0">
      <dt className="font-medium text-texto">{nombre}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-14">
      <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight">
        <ShieldCheck size={28} className="text-rojo-acento" aria-hidden="true" />
        Política de privacidad
      </h1>
      <p className="mt-3 text-sm text-texto-tenue">Última actualización: {ACTUALIZADA}</p>
      <p className="mt-4 text-sm leading-relaxed text-texto-suave">
        Esta política explica qué datos personales recoge {marca.nombre}, para qué los
        usamos, con quién los compartimos y cómo puedes ejercer tus derechos. Se rige por
        la Ley N.° 29733, Ley de Protección de Datos Personales del Perú, y su reglamento.
      </p>

      <Seccion titulo="1. Quién es responsable de tus datos">
        <p>
          El responsable del tratamiento es Alejandro Valentino Seminario Medina, a cargo de{" "}
          {marca.nombre}. Para cualquier consulta sobre tus datos escribe a{" "}
          <a href={`mailto:${CORREO}`} className="font-medium text-texto underline underline-offset-4 hover:text-rojo-acento">
            {CORREO}
          </a>
          .
        </p>
      </Seccion>

      <Seccion titulo="2. Qué datos recogemos">
        <dl>
          <Dato nombre="Cuenta">
            Tu nombre y correo. Si entras con Google, Google nos entrega tu nombre, tu
            correo y tu foto de perfil; no recibimos tu contraseña de Google ni acceso a tu
            Gmail, Drive u otros servicios. Si entras con contraseña o con un código por
            correo, guardamos la contraseña cifrada; nunca en texto legible.
          </Dato>
          <Dato nombre="Perfil">
            Lo que completes en tu perfil: teléfono con su país y foto.
          </Dato>
          <Dato nombre="Cursos y aprendizaje">
            Tus matrículas, las lecciones que vas viendo (progreso), las valoraciones y
            comentarios que dejes sobre un curso, y tus certificados (nombre, curso, horas,
            fecha y código de verificación).
          </Dato>
          <Dato nombre="Pagos">
            El concepto, el monto, el estado y los números de operación del pago. Los pagos
            se hacen con un código QR de Niubiz: {marca.nombre} no recibe ni guarda datos
            de tarjetas ni claves bancarias.
          </Dato>
          <Dato nombre="Libro de Reclamaciones">
            Lo que pide la norma para registrar un reclamo o una queja: nombre, tipo y número
            de documento, correo, teléfono, domicilio, el bien o servicio y el monto, el
            detalle del reclamo y tu pedido; si eres menor de edad, también el nombre de tu
            padre, madre o apoderado.
          </Dato>
          <Dato nombre="Reportes de errores">
            Si reportas un problema desde la plataforma: la descripción, la página donde
            ocurrió, el navegador que usabas y las imágenes que adjuntes.
          </Dato>
          <Dato nombre="Equipo docente">
            De quienes forman el equipo: nombre, título, foto, biografía, redes y, solo para
            uso interno, correo y teléfono.
          </Dato>
          <Dato nombre="Uso del sitio">
            Datos de navegación agregados (páginas visitadas, dispositivo, origen de la
            visita) mediante Google Tag Manager, para entender cómo se usa el sitio.
          </Dato>
        </dl>
      </Seccion>

      <Seccion titulo="3. Para qué los usamos">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Crear y proteger tu cuenta, e iniciar tu sesión.</li>
          <li>Darte acceso a los cursos que compraste o tienes habilitados y guardar tu avance.</li>
          <li>Procesar y confirmar tus pagos.</li>
          <li>Emitir tus certificados y permitir que cualquiera compruebe que son auténticos.</li>
          <li>Enviarte correos sobre tu cuenta, tus cursos y tus certificados.</li>
          <li>Atender reclamos, quejas y reportes de errores.</li>
          <li>Mejorar el sitio a partir de cómo se usa.</li>
        </ul>
        <p>No vendemos tus datos ni los usamos para publicidad de terceros.</p>
      </Seccion>

      <Seccion titulo="4. Por qué podemos usarlos">
        <p>
          Usamos tus datos porque los necesitamos para prestarte el servicio que pides
          (tu cuenta, tus cursos, tus pagos y tus certificados), porque una norma nos obliga
          (por ejemplo, el Libro de Reclamaciones y las normas tributarias) o porque nos diste
          tu consentimiento (por ejemplo, para medir el uso del sitio). Puedes
          retirar tu consentimiento cuando quieras, sin efecto sobre lo ya hecho.
        </p>
      </Seccion>

      <Seccion titulo="5. Con quién los compartimos">
        <p>
          Para funcionar usamos proveedores que tratan datos por encargo nuestro y solo
          para ese fin:
        </p>
        <dl>
          <Dato nombre="Supabase">Base de datos, cuentas y archivos. Servidores en Estados Unidos.</Dato>
          <Dato nombre="Vercel">Alojamiento del sitio. Servidores en Estados Unidos y otras regiones.</Dato>
          <Dato nombre="Google">Inicio de sesión con Google y medición de uso del sitio (Google Tag Manager).</Dato>
          <Dato nombre="Niubiz">Procesamiento de pagos con código QR, en el Perú.</Dato>
          <Dato nombre="Resend">Envío de correos, como el de tus certificados. Servidores en Estados Unidos.</Dato>
        </dl>
        <p>
          Como varios de estos servidores están fuera del Perú, al usar {marca.nombre} tus
          datos se transfieren a otros países. Solo trabajamos con proveedores que aplican
          medidas de seguridad adecuadas. También entregaremos datos a una autoridad cuando
          la ley lo exija.
        </p>
      </Seccion>

      <Seccion titulo="6. Qué es público">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="font-medium text-texto">Certificados:</strong> quien tenga el
            código de un certificado puede ver en la página de verificación el nombre del
            alumno, el curso, las horas y la fecha. Así se comprueba que es auténtico.
          </li>
          <li>
            <strong className="font-medium text-texto">Docentes:</strong> el nombre, el título,
            la foto, la biografía y las redes de los docentes aparecen en la página principal
            del sitio. Su correo y su teléfono nunca se publican.
          </li>
        </ul>
      </Seccion>

      <Seccion titulo="7. Cuánto tiempo los guardamos">
        <p>
          Mientras tu cuenta esté activa. Si pides que la eliminemos, borramos tus datos,
          salvo los que una norma nos obliga a conservar por un plazo (por ejemplo, los
          registros de pagos y las hojas del Libro de Reclamaciones), que se guardan solo
          durante ese plazo. Los certificados emitidos se conservan para que su verificación
          siga funcionando, salvo que pidas anularlos.
        </p>
      </Seccion>

      <Seccion titulo="8. Cookies y almacenamiento en tu navegador">
        <p>
          Usamos cookies necesarias para mantener tu sesión iniciada, y Google Tag Manager
          puede usar cookies para medir las visitas. También guardamos en tu navegador algunas
          preferencias, como cómo prefieres ver ciertas listas. Puedes borrar las cookies desde
          tu navegador; si borras las de sesión, tendrás que volver a entrar.
        </p>
      </Seccion>

      <Seccion titulo="9. Tus derechos">
        <p>
          Puedes pedir en cualquier momento acceder a tus datos, rectificarlos, cancelarlos
          (eliminarlos) u oponerte a su uso (derechos ARCO), y retirar tu consentimiento.
          Escribe a{" "}
          <a href={`mailto:${CORREO}`} className="font-medium text-texto underline underline-offset-4 hover:text-rojo-acento">
            {CORREO}
          </a>{" "}
          desde el correo de tu cuenta, indicando qué pides. Te responderemos dentro de los
          plazos que fija la ley.
        </p>
        <p>
          Si no estás conforme con la respuesta, puedes presentar un reclamo ante la Autoridad
          Nacional de Protección de Datos Personales del Ministerio de Justicia y Derechos
          Humanos.
        </p>
      </Seccion>

      <Seccion titulo="10. Menores de edad">
        <p>
          Si tienes menos de 14 años, necesitas que tu padre, madre o apoderado autorice el uso
          de tus datos antes de crear una cuenta o dejar tus datos en el sitio.
        </p>
      </Seccion>

      <Seccion titulo="11. Seguridad">
        <p>
          Protegemos tus datos con conexiones cifradas (HTTPS), contraseñas cifradas y reglas
          de acceso en la base de datos que impiden que una persona vea los datos de otra.
          Ningún sistema es infalible: si detectamos un incidente que afecte tus datos, te lo
          comunicaremos.
        </p>
      </Seccion>

      <Seccion titulo="12. Cambios a esta política">
        <p>
          Si cambiamos esta política, actualizaremos la fecha de arriba y, si el cambio es
          importante, te avisaremos por correo o en la plataforma.
        </p>
      </Seccion>
    </div>
  );
}
