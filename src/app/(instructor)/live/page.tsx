import Link from "next/link";
import { LiveTable } from "./LiveTable";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <main className="min-h-screen p-6 max-w-5xl mx-auto">
      <nav className="text-xs text-[#858585] mb-4 flex gap-2">
        <Link href="/" className="hover:text-white">home</Link>
        <span>/</span>
        <span className="text-[#cccccc]">instructor · live</span>
      </nav>
      <h1 className="text-2xl font-semibold mb-1">Live class</h1>
      <p className="text-xs text-[#858585] mb-4">
        SSE-driven. One line per active remix session. Click a row to open
        the reasoning view.
      </p>
      <LiveTable />
    </main>
  );
}
