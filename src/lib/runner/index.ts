// Public entry point. Importing this module registers every shipped runner
// as a side effect, after which callers can `getRunner(kind)` anywhere.

import { englishDictationRunner } from "./english-dictation";
import { englishReadAloudRunner } from "./english-read-aloud";
import { englishRemixRunner } from "./english-remix";
import { englishShadowingRunner } from "./english-shadowing";
import { registerRunner } from "./registry";

registerRunner(englishRemixRunner);
registerRunner(englishDictationRunner);
registerRunner(englishShadowingRunner);
registerRunner(englishReadAloudRunner);

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
