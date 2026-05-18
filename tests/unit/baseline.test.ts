// R0 baseline smoke test. Subsequent rounds replace this with real suites
// (R1 Runner + Opus prompt unit tests, R2 NCE ingest, R3 skeleton extract...).
import { describe, expect, it } from "vitest";
import { LANG_TAG, LANGS, isLang } from "@/lib/i18n/dict";
import { en } from "@/lib/i18n/en";
import { es } from "@/lib/i18n/es";
import { zh } from "@/lib/i18n/zh";

describe("R0 baseline", () => {
  it("i18n dictionary exposes language tags", () => {
    expect(LANG_TAG.en).toBe("en");
    expect(LANG_TAG.es).toBe("es");
    expect(LANG_TAG.zh).toBe("zh-CN");
  });

  it("LANGS lists every supported locale", () => {
    expect(LANGS).toEqual(["en", "es", "zh"]);
  });

  it("isLang accepts known locales and rejects unknown", () => {
    expect(isLang("zh")).toBe(true);
    expect(isLang("fr")).toBe(false);
    expect(isLang(undefined)).toBe(false);
  });

  it("zh dictionary mirrors the en shape (top-level keys)", () => {
    expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort());
    expect(Object.keys(zh).sort()).toEqual(Object.keys(es).sort());
  });

  it("zh translates the actively rendered languageSwitcher label", () => {
    expect(zh.languageSwitcher.label).toBe("\u8bed\u8a00");
  });
});
