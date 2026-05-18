"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface SessionRow {
  sessionId: string;
  studentId: string;
  exerciseTitle: string;
  currentPhase: number;
  completed: boolean;
  lastActiveAt: string;
  startedAt: string;
  summary: string;
  flags: string[];
}

const FLAG_COLOR: Record<string, string> = {
  stuck_signal: "text-red-400",
  plan_loop: "text-amber-300",
  missing_required_node: "text-red-400",
  drift_heavy: "text-amber-300",
  high_performer: "text-emerald-400",
  completed: "text-[#858585]",
};

export function LiveTable() {
  const [rows, setRows] = useState<Record<string, SessionRow>>({});
  const [status, setStatus] = useState<"connecting" | "open" | "closed">("connecting");
  const [lastTick, setLastTick] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/instructor/live");
    esRef.current = es;
    es.onopen = () => setStatus("open");
    es.onerror = () => setStatus("closed");
    es.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.kind === "session") {
          setRows((r) => ({ ...r, [msg.sessionId]: msg as SessionRow }));
        } else if (msg.kind === "tick") {
          setLastTick(msg.at);
        }
      } catch {
        // ignore
      }
    };
    return () => {
      es.close();
    };
  }, []);

  const list = Object.values(rows).sort(
    (a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime(),
  );

  return (
    <div>
      <div className="text-xs font-mono text-[#858585] mb-2 flex gap-3">
        <span>status: {status}</span>
        {lastTick && <span>last tick: {new Date(lastTick).toLocaleTimeString()}</span>}
        <span>sessions: {list.length}</span>
      </div>
      <table className="w-full text-xs border border-[#3c3c3c]">
        <thead className="bg-[#2d2d2d]">
          <tr>
            <th className="p-1 text-left">student</th>
            <th className="p-1 text-left">exercise</th>
            <th className="p-1 text-left">phase</th>
            <th className="p-1 text-left">summary</th>
            <th className="p-1 text-left">flags</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-3 text-center text-[#858585]">
                Waiting for sessions…
              </td>
            </tr>
          ) : (
            list.map((s) => (
              <tr key={s.sessionId} className="border-t border-[#3c3c3c] hover:bg-[#252526]">
                <td className="p-1 font-mono">
                  <Link
                    href={`/reasoning/${s.sessionId}`}
                    className="text-[#3794ff] hover:underline"
                  >
                    {s.studentId}
                  </Link>
                </td>
                <td className="p-1">{s.exerciseTitle}</td>
                <td className="p-1 font-mono">
                  {s.currentPhase}
                  {s.completed && "✓"}
                </td>
                <td className="p-1">{s.summary}</td>
                <td className="p-1 font-mono">
                  {s.flags.map((f) => (
                    <span
                      key={f}
                      className={`mr-1 ${FLAG_COLOR[f] ?? ""}`}
                    >
                      {f}
                    </span>
                  ))}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
