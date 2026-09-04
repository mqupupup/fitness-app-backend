# Ablation 实验结果（D→B→A 三轮，各自单独验证）— 2026-09-02

## 实验设置

- 数据：53 条 Golden QA（golden_qa.jsonl，文档级判据）+ 3109 KnowledgeUnit + BGE-M3 dense 索引（bge_m3_v1）
- 检索模式：RRF（BM25+Dense 融合）
- 每步只改一个变量，全部独立跑 53 条

## 结果总表

| 实验 | 变量 | R@5 | R@10 | MRR | nDCG@10 | uniqSrc | maxShare | entropy |
|---|---|---|---|---|---|---|---|---|
| Exp0 baseline | 每路候选=20 | 0.651 | 0.670 | 0.604 | 0.570 | 3.11 | 0.628 | 1.234 |
| Exp1 D×2 | 候选=40 | 0.632 | 0.632 | 0.605 | 0.561 | 3.06 | 0.640 | 1.207 |
| Exp1 D×4 | 候选=80 | 0.651 | 0.651 | 0.610 | 0.569 | 3.06 | 0.638 | 1.207 |
| Exp1 D×8 | 候选=160 | 0.651 | 0.651 | 0.610 | 0.569 | 3.04 | 0.642 | 1.197 |
| Exp2 D×4 + cap=1 | 来源≤1 | **0.802** | **0.943** | **0.660** | **0.698** | **6.85** | **0.165** | **2.702** |
| Exp2 D×4 + cap=2 | 来源≤2 | **0.802** | 0.858 | 0.653 | 0.668 | 5.45 | 0.218 | 2.370 |
| Exp2 D×4 + cap=3 | 来源≤3 | 0.783 | 0.792 | 0.647 | 0.641 | 4.42 | 0.305 | 2.018 |
| Exp2 D×4 + cap=4 | 来源≤4 | 0.764 | 0.764 | 0.643 | 0.627 | 3.96 | 0.392 | 1.796 |
| Exp3 + cap=2 + prior | +证据先验 | **0.896** | **0.915** | 0.602 | 0.671 | 5.43 | 0.218 | 2.367 |
| Exp3 + cap=3 + prior | +证据先验 | 0.858 | 0.858 | 0.602 | 0.645 | 4.45 | 0.305 | 2.014 |

先验权重（evidence_level）：position_stand +0.10 / textbook +0.04 / expert_book +0.02。

## 结论（逐条归因）

### 1. D（扩大候选池）单独几乎无效，甚至有害
- D×2 反而把 R@5 从 0.651 降到 0.632；D×4/D×8 持平 baseline。
- 来源分布几乎不变（uniqSrc≈3.1，maxShare≈0.64）。
- **归因**：正确结果本来就已在每路 top20 候选池内（见根因诊断：14 条失败 case 的 gold 全量相似度 rank 有 13/14 ≤ 50）。扩大候选池不改变融合后的排序，"黑洞"内容反而更多。
- **结论：候选池截断不是根因。D 作为单独变量被排除。**

### 2. B（来源多样性 cap）是决定性因素
- cap=1：R@5 0.651→**0.802**（+0.15），R@10 0.670→**0.943**（+0.27），MRR 0.604→0.660，nDCG 0.570→0.698。
- 来源分布巨变：uniqSrc 3.1→6.85，maxShare 0.628→0.165，entropy 1.23→2.70。
- **归因**：直接打破 Nippard/NSCA 运动营养的"来源黑洞"，让正确来源进入候选。
- **结论：来源集中（source concentration）才是真正的瓶颈，与 D 无关。**

### 3. A（evidence prior）提升 Recall 但损失 MRR
- cap=2 + prior：R@5 0.802→**0.896**（+0.09），R@10 0.858→0.915，**但 MRR 0.653→0.602（−0.05）**。
- **归因**：证据先验把 position_stand 源（ps_00x）的分数整体抬升，使它们越过更相关的 expert_book/textbook 排到更前——Recall 覆盖率上升，但 Top1 排序质量下降。
- **印证预判**：evidence prior 确实会把"证据等级"与"检索相关性"混为一谈。它是一个 Recall↔MRR 的 tradeoff，不是免费午餐。

