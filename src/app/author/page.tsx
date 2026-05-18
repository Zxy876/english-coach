// /author redirects to the new (instructor)/authoring console (R8).
import { redirect } from "next/navigation";

export default function AuthorPage() {
  redirect("/authoring");
}
