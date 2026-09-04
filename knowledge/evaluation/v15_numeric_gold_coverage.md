# v1.5：Numeric Guard v2 + Golden Conflict Fix + Answer Coverage v2（2026-09-03）

主线顺序（用户拍板）：① Numeric Guard v2（P0）→ ② Golden Conflict Fix（P0，D 类多口径）
→ ③ Answer Coverage v2（P1，要点清单→逐点→自检）→ 重跑 20 QA + Answer Coverage 指标。

---

## ① Numeric Guard v2（P0）— 完成

**问题背景（v1.4 实证）**：Numeric Guard 用旧 `_num_units`（只匹配阿拉伯数字+简单范围），
产生 2 条误报：
- 英文数字词不识别："five sets" vs "5 sets" → 误判无证据
- 单位变体不归一："g/kg" vs "g∙kg⁻¹·day⁻¹" → 误判无证据

**v2 改造**（`knowledge_pipeline/llm/numbers.py` 新增，`safety.py` 接入）：
- numeric parser：阿拉伯 / 英文数字词（one~ninety、twenty-five、one point six）/ 中文数字词
  （X点Y、X十Y、单位前单字）/ 小数 / 区间 / 不等式 / 科学计数法
- unit normalizer：单遍替换（修复嵌套占位符 bug），g/kg ↔ g·kg⁻¹·day⁻¹ ↔ 克/千克/天 ↔
  mg/kg ↔ 毫克/千克 ↔ sets/reps/次/组 等 14 组别名
- 字符归一：上标（⁻¹→-1）、点号/连字符统一（∙·−‑–→·/-）
- 语义关系：exact / contained / overlap / equivalent / unsupported；区间包含、单值在区间内、
  不等号保守处理；**判定不确定时不判 unsupported**（宁放过不误报，用户原则）
- 修复 3 个解析 bug：范围分隔组漏 `?`（单值解析失败）、单值 hi=None（lo==hi 恒 False 导致
  单值匹配全跳过）、g/kg 嵌套占位符（二次替换）

**验证**：
- `guard_precision_cases.jsonl`（新增精度测试集，12 条）：**12/12 通过**
  （英文/中文数字、单位变体、range 分隔符、contained、拒绝 30g vs 3-5g、中英单位互通、不等式）
- 全量 pytest：**87 passed**（原 73 + 12 guard 精度 + 2 回归：question 复述、单位变体）

**A/B 实证**：`numeric_guard.rag_violation_cases` **2 → 0**，`rag_violations_total` **2 → 0**。
Pure 组 4 cases / 6 violations 保留（裸模型无证据仍给具体数值建议，作为对照 baseline）。

---

## ② Golden Conflict Fix（P0）— 完成

**问题**：4 条 D 类 gold 是"口径/标注问题"——知识库不同来源给出不同范围，却用唯一数字要求模型
（如 10-20 组/周 vs 2026 ACSM 每肌群每周至少 2 组起）。

**改造**（`llm_ready_set.jsonl` 3 条 → `evaluation_mode: multi_source`）：
- 新增 `gold_claims`（跨来源的核心判断）
- 新增 `acceptable_claim_variants`（多口径均接受，不再要求背唯一数字）
- 新增 `source_conflicts`（列出各来源口径与立场，供模型识别条件/来源/适用范围）
- `required_claims` 保留非冲突项（兼容旧评估链路）
- 3 条 case：
  - 增肌每周每个肌群多少组（10-20 组/周 vs 至少 2 组起剂量-反应）
  - 每周增肌训练量建议组数（新手 5-10 / 常见 10-20 / ACSM 剂量-反应）
  - creatine loading（loading 非必须 vs 冲击期可选加速）

**实证**：归因矩阵 D 类 **4 → 0**，口径污染清零。

---

## ③ Answer Coverage v2（P1）— 完成

`prompt.py` JSON_FORMAT_GUIDE 的答案覆盖升级为三步自检：
1. 要点清单：从 Evidence 提取必须覆盖的全部关键要点（主结论/数值/条件/例外/时间窗/人群）
2. 逐点作答：每个要点独立 Atomic Claim，绑定对应 Evidence ID
3. 自检：对照清单逐项核对，遗漏必须补齐

并新增 multi-source 识别指令：不同来源口径不同时，不要只挑一个数字，应识别并说明
来源、条件与适用范围，各口径分别绑定其 Evidence ID。（SYSTEM_PROMPT 用户锁定未动）

---

## 重跑 20 QA（A/B）结果

| 指标 | v1.4 | v1.5 | 变化 |
|---|---|---|---|
| rag_claimed groundedness | 0.940 | **0.992** | ↑ 显著 |
| rag_claimed citation_accuracy | 0.940 | **0.992** | ↑ 显著 |
| rag_claimed citation_completeness | 0.771 | 0.688 | 见注① |
| unsupported_claim_rate | 0.057 | **0.023** | ↓ 降一半 |
| rag_gold groundedness | 0.965 | 0.967 | ~ |
| abstention_recall / precision | 1.0 / 1.0 | 1.0 / 1.0 | 保持 |
| response_validity (rag/pure) | 1.0 / 1.0 | 1.0 / 1.0 | 保持 |
| **numeric_guard rag violations** | **2** | **0** | **清零** |
| pure violations (baseline) | 4 cases / 7 | 4 cases / 6 | 对照 |

注①：completeness 口径变化——D 类 4 条 required 已移出（不再要求唯一数字），
且多 source case 的 required 改为非冲突要点；与 v1.4 不完全同分母。

**归因矩阵（judge 口径，50 required claims）**：
| 类别 | v1.4 | v1.5 | 说明 |
|---|---|---|---|
| A 真漏答 | 18 | **22** | 系统性"答主问题漏附加条件" |
| B 说了没引用 | 0 | 0 | 引用绑定机制正常 |
| C 粒度合并 | 9 | 8 | 轻微 |
| D 口径问题 | **4** | **0** | Golden Conflict Fix 清零 |
| OK | 23 | 20 | — |
| completeness | 0.596 | 0.560 | 分母变化（54→50） |

A 类 22 条全部是"附加条件/细节被漏"：接近力竭、均匀分餐、握距 1.25-1.75 倍肩宽、
肾功能异常遵医嘱、个体差异、正确技术下不伤害健康膝盖 等。

---

## 结论

- **P0 Numeric Guard v2**：安全护栏从"会误报生产护栏"升级到 12/12 精度 + 0 误报，
  达到生产护栏资格（用户原则：宁可不确定也不误报）。
- **P0 Golden Conflict Fix**：D 类口径污染清零，multi_source 测的是"识别条件/来源/适用范围"而非背数字。
- **P1 Answer Coverage v2**：prompt 层落地；首轮对 glm-4-flash 的自检执行力有限——
  A 类 22 条未解决，这是下一轮主线（下一轮不应继续改 prompt 堆指令，应评估：
  自检机制 vs 模型能力 vs 是否需要 Evidence 侧要点预提取/结构化提示）。
- groundedness 0.992 + unsupported 0.023 + guard 0 误报：v1.5 的"能力—安全"耦合阶段验收通过。

**产物**：`ab_llm_results.json`（v1.5 版，备份 .bak_v14_20260903）、`citation_attribution.json`（v1.5 版）、
`guard_precision_cases.jsonl`（新增）、`llm_ready_set.jsonl`（3 条 multi_source）、
`numbers.py` / `safety.py` / `prompt.py`（更新）、`test_numeric_guard.py`（新增，87 passed）。
