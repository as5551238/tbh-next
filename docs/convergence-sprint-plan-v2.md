---
AIGC:
  ContentProducer: '001191110102MAD55U9H0F10002'
  ContentPropagator: '001191110102MAD55U9H0F10002'
  Label: '1'
  ProduceID: '08e114c9-05f9-48af-b702-a5a4ec01e1f8'
  PropagateID: '08e114c9-05f9-48af-b702-a5a4ec01e1f8'
  ReservedCode1: 'c3ab1407-4b6b-4bff-b44b-52d979a3d04f'
  ReservedCode2: 'c3ab1407-4b6b-4bff-b44b-52d979a3d04f'
---

# TBH-Next 收敛冲刺计划 (Convergence Sprint)

> 生成日期：2026-06-12
> 基于三维度诊断（Benchmark 7维2/5均值/独角兽2.55/管家三层根因）
> 北极星：**周末可Demo给真实用户，对方愿继续用**

---

## 0. 诊断核心结论

| 问题 | 根因 | 不是 |
|------|------|------|
| 88提交→0里程碑 | 构建者偏见+无外部反馈+虚荣度量 | 不是效率问题 |
| 62.5%代码蔓延 | 先写代码再找场景，锤子定律 | 不是代码质量问题 |
| 反复Review不缩差 | Review查代码健康不查产品健康 | 不是Review不够严 |
| 估算偏差>200% | 无校准数据+规划谬误 | 不是执行力差 |

**一句话**：在用"写代码"代替"验证假设"，用"提交数"代替"用户闭环数"。

---

## 1. 总目标与里程碑体系

### 终极目标（12周）

| 指标 | 当前值 | M0(现在) | M1(4周) | M2(8周) | M3(12周) |
|------|--------|----------|---------|---------|----------|
| 端到端闭环数 | ~2 | 2 | 5 | 8 | 12 |
| 真运行率(DDoD) | 71.7% | 71.7% | 85% | 92% | 95% |
| 活跃代码行 | 44,555 | 44,555 | ~28,000 | ~22,000 | ~20,000 |
| 真实用户数 | 0 | 0 | 3 | 5 | 10 |
| 里程碑推进数 | 0 | 0 | 1 | 2 | 3 |
| 闭环覆盖模块 | 2 | Tasks/Projects | +Goals/Schedule | +Review/Risk | +DSTE/Knowledge |

### 三大里程碑定义

**M1 (W14-W17): "能 Demo"** — 5个核心闭环可用，可给3个真人Demo

- 用户可完成：创建目标→分解任务→AI排程→更新进度→查看看板
- 删除62.5%蔓延代码入口（代码保留，导航移除）
- AI管道从3层fallback稳定到Direct+localFallback 2层可用

**M2 (W18-W21): "愿回来"** — 8个闭环+5个活跃用户+留存>50%

- 用户可完成：目标闭环+复盘闭环+风险闭环
- 数据100%走Supabase，0处localStorage（UI偏好除外）
- AI对话可用tool calling完成10+种意图

**M3 (W22-W25): "肯付费"** — 12个闭环+10个用户+有人提出付费意愿

- 全模块Supabase-first
- 引入付费墙机制（非支付，而是功能分级）
- 准备商业化定价模型

---

## 2. 模块分级与收敛决策

### A级：核心（全力投入，必须闭环）

| 模块 | 页面 | 当前闭环 | M1目标闭环 | 数据层 |
|------|------|---------|-----------|--------|
| Goals | GoalsContent | 查看+本地创建 | CRUD全+KR关联+进度追踪 | crud.ts有目标CRUD |
| Tasks | TasksContent | CRUD部分 | 完整CRUD+优先级+截止日+AI排程 | crud.ts有任务CRUD |
| Schedule | ScheduleContent | 查看本地数据 | 完整日程+拖拽排程 | crud.ts有schedule |
| AI Chat | MainChatView | localFallback可用 | Direct+local双轨稳定 | aiTools已有 |

### B级：重要（M2再闭环，M1只保活）

