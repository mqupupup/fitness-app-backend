# v1.3 — 冲突审核 + Metadata 治理 + 索引重建 + A/B 重跑

> 顺序（用户拍板）：P0 审核 5 条冲突 → P1 补 metadata → P1 重建索引 → P1 重跑 20 条 A/B。
> semantic claims 抽检穿插，不阻塞。主线全部完成，73 tests passed。

---

## 一、P0：5 条冲突审核（人工审核，`conflicts_resolution.jsonl`）

**结论：5 条全部是 context_specific 或噪音，没有一条需要标 superseded/historical。**
13 源 `evidence_temporal_status` 全部保持 current。

| conflict_id | 判定 | 依据（原文） |
|---|---|---|
| g/kg\|protein 0.4-0.5 vs 1.4-2.0 | **context_specific** | 0.4-0.5 g/kg 是训练前后**单餐**蛋白量（Pyramid p135）；1.4-2.0 是**每日总量**（ISSN minimum）。口径不同，非冲突。 |
| g/kg\|protein 1-3 vs 1.4-2.0 | **noise_drop** | value "1-3" 实为**低碳水摄入量**（Pyramid p93：1-3 g/kg of carbohydrate），被检测器语境误归到 protein，剔除。 |
| g/kg\|protein 1.4-2.0 vs 1.6-2.2 | **context_specific（核心）** | ISSN 2017：1.4-2.0 g/kg/day 是**最低推荐量**（minimum，减脂保瘦体重需更高）；Pyramid 2019 引最新 meta：非热量限制人群获益在 1.6-2.2 达平台。**"最低推荐 vs 最优化区间"，可兼容非新旧之争**。 |
| g/kg\|protein 1.4-2.0 vs 2.5-3 | **context_specific** | 2.5-3 g/kg 是减脂期**可容忍上限**（"would not be harmful"，安全上限非推荐量）；1.4-2.0 是每日最低推荐。问题定义不同。 |
| mg/kg\|caffeine 1-3 vs 3-9 | **context_specific** | Pyramid 1-3 mg/kg 是**抑制疲劳**剂量（p157）；NSCA 3-9 mg/kg 是**运动表现增强**剂量（p261）。目的不同，均正确。 |

**关键认知（正是用户要求的非机械审核）**：
- 不把 2017 ISSN 标 superseded——它不是被取代，而是"最低推荐 vs 最优化区间"的口径差异，ISSN 2017 蛋白立场目前仍是现行立场。
- 最专业的回答表达是**并列说明差异**："知识库不同来源给出不同范围——较新资料 1.6-2.2 g/kg/day（增肌最大化），早期 ISSN 立场 1.4-2.0 g/kg/day（最低推荐量），两者适用口径不同"。
- **检测器已知局限已记录**：句子级语境会跨桶误归（碳水 1-3 g/kg 被归蛋白），v3 的 unit 级语境已缓解但非完美，审核时必须回原文。

## 二、P1：Metadata 补全（3109 units，规则抽取优先）

`knowledge_qa/metadata_enrich.py`（RULES_VERSION = metadata_rules_v1）：
- **3109/3109 units 更新**，exercise / topic / goal / population 四类 + metadata dict 全部回填，写回 units.jsonl。
- **低置信度**：无动作命中 2116（68%，主要是营养/立场内容本不含动作）、无人群命中 410 → 待人工/LLM 审核清单。
- **抽取质量验证**：动作专项书 100% 命中（Nippard bench→bench_press 55/55、squat→55/55）；训练书大量命中（SS 的 squat 192/bench 116/deadlift 139、PP 同型）；营养/立场类合理无动作。
- 规则优先（不引入 LLM 批量重写的不可控错误），低置信度留给人工。

## 三、P1：重建索引

`knowledge_qa/rebuild_index.py`：
- **原则**：metadata 抽取未改 content → BGE-M3 embedding 不变，**不重算 3109 向量**（省时省算力且不引入噪声）。
- 校验：doc_ids 3109 与 units **完全对齐**、向量 3109×1024。
- manifest 更新：registry_version=v1.2、metadata_rules_version=metadata_rules_v1、重建说明。

## 四、P1：重跑 20 条 A/B（glm-4-flash，v1.2 改动生效）

| 指标 | v1.1/P2 | **v1.2 重跑** | 变化 |
|---|---|---|---|
| RAG citation_completeness | 0.48-0.51 | **0.596** | ▲ ~10pt（Atomic Claim 起效） |
| Pure response_validity | 0.05（schema 污染） | **1.0** | ▲ Pure schema 修复（no_external_evidence 合法） |
| RAG groundedness | ~0.97 | 0.95 | 持平（语义分母更严格） |
| RAG citation_accuracy | ~0.97 | 0.95 | 持平 |
| RAG abstention_recall / precision | 1.0 | **1.0 / 1.0** | ✅ 保持 |
| RAG numeric_guard 违规 | 0 | **0** | ✅ 保持 |
| rag_gold groundedness | 1.0 | **1.0** | ✅（理想证据→LLM 无损失） |
| Pure abstention_recall | 0 | **0** | 裸模型仍不拒答 → 程序化 Gate 必要性再次证实 |
| Pure numeric_guard | — | **6 case / 8 违规** | 裸模型乱给数字 → RAG 0 违规对照 |
| insufficient_ok_rate (RAG) | 1.0 | **1.0** | ✅ |

**解读**：citation_completeness 显著改善，但离 90% 目标仍远（Atomic Claim 已拆细 claim，但 required_claims 标注粒度 + 模型引用习惯仍是瓶颈）。Pure 组 abstention=0 + 8 处数字违规，反向证明了 v1.1 程序化 Abstention Gate + Numeric Guard 是产品安全的关键。

## 五、证据解释能力（v1.3 附加价值，数据基础已就绪）

conflicts_resolution.jsonl 已为"证据解释"备好结构化基础：每条含 verdict/summary/action/原文依据。运行时（fitness-app-backend）可据此渲染：
```
推荐 1.6-2.2 g/kg/day（增肌最大化）
  ✓ 较新资料（2019）引最新 meta：获益达平台区间
  · 另一来源：1.4-2.0 g/kg/day（ISSN 2017，最低推荐量）
```
> 实现归 fitness-app-backend 运行时层，v1.3 只交付数据基础（审核结论），不写运行时 UI。

## 六、产物清单（v1.3）

- `knowledge/evaluation/conflicts_resolution.jsonl`（新增：5 条审核结论）
- `knowledge/evaluation/ab_llm_results.json`（重跑：v1.2 版，备份 .bak_v12_pre）
- `knowledge/evaluation/ab_llm_results.json.bak_v12_pre_20260902`（重跑前备份）
- `knowledge/builds/<13>/units.jsonl`（3109 units：metadata 四类回填）
- `knowledge/dense_index/bge_m3_v1/manifest.json`（更新 v1.2）
- `knowledge_pipeline/knowledge_qa/{metadata_enrich, rebuild_index, write_resolution}.py`（新增）
- 测试：73 passed（含新增 metadata/索引无破坏）
