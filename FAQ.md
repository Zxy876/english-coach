# FAQ

### Why does `npm run dev` show empty dashboards?

The dashboards (`/live`, `/cohorts`, `/reasoning/[id]`) only render once there are `RemixSession` rows. Run `npm run reset-demo` after `nce:ingest` + `skeleton:extract` + `remix:seed` — it seeds three demo students (alice, bob, carol) in three different phases on the first published exercise.

### `reset-demo` errors with "No RemixExercise found"

You haven't run the upstream scripts yet. The full bootstrap is:

```bash
npm run nce:ingest
npm run skeleton:extract
npm run remix:seed
npm run reset-demo
```

### Gemini calls are slow / cost money — can I run offline?

Skeleton extraction is the expensive step (one call per lesson, ~24 cohorts × 600 lessons cap). The result is cached in `LessonSkeleton`. Subsequent runs of `extract-skeletons` are no-ops unless you delete rows. Authoring + cohort-narrative + live-summary also call Gemini but use shorter prompts and are gated to per-request invocations.

### Why is there a `CUSTOM` book in `NceBook`?

The R8 authoring console accepts pasted English text. Each paste is materialized as a synthetic `NceLesson` under `bookKey = "CUSTOM"` so the rest of the pipeline (skeleton, remix, alignment) just works without special-casing.

### Locked plot nodes — what does the cap do?

`vocabBandCap` constrains the LLM and the alignment check: drafts that climb above the cap are flagged as `vocab-band` drift. `lockedNodeIds` are the plot nodes the student *must* preserve — missing any of them shows up in `align.missingRequired` and surfaces on the cohort dashboard.

### NCE content licence?

This project does not redistribute NCE source files; it streams from `nce.mleo.site` at runtime. Use is intended for personal study and classroom teaching only.

### Where do I change the dashboard refresh rate?

`src/app/api/instructor/live/route.ts` — the SSE tick interval is `5000` ms. Lower it for finer-grained debugging, raise it to cut Gemini summary calls.

### Can I run multiple instances against the same SQLite file?

For local dev yes (one writer at a time). For Cloud Run, switch `DATABASE_URL` to Postgres / Cloud SQL — the Prisma schema is portable; only the provider line in `prisma/schema.prisma` needs to change.
