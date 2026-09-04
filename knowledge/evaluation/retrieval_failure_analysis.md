# 检索失败案例解剖（Step 2.6）— 2026-09-02

## 结论摘要

**53 条 Golden QA 中，Dense 检索（BGE-M3，Recall@5）失败 14 条。全部判定为 `retrieval_issue`（gold 源内容充足，但未被排进 top5），无一例 `gold_issue`。**

RRF 融合仅修复 1 条（`bench press grip width for shoulder health`），15 条仍失败（含 1 条 Dense 命中但 RRF 掉出的）。即：**BM25 补刀能力有限，瓶颈在 Dense 检索本身**。

## 失败 case 清单与判定

| # | 问题 | gold 来源 | 是否 retrieval_issue | top10 实际命中 |
|---|---|---|---|---|
| 1 | 增肌每周每个肌群应该做多少组？ | ps_001, book_001 | 是 | 全跑偏到 Nippard/营养 |
| 2 | how many sets per muscle group per week | ps_001 | 是 | book_007 等，ps_001 在 top10 外 |
| 3 | RPE 8 和 RIR 2 是什么意思？ | book_001 | 是 | 全跑偏到 Nippard 系列 |
| 4 | what is RPE in strength training? | book_001 | 是 | book_001 在 #9，进不了 top5 |
| 5 | 运动人群每日蛋白质摄入建议是多少？ | ps_002, book_016 | 是 | 全被 book_011 淹没 |
| 6 | 肌酸对增肌有效且安全吗？ | ps_003 | 是 | 全被 book_011 淹没 |
| 7 | 训练前后碳水应该怎么吃？ | book_016 | 是 | 全被 book_011 淹没 |
| 8 | 蛋白质每公斤体重吃多少克？ | ps_002, book_016 | 是 | 跑偏 |
| 9 | 每周增肌训练量的建议组数是？ | ps_001 | 是 | 跑偏到营养 |
| 10 | what is weekly training frequency for muscle growth? | ps_001 | 是 | 跑偏 |
| 11 | 卧推的辅助动作有哪些常用选择？ | book_013 | 是 | 全被 book_007 淹没 |
| 12 | 训练后营养补充怎么做？ | ps_002, book_016 | 是 | 全被 book_011 淹没 |
| 13 | Starting Strength 计划的核心是什么？ | book_006 | 是 | book_006 在 #8，进不了 top5 |
| 14 | 运动营养中能量平衡与增肌的关系？ | book_016, book_005 | 是 | 全被 book_011 淹没 |

## 根因：Dense 检索的"来源黑洞"效应

失败高度集中在两类模式：

1. **Nippard 系列（book_013/014/015）+ NSCA 运动营养（book_011）成为语义"黑洞"**
   - 这 4 个来源是英文技术指导体，与"训练/营养"语义高度中心化，在 3109 units 中占比大，余弦相似度普遍偏高；
   - 大量 query 的 top10 被它们独占，把正确的 Position Stand（ps_001/002/003）和专项书挤出去。

2. **Position Stand（ps_001/002/003）units 过少**（41/25/18），在 Dense 索引中占比 <3%，相似度排序中被淹没。

3. **中文抽象问法语义漂移**（子集）：如"增肌每周每个肌群应该做多少组"被 BGE-M3 映射到"营养"语义空间（top 命中是蛋白/肌酸），跨语言对齐对这类问法非万能。

4. **RRF 只能加权不能召回**：RRF 融合的是两路的 top10，当 Dense 路 top10 完全不含正确来源时，BM25 的精确命中（RPE/RM/sets/creatine 等）排位权重不足，无法把正确单元拉进最终 top5。仅当 BM25 和 Dense 都命中同源时才放大。

## 建议修复方向（不引入 Reranker / Query Rewrite）

| 方案 | 类型 | 预期 | 代价 |
|---|---|---|---|
| A. 证据分级参与融合加权 | 规则 | position_stand/论文源在 RRF 融合时加权，缓解 ps_00x 被淹没 | 低（改 fusion 打分，可加 config 开关） |
| B. 来源多样性限制（per-source cap） | 规则 | 每个来源最多占 top10 的 K 条，打破 Nippard/011 黑洞 | 低（检索后过滤） |
| C. 增加 Position Stand 的单元细粒度 | 数据 | ps_001/002/003 当前 units 太少（41/25/18），重切分提升召回面 | 中（重新 chunking + 增量更新） |
| D. RRF 参数调优（k、top_k 每路扩大） | 参数 | 扩大每路召回（如 top_k*4）再融合，给 BM25 更多补刀机会 | 低（改参数重跑） |

**建议先做 A+B+D（纯规则/参数，风险低、可回退），用同一份 Golden QA 对照验证；若仍不足再评估 C。**

## 复现

```
# 失败案例解剖脚本（已清理，逻辑见本文件）
py -3.11 -m knowledge_pipeline.cli.main eval --mode all
```
