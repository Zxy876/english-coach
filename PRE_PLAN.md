# 新项目 PRE 规划：Maieutic × NCE 融合路线图

> **核心定位**：把 maieutic 的「先写 spec → 写代码 → 比对差异」教学循环，改写为面向英语**写作**的四步循环：
>
> **① 抽取 narrative skeleton → ② 受限 remix → ③ 对齐 canonical structure → ④ 提取 language drift**
>
> 训练目标：让学生**产出与 NCE 该册该课同风格的 remix 文本**（写作主线）。
> 听 / 说 / 读 三类训练作为**输入与回灌**保留，但服务于「remix 写作」这条主线，而不是各自独立的目标。
>
> 内容层固定为 **NCE 全四册**。本文档完成「**功能点分析 → 管线 → 依赖排序 → 每轮交付（输入 / 输出 / 顺序）**」的 pre-work，作为后续 phase 实施的契约。

- **Phase 1 = maieutic**：基础框架（角色、Session、Opus 多 hook、Live Dashboard、SSE、i18n、Prisma 持久化）
- **Phase 2 = NCE**：内容层（课本/单元/课文/逐句音频/中英对照），既作为「canonical 范本」也作为「听说读训练素材」

---

## 0. 两个源项目的形态速览

### 0.1 maieutic（Phase 1 来源 / 框架）

| 维度 | 现状 |
|---|---|
| 技术栈 | Next.js 16 (app router) + React 19 + TS strict + Tailwind v4 + shadcn/ui + Monaco + Prisma 6 + **PostgreSQL** + SSE |
| LLM | `@google/generative-ai`（`gemini-2.5-flash`），统一 provider 抽象 `src/lib/opus/provider.ts` |
| 角色 | 学生 `(student)` / 教师 `(instructor)`，**无登录**，进入页选角色 |
| 数据模型 | `Exercise` / `ExerciseTranslation` / `Session` / `SessionEvent`（见 `prisma/schema.prisma`） |
| 学生 Session | 3 阶段：① Spec（先写规格，编辑器锁定）② Writing（Monaco，关 autocomplete，旁边 chat）③ Review（intent vs impl 差异问句） |
| Opus 7 个 hook | `scaffolding`、`spec-examiner`、`phase2-chat`、`intent-diff`、`live-summary`、`post-hoc`、`cohort-narrative`（`src/lib/opus/prompts/`） |
| 教师视图 | Live Dashboard（SSE 推单句摘要）、Reasoning（双栏）、Cohort Narrative |
| i18n | `en` / `es`，`ExerciseTranslation` 按 (exerciseId, lang) 缓存翻译 |
| 多目标语言 | `targetLanguage`：python / java / 5 类 math，对应 `run-python.ts` / `run-java.ts` / `run-symbolic-math.ts` 执行器 |
| Demo | `npm run reset-demo` 注入 Ana/Beto/Carmen 与 cohort 历史 |

### 0.2 NCE（Phase 2 来源 / 内容）

| 维度 | 现状 |
|---|---|
| 技术栈 | 纯静态 HTML + CSS + 原生 JS（`ReadingSystem` 单类） |
| 内容入口 | `data.json` → `books[]`，每本含 `bookPath`（远程，如 `https://nce.mleo.site/NCE1`） |
| 内容形态 | book → unit → 课文：每条 unit 有音频 + LRC 时间轴 + 句级中英对照 |
| 功能 | 课本切换、单元列表、逐句点读、播放模式（单句/循环/连播）、变速 0.5–2.0、中英对照开关、暗色主题、`localStorage` 偏好 |
| 资源依赖 | 音频/字幕全部远程，**无后端、无账号、无进度同步** |
| 版权 | 仅个人学习，需保留来源声明 |

---

## 1. 功能点分解（按管线层）

把所有能力拆到 6 个层，**下层 = 上层依赖**，便于排序。

### L0 · 基础设施层
1. Next.js 16 (app router) 工程骨架
2. TS strict / ESLint / Tailwind v4 / shadcn/ui 设计令牌
3. Prisma 6 + Postgres（本地可 Docker）
4. 环境变量与配置（`.env`、provider 选择、目标语言 = `english`）
5. 测试：Vitest（unit）+ Playwright（e2e）
6. 部署脚本（Cloud Run / Dockerfile，沿用 maieutic）

