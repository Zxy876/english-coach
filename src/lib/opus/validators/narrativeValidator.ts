// Narrative Semantic Validator Pipeline (雏形)
// 支持 NodeType、strictness、semanticTags、causal graph
// 兼容 literal/semantic/trait/causal/pattern 校验

export type NodeType =
  | "locked_literal"
  | "locked_semantic"
  | "expandable_trait"
  | "optional_detail"
  | "style_anchor";

export interface SkeletonNode {
  id: string;
  type: NodeType;
  label: string;
  required: boolean;
  description: string;
  strictness?: number; // 0-1, 软到硬
  semanticTags?: string[];
  supports?: string[]; // causal graph
  canonicalValue?: any;
}

export interface StudentRemix {
  // 可扩展
  [key: string]: any;
}

export interface ValidationResult {
  nodeId: string;
  ok: boolean;
  reason: string;
  explain: string;
}

// 骨架 pipeline
export function validateNarrativeSkeleton(
  skeletonNodes: SkeletonNode[],
  student: StudentRemix
): ValidationResult[] {
  return skeletonNodes.map((node) => {
    switch (node.type) {
      case "locked_literal":
        return checkLiteralMatch(node, student);
      case "locked_semantic":
        return checkSemanticMatch(node, student);
      case "expandable_trait":
        return checkTraitExtension(node, student);
      case "optional_detail":
        return { nodeId: node.id, ok: true, reason: "optional", explain: "可选细节，允许 creative" };
      case "style_anchor":
        return checkStyleAnchor(node, student);
      default:
        return { nodeId: node.id, ok: false, reason: "unknown_type", explain: "未知节点类型" };
    }
  });
}

// 以下为各 validator 雏形，可逐步完善
function checkLiteralMatch(node: SkeletonNode, student: StudentRemix): ValidationResult {
  // 严格字段比对
  const ok = student[node.id] === node.canonicalValue;
  return {
    nodeId: node.id,
    ok,
    reason: ok ? "literal_match" : "literal_mismatch",
    explain: ok ? "严格字段对齐" : `学生答案 ${student[node.id]} ≠ 标准答案 ${node.canonicalValue}`,
  };
}

function checkSemanticMatch(node: SkeletonNode, student: StudentRemix): ValidationResult {
  // 语义等价：简单实现（忽略大小写、去除标点）
  const normalize = (str: string) =>
    (str || "")
      .toLowerCase()
      .replace(/[.,!?;:()\[\]"'\s]/g, "");
  const studentValue = student[node.id];
  const canonical = node.canonicalValue;
  const ok = normalize(studentValue) === normalize(canonical);
  return {
    nodeId: node.id,
    ok,
    reason: ok ? "semantic_match" : "semantic_mismatch",
    explain: ok
      ? "语义等价（忽略大小写和标点）"
      : `学生答案 ${studentValue} ≉ 标准答案 ${canonical}`,
  };
}

function checkTraitExtension(node: SkeletonNode, student: StudentRemix): ValidationResult {
  // trait 扩展/兼容性检测
  // 简单实现：如学生答案包含所有 semanticTags，则判定兼容
  const studentValue = student[node.id] || "";
  const tags = node.semanticTags || [];
  const ok = tags.every((tag) => studentValue.includes(tag));
  return {
    nodeId: node.id,
    ok,
    reason: ok ? "trait_compatible" : "trait_conflict",
    explain: ok
      ? `包含所有 trait: ${tags.join(", ")}`
      : `缺少 trait: ${tags.filter((tag) => !studentValue.includes(tag)).join(", ")}`,
  };
}

function checkStyleAnchor(node: SkeletonNode, student: StudentRemix): ValidationResult {
  // 风格锚点检测
  // 这里只做占位
  return {
    nodeId: node.id,
    ok: true,
    reason: "style_checked",
    explain: "风格锚点，暂不强制校验",
  };
}

// 可扩展：causal support、pattern abstraction等

// 占位：causal support 检查
function checkCausalSupport(node: SkeletonNode, skeletonNodes: SkeletonNode[], student: StudentRemix): ValidationResult {
  // 检查 supports 字段指向的节点是否全部 ok
  if (!node.supports || node.supports.length === 0) {
    return { nodeId: node.id, ok: true, reason: "no_causal", explain: "无因果依赖" };
  }
  // 这里只做占位，实际应递归检查依赖节点
  return { nodeId: node.id, ok: true, reason: "causal_checked", explain: "因果支持链未实现" };
}

// 占位：pattern abstraction 检查
function checkPatternAbstraction(node: SkeletonNode, student: StudentRemix): ValidationResult {
  // 这里只做占位
  return { nodeId: node.id, ok: true, reason: "pattern_checked", explain: "pattern abstraction 未实现" };
}