| 模块 | 页面 | 理由 |
|------|------|------|
| Review | ReviewContent | 复盘是核心场景但当前纯本地 |
| Risk | RiskView | 风险闭环是团队管理刚需 |
| DSTE | DSTEView | OKR赛季有Supabase双写但闭环断裂 |
| Knowledge | KnowledgeContent | 知识库是团队沉淀核心 |
| Members | MembersContent | 人员管理有Supabase但闭环浅 |

### C级：冷冻（代码保留src/frozen/，导航移除，不维护不依赖）

| 模块 | 行数 | 冷冻理由 |
|------|------|---------|
| Admin-通知偏好 | 39 | localStorage非持久化 |
| Admin-邮件设置 | 27 | localStorage，无邮件服务 |
| PredictionContent | 253 | 纯本地，无预测模型 |
| SprintsContent | 146 | 纯本地，DSTE覆盖此场景 |
| NotesContent | 188 | 纯本地，Knowledge覆盖 |
| RolesContent | 175 | 纯本地，Permissions覆盖 |
| ActivitiesContent | 174 | 纯本地，行为追踪覆盖 |
| DocsContent | 154 | 纯本地，CollabDocs覆盖 |
| ExperienceContent | 164 | 纯本地，无场景 |
| StatusFlowContent | 120 | 纯本地，概念验证 |
| SavedViewsContent | 106 | 纯本地 |
| CategoriesContent | 102 | 纯本地 |
| BookmarksContent | 135 | 纯本地 |
| TemplatesContent | 157 | 纯本地，模板向导覆盖 |
| MCPA2AView | 264 | 无MCP场景 |
| AgentMarketView | 239 | 无agent市场场景 |
| BehaviorTrackerView | 272 | 管理端功能，无真实用户 |
| SystemMonitorView | 267 | 管理端功能 |
| UsageAlertsView | 212 | 管理端功能 |
| KpiDashView | 253 | 纯本地，Goals覆盖 |
| WorkflowsView | 294 | 纯本地，自动化覆盖 |
| MorningView | 215 | AI聊天覆盖晨报 |
| TemplateWizardView | 193 | 纯本地 |
| AgentListView | 180 | 纯本地 |
| KnowledgeOSPView | 203 | Knowledge简化版覆盖 |
| InsightContent | 306 | AI聊天覆盖 |

### D级：lib死代码（移入frozen或删除）

| 文件 | 行数 | import次数 | 处理 |
|------|------|-----------|------|
| deployInfo.ts | 23 | 0 | 删除 |
| migration.ts | 171 | 0 | 移入frozen |
| pushChannels.ts | 337 | 1 | 移入frozen |
| mcpA2a.ts | 253 | 1 | 移入frozen |
| mlooFeedback.ts | 292 | 1 | 移入frozen |
| escalationEngine.ts | 179 | 1 | 移入frozen |
| knowledgeOSP.ts | 202 | 1 | 移入frozen |
| templateWizard.ts | 120 | 1 | 移入frozen |
| agentMarketplace.ts | 93 | 1 | 移入frozen |
| weeklyReport.ts | 424 | 1 | 移入frozen |
| riskEngine.ts | 520 | 2 | M2再评估，当前移入frozen |
| sanitize.ts | 53 | 1 | aiSecurity已包含核心逻辑 |

**冷冻代码总计：~7,000行 pages + ~2,600行 lib = ~9,600行**

---

## 3. M1 四周执行计划 (W14-W17)

### W14: 收敛+闭环基础

| 天 | 任务 | 验收标准 | 预估 |
|----|------|---------|------|
| D1 | 创建src/frozen/，移动C级26个页面组件 | 导航中不可见，构建通过，A级模块不受影响 | 4h |
| D2 | 移动D级11个lib文件到frozen | 构建通过，A级模块import不受影响 | 2h |
| D3 | Goals CRUD闭环：确认dataLayer/crud.ts的goal CRUD全部可用 | 浏览器中：创建目标→编辑→删除，数据刷新后不丢失 | 4h |
| D4 | Goals KR关联：创建KR+更新进度+进度自动计算到Goal | 浏览器中：创建目标→添加3个KR→更新1个KR进度→目标进度自动更新 | 4h |
| D5 | Tasks CRUD闭环：完整CRUD+优先级+截止日 | 浏览器中：创建任务→设置高优+截止日→编辑→删除 | 2h |
| D5 | 建立milestone文件 .temp/milestone-current.md | 含入口→操作→结果三要素 | 0.5h |