### L1 · 领域核心层（无 UI）
1. **角色入口**：student / instructor 路由分流（无登录，沿用 maieutic）
2. **Session 引擎**：三阶段（可扩展为 N 阶段）状态机 + `SessionEvent` 审计流
3. **i18n 引擎**：`zh-CN` / `en` / `es`，并把 `ExerciseTranslation` 抽象成 `ContentTranslation`
4. **Opus Provider 抽象**：`provider.ts` + Gemini 实现 + Zod 校验，保留 7 个 hook 槽位
5. **SSE / EventEmitter 总线**：Live 推送通道
6. **执行器抽象 `Runner`**：原 `run-python/java/math` → 替换为 **`run-english-attempt`**（朗读/听写/翻译/复述的判分）

### L2 · 内容模型层（NCE 接入 + 结构标注）
1. **Content schema**：`Book` → `Unit` → `Lesson` → `Sentence`（含 `audioUrl`、`startMs`、`endMs`、`en`、`zh`）
2. **NCE 适配器**：把 `data.json` + 远程 `bookPath/<unit>` 拉成统一 schema
3. **本地化镜像**：把音频/LRC 抓回本地 `public/nce/...`（解决离线 + 防止源站抖动），保留出处
4. **Lesson 索引与检索**：按册/单元/难度/词汇量
5. **媒体播放服务**：句级时间戳 → 单句循环 / 跟读区间
6. **🆕 Canonical Skeleton 标注**：每节 Lesson 离线由 Opus 抽出 `NarrativeSkeleton`（人物 / 时间线 / 关键情节节点 / 句式骨架 / 风格特征向量）并持久化，作为 L3 的「参考答案」

### L3 · 学习管线层（remix 写作四步循环）
> 关键映射：把 maieutic 的 spec→code→diff 改写为 **skeleton → remix → align → drift**，最终产出 = **一段与本课同风格的学生原创短文**。
> 听说读训练不是独立 phase，而是 Phase 1 / Phase 2 的**输入素材与回灌通道**。

1. **Phase 1 · Skeleton 抽取 + 学生 Remix 计划（Spec 替身）**
   - 系统呈现本课 canonical skeleton（**先隐藏原文，只给骨架**：场景 / 角色 / 时间线 / 风格标签）
   - 学生填写 **Remix Plan**：「我要把场景换成 ___ / 主角换成 ___ / 时间线保留几个节点 / 我要复用哪些句式模板」
   - Opus = **Plan 审查官**（沿用 `spec-examiner` hook）：找出未交代的维度（如"你没说骨架第 3 个情节节点要不要保"），未补齐则**锁住后续 phase**
   - **辅助输入通道**：学生可点开「听读原文」「单句精听」做听读训练，结果回写为 Phase 1 的素材笔记

2. **Phase 2 · 受限 Remix 写作（Writing 替身）**
   - 编辑器（沿用 Monaco，关 autocomplete + 关语法提示）→ 学生按 Plan 写出 remix 文本
   - **受限**：实时约束器检查「骨架节点覆盖率 / 句式模板复用率 / 词汇难度上限（不超过该册级别 + 1）」；超出/缺失给中立提示而不改文
   - 同步 chat（沿用 `phase2-chat`）：reference 问题（"past perfect 怎么用"）直答；reasoning 问题（"我这句为什么读起来不像 NCE"）反问
   - **辅助训练通道**：
     - 🎧 听写当前段落原文片段 → 补素材
     - 🎤 跟读 / 复述自己刚写的句子 → 验证可朗读性
     - 📖 调取 canonical 原文做参照（**有冷却时间，避免直接抄**）

3. **Phase 3 · 对齐 Canonical Structure（Review 替身 · 上半）**
   - 系统把学生 remix 与 canonical skeleton 做**结构对齐**：节点级映射（哪个段落对应哪个骨架节点 / 哪些节点缺失 / 哪些被合并）
   - 输出 `StructureAlignment` 报告（机器生成 + Opus 自然语言化）

4. **Phase 4 · 提取 Language Drift（Review 替身 · 下半）**
   - 在已对齐的节点内，逐节点比对学生表达 vs NCE 风格基线：词汇等级偏移、句式偏移、时态/语态偏移、register（正式度）偏移
   - Opus（沿用 `intent-diff` hook，提示词改造）用**中立问句**指出每条 drift："NCE 这里用过去完成时（had + 过去分词）连接两个动作，你用了一般过去时，你想表达的先后关系还在吗？"
   - 终态产物：`RemixArtifact { plan, draft, alignment, drifts[], reflection }`，进入教师端 Reasoning 视图

