-- CreateTable
CREATE TABLE "LessonSkeleton" (
    "lessonId" TEXT NOT NULL PRIMARY KEY,
    "scene" TEXT NOT NULL,
    "registerLevel" TEXT NOT NULL,
    "vocabBand" TEXT NOT NULL,
    "characters" JSONB NOT NULL,
    "timeline" JSONB NOT NULL,
    "plotNodes" JSONB NOT NULL,
    "sentencePatterns" JSONB NOT NULL,
    "styleTags" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "extractedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LessonSkeleton_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "NceLesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
