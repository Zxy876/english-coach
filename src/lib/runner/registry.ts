// Runner registry. Module-scoped Map keyed by `RunnerKind`. The registry is
// populated at module-load time by `src/lib/runner/index.ts` (which imports
// every concrete runner for its side effect). Call sites should ONLY look
// up runners via `getRunner` so the dispatch table stays the single source
// of truth.

import type { Runner, RunnerKind } from "./types";

const REGISTRY = new Map<RunnerKind, Runner>();

/** Register a runner. Throws if a runner with the same `kind` is already
 * registered \u2014 silent overwrites would mask wiring bugs. */
export function registerRunner(runner: Runner): void {
  if (REGISTRY.has(runner.kind)) {
    throw new Error(`Runner already registered for kind: ${runner.kind}`);
  }
  REGISTRY.set(runner.kind, runner);
}

/** Look up a runner. Throws if none is registered \u2014 a missing runner means
 * the exercise was authored against a backend that doesn't exist in this
 * build, which should fail loudly rather than silently render nothing. */
export function getRunner(kind: RunnerKind): Runner {
  const r = REGISTRY.get(kind);
  if (!r) {
    throw new Error(`No runner registered for kind: ${kind}`);
  }
  return r;
}

/** Test-only escape hatch. Used by `tests/unit/runner.test.ts` to reset
 * state between cases since the registry is module-scoped. */
export function _resetRegistryForTests(): void {
  REGISTRY.clear();
}
