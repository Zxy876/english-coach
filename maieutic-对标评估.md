# English Coach vs maieutic 功能对标评估

> 目标：对齐 maieutic 的架构/功能/监控/作业流转/教师端能力，排除编程相关内容，聚焦 remix+AI批改+风格达成学习法。

---

## 1. 页面/路由结构

| 功能模块         | maieutic 路由/页面           | English Coach 现状         | 评估/建议 |
|------------------|-----------------------------|---------------------------|-----------|
| 主页/入口        | /                           | /                         | ✅ 已有    |
| 选课/练习列表    | /exercises, /cohort         | /lessons                  | ✅ 已有，需 cohort 汇总页 |
| 单练习/作业页面  | /exercises/[id], /sessions/[id] | /lessons/[bookKey]/[ordinal], /sessions/[id] | ✅ 已有 |
| 学生作业流转     | /sessions/[id] 四阶段       | /sessions/[id] 四阶段     | ✅ 已有 |
| 教师端监控       | /cohort, /monitor, /admin   | 无                        | ❌ 需补齐 |
| 统计/分析        | /cohort, /monitor           | 无                        | ❌ 需补齐 |
| 个人进度/历史    | /me, /history               | 无                        | ⚠️ 可选   |

---

## 2. 数据结构/作业流转

| 数据结构/流转    | maieutic                    | English Coach             | 评估/建议 |
|------------------|-----------------------------|---------------------------|-----------|
| Exercise/练习    | exercise, cohort, session   | lesson, exercise, session | ✅ 已有    |
| Session/作业     | session, event, phase       | session, event, phase     | ✅ 已有    |
| Cohort/班级      | cohort, cohort_exercise     | 无                        | ❌ 需补齐 |
| 作业事件流转     | event, phase, gate          | event, phase, gate        | ✅ 已有    |
| 学生状态         | session.phase, event        | session.phase, event      | ✅ 已有    |
| 教师点评/批改    | event, review, feedback     | event, review (AI)        | ⚠️ 需补齐人工点评 |
| 风格/统计        | drift, align, summary       | drift, align, summary     | ✅ 已有基础，需 cohort 汇总 |

---

## 3. 权限体系

| 角色/权限        | maieutic                    | English Coach             | 评估/建议 |
|------------------|-----------------------------|---------------------------|-----------|
| 学生             | session, submit, revise     | session, submit, revise   | ✅ 已有    |
| 教师             | cohort, monitor, review     | 无                        | ❌ 需补齐 |
| 管理员           | admin, manage users         | 无                        | ⚠️ 可选   |

---

## 4. 主要 API/数据流

| 能力             | maieutic                    | English Coach             | 评估/建议 |
|------------------|-----------------------------|---------------------------|-----------|
| 作业提交/批改    | /api/sessions/[id]/...      | /api/sessions/[id]/...    | ✅ 已有    |
| AI批改/门槛      | spec-examiner, phase2-chat  | plan-examiner, draft-review | ✅ 已有    |
| 风格/剧情分析    | align, drift, summary       | align, drift, summary     | ✅ 已有    |
| Cohort/全班统计  | /api/cohort, /api/monitor   | 无                        | ❌ 需补齐 |
| 教师点评/批改    | /api/review, /api/feedback  | 无                        | ❌ 需补齐 |

---

## 5. prompt/AI能力

| 能力             | maieutic                    | English Coach             | 评估/建议 |
|------------------|-----------------------------|---------------------------|-----------|
| 结构门槛         | spec-examiner, plan-examiner| plan-examiner             | ✅ 已有    |
| 过程批改         | phase2-chat, draft-review   | draft-review              | ✅ 已有    |
| 风格/剧情分析    | align, drift                | align, drift              | ✅ 已有    |
| 编程相关         | 代码生成/解释/测试          | 不适用                   | 🚫 不抄   |

---

## 6. 监控/统计/教师端能力

| 能力             | maieutic                    | English Coach             | 评估/建议 |
|------------------|-----------------------------|---------------------------|-----------|
| Cohort 监控      | 班级/全员进度/作业统计      | 无                        | ❌ 需补齐 |
| 作业批改流转     | 教师点评/AI批改/多轮        | 仅 AI 批改                | ⚠️ 需补齐人工点评 |
| 风格/剧情统计    | 全班风格/剧情偏差           | 无                        | ❌ 需补齐 |
| 作业历史/追踪    | 全部事件/版本/回溯          | 有事件，缺 cohort 汇总     | ⚠️ 需补齐 |

---

## 7. 结论与建议

- English Coach 已实现 remix/AI批改/风格分析的学生端主线，**但 cohort/教师端/全班监控/统计/人工点评等能力需补齐**。
- 建议：
  1. 新增 cohort/monitor/教师端页面，汇总所有学生作业、进度、风格、剧情统计。
  2. 补齐 cohort/作业/事件/风格等聚合 API。
  3. 权限体系补齐教师/管理员角色。
  4. 后续所有流程、数据结构、页面布局、监控能力均对标 maieutic，prompt 只保留通用写作/风格/剧情，不抄编程内容。

---

如需细化某一块（如 cohort 监控、教师点评、作业流转等），可指定优先级，立刻进入设计/开发。