### L4 · 教师视图层
1. **Live Dashboard**：一行一学生，单句自然语言摘要（"卡在听写第 3 句的 /θ/ 上"）
2. **Reasoning 双栏**：左 = 学生写的预测/听写/翻译/反思；右（教师专属）= Opus 的私有预测 vs 学生实际
3. **Cohort Narrative**：一节课结束后，输出"8 人里 6 人在弱读上失分，建议在 Unit X 前置弱读小节"
4. **课程库**：按 NCE 册/单元呈现卡片 + 完成率 + 高频失分点

### L5 · 教师创作层
1. **快速创作**：教师选一节 NCE Lesson（或贴自定义文本）→ Opus 生成 **Skeleton + Remix Plan 维度脚手架**（复用 `scaffolding` hook）→ 教师逐字段审阅（可锁定/可解锁某些骨架节点、可设词汇等级上限）→ 发布
2. **多语言翻译缓存**：复用 `ExerciseTranslation` 模式

---

## 2. 模块依赖图

```
        L0 基础设施
            │
            ▼
        L1 领域核心（Session / i18n / Opus / SSE / Runner 抽象）
         │           │
         ▼           ▼
    L2 内容模型     L3 学习管线（Phase 1/2/3）
    （NCE 接入）        │
         │              │
         └──────┬───────┘
                ▼
           L4 教师视图
                │
                ▼
           L5 教师创作
```

强约束（不可跨越）：
- L3 依赖 L1（Session/Opus）与 L2（必须有 Lesson **且已抽出 canonical skeleton**）
- L4 依赖 L3（要有 `RemixArtifact` 才能展示）
- L5 依赖 L1（Opus）+ L2（Lesson 库做"选源"）

---

## 3. 每轮（Round）实施目标

每轮控制在"可独立 demo / 可独立合并"的粒度。形式统一为 **目标 / 输入 / 输出 / DoD（完成定义）**。
顺序严格自上而下，不要并行越层。

### Round 0 · Pre — 共识与脚手架
- **目标**：从 maieutic fork 出 `english-coach` 仓库；剥离与编程教学强绑定的代码；锁定栈版本
- **输入**：本规划文档 + maieutic 仓库当前 HEAD
- **输出**：
  - 新仓库（或新分支）`english-coach`，可 `npm run dev` 起空白首页
  - `prisma/schema.prisma` 清掉 `Exercise.targetLanguage` 中编程语言枚举，预留 `subject = "english"`
  - 删除 `run-python.ts / run-java.ts / run-symbolic-math.ts / run-exercise-code.ts` 及对应 `pyodide-worker.js`
  - 保留 `Session / SessionEvent / ExerciseTranslation` 数据模型不动
- **DoD**：`npm run dev` + `npm run lint` + `vitest run` 全绿；首页能区分 student / instructor

---

### Round 1 · L0+L1 — 框架瘦身与抽象就绪
- **目标**：把"编程教学语义"换成"通用学习教学语义"
- **输入**：Round 0 仓库
- **输出**：
  - `src/lib/runner/`：新增 `Runner` 抽象接口 `{ kind, evaluate(input, expected): Promise<RunnerResult> }`
  - `src/lib/opus/` 保留 7 个 prompt 槽位，提示词中**仅修改领域词**（code → utterance/answer，spec → expectation）
  - `src/lib/i18n/` 增加 `zh-CN`
  - SSE 总线与 `live-summary.ts` 不动，仅泛化字段命名
- **DoD**：旧 Opus 单测改名后通过；新增 `Runner` 接口 mock 测试通过

---

### Round 2 · L2 — NCE 内容接入（只读管线）
- **目标**：把 NCE 内容标准化进数据库，构建只读检索/播放能力（**复刻原 NCE 点读站**）
- **输入**：`/Users/zxydediannao/ NCE /NCE/data.json` + 远程 `bookPath/<unit>` 真实样本（先取 NCE1 前 5 课）
- **输出**：
  - Prisma 新增 `Book / Unit / Lesson / Sentence` 表（迁移 1 个）
  - `scripts/nce-ingest.ts`：拉远程 → 解析 LRC + zh/en → 入库；幂等
  - `scripts/nce-mirror.ts`：把音频镜像到 `public/nce/<book>/<unit>.mp3`
  - `/api/lessons`、`/api/lessons/:id` 只读 Route Handler
  - `<NcePlayer />` React 客户端组件：移植 NCE 原 `main.js` 句级点读 / 变速 / 中英对照 / 单句循环
  - 极简 `(student)/lessons` 列表 + `(student)/lessons/[id]` 播放页
