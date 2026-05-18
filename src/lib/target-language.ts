import { z } from "zod";

export const TargetLanguage = z.enum([
  "python",
  "java",
  "math-symbolic",    // 符号计算（SymPy）
  "math-geometric",   // 几何作图（GeoGebra）
  "math-proof",       // 结构化证明
  "math-formal",      // 形式化证明（Lean/Coq风格）
  "math-theoretical", // 纯理论证明
]);
export type TargetLanguage = z.infer<typeof TargetLanguage>;

const JAVA_CUES = [
  /\bjava\b/i,
  /\bapcsa\b/i,
  /\bap computer science a\b/i,
  /\bindexof\s*\(/i,
  /\bsubstring\s*\(/i,
  /\bmath\.random\s*\(/i,
  /\bstring\b/i,
  /\bcharat\s*\(/i,
  /\bsystem\.out\.println\s*\(/i,
  /\bpublic\s+static\s+void\s+main\b/i,
  /\(int\)/i,
];

const PYTHON_CUES = [
  /\bpython\b/i,
  /\bdef\b/i,
  /\bfind\s*\(/i,
  /\brandom\.randint\s*\(/i,
  /\bslice\b/i,
];

const MATH_SYMBOLIC_CUES = [
  /\bsymbolic\b/i,
  /\bsympy\b/i,
  /\bsymbol\b/i,
  /\balgebra\b/i,
  /\bc calculus\b/i,
  /\bcalculate\b/i,
  /\bintegral\b/i,
  /\bderivative\b/i,
  /\bequation\b/i,
];

const MATH_GEOMETRIC_CUES = [
  /\bgeometr/i,
  /\btriangle\b/i,
  /\bcircle\b/i,
  /\bpoint\b/i,
  /\bline\b/i,
  /\bangle\b/i,
  /\bconstruct\b/i,
  /\bproof.*geometr/i,
];

const MATH_PROOF_CUES = [
  /\bprove\b/i,
  /\bproof\b/i,
  /\btheorem\b/i,
  /\blemma\b/i,
  /\bdefinition\b/i,
  /\baxiom\b/i,
  /\bshow.*that\b/i,
  /\bdemonstrate\b/i,
];

const MATH_FORMAL_CUES = [
  /\bformal\b/i,
  /\blean\b/i,
  /\bcoq\b/i,
  /\btype.*theory\b/i,
  /\bformal.*proof\b/i,
  /\btheorem.*proof\b/i,
];

const MATH_THEORETICAL_CUES = [
  /\btopolog/i,
  /\bmetric.*space\b/i,
  /\bcompact\b/i,
  /\bcomplete\b/i,
  /\banalysis\b/i,
  /\babstract.*algebra\b/i,
  /\bfunctional.*analysis\b/i,
];

export function inferTargetLanguage(text: string): TargetLanguage {
  // 计算各种语言的得分
  const javaScore = JAVA_CUES.reduce(
    (count, regex) => count + (regex.test(text) ? 1 : 0),
    0,
  );
  const pythonScore = PYTHON_CUES.reduce(
    (count, regex) => count + (regex.test(text) ? 1 : 0),
    0,
  );
  const mathSymbolicScore = MATH_SYMBOLIC_CUES.reduce(
    (count, regex) => count + (regex.test(text) ? 1 : 0),
    0,
  );
  const mathGeometricScore = MATH_GEOMETRIC_CUES.reduce(
    (count, regex) => count + (regex.test(text) ? 1 : 0),
    0,
  );
  const mathProofScore = MATH_PROOF_CUES.reduce(
    (count, regex) => count + (regex.test(text) ? 1 : 0),
    0,
  );
  const mathFormalScore = MATH_FORMAL_CUES.reduce(
    (count, regex) => count + (regex.test(text) ? 1 : 0),
    0,
  );
  const mathTheoreticalScore = MATH_THEORETICAL_CUES.reduce(
    (count, regex) => count + (regex.test(text) ? 1 : 0),
    0,
  );

  // 找到最高分的语言
  const scores = {
    java: javaScore,
    python: pythonScore,
    "math-symbolic": mathSymbolicScore,
    "math-geometric": mathGeometricScore,
    "math-proof": mathProofScore,
    "math-formal": mathFormalScore,
    "math-theoretical": mathTheoreticalScore,
  };

  const maxScore = Math.max(...Object.values(scores));
  const candidates = Object.entries(scores).filter(([_, score]) => score === maxScore);

  // 如果有多个候选，优先选择编程语言
  if (candidates.length > 1) {
    if (candidates.some(([lang]) => lang === "java")) return "java";
    if (candidates.some(([lang]) => lang === "python")) return "python";
  }

  // 返回最高分的语言
  return candidates[0][0] as TargetLanguage;
}

export function targetLanguageLabel(language: TargetLanguage): string {
  const labels: Record<TargetLanguage, string> = {
    java: "Java",
    python: "Python",
    "math-symbolic": "符号计算",
    "math-geometric": "几何作图",
    "math-proof": "数学证明",
    "math-formal": "形式化证明",
    "math-theoretical": "纯理论证明",
  };
  return labels[language];
}

export function targetLanguageRules(language: TargetLanguage): string {
  if (language === "java") {
    return `TARGET LANGUAGE: Java
Use Java syntax and Java classroom terminology. Prefer String, indexOf(), substring(), length(), charAt(), Math.random(), int casting, for, if, and return. Do NOT suggest Python APIs or syntax such as find(), slicing like myString[start:end], random.randint(), or list/dict defaults. Do not say this is a Python exercise.`;
  }

  if (language === "python") {
    return `TARGET LANGUAGE: Python
Use Python syntax and Python classroom terminology.`;
  }

  if (language === "math-symbolic") {
    return `TARGET LANGUAGE: Symbolic Mathematics (SymPy)
Use SymPy for symbolic computation. Focus on algebraic manipulation, calculus, equation solving, and symbolic analysis. Use LaTeX notation for mathematical expressions. Students can use SymPy to verify calculations and explore mathematical properties.`;
  }

  if (language === "math-geometric") {
    return `TARGET LANGUAGE: Geometric Mathematics
Use geometric reasoning and construction methods. Students can use coordinate geometry, vector methods, or interactive geometric construction. Focus on geometric relationships, properties, and proofs. Use LaTeX notation for geometric expressions.`;
  }

  if (language === "math-proof") {
    return `TARGET LANGUAGE: Mathematical Proof
Use structured mathematical proof format with clear premises, logical steps, and conclusions. Students should justify each step with appropriate theorems, definitions, or logical rules. Use LaTeX notation for mathematical expressions.`;
  }

  if (language === "math-formal") {
    return `TARGET LANGUAGE: Formal Proof
Use formal proof language (Lean/Coq style) with type systems, inductive definitions, theorem statements, and tactical proofs. Focus on rigor, type checking, and formal verification. Use formal syntax appropriate to the proof assistant.`;
  }

  if (language === "math-theoretical") {
    return `TARGET LANGUAGE: Theoretical Mathematics
Use rigorous mathematical reasoning appropriate to the context (topology, analysis, abstract algebra, etc.). Students should specify the mathematical framework (axioms, definitions) and provide thorough logical arguments. Use LaTeX notation for mathematical expressions.`;
  }

  return `TARGET LANGUAGE: Python
Use Python syntax and Python classroom terminology.`;
}