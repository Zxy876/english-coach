// Runner abstraction. Stable interface that every evaluation backend must
// implement. The first concrete backend (R4) is the English remix scorer
// that compares a student remix against the lesson's canonical text; the
// architecture is left open so listening/dictation drills (R5) and any
// future grading mode can plug in without touching call sites.
//
// `kind` is the discriminator stored on the `Exercise` row (or the lesson
// task) and used by the registry to dispatch. Adding a new runner means:
//   1. Add a new literal to `RunnerKind`.
//   2. Implement `Runner` and register it via `registerRunner()`.
//   3. Author code references the runner only through `getRunner(kind)`.
//
// Until R4 lands, only the placeholder `english-remix` runner is wired up,
// returning a stub result so the rest of the pipeline can be built and
// tested end-to-end against a real (if trivial) implementation.

export const RUNNER_KINDS = [
  "english-remix",
  "english-dictation",
  "english-shadowing",
  "english-read-aloud",
] as const;
export type RunnerKind = (typeof RUNNER_KINDS)[number];

export function isRunnerKind(v: string): v is RunnerKind {
  return (RUNNER_KINDS as readonly string[]).includes(v);
}

export type RunnerSeverity = "info" | "warn" | "error";

/** A single evaluator note surfaced back to the student / instructor. */
export interface RunnerNote {
  severity: RunnerSeverity;
  message: string;
  /** Optional pointer into the input (e.g. character offset, sentence id). */
  anchor?: string;
}

/** Generic shape passed into every runner. Backend-specific extras live in
 * `payload` and are validated by the runner itself. */
export interface RunnerInput {
  /** Student-authored text (remix, dictation transcript, …). */
  submission: string;
  /** Backend-specific reference material (canonical lesson, skeleton, expected
   * dictation). Kept as `unknown` so the registry doesn't need to know about
   * any one backend's schema. */
  expected: unknown;
  /** Free-form bag for backend-specific knobs (target length, allowed drift,
   * ASR confidence cut-off, …). Validated by the runner. */
  payload?: Record<string, unknown>;
}

/** Generic runner result. `score` is normalised to [0, 1] when defined;
 * `notes` are surfaced in the UI in order. */
export interface RunnerResult {
  ok: boolean;
  score: number | null;
  notes: RunnerNote[];
  /** Backend-specific structured output (drift items, alignment map, …).
   * Persisted into `SessionEvent.payload` as JSON. */
  data?: Record<string, unknown>;
}

export interface Runner {
  readonly kind: RunnerKind;
  evaluate(input: RunnerInput): Promise<RunnerResult>;
}
