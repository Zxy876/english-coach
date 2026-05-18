"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function StartButton({ exerciseId }: { exerciseId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    try {
      const res = await fetch(`/api/exercises/${exerciseId}/start`, {
        method: "POST",
      });
      if (!res.ok) {
        setBusy(false);
        return;
      }
      const { sessionId } = (await res.json()) as { sessionId: string };
      router.push(`/sessions/${sessionId}`);
    } catch {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="text-xs font-mono px-3 py-1 rounded bg-[#04395e] hover:bg-[#0e639c] text-white disabled:opacity-50"
    >
      {busy ? "starting…" : "start →"}
    </button>
  );
}