- **DoD**：新框架内能复刻 NCE 原站点读体验；NCE1 至少 5 节课入库且可播放

---

### Round 3 · L2+L3 — Canonical Skeleton 离线抽取
- **目标**：为每节 Lesson 产出可被 L3 消费的 `NarrativeSkeleton`
- **输入**：Round 2 的 Lesson 全文 + Opus provider
- **输出**：
  - Prisma 新增 `LessonSkeleton { lessonId, scene, characters[], timeline[], plotNodes[], sentencePatterns[], styleTags[], vocabBand, registerLevel }`（迁移 1 个）
  - `src/lib/opus/prompts/skeleton-extract.ts`：新增第 8 个 Opus hook，输出 Zod 严格校验
  - `scripts/extract-skeletons.ts`：批跑全库；幂等；失败可重试
  - 教师端只读预览页 `(instructor)/lessons/[id]/skeleton`
- **DoD**：NCE1 前 5 课的 skeleton 全部抽出、人审通过；schema 稳定

---

### Round 4 · L3 — Remix 写作四步闭环 MVP
- **目标**：跑通 **Phase 1 Skeleton+Plan → Phase 2 受限 Remix → Phase 3 Align → Phase 4 Drift** 完整闭环
- **输入**：Round 3 skeleton + Opus provider
- **输出**：
  - `Exercise` 语义 = 「基于某 Lesson 的 remix 任务」，引用 `lessonId` + `skeletonId`
  - **Phase 1**：渲染 skeleton 卡片（隐藏原文）+ Remix Plan 表单（场景/主角替换、要保留的骨架节点、要复用的句式模板）→ Opus `spec-examiner`（改造版）反问
  - **Phase 2**：Monaco 编辑器（关 autocomplete）+ 实时受限检查器 `RemixConstraintChecker`（骨架节点覆盖率 / 句式复用率 / 词汇等级）；`Runner.english-remix-draft` 提交时落 `RunnerResult`
  - **Phase 3 Align**：`src/lib/opus/prompts/structure-align.ts`（第 9 个 hook）→ 输出节点级映射 JSON
  - **Phase 4 Drift**：`intent-diff` hook 提示词改造，逐节点产出中立问句
  - `SessionEvent` 全程审计；终态产物 `RemixArtifact` 入 `Session.phase3Data` 与 `phase4Data`（schema 扩展 `Session` 增加 `phase4Data Json?`）
- **DoD**：一名学生从选课 → 四 phase 全程跑通；DB 留下完整 `Session + RemixArtifact`

---

### Round 5 · L3 辅助 — 听说读训练通道接入
- **目标**：在 Phase 1 / Phase 2 内嵌入听说读训练，结果**回灌**到主线写作
- **输入**：Round 4 + 浏览器 `MediaRecorder` + Web Speech API（或 Whisper API 备选）
- **输出**：
  - `Runner.english-dictation`（听写）：句级播放 → 输入 → Levenshtein 评分；产物作为 Phase 1 素材笔记
  - `Runner.english-shadowing`（跟读）：录音 → ASR → 相似度 + 节奏分；可在 Phase 2 用来朗读学生自己写的句子
  - `Runner.english-read-aloud`（精读）：调取 canonical 原文片段（带冷却防抄）
  - 学生 UI：Phase 1 / Phase 2 侧边栏的「辅助训练」抽屉
  - 所有训练结果统一写入 `SessionEvent.kind = "aux_training"`
- **DoD**：3 类辅助训练在 demo 课上均可触发并把结果回灌到主线

---

### Round 6 · L4 — 教师 Live Dashboard + Reasoning
- **目标**：教师能实时看到学生在 remix 四步哪一步、卡在哪个骨架节点
- **输入**：Round 4 / 5 产生的 Session 流
- **输出**：
  - `(instructor)/live`：SSE，一行/学生，单句摘要由 `live-summary.ts` 生成（提示词改写聚焦 remix 进度，例：「学生在 Lesson 17 remix 的第 2 个骨架节点，用了过去完成时但搭配错误」）
  - `(instructor)/reasoning/[sessionId]`：双栏视图，左 = Plan/Draft/Reflection；右 = Skeleton/Alignment/Drifts
- **DoD**：教师页打开能看到 demo 班级实时 remix 进展；点进任一 session 看到推理视图

---

