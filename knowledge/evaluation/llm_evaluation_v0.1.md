# Evaluation v0.1：LLM 生成质量验收框架（2026-09-02）

在接入真实 LLM 之前先钉死"什么叫正确回答"。Retrieval 层回答"有没有找到正确证据"
（Recall/MRR/nDCG）；Generation 层回答"LLM 有没有正确使用这些证据"。两层彻底分开。

## 数据资产（fitness-app-backend/knowledge/）

| 文件 | 内容 |
|---|---|
| `evaluation/llm_ready_set.jsonl` | 20 条 LLM-ready QA（5 训练量/肌肥大 + 5 营养 + 3 动作 + 3 补剂 + 2 争议 + 2 无证据），从 53 条 golden 中挑选 |
| `evaluation/groundedness_cases.jsonl` | 20 条（required_claims + forbidden_claims） |
| `evaluation/citation_cases.jsonl` | 18 条 answer 型（citation_required=true） |
| `evaluation/completeness_cases.jsonl` | 18 条多事实（每条多条 required_claims 都需引用） |
| `evaluation/insufficient_evidence_cases.jsonl` | 2 条无证据（expected_behavior=insufficient_evidence） |
| `schemas/llm_qa_case.schema.json` | 统一 case schema（question / expected_behavior / required_claims / forbidden_claims / citation_required） |
| `schemas/llm_response.schema.json` | LLM 结构化输出 schema（answer / claims[{text, evidence_ids}] / evidence_status / confidence） |

## 设计决策

1. **第一版不用 LLM judge**：Golden expected labels + 规则检查 + 人工抽检。数据量不足以
   证明 Judge LLM 可靠，先钉死定义。
2. **LLM 必须输出 JSON（llm_response schema）**，引用由程序控制：模型只能返回
   evidence_id（来自 Evidence Builder 的 E1/E2/E3 编号），禁止填 source 名 → 杜绝虚构来源。
   后端再把 evidence_id → Citation Map → 真实来源/页码。
3. **四类验收分开测**（llm_evaluator.py）：
   - Groundedness：claim 是否被其引用的 evidence 支持
   - Citation Accuracy：引用真实、合法、确实支持对应陈述（不虚构 id）
   - Citation Completeness：required_claims 是否都被覆盖且带引用
   - Insufficient Evidence：无证据时是否明确说"证据不足"且不给具体建议

## 规则检查器（llm_evaluator.py）的实现与已知边界

- **跨语言可验证 token**：英文术语精确匹配 evidence；数字+单位跨语言归一
  （组↔sets、克↔g、次↔reps 等，数字是语言无关判别项）。
- **纯中文、无数字无英文的 claim**：无法规则判定（中文 claim vs 英文 evidence 盲区），
  标记 verifiable=False 跳过，交人工抽检，不误判。
- **forbidden_claims 检测**：完整串优先 + 60% token 命中门槛（bigram 太宽松会误报，
  实测"肌酸是激素"会因"肌酸是"子串误判）。
- **已知局限**：规则版是 token 命中近似，非语义蕴含。对"用不同措辞表达的未知幻觉"
  依赖 forbidden 标注；深层 groundedness 需后续用 LLM judge 升级（先验证 judge 本身）。

## 冒烟验证（smoke_llm_eval.py）

用理想响应（required_claims 直接作为 answer/claims + 引用实际检索到的全部 evidence）跑 20 条：

```
mean_groundedness       0.658
mean_citation_accuracy  0.658
mean_citation_completeness 1.0
insufficient_ok_rate    1.0
forbidden_claims_hit    2
```

- 这是"理想 LLM + 当前检索"的上界（0.658 不是 1.0，因为部分 required_claim 的对应
  evidence 没被检索到，如"超过20-25组递减"——反映检索缺口而非检查器 bug）。
- 冒烟中曾发现并修复两处 bug：① 20 条 case 的 evidence id 互相覆盖导致引用错配
  （修复：case 前缀唯一化）；② 中英文单位不匹配（修复：单位类别映射）。
- 单测 19 passed（含 6 个 llm_evaluator 测试：正反例覆盖 4 类维度）。

## 复现

```
py -3.11 -m pytest knowledge_pipeline/tests -q                 # 19 passed
cd wl-analysis-backend
$env:HF_ENDPOINT="https://hf-mirror.com"; $env:PYTHONPATH=...
py -3.11 knowledge_pipeline/evaluation/generate_llm_cases.py   # 重新生成 20 条 + 4 类文件
py -3.11 knowledge_pipeline/evaluation/smoke_llm_eval.py       # 冒烟 sanity check
```

## 下一步

LLM Grounding v1.0：evidence-only prompt + zh-CN 响应 + evidence_id 引用 +
结构化 JSON 输出 + insufficient-evidence 行为，然后拿这 20 条跑第一轮 A/B
（纯 LLM vs RAG+LLM）。