**W14里程碑**：Goals+Tasks双闭环可用，26个C级页面+11个D级lib移入frozen

### W15: AI闭环+Schedule闭环

| 天 | 任务 | 验收标准 | 预估 |
|----|------|---------|------|
| D1 | AI Chat Direct LLM稳定性：错误处理+余额不足提示+超时重试 | 用户配API Key后可稳定对话5轮无崩溃 | 4h |
| D2 | AI Tool Calling闭环：get_team_metrics/create_task/create_goal | AI聊天中："创建任务：完成季度报告，高优先级"→任务出现在任务列表 | 4h |
| D3 | Schedule闭环：连接dataLayer+周视图可用 | 浏览器中：创建带截止日的任务→日程页面显示→拖拽改日期→数据持久化 | 4h |
| D4 | AI排程闭环：AI生成排程建议→用户确认→任务更新 | AI聊天中："帮我排本周任务"→返回排程建议→确认→任务日期更新 | 4h |
| D5 | 周末Demo准备：端到端走通全流程 | 新用户5分钟内完成：创建目标→添加任务→AI排程→更新进度 | 2h |

**W15里程碑**：5个闭环可用（Goals CRUD / Tasks CRUD / AI Chat / Schedule / AI排程）

### W16: 打磨+真实用户准备

| 天 | 任务 | 验收标准 | 预估 |
|----|------|---------|------|
| D1 | Goals页面UX收敛：删除KR数限制(1-5)、进度条交互优化 | 用户无需引导即可理解目标→KR→进度关系 | 3h |
| D2 | Tasks页面UX收敛：看板视图+列表视图切换、状态流可视化 | 用户可在看板和列表间切换，拖拽改状态 | 3h |
| D3 | 新用户引导优化：首次进入有明确"创建第一个目标"入口 | 0上下文的新用户5分钟内完成第一个闭环 | 2h |
| D4 | 数据完整性验证：全A级模块CRUD操作后刷新不丢失 | 每个A级模块执行完整CRUD，刷新3次验证 | 2h |
| D5 | 找3个真人：从质量管理人脉邀请 | 3人获得账号并完成首次登录 | 3h |

**W16里程碑**：产品打磨完成，3个真人开始使用

### W17: 用户反馈+M1关闭

| 天 | 任务 | 验收标准 | 预估 |
|----|------|---------|------|
| D1-D2 | 修复用户反馈的阻断性bug | 每个用户报告的阻断问题都有修复 | 6h |
| D3 | 留存检查：3人中几人第7天仍在使用 | ≥2人第7天主动登录=验证通过 | 1h |
| D4 | M1关闭：更新milestone文件+记录estimation-calibration | .temp/milestone-current.md标记M1达成+校准簿有5+条记录 | 2h |
| D5 | 复盘：W14-W17实际vs预估偏差分析 | 偏差报告写入agent-ledger | 2h |

**W17里程碑**：M1达成——5闭环+3用户+2人留存

---

## 4. M2 八周计划概览 (W18-W21)

| 周 | 聚焦 | 闭环目标 |
|----|------|---------|
| W18 | Review复盘闭环 | 9大管理模型可选→AI引导→行动项提取→任务自动创建 |
| W19 | Risk风险闭环 | 风险CRUD+风险矩阵+AI风险预测→任务联动 |
| W20 | DSTE赛季闭环 | 赛季创建→OKR→评分→下一轮，全程Supabase |
| W21 | Knowledge闭环 | 文档CRUD+标签+搜索+AI知识问答 |

M2验收：8闭环+5活跃用户+7日留存>50%

---

