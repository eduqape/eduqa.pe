import { redirect } from "next/navigation";

export default function Page() {
  redirect("/proximos-cursos?gestion=1#gestion-propuestas");
}
