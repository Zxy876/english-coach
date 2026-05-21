
import { describe, it, expect } from "vitest";
import { validateNarrativeSkeleton, SkeletonNode } from "@/lib/opus/validators";

describe("narrativeValidator", () => {
  it("locked_literal should pass on exact match", () => {
    const nodes: SkeletonNode[] = [
      { id: "n1", type: "locked_literal", label: "A", required: true, description: "", canonicalValue: "foo" },
    ];
    const student = { n1: "foo" };
    const result = validateNarrativeSkeleton(nodes, student);
    expect(result[0].ok).toBe(true);
  });

  it("locked_literal should fail on mismatch", () => {
    const nodes: SkeletonNode[] = [
      { id: "n1", type: "locked_literal", label: "A", required: true, description: "", canonicalValue: "foo" },
    ];
    const student = { n1: "bar" };
    const result = validateNarrativeSkeleton(nodes, student);
    expect(result[0].ok).toBe(false);
  });

  it("locked_semantic should pass on normalized match", () => {
    const nodes: SkeletonNode[] = [
      { id: "n1", type: "locked_semantic", label: "A", required: true, description: "", canonicalValue: "Hello, world!" },
    ];
    const student = { n1: "hello world" };
    const result = validateNarrativeSkeleton(nodes, student);
    expect(result[0].ok).toBe(true);
  });

  it("expandable_trait should pass if all tags present", () => {
    const nodes: SkeletonNode[] = [
      { id: "n1", type: "expandable_trait", label: "A", required: true, description: "", semanticTags: ["foo", "bar"] },
    ];
    const student = { n1: "this has foo and bar" };
    const result = validateNarrativeSkeleton(nodes, student);
    expect(result[0].ok).toBe(true);
  });

  it("expandable_trait should fail if missing tag", () => {
    const nodes: SkeletonNode[] = [
      { id: "n1", type: "expandable_trait", label: "A", required: true, description: "", semanticTags: ["foo", "bar"] },
    ];
    const student = { n1: "this has only foo" };
    const result = validateNarrativeSkeleton(nodes, student);
    expect(result[0].ok).toBe(false);
  });
});
