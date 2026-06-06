---
AIGC:
  ContentProducer: '001191110102MAD55U9H0F10002'
  ContentPropagator: '001191110102MAD55U9H0F10002'
  Label: '1'
  ProduceID: '50446ae2-a5a3-463e-8492-bd3111d998fc'
  PropagateID: '50446ae2-a5a3-463e-8492-bd3111d998fc'
  ReservedCode1: 'c8cd0690-5235-4edb-a463-778f0b353b62'
  ReservedCode2: 'c8cd0690-5235-4edb-a463-778f0b353b62'
---

# TBH-Next 部署记录

| 日期 | 部署 SHA | Round | 主要变更 |
|------|---------|-------|---------|
| 2026-05-31 | f9923e95 | R1 | Review engine + AI推荐 + 隐性闭环基础设施 |
| 2026-05-31 | b91758a2 | R2 | Edge Function proxy + action_items + 死按钮修复 |
| 2026-05-31 | 73d4958a | R3 | 暗色模式 + OKR进度自动回算 + motion chunk |
| 2026-06-01 | 8de7e3a2 | R4 | 13项商业UX修复（假AI标签→诚实标签、Math.random→确定性值、localStorage持久化） |
| 2026-06-06 | 70f06845 | R4-Fix1 | MeetingsView类型安全 + InsightContent重复声明修复 + useToast.tsx重命名 |
| 2026-06-06 | 5ea48d3e | R4-Fix2 | ItemDetailModal泛型化 + 消除as-unknown-as桥接 + 5个页面类型安全 + DEPLOY-LOG |
| 2026-06-06 | 7c2b8d9f | R5 | 46项商业UX修复Batch1-3：动态数据替换硬编码、诚实标签、真实交互（搜索/日历/导出/审批/公告/频道/AI洞察等） |
| 2026-06-06 | 9ea3a4cf | R5-Fix | 残留假AI标签清除：AI分析→数据分析、AI洞察摘要→洞察概览、AI增强→知识沉淀、AI建议→经验提示、实时数据→业务概览 |
| 2026-06-06 | 6a6e7970 | S6 | 数据闭环：消灭协作台local-only写入 — 7个View的setX→mutator hook、messages持久化、agent持久化、Group B错误处理throw |
| 2026-06-06 | b672c722 | S7 | MLOO闭环：协作回流到OKR — 审批/会议→ActionItem、任务→目标进度自动同步、通知总线、NotificationRow对齐DB |
| 2026-06-06 | 47d9a950 | S8 | AI执行引擎：tool use loop(8 tools, max3迭代) + 主动偏差推送 + 晨报通知推送 + AgentConfig持久化到Supabase + 晨报/主聊天启用tool use |

> AI生成