# Narrative Validator Pipeline

本目录为 narrative skeleton validator 新架构的实现入口。

- narrativeValidator.ts：主 pipeline 骨架与类型定义
- index.ts：统一出口
- 后续可扩展 literal/semantic/trait/causal/pattern validator 细节

集成方式：
- 在 remix 校验主流程中引入 `import { validateNarrativeSkeleton } from "@/lib/opus/validators"`
- 传入增强后的 skeleton.nodes 与 student remix，获得 explainable 校验结果

如需扩展 validator，可在本目录下新增文件并在 index.ts 导出。
