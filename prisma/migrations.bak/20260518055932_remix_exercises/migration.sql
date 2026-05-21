-- CreateTable
CREATE TABLE "RemixExercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lessonId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "vocabBandCap" TEXT,
    "lockedNodeIds" JSONB NOT NULL,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RemixExercise_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "NceLesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RemixSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "currentPhase" INTEGER NOT NULL DEFAULT 1,
    "planData" JSONB,
    "draftData" JSONB,
    "alignData" JSONB,
    "driftData" JSONB,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "RemixSession_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "RemixExercise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RemixEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RemixEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "RemixSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RemixExercise_lessonId_idx" ON "RemixExercise"("lessonId");

-- CreateIndex
CREATE INDEX "RemixSession_exerciseId_idx" ON "RemixSession"("exerciseId");

-- CreateIndex
CREATE INDEX "RemixSession_studentId_idx" ON "RemixSession"("studentId");

-- CreateIndex
CREATE INDEX "RemixSession_lastActiveAt_idx" ON "RemixSession"("lastActiveAt");

-- CreateIndex
CREATE INDEX "RemixEvent_sessionId_createdAt_idx" ON "RemixEvent"("sessionId", "createdAt");