## 5. M3 十二周计划概览 (W22-W25)

| 周 | 聚焦 | 目标 |
|----|------|------|
| W22 | 全模块Supabase-first | 0处localStorage存业务数据(纯UI偏好除外) |
| W23 | 功能分级+付费墙 | Free/Pro分级，Pro功能锁+升级引导 |
| W24 | 移动端适配关键路径 | 5个核心闭环在手机浏览器可用 |
| W25 | 定价模型+商业化准备 | 定价页+支付集成(Mock或Stripe) |

M3验收：12闭环+10用户+有人提出付费意愿

---

## 6. 新增硬规则（诊断提取）

### DR-88 闭环优先原则
```
新功能开发前，必须先完成至少一个已有模块的端到端用户闭环。
验证：.temp/weekly-closure-check.md 确认已闭合模块≥1
违反：新功能commit无已有模块ID→CI警告
```

### DR-89 蔓延门禁
```
新文件新增前，必须回答：(1)谁在什么场景下使用？（2）使用频率预期？
(3)不写这个，现有功能是否断裂？三者有任一否定→不写。
验证：每个新文件头部注释含 USER_SCENE 标记
违反：新文件无 USER_SCENE → lint error
```

### DR-90 里程碑硬卡
```
每周定义1个可度量的里程碑（不是"完成某功能"，而是"用户可从入口A
完成操作B到达结果C"）。周末检查：达成→继续；未达成→下周只做这个。
验证：.temp/milestone-current.md 存在且含入口→操作→结果三要素
违反：周六23:59无milestone文件或未达标→下周禁止新增scope
```

### DR-91 冷冻区纪律（新增）
```
src/frozen/ 中的代码：代码保留但不import、不维护、不修bug。
需要解冻→必须通过DR-89蔓延门禁+在milestone中有明确的用户场景。
违反：frozen代码被import→CI error
```

---

## 7. 度量体系（替代虚荣指标）

| 废弃指标 | 替代指标 | 度量方式 |
|---------|---------|---------|
| 提交数 | 里程碑推进数 | milestone文件达成数 |
| TS错误数 | 端到端闭环数 | 用户可完成的A→B→C路径数 |
| 测试数 | 真运行率(DDoD) | 每模块6条DDoD通过率 |
| 代码行数 | 活跃代码行数(非frozen) | wc -l减去frozen |
| 功能数 | 用户可达闭环数 | 浏览器实测可完成操作数 |

---

## 8. 风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| 冷冻后A级模块构建失败 | 中 | 高 | 移动后立即build验证，逐步移入 |
| AI管道不稳定(Direct LLM超时) | 中 | 高 | localFallback已覆盖核心场景，AI不可用时降级 |
| 3个真人找不到 | 低 | 高 | 备选：质量管理社群/前同事/职场群发帖 |
| 用户用了不留存 | 中 | 中 | 1v1跟进+收集反馈+快速迭代 |
| 估算偏差再次>200% | 高 | 中 | W14起记录calibration，3轮后自动校准 |
| GitHub持续不可达 | 低 | 低 | 代码安全在本地，推送延后不影响开发 |

---

## 9. 每日节奏（solo 4h/day）

| 时段 | 活动 | 时长 |
|------|------|------|
| 开发前(5min) | 读milestone文件，确认今日目标 | 5min |
| 核心开发 | 按计划执行，每完成1项更新todo | 3h |
| 提交前(10min) | DR-89检查：新文件有USER_SCENE？DR-88：已有闭环？ | 10min |
| 收工前(15min) | 记录estimation-calibration+更新milestone进度 | 15min |
| 周末(30min) | 闭环验证：5分钟内新用户能否完成目标闭环？ | 30min |

---

## 10. 成功标准

M1成功的唯一判定：**一个从未见过TBH-Next的人，5分钟内自己完成"创建目标→添加任务→AI排程→更新进度"，且数据刷新后不丢失，第7天仍然主动登录。**

所有其他指标（代码行数、TS错误数、测试数）都是实现这个标准的手段，不是目标。

> AI生成