// NCE ingest script.
//
// Pulls `data.json` from a local mirror (or the upstream URL via
// `--data-url=`) to discover the catalogue of books, then for each book
// pulls `book.json` + every `*.lrc` and writes the result into the
// `NceBook / NceLesson / NceSentence` tables. Audio files are not
// downloaded \u2014 `audioUrl` is left pointing at the upstream CDN until R2.5
// runs `nce-mirror.ts`.
//
// Usage:
//   tsx scripts/nce-ingest.ts                              # all books
//   tsx scripts/nce-ingest.ts NCE1                         # one book
//   tsx scripts/nce-ingest.ts NCE1 NCE2 --limit-lessons=5  # smoke run
//
// Idempotent: every run upserts books / lessons / sentences. Sentences
// for a re-ingested lesson are deleted first to avoid orphans (since the
// composite key is (lessonId, ordinal), shrinking a lesson's sentence
// count otherwise leaves stale rows).

import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { parseLrc } from "../src/lib/nce/lrc";

const DEFAULT_LOCAL_DATA = path.resolve(
  __dirname,
  "../../",
  " NCE ",
  "NCE",
  "data.json",
);

interface BookEntry {
  key: string;
  title: string;
  bookPath: string;
}

interface BookConfig {
  bookName: string;
  bookLevel: string;
  bookCover?: string;
  units: Array<{ title: string; filename: string }>;
}

function parseArgs(argv: string[]): {
  bookKeys: string[];
  limitLessons?: number;
  dataUrl?: string;
} {
  const bookKeys: string[] = [];
  let limitLessons: number | undefined;
  let dataUrl: string | undefined;

  for (const arg of argv) {
    if (arg.startsWith("--limit-lessons=")) {
      limitLessons = Number.parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--data-url=")) {
      dataUrl = arg.split("=")[1];
    } else if (!arg.startsWith("--")) {
      bookKeys.push(arg);
    }
  }

  return { bookKeys, limitLessons, dataUrl };
}

async function loadCatalogue(
  dataUrl: string | undefined,
): Promise<BookEntry[]> {
  if (dataUrl) {
    const res = await fetch(dataUrl);
    if (!res.ok) throw new Error(`GET ${dataUrl} -> ${res.status}`);
    const json = (await res.json()) as { books: BookEntry[] };
    return json.books;
  }
  const raw = await readFile(DEFAULT_LOCAL_DATA, "utf-8");
  return (JSON.parse(raw) as { books: BookEntry[] }).books;
}

async function fetchBookConfig(bookPath: string): Promise<BookConfig> {
  const url = `${bookPath}/book.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return (await res.json()) as BookConfig;
}

async function fetchLrc(bookPath: string, filename: string): Promise<string> {
  // Upstream filenames contain spaces and `&`; encodeURIComponent leaves
  // path separators alone, which is what we need since `bookPath` already
  // contains the slashes.
  const url = `${bookPath}/${encodeURIComponent(filename)}.lrc`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return await res.text();
}

async function ingestBook(
  prisma: PrismaClient,
  entry: BookEntry,
  opts: { limitLessons?: number },
): Promise<void> {
  console.log(`\n\u2192 ${entry.key} (${entry.title})`);
  const cfg = await fetchBookConfig(entry.bookPath);

  await prisma.nceBook.upsert({
    where: { key: entry.key },
    create: {
      key: entry.key,
      title: entry.title,
      bookPath: entry.bookPath,
      bookLevel: cfg.bookLevel,
      bookCover: cfg.bookCover ?? null,
    },
    update: {
      title: entry.title,
      bookPath: entry.bookPath,
      bookLevel: cfg.bookLevel,
      bookCover: cfg.bookCover ?? null,
      fetchedAt: new Date(),
    },
  });

  const units = opts.limitLessons
    ? cfg.units.slice(0, opts.limitLessons)
    : cfg.units;

  for (const [index, unit] of units.entries()) {
    const ordinal = index + 1;
    const audioUrl = `${entry.bookPath}/${encodeURIComponent(unit.filename)}.mp3`;
    const lrcUrl = `${entry.bookPath}/${encodeURIComponent(unit.filename)}.lrc`;

    let lrcText: string;
    try {
      lrcText = await fetchLrc(entry.bookPath, unit.filename);
    } catch (err) {
      console.warn(
        `  ! skip ${ordinal} ${unit.title}: ${(err as Error).message}`,
      );
      continue;
    }

    const sentences = parseLrc(lrcText);
    if (sentences.length === 0) {
      console.warn(`  ! skip ${ordinal} ${unit.title}: no parsable sentences`);
      continue;
    }

    const lesson = await prisma.nceLesson.upsert({
      where: { bookKey_ordinal: { bookKey: entry.key, ordinal } },
      create: {
        bookKey: entry.key,
        ordinal,
        title: unit.title,
        filename: unit.filename,
        audioUrl,
        lrcUrl,
      },
      update: {
        title: unit.title,
        filename: unit.filename,
        audioUrl,
        lrcUrl,
        fetchedAt: new Date(),
      },
    });

    // Replace sentences atomically (otherwise re-ingest could leave
    // orphans for lessons whose LRC shrank between runs).
    await prisma.$transaction([
      prisma.nceSentence.deleteMany({ where: { lessonId: lesson.id } }),
      prisma.nceSentence.createMany({
        data: sentences.map((s: { startMs: number; english: string; chinese: string }, i: number) => ({
          lessonId: lesson.id,
          ordinal: i + 1,
          startMs: s.startMs,
          english: s.english,
          chinese: s.chinese,
        })),
      }),
    ]);

    console.log(
      `  \u2713 ${ordinal.toString().padStart(3, "0")} ${unit.title} ` +
        `(${sentences.length} sentence${sentences.length === 1 ? "" : "s"})`,
    );
  }
}

async function main() {
  const { bookKeys, limitLessons, dataUrl } = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();
  try {
    const catalogue = await loadCatalogue(dataUrl);
    const targets = bookKeys.length
      ? catalogue.filter((b) => bookKeys.includes(b.key))
      : catalogue;

    if (targets.length === 0) {
      console.error(
        `No matching books. Available: ${catalogue
          .map((b) => b.key)
          .join(", ")}`,
      );
      process.exit(1);
    }

    for (const entry of targets) {
      try {
        await ingestBook(prisma, entry, { limitLessons });
      } catch (err) {
        console.error(`\u2717 ${entry.key} failed: ${(err as Error).message}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
