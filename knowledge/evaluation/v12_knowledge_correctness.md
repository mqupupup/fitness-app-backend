# v1.2 — 知识正确性与答案完整性（Knowledge Correctness & Answer Completeness）

> 状态：v1.1 架构与安全护栏**冻结**（Retriever/Evidence Builder/LLM Grounding 接口不再动）。
> v1.2 只做四个未闭环问题：①知识版本冲突 ②Atomic Claim ③Semantic 评测盲区 ④Knowledge QA。
> 测试：**73 passed**（70 原有 + 3 新增 knowledge_qa）。

---

## 一、P0：Knowledge Correctness（版本化 + 冲突检测）

### 1.1 版本化（versioning）——已完成

- **source 级权威**：`sources_registry.json` 13 个已摄入源注入 `source_year / edition / evidence_temporal_status / is_current / supersedes`。
  - 版本元数据放 registry（source 级），一本书/立场声明的所有 units 共享，避免重复。
- **units 落盘注入**：`knowledge_pipeline/knowledge_qa/versioning.py` 把字段注入全部 builds 的 units.jsonl。
  - **3109 / 3109 units 注入**，13 源全 current（当前核心集无 superseded）。
  - **幂等**（重复运行结果一致）。
  - **知识保留策略**：不删除旧知识，只打 temporal 标记——默认检索 current，明确历史问题时允许 historical（用户 v1.2-P0 明确）。
  - 无版本元数据的源显式打 `unknown`（不假装 current）。

### 1.2 冲突检测（conflict detection）——已完成

- `knowledge_pipeline/knowledge_qa/conflict_detection.py` → 输出 `knowledge/evaluation/conflicts.jsonl`。
- **三轮收敛**（体现"自动检测必须聚焦"）：

| 版本 | 策略 | 冲突数 | 问题 |
|---|---|---|---|
| v1 | 纯单位聚类（days/g/sets...） | **77567** | 语义无关数值全混入，无价值 |
| v2 | 只留剂量单位 g/kg/mg/kg + 语境词 | 60 | 跨语境交叉噪音（肌酸立场提 protein） |
| v3 | 区间型推荐 + **unit 级主导语境** | **5** | 干净，均为真候选 |

- **核心实证冲突已检出**：`g/kg|protein` **1.4-2.0（ISSN 2017） vs 1.6-2.2（Pyramid 2019）** —— 正是 case 5 审计发现的版本冲突。
- 另检出：咖啡因 `1-3（Pyramid）vs 3-9（NSCA）`（即 case 15 的 gold 冲突）。
- 5 条候选 `conflicts.jsonl` 待**人工/LLM 审核**（哪个更新、哪个人群、哪个语境）。

## 二、P1-1：Source Policy（来源策略）——已完成

- `knowledge_pipeline/knowledge_qa/source_policy.py`：`SOURCE_PRIORITY` 表（用户给）：
  position_stand=100 / systematic_review=95 / meta_analysis=95 / guideline=90 / rct=85 / textbook=75 / expert_book=60 / practical_article=40。
- **用途限定**：①冲突解决 ②同等相关证据选择 ③答案中的证据解释。
- **严禁**：priority 直接加入检索 final score（v1 evidence prior 已实证 MRR 0.653→0.602，否决）。
- `resolve_conflict()`：对每条 conflicts.jsonl 输出裁决参考（哪个新/哪个优先/建议），**只建议不自动改数据**。
  - **关键改进**：高等级但更旧时提示"核对共识更新，不要机械按等级采信"——因为蛋白 case 中 ISSN(2017, position_stand) 等级高却比 Pyramid(2019) 旧，机械采信会得到与新版共识相反的错误结论。

## 三、P1-2：Atomic Claim 输出——已完成

- `llm/prompt.py` JSON_FORMAT_GUIDE 强化：
  - "每条 claim 只表达一个可验证事实，不要一条 claim 塞入多个独立结论（如既说推荐剂量又说冲击期）"
  - "若一个结论依赖多个条件/多个 Evidence，拆成多条 claim 各自绑定对应 Evidence ID"
- 目的：解决"一个 claim = 3 个 required_claim"导致 citation completeness / groundedness / judge 一致性 / 前端引用 同时变差的问题。

## 四、P1-3：Semantic claim 评测（消除"中文无数字盲区"）——已完成

- `evaluation/llm_evaluator.py`：claim 三分类 `evaluation_mode`：
  - **numeric**（有数字+单位）→ 程序检查（现状）
  - **term**（有英文术语）→ 术语检查（现状）
  - **semantic**（纯中文无数字无英文）→ **不再假装验证**：`supported=None`、`verifiable=False`、单独统计
- `evaluate_response` / `run_benchmark` 新增 `semantic_claims_total / semantic_claims_pending_human`（当前无语义蕴含模型，全部待人工/Judge 抽检）。
- **效果**：之前纯中文 claim（如"膝盖超过脚尖是错误的"）verifiable=False 被排除分母，groundedness 虚高到 1.0；现在这些 claim 被显式标记为"待抽检"，不再假装被验证。

## 五、P1-4：Knowledge QA（知识资产质量检查）——已完成

- `knowledge_pipeline/knowledge_qa/quality_report.py` → `knowledge/evaluation/knowledge_quality_report.json`。

**发现（3109 units）**：
| 检查项 | 结果 | 评价 |
|---|---|---|
| 缺页码 | 0（0.0%） | ✅ 健康 |
| 版本字段 | 3109 全 current，无缺失源 | ✅ 健康 |
| 重复内容 | 0 组 | ✅ 健康 |
| 缺关键字段 | 0 | ✅ 健康 |
| **metadata dict** | **3109 全空** | ⚠️ ingestion 未填充 |
| **exercise/goal/population** | **3109 全空** | ⚠️ 无法按动作/人群过滤检索 |
| 冲突候选 | 5 条 | ✅ 已生成待审核 |

> **结论**：Knowledge QA 抓到了真实的知识资产缺口——**检索元数据（exercise/population/goal）在 ingestion 时未填充**。这不影响当前 RAG 跑通（靠 content 语义检索），但影响未来"按动作/人群过滤"与证据分层。属 v1.3 ingestion 改进项。

## 六、测试与落盘

- **73 passed**（新增 test_knowledge_qa.py：versioning 幂等 / 冲突检出蛋白 / source_policy 裁决）。
- 新落盘：
  - `knowledge/evaluation/conflicts.jsonl`（5 条候选冲突）
  - `knowledge/evaluation/knowledge_quality_report.json`（知识质量报告）
  - `sources/sources_registry.json`（13 源 versioning 字段）
  - 3109 units 全量注入 versioning 字段
- 新模块：`knowledge_pipeline/knowledge_qa/{versioning, conflict_detection, source_policy, quality_report}.py`

## 七、未决 / 下一步（v1.3 候选）

1. **冲突审核**：人工/LLM 审核 5 条 conflicts.jsonl → 决定哪条 source 标 superseded（尤其蛋白 1.4-2.0 vs 1.6-2.2）。
2. **ingestion metadata 填充**：exercise/goal/population 自动提取（Knowledge QA 暴露）。
3. **semantic claims 抽检**：对 semantic claims（纯中文无数字）用 Judge/人工抽检，验证 judge 可靠性。
4. **重跑 20 条 LLM A/B**：验证 Atomic Claim + Semantic 三分类对 groundedness/completeness 的影响（需智谱 key）。
