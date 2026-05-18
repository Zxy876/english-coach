// NCE lesson player. Sentence-level highlighting driven by `<audio>`
// `timeupdate` events. Click any sentence to jump the audio to that
// timestamp. Designed to be the read-only baseline player; the remix
// surface (R4) will wrap this with a side-by-side editor.
//
// Audio is streamed from upstream until R2.5's mirror script flips the
// `audioUrl` over to a local route.

"use client";

import * as React from "react";

export interface PlayerSentence {
  id: string;
  ordinal: number;
  startMs: number;
  english: string;
  chinese: string;
}

export interface NcePlayerProps {
  audioUrl: string;
  sentences: PlayerSentence[];
  lessonTitle: string;
}

export function NcePlayer({ audioUrl, sentences, lessonTitle }: NcePlayerProps) {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [activeIdx, setActiveIdx] = React.useState(-1);
  const [showTranslation, setShowTranslation] = React.useState(true);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => {
      const currentMs = audio.currentTime * 1000;
      // Find the last sentence whose startMs <= currentMs.
      let idx = -1;
      for (let i = 0; i < sentences.length; i++) {
        if (sentences[i].startMs <= currentMs) idx = i;
        else break;
      }
      setActiveIdx(idx);
    };
    audio.addEventListener("timeupdate", onTimeUpdate);
    return () => audio.removeEventListener("timeupdate", onTimeUpdate);
  }, [sentences]);

  // Auto-scroll active sentence into view.
  const itemRefs = React.useRef<(HTMLLIElement | null)[]>([]);
  React.useEffect(() => {
    if (activeIdx < 0) return;
    const el = itemRefs.current[activeIdx];
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeIdx]);

  function seekTo(startMs: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = startMs / 1000;
    void audio.play();
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold">{lessonTitle}</h1>
        <button
          onClick={() => setShowTranslation((v) => !v)}
          className="text-xs font-mono px-2 py-1 rounded border hover:bg-muted/60"
        >
          {showTranslation ? "hide \u4e2d\u6587" : "show \u4e2d\u6587"}
        </button>
      </header>
      <audio ref={audioRef} src={audioUrl} controls preload="metadata" />
      <ol className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto pr-2">
        {sentences.map((s, i) => {
          const active = i === activeIdx;
          return (
            <li
              key={s.id}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              className={`rounded px-3 py-2 cursor-pointer transition-colors ${
                active
                  ? "bg-[#04395e] text-white"
                  : "hover:bg-[#2a2d2e] text-[#cccccc]"
              }`}
              onClick={() => seekTo(s.startMs)}
            >
              <div className="text-[11px] font-mono opacity-60">
                #{s.ordinal} \u00b7 {formatMs(s.startMs)}
              </div>
              <div className="text-sm">{s.english}</div>
              {showTranslation && s.chinese && (
                <div className="text-xs text-[#858585] mt-0.5">{s.chinese}</div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function formatMs(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
