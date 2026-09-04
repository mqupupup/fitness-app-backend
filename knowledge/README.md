# knowledge —— 健身知识库数据资产（source of truth）

> 本目录是**产品知识资产**的权威来源，由 Git 管理；它**不是**运行时数据库。
> 运行时数据（向量索引、检索元数据）放在 Postgres/pgvector 或 Qdrant，二者通过 `build_manifest` 对齐版本，避免出现"JSON 文件一个版本、数据库又一个版本"。

## 目录

```
knowledge/
├── sources/
│   └── sources_registry.json      # 数据源准入登记表（许可 / 商用 / grounding / 原文输出）
├── manifests/
│   ├── books_manifest.jsonl       # 版权书清单（仅合法获取渠道；55 本，purchased=true）
│   └── core_evidence.tsv          # 核心证据集（论文 / Position Stand，source of truth）
├── schemas/
│   ├── evidence.schema.json       # 证据分级 + 证据记录 schema
│   └── knowledge_unit.schema.json # KnowledgeUnit 数据模型（原文/检索文本/页码/元数据）
├── builds/                        # 摄入产物：<build_id>/{manifest.json, units.jsonl}
│                                  # 当前 13 个来源已摄入，共 3077 个 KnowledgeUnit
├── dense_index/
│   └── bge_m3_v1/                 # BGE-M3 稠密向量索引（vectors.npy + doc_ids.json + meta.json）
└── evaluation/
    ├── golden_qa.jsonl            # 端到端 Golden QA（53 条，覆盖中英/术语/数字/争议；reviewed 待人工复核）
    ├── retrieval_cases.jsonl      # 纯检索评测（关键词级 Recall@k）
    └── conflict_cases.jsonl       # 证据冲突用例（测试 grounded 回答）
```

## 职责边界（定案 A+）

| 层 | 位置 | 说明 |
|---|---|---|
| 知识资产 | `fitness-app-backend/knowledge/` | Git 管理，source of truth |
| 离线管道 | `wl-analysis-backend/knowledge_pipeline/` | PDF 解析 / 切分 / embedding / BM25 / RRF，Python |
| 知识索引 | Postgres/pgvector 或 Qdrant | 运行时向量库 |
| 运行时 RAG | `fitness-app-backend` | 查询服务 + LLM；**不在** wl-analysis-backend 内 |
| 评测 | `knowledge/evaluation/` | Golden QA 是知识资产，不是测试代码 |

"构建知识库"与"用户查询知识库"是两个不同的生命周期，管道与运行时严格分离。

## 准入规则（硬约束）

ingestion 的第一道门是 **License Validation**：

```
发现来源 → 查 sources_registry → 校验许可
  ├─ status=blocked / 未登记 / 许可不允许 grounding → STOP
  └─ status=active 且 llm_grounding=true → parse → chunk → embed → index
```

**"GitHub 上能下载" ≠ "能进生产知识库"**。GitHub 转载的版权书 PDF、无许可的资源一律不入库。判定标准是许可证与版权链，不是"它能不能下载"。

## 检索运行时（Phase 1 已落地）

```
用户问题 → 基础清洗 → ┬─ Vector Search（BGE-M3 稠密）─┐
                       └─ BM25 Search（术语/缩写/数字） ─┤
                                                        ├─ Rank Fusion（RRF）→ Top5~10
                                                        └─ Evidence Builder（证据分级排序）
                                                        → 答案 + 来源 + 章节 + 页码
```

- **Dense**：BGE-M3（1024 维，多语言），解决 中文 query → 英文语料 的跨语言语义检索；
- **BM25**：保留（RPE/RIR/1RM/5/3/1/creatine 等术语数字词法匹配强）；
- **RRF 融合**：二者互补，见 `wl-analysis-backend/knowledge_pipeline/retrieval/`。
- 明确**不做**（等 Golden QA 证明需要再加）：Query Router / Query Rewrite / Reranker / Knowledge Graph。

## 评测

- `golden_qa.jsonl`（53 条）：文档级 Recall@5/10 + MRR + nDCG@10；
- `retrieval_cases.jsonl`：关键词级 Recall@5/10；
- 对照实验：BM25 / Dense / RRF 三组，`python -m knowledge_pipeline.cli.main eval --mode all`；
- Golden QA 是**知识资产**不是测试代码；`reviewed:false` 待人工复核后置 true。

## 版本追踪

每次 build 写入 `build_manifest`（见 `knowledge_pipeline/manifest.py`），记录：
embedding model、chunking version、pipeline version、文档数、knowledge unit 数。
否则以后 V1→V2 chunking 无法追溯"到底是哪次构建产生了哪个向量库"。

## 与管道/索引的对接

- 管道读 `sources/sources_registry.json` 做许可门（`validation/license.py`）；
- 管道产出 KnowledgeUnit 应符合 `schemas/knowledge_unit.schema.json`；
- 管道写入向量库前生成 `build_manifest`，运行时据此对齐索引版本。
