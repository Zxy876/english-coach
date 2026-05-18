// LRC parser unit tests. The parser is the only piece of NCE ingest that
// runs without network or DB, so it's the right surface to nail down
// before R3's skeleton extractor depends on the parsed shape.

import { describe, expect, it } from "vitest";
import { parseLrc } from "@/lib/nce/lrc";

describe("parseLrc", () => {
  it("parses canonical English | Chinese lines", () => {
    const lrc = [
      "[al:foo]",
      "[00:00.61]Lesson 1 | \u7b2c1\u8bfe",
      "[00:02.71]Excuse me! | \u6253\u6270\u4e00\u4e0b\uff01",
    ].join("\n");
    const out = parseLrc(lrc);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({
      startMs: 610 - 500 < 0 ? 0 : 610 - 500,
      english: "Lesson 1",
      chinese: "\u7b2c1\u8bfe",
    });
    expect(out[1].startMs).toBe(2710 - 500);
  });

  it("handles 3-digit milliseconds", () => {
    const out = parseLrc("[01:23.456]hello | \u4f60\u597d");
    expect(out[0].startMs).toBe(83_456 - 500);
  });

  it("clamps the -0.5s nudge at zero", () => {
    const out = parseLrc("[00:00.10]first | \u9996");
    expect(out[0].startMs).toBe(0);
  });

  it("treats missing translation as empty string", () => {
    const out = parseLrc("[00:05.00]english only");
    expect(out[0].chinese).toBe("");
    expect(out[0].english).toBe("english only");
  });

  it("ignores metadata and unparseable lines", () => {
    const lrc = [
      "[ti:title]",
      "garbage",
      "[00:01.00]one | \u4e00",
    ].join("\n");
    expect(parseLrc(lrc)).toHaveLength(1);
  });

  it("sorts by startMs even if upstream is out of order", () => {
    const out = parseLrc(
      "[00:10.00]b | b\n[00:05.00]a | a\n[00:07.00]middle | m",
    );
    expect(out.map((s) => s.english)).toEqual(["a", "middle", "b"]);
  });
});
