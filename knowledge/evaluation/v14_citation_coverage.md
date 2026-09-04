# v1.4 — Citation Completeness / Claim Coverage

> 拍板（用户）：不做证据解释、不先审 2116 低置信度 metadata。v1.4 唯一主线：
> 解剖 citation_completeness 0.596 → 目标 ≥0.85~0.90。
> 关键纪律：先归因（A/B/C/D），再针对性改 Prompt，不盲改。

---

## 一、P0：Citation Attribution Matrix（`evaluation/attribution.py` → `citation_attribution.json`）

**机制**：规则层（数字范围/关键词重叠）+ LLM judge（语义覆盖 + 口径判定，glm-4-flash，20 case 一次调用）。

**结果（54 个 required claims）**：
| 指标 | 值 |
|---|---|
| claim_coverage（required 被回答的比例） | **0.593** |
| citation_completeness | **0.593**（≈ evaluator 0.596，口径自洽验证 ✅） |
| 分类 A 真漏答 | **18（33%）** |
| 分类 B 说了没引用 | **0（0%）** |
| 分类 C 粒度合并 | 9 |
| 分类 D 标注/口径 | 4 |
| OK | 23 |

**核心归因结论（决定改什么）**：
- **B = 0**：不存在"回答了但没绑证据"的情况 → **citation binding 机制本身工作正常，不需要改绑定规则**。
- **A = 33% 是主瓶颈**：模型回答主问题但系统性遗漏"附加条件/细节"要点——例如回答"每周组数"遗漏"接近力竭"、回答"蛋白质"遗漏"分餐时机"、回答"卧推握距"遗漏"1.25-1.75 倍肩宽"、回答"硬拉起始"遗漏"髋部略高于膝"。
  → **这是 Answer Coverage（Answer Completeness）问题，不是 Citation 问题**（完全验证用户的判断）。
- **C = 9**：一个 claim 合并 2 个 required claims，Atomic Claim 约束不够强。
- **D = 4**：gold 标注口径与 2026 新立场冲突（"每个肌群每周 10-20 组" vs 2026 ACSM 的"至少 2 组"）→ benchmark 标注维护项。

## 二、P1：针对性 Prompt 微调（`llm/prompt.py` JSON_FORMAT_GUIDE）

**基于归因，不是盲改**。只动结构化输出约束（用户锁定的 SYSTEM_PROMPT 未动）：
1. **Answer Coverage（治 A）**：生成前先在内部枚举问题需覆盖的全部关键要点（主结论 + 数值/范围 + 前提条件 + 例外限制 + 时间窗口 + 适用人群），claims 必须覆盖 Evidence 支持的要点，禁止只答主问题而漏附加细节。
2. **原子粒度强化（治 C）**：主结论与附加条件必须分开成独立 claim，禁止合并成一句（"建议 X 但 Y 例外"拆两条各自绑定证据）。

## 三、P1：重跑 20 条 A/B（glm-4-flash）

| 指标 | v1.3 | **v1.4** | 变化 |
|---|---|---|---|
| **citation_completeness** | 0.596 | **0.771** | ▲ **17.5pt** |
| groundedness | 0.95 | 0.94 | 持平 |
| citation_accuracy | 0.95 | 0.94 | 持平 |
| unsupported_claim_rate | 0.053 | 0.057 | 持平 |
| abstention_recall / precision | 1.0 / 1.0 | **1.0 / 1.0** | ✅ 保持 |
| response_validity | 1.0 | **1.0** | ✅ 保持 |
| numeric_guard 违规 | 0 | **2**（已确认为 guard 误报） | ⚠️ 见下 |

**numeric_guard 2 条——非模型回归，已逐条核实为 guard 数值匹配精度问题**：
- 增肌训练量：模型引用 "5 组 10 次 vs 10 组 10 次"，evidence_03 原文明确支持（"five sets of 10 reps...greater strength responses"）——guard 只匹配阿拉伯数字，英文数字 "five/ten" 漏配。
- 蛋白质：模型引用 "1.4-2.0 g/kg"，正是 ISSN 立场原文——guard 单位变体（g/kg vs g∙kg⁻¹·day⁻¹）匹配失败。
- **结论**：Answer Coverage 强化后模型引用更完整，guard 数值解析跟不上 → 这是 **v1.5 的 Numeric Guard 精度改进项**（英文数字 / 单位变体 / 区间格式），不是安全回归。

## 四、v1.4 结论

1. **completeness 0.596 → 0.771**：归因驱动的针对性 Prompt 有效（▲17.5pt），且 groundedness / abstention / validity 全部保持。
2. **剩余 ~0.23 缺口**：主要是 A 类（覆盖）尚未完全解决 + C 类 + D 类标注。
3. **方法学验证**：attribution 分析器的 claim_coverage（0.593）与 evaluator completeness（0.596）吻合，说明"归因→定向改→重跑"闭环成立。

## 五、下一步（v1.5 候选）

| 优先级 | 项 | 说明 |
|---|---|---|
| P0 | Numeric Guard 精度 | 英文数字/单位变体/区间格式匹配（2 条误报暴露），生产护栏必须修 |
| P1 | A 类覆盖继续攻坚 | completeness 0.771→0.85+：覆盖强化已见 17.5pt，可再加"要点清单"显式机制或 few-shot |
| P2 | D 类标注修正 | 4 条 gold 口径与 2026 新立场冲突（10-20 组 vs 至少 2 组）→ 修 benchmark |
| P3 | semantic claims 抽检 | 穿插项，未阻塞主线 |
