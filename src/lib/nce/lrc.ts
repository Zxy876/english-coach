// LRC parser. Mirrors the parsing logic in the upstream NCE site
// (`NCE/js/main.js` -> class LRCParser) so the persisted timestamps line
// up exactly with whatever the upstream player would show. The upstream
// nudges every timestamp back by 0.5 s to compensate for highlight
// latency; we keep that nudge here so our own React player can drive its
// highlights from `startMs` directly.
//
// Each LRC body line looks like:
//   [mm:ss.xx]English text | Chinese text
// The `xx` may be 2 or 3 digits. Metadata lines (`[al:...]`, `[ti:...]`)
// do not match the body regex and are ignored.

const LINE_RE = /^\[(\d{2}):(\d{2})\.(\d{2,3})\](.+)$/;

export interface ParsedSentence {
  startMs: number;
  english: string;
  chinese: string;
}

export function parseLrc(lrcText: string): ParsedSentence[] {
  const out: ParsedSentence[] = [];

  for (const rawLine of lrcText.split(/\r?\n/)) {
    const m = rawLine.match(LINE_RE);
    if (!m) continue;

    const minutes = Number.parseInt(m[1], 10);
    const seconds = Number.parseInt(m[2], 10);
    const fracDigits = m[3];
    // 2-digit fractions are centiseconds, 3-digit are milliseconds.
    const fracMs =
      fracDigits.length === 3
        ? Number.parseInt(fracDigits, 10)
        : Number.parseInt(fracDigits, 10) * 10;
    const rawMs = minutes * 60_000 + seconds * 1_000 + fracMs;
    // Match upstream's -0.5s nudge so our highlights and theirs align.
    const startMs = Math.max(0, rawMs - 500);

    const body = m[4].trim();
    const [englishRaw = "", chineseRaw = ""] = body.split("|");

    out.push({
      startMs,
      english: englishRaw.trim(),
      chinese: chineseRaw.trim(),
    });
  }

  out.sort((a, b) => a.startMs - b.startMs);
  return out;
}
