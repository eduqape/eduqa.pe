import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * En Next 16 el archivo `middleware` pasó a llamarse `proxy`. Corre en cada
 * petición y cumple dos funciones:
 *
 *   1. Refrescar el token de sesión de Supabase y reescribir las cookies.
 *      Sin esto la sesión caduca y los Server Components ven al usuario
 *      como anónimo aunque haya iniciado sesión.
 *   2. Filtrar de forma optimista las rutas protegidas.
 *
 * La comprobación de aquí es solo un primer filtro. La autorización real
 * se verifica de nuevo en cada página protegida, porque proxy corre también
 * sobre rutas precargadas y no debe ser la única barrera.
 */
const RUTAS_PROTEGIDAS = [
  "/panel",
  "/pagar",
  "/perfil",
  "/ajustes",
  "/compras",
  "/certificaciones",
];

/*
 * `/cursos` a secas es la lista de matrículas de quien entra, así que exige
 * sesión. Sus hijas no se filtran aquí: si una lección es de acceso libre
 * depende de una marca en la base que proxy no consulta, y hacerlo obligaría
 * a una segunda ida a Supabase en cada petición. Esas páginas resuelven su
 * propio acceso, que de todas formas es donde se autoriza de verdad.
 */
const RUTAS_PROTEGIDAS_EXACTAS = ["/cursos"];

export default async function proxy(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesNuevas) {
          cookiesNuevas.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          respuesta = NextResponse.next({ request });
          cookiesNuevas.forEach(({ name, value, options }) =>
            respuesta.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // No introducir lógica entre createServerClient y getUser: cualquier cosa
  // en medio puede hacer que la sesión se cierre de forma intermitente.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ruta = request.nextUrl.pathname;
  const protegida =
    RUTAS_PROTEGIDAS.some((r) => ruta.startsWith(r)) ||
    RUTAS_PROTEGIDAS_EXACTAS.includes(ruta);

  if (protegida && !user) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/acceder";
    destino.searchParams.set("volverA", ruta);
    return NextResponse.redirect(destino);
  }

  if ((ruta === "/acceder" || ruta === "/registro") && user) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/panel";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  if (RE_LECCION_BASH.test(ruta)) {
    respuesta.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    respuesta.headers.set("Cross-Origin-Embedder-Policy", "credentialless");
  }

  return respuesta;
}

/*
 * Bash corre en WebAssembly con varios Workers que comparten memoria, y eso
 * exige un documento aislado. `credentialless` en lugar de `require-corp`
 * permite seguir cargando imágenes y scripts de otros orígenes sin que
 * declaren CORP. Se limita a las lecciones de cursos cuyo slug contiene
 * `bash` para no cambiar el comportamiento del resto del sitio.
 */
const RE_LECCION_BASH = /^\/cursos\/[a-z0-9-]*bash[a-z0-9-]*\/(?!informacion$)[a-z0-9-]+$/;

export const config = {
  // Se excluyen estáticos e imágenes: no necesitan sesión y encarecerían
  // cada petición con una llamada de red a Supabase.
  matcher: [
    "/((?!_next/static|_next/image|vendor/|fortran/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
