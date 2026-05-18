// R0 baseline smoke test. Subsequent rounds replace this with real suites
// (R1 Runner + Opus prompt unit tests, R2 NCE ingest, R3 skeleton extract...).
import { describe, expect, it } from "vitest";
import { LANG_TAG } from "@/lib/i18n/dict";

describe("R0 baseline", () => {
  it("i18n dictionary exposes language tags", () => {
    expect(LANG_TAG.en).toBe("en");
    expect(LANG_TAG.es).toBe("es");
  });
});
