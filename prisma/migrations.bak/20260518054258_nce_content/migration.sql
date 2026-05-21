-- CreateTable
CREATE TABLE "NceBook" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "bookPath" TEXT NOT NULL,
    "bookLevel" TEXT,
    "bookCover" TEXT,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "NceLesson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookKey" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "lrcUrl" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NceLesson_bookKey_fkey" FOREIGN KEY ("bookKey") REFERENCES "NceBook" ("key") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NceSentence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lessonId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "startMs" INTEGER NOT NULL,
    "english" TEXT NOT NULL,
    "chinese" TEXT NOT NULL,
    CONSTRAINT "NceSentence_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "NceLesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "NceLesson_bookKey_idx" ON "NceLesson"("bookKey");

-- CreateIndex
CREATE UNIQUE INDEX "NceLesson_bookKey_ordinal_key" ON "NceLesson"("bookKey", "ordinal");

-- CreateIndex
CREATE INDEX "NceSentence_lessonId_idx" ON "NceSentence"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "NceSentence_lessonId_ordinal_key" ON "NceSentence"("lessonId", "ordinal");