### Round 7 · L4 扩展 — Cohort Narrative + 课程库
- **目标**：班级级别的洞察 + 课程库卡片
- **输入**：一节课全班 `RemixArtifact` 集合
- **输出**：
  - `(instructor)/cohort/[exerciseId]`：Opus `cohort-narrative`（提示词改写）输出班级 drift 模式 + 课程建议（例：「8 人中 6 人在过去完成时上漂移，建议在 Unit 3 前置一节」）
  - `(instructor)/cohorts`：按 NCE 册/单元罗列卡片（尝试人数 / 完成率 / 高频 drift 类型）
- **DoD**：跑完 demo 班级后能看到上述风格报告

---

### Round 8 · L5 — 教师创作（Authoring）
- **目标**：教师可基于任意 NCE Lesson（或自定义文本）一键生成 remix 训练任务
- **输入**：Round 3 skeleton + Opus `scaffolding`
- **输出**：
  - `(instructor)/authoring`：选 Lesson → 自动加载 skeleton → Opus 生成默认 Remix Plan 维度（可替换字段 / 必保节点 / 词汇等级上限）→ 教师逐字段编辑 → 发布
  - 自定义文本路径：教师贴文本 → 先跑 skeleton-extract → 进入同一编辑器
- **DoD**：5 分钟内能从零造出一节可发布的 remix 任务

---

### Round 9 · 完整化 — i18n / 部署 / Demo seed
- **目标**：达到 maieutic 当前的工程完成度
- **输出**：
  - `zh-CN / en` 全量翻译；`ExerciseTranslation` 表正常工作
  - `scripts/reset-demo.ts` 改写：注入 3 个 demo 学生 + 一节 NCE1 demo 课的 cohort `RemixArtifact` 历史
  - `Dockerfile` / `cloudbuild.yaml` 复核可部署
  - README / FAQ 更新；保留 NCE 内容版权声明
- **DoD**：新机器 clone → 一条 `npm run reset-demo && npm run dev` 立刻有可演示数据

---

## 4. 跨轮约束 / 风险登记

| 项 | 风险 | 缓解 |
|---|---|---|
| NCE 内容版权 | 商用风险 | 仅个人学习/教学用；保留原作者与来源声明；不内置商业化入口 |
| 远程音频源稳定性 | mleo.site 抖动会让辅助听训崩溃 | Round 2 提供 mirror 脚本，生产环境用本地镜像 |
| ASR 成本与隐私 | Web Speech 准确率参差，Whisper API 收费 | 先用 Web Speech 兜底，第三方 ASR 走 provider 抽象 |
| Next.js 16 破坏性变更 | 训练数据中可能仍是 14/15 写法 | 严格遵循 `node_modules/next/dist/docs/`，沿用 maieutic 已验证写法 |
| Opus 提示词漂移 | 7+2 个 hook 全部改语义，容易回归 | 每个 prompt 保留 maieutic 原版 git diff，单测使用 frozen fixtures |
| Skeleton 抽取质量 | LLM 抽出的 skeleton 偏差会污染整条管线 | Round 3 强制人审 NCE1 前 5 课；schema 锁死，离线批跑可回滚 |
| Remix 受限度调参 | 太严学生写不出，太松失去对齐价值 | Round 4 设默认阈值 + 教师可调；记录 cohort 通过率作为反馈 |
| Schema 变更 | R2 / R3 / R4 都改 Prisma | 严格 1 round = 1 迁移，CI 跑 `prisma migrate diff` |

---

## 5. 验收顺序总览（"前一项绿了再做下一项"）

```
R0 脚手架 → R1 抽象就绪 → R2 NCE 接入（可播放）
        → R3 Skeleton 抽取 → R4 Remix 四步闭环
        → R5 听说读辅助训练 → R6 Live Dashboard
        → R7 Cohort/课程库 → R8 Authoring
        → R9 部署/Demo
```

---

## 6. 立即可执行的 Next Step

1. 在新分支 `english-coach/round-0` 上执行 Round 0 的剥离动作
2. 起一个 `docs/decisions/` 目录，每轮一份 ADR 记录关键技术选择
3. Round 2 之前先用 `curl https://nce.mleo.site/NCE1/...` 抓 1 节真实样本，对齐 LRC + zh/en 文件格式
4. Round 3 之前先**手工**为 NCE1 第 1 课写一份 `NarrativeSkeleton` 样例（JSON），作为 Opus 抽取的 golden fixture

> 本文档将作为后续 PR 的 "contract"：任何 PR 标题需带 `[R0]`～`[R9]` 前缀，描述里勾选本文档对应 Round 的 DoD 才能合并。