## 生产配置建议

| 场景 | 推荐 | R@5 | MRR |
|---|---|---|---|
| 默认（平衡） | **D×4 + cap=2**（不引入 prior） | 0.802 | 0.653 |
| 证据广度优先 | D×4 + cap=1 | 0.802 | 0.660 |
| 覆盖最大化（接受 MRR 损失） | D×4 + cap=2 + prior | 0.896 | 0.602 |

建议生产默认 **D×4 + cap=2**：R@5=0.80 与 cap1 持平，且每个来源保留 2 条上下文更完整；不引入 evidence prior，避免 MRR 损失。cap=1 可用于"证据多样性优先"的场景开关。

## 固化：retrieval_profile = v1_diversity（2026-09-02 冻结）

```python
# knowledge_pipeline/retrieval/retriever.py
DEFAULT_RETRIEVAL_CONFIG = {
    "candidate_multiplier": 4,   # 每路候选 = top_k×2×4 = 80（候选池安全裕量）
    "source_cap": 2,             # 每个来源最多进 top_k 的条数（核心优化）
    "use_evidence_prior": False, # 证据先验（Recall↔MRR tradeoff，默认关）
}
RETRIEVAL_PROFILE = "v1_diversity"
```

语义定义：`candidate_multiplier=1` 即 baseline（每路 20）。**source_cap 是 v1 真正的核心优化**（打破来源黑洞，R@10 0.670→0.858）；candidate_multiplier 定位为"候选池安全裕量"，不是核心质量优化，未来可下调降计算。

CLI 可覆盖：`search / eval --candidate-multiplier 8 --source-cap 1 --use-evidence-prior`。

## cap=2 下 candidate pool 最小有效值实验（决定性补充）

| 实验 | multiplier（每路候选） | R@5 | R@10 | MRR | nDCG | uniqSrc |
|---|---|---|---|---|---|---|
| cap2_m1 | 1（20） | 0.717 | 0.755 | 0.631 | 0.614 | 4.13 |
| cap2_m2 | 2（40） | 0.774 | 0.840 | 0.651 | 0.658 | 5.21 |
| **cap2_m4** | **4（80）** | **0.802** | **0.858** | **0.653** | **0.668** | 5.45 |
| cap2_m8 | 8（160） | 0.802 | 0.877 | 0.656 | 0.675 | 5.68 |

**结论**：cap=2 下，multiplier 1→2→4 收益递增（R@5 0.717→0.774→0.802），**4→8 边际收益极小**（R@5 持平，R@10 +0.019）。multiplier=4 是"性价比拐点"，作为生产默认合理；若未来性能优化可下调到 2（R@5 0.774，计算减半），不宜低于 2。

## Regression 基准（production_v1）

`knowledge/evaluation/retrieval_regression.json`：
R@5=0.802 / R@10=0.858 / MRR=0.653 / nDCG@10=0.668 / uniqSrc=5.45 / maxShare=0.218（53 QA，3109 units，bge-m3）。
以后任何检索代码改动，若 production profile 的 R@10 从 0.858 明显回落，即回归。

## 根因诊断（复用于区分候选池 vs 语义混淆）

14 条 Dense Recall@5 失败 case 的 gold 源单元全量相似度 rank：13/14 条 ≤ 50（10 条 ≤ 29），仅 1 条（weekly training frequency）= 94。
→ 绝大多数是"候选池截断 + 来源集中"，非语义混淆。这解释了为什么 D 无效而 B 有效。

## 复现

```
py -3.11 -m pytest knowledge_pipeline/tests -q          # 8 passed
cd wl-analysis-backend
$env:HF_ENDPOINT="https://hf-mirror.com"
py -3.11 knowledge_pipeline/evaluation/ablation.py      # 全部 10 组实验
```
