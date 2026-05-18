// Public entry point. Importing this module registers every shipped runner
// as a side effect, after which callers can `getRunner(kind)` anywhere.

import { englishRemixRunner } from "./english-remix";
import { registerRunner } from "./registry";

registerRunner(englishRemixRunner);

export { getRunner, registerRunner, _resetRegistryForTests } from "./registry";
export type {
  Runner,
  RunnerInput,
  RunnerKind,
  RunnerNote,
  RunnerResult,
  RunnerSeverity,
} from "./types";
export { RUNNER_KINDS, isRunnerKind } from "./types";
