# english-coach

A guided English-writing coach that turns each [New Concept English (NCE)](https://nce.mleo.site/) lesson into a four-phase **remix** workout — *plan → draft → align → drift* — and gives instructors a live view of where every student is stuck.

Forked in spirit from the maieutic project: the LLM never hands the student a finished answer. It asks the questions the student forgot to ask themselves, then makes them defend the gap between what they planned and what they actually wrote.

---

## What's in the box

- **Listen / read / shadow** assists on top of the original NCE audio + LRC stream (R2, R5)
- **Skeleton extraction** (R3) — Gemini distills each NCE passage into a canonical `LessonSkeleton` (scene, plot nodes, vocab band, sentence patterns) which becomes the "reference answer"
- **Remix four-step** (R4) — student plans, drafts, aligns against the skeleton, then reflects on drifts
- **Live instructor dashboard** (R6) — SSE stream of every active session with one-line LLM summaries + a reasoning inspector
- **Cohort narrative** (R7) — per-exercise class summary, drift patterns, micro-lesson suggestion
- **Authoring console** (R8) — pick a lesson (or paste custom English), get a model-drafted remix exercise, edit, publish
- **i18n** — `en` / `zh-CN` / `es` cookie-driven, `ExerciseTranslation` table for LLM-translated copies

---

## Quick start

```bash
# 0. clone, install
npm install

# 1. set up the SQLite database
npx prisma migrate deploy
npx prisma generate

# 2. configure your Gemini key
echo 'GEMINI_API_KEY=sk-...' > .env
echo 'DATABASE_URL="file:./prisma/dev.db"' >> .env

# 3. pull NCE content + extract skeletons + seed sample exercises
npm run nce:ingest        # downloads NCE1/2/3/4 manifests
npm run skeleton:extract  # runs Gemini over every lesson (cached)
npm run remix:seed        # creates a handful of published RemixExercises

# 4. plant demo data so /live, /cohort, /reasoning aren't empty
npm run reset-demo

# 5. start
npm run dev
```

Open <http://localhost:3000> — student surfaces at `/exercises`, `/lessons`, instructor surfaces at `/live`, `/cohorts`, `/authoring`.

---

## Project layout

```
src/app/
  (instructor)/        live / reasoning / cohort(s) / authoring
  api/                 author, instructor, sessions, exercises, lang
  exercises/           student remix list
  lessons/             NCE browser, lesson player, skeleton viewer
  sessions/[id]/       student remix workspace (plan/draft/align/drift)
src/lib/
  opus/                LLM client + prompts (skeleton-extract, plan-review,
                       structure-align, drift-naming, remix-live-summary,
                       remix-cohort-narrative, remix-scaffolding, …)
  remix/               session / cohort / summary helpers
  i18n/                cookie-based locale dict
prisma/                schema + migrations (SQLite)
scripts/               nce-ingest, extract-skeletons, seed-remix-exercises,
                       smoke-remix, reset-demo
tests/unit/            vitest specs for every prompt schema
```

---

## Deployment (Cloud Run)

```bash
gcloud builds submit --config cloudbuild.yaml
```

The image is built from the included [Dockerfile](Dockerfile) (Node 20-alpine, prisma migrate-on-boot). `cloudbuild.yaml` pushes to `gcr.io/$PROJECT/english-coach` and deploys to Cloud Run region `asia-east1`.

Set `GEMINI_API_KEY` and `DATABASE_URL` as Cloud Run env vars (use Cloud SQL or a persistent disk for SQLite — the in-image SQLite is for local dev only).

---

## Content credit

The English passages, audio, and Chinese translations served at <https://nce.mleo.site/> originate from *New Concept English* by L. G. Alexander (Longman). This project is for **personal study and classroom use**; it does not redistribute the source files and has no commercial entry point. Please respect the original copyright when running it for groups beyond your own classroom.

---

## Round contract

The codebase was built in nine rounds (R0–R9); each round's definition of done lives in [`PRE_PLAN.md`](PRE_PLAN.md). PR titles carry `[R*]` prefixes and check off the corresponding DoD.

See [`FAQ.md`](FAQ.md) for common operator questions.
