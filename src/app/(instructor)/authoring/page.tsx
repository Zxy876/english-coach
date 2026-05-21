import Link from "next/link";
import { prisma } from "@/lib/db";
import { AuthoringConsole } from "./AuthoringConsole";

export const dynamic = "force-dynamic";

export default async function Page() {
  const lessons = await prisma.nceLesson.findMany({
    include: { skeleton: true, book: true },
    orderBy: [{ bookKey: "asc" }, { ordinal: "asc" }],
  });

  const options = lessons
    .filter((l: { skeleton: unknown }) => l.skeleton !== null)
    .map((l: { id: string; bookKey: string; ordinal: number; title: string }) => ({
      id: l.id,
      label: `${l.bookKey} L${l.ordinal} — ${l.title}`,
    }));

  return (
    <main className="min-h-screen p-6 max-w-5xl mx-auto">
      <nav className="text-xs text-[#858585] mb-4 flex gap-2">
        <Link href="/" className="hover:text-white">home</Link>
        <span>/</span>
        <span className="text-[#cccccc]">authoring</span>
      </nav>
      <h1 className="text-2xl font-semibold mb-1">Authoring</h1>
      <p className="text-xs text-[#858585] mb-6">
        Pick a lesson with a skeleton, ask the model for a draft remix, edit
        the fields, then publish. Or paste your own text to build a custom
        lesson first.
      </p>
      <AuthoringConsole lessons={options} />
    </main>
  );
}
