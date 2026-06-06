# TBH-Next 深度回顾与后续规划

> 生成时间: 2026-06-05 | 基于: 代码库全量审查(44页面+15模块+4hooks) + MLOO-Lite R1-R4蓝图 + 守门人审查标准

---

## 第一部分：现状深度诊断

### 1.1 代码库全景

| 维度 | 数据 |
|------|------|
| 页面组件 | 44个，7277行 |
| 核心模块 | 15个，3546行 |
| 自定义Hooks | 4个，590行 |
| 共享组件 | 8个，1427行 |
| 总代码行 | ~14000行 |
| 测试覆盖 | 4文件699行，仅覆盖aiService/auth/dataLayer/harness |
| 构建产物 | 主包~95KB(lazy) + vendor 229KB |

### 1.2 架构三层断裂

当前代码库存在**三层断裂**——UI层(完整) > 数据层(半空) > 后端层(极薄)：

```
┌─────────────────────────────────────────────────┐
│  UI层: 44个页面，视觉完整，交互基本可用           │  ← 用户所见
├─────────────────────────────────────────────────┤
│  数据层: 22个hook，但15个只有fetch无CRUD          │  ← 断裂点
│  dataLayer.ts: 仅5张核心表有写入API               │
├─────────────────────────────────────────────────┤
│  后端层: Supabase仅配置了5张表                    │  ← 极薄
│  其余18种实体无Supabase表、无RLS、无触发器        │
└─────────────────────────────────────────────────┘
```

**结论**: 产品看起来完整，但一动手写数据就丢失(刷新丢失)，这是**Demo级产品**而非**可用产品**的核心差距。

### 1.3 页面功能完整度分布

| 评分 | 数量 | 页面举例 |
|------|------|----------|
| 5/5(完整闭环) | 0 | — |
| 4/5(基本可用) | 5 | ReviewContent, MorningView, ChannelsView, AuditLogView, MainChatView |
| 3/5(可读不可写) | 13 | DocsContent, PenetrationView, NotificationsContent, AgentListView... |
| 2/5(写操作空壳) | 12 | ScheduleContent, ReportsContent, AdminContent, OrgContent... |
| 1/5(纯占位) | 2 | InsightContent, TeamCalView |

**平均值: 2.6/5** — 距离"可用产品"还有结构性差距。

### 1.4 关键缺陷清单(按根因分类)

#### 根因A: 后端缺失 — 写操作走SetState而非后端(20个页面)

| 页面 | 缺失的CRUD | 用户体验影响 |
|------|-----------|-------------|
| ScheduleContent | 创建/编辑/删除日程 | 新建日程刷新丢失 |
| DocsContent | 创建/编辑/删除文档 | 同上 |
| ReportsContent | 生成/编辑报表 | 同上 |
| ExperienceContent | 创建/编辑/删除经验 | 同上 |
| AdminContent | 全部配置操作 | 管理设置全部丢失 |
| OrgContent | 编辑组织/添加部门/编辑部门/保存人员设置 | 所有管理操作无效 |
| RolesContent | 创建角色/编辑角色权限 | 权限配置无效 |
| PredictionContent | 创建/编辑/删除预测 | 预测不持久 |
| NotificationsContent | 标记已读/删除/全部标记 | 已读状态不跨设备 |
| AgentListView | 注册/启用/禁用Agent | Agent配置不持久 |
| AgentConfigView | 保存Agent配置 | 配置修改无效 |
| AgentMarketView | 安装/卸载Agent | 安装状态刷新丢失 |
| WorkflowsView | 复制/启动工作流 | 操作不持久 |
| KnowledgeOSPView | 安装/卸载知识包 | 同上 |
| SubscriptionView | 升级/降级方案 | 无法改变订阅 |
| CollabDocsView | 创建/保存文档 | 协作内容丢失 |
| FilesView | 上传/删除文件 | 文件操作无效 |
| MeetingsView | 预约/加入会议 | 会议功能无效 |
| AnnouncementsView | 发布公告 | 公告不可创建 |
| ApprovalsView | 审批通过/驳回 | 审批决策无效 |

#### 根因B: 死按钮残留(11个页面, 20+个按钮)

| 页面 | 死按钮 | 严重度 |
|------|--------|--------|
| MembersContent | Mail/Phone/MoreHorizontal | 中 |
| AdminContent | 通用配置"保存" | 高 |
| OrgContent | 4个保存按钮全部空壳 | 高 |
| RolesContent | 创建/保存角色按钮 | 高 |
| WorkflowsView | "编辑"按钮 | 中 |
| FilesView | "上传"按钮 | 高 |
| MeetingsView | 预约会议+加入会议 | 高 |
| AnnouncementsView | "发布公告"按钮 | 高 |
| DirectoryView | 消息/电话/邮件+搜索框 | 中 |
| AiAgentsView | 添加AI同事+4个操作按钮 | 中 |
| TeamCalView | 月份切换+今天按钮 | 中 |

#### 根因C: 安全隐患(Critical)

| ID | 问题 | 严重度 | 影响 |
|----|------|--------|------|
| S1 | API Key硬编码在前端(aiService.ts) | **Critical** | 任何人可从DevTools获取DeepSeek/豆包/OpenAI密钥 |
| S2 | AI安全规则纯客户端(aiSecurity.ts) | 高 | 攻击者直接调用API绕过所有安全防线 |
| S3 | 审计日志仅存localStorage | 高 | 清浏览器数据即消除审计痕迹 |
| S4 | 订阅用量校验仅在客户端 | 高 | 恶意客户端可绕过限制无限调用 |
| S5 | isAuthenticated() Supabase模式永远返回true | 高 | 认证形同虚设 |
| S6 | Demo模式无密码验证 | 中 | 任何人输入任何内容即可"登录" |
| S7 | team_id硬编码为'__default__' | 中 | 无多租户隔离 |

#### 根因D: 数据模型缺陷

| 问题 | 详情 |
|------|------|
| Project无goalId | 项目与目标无法关联，penetration view只能并列展示 |
| Task无progress字段 | 任务只有done布尔值，无法表达50%完成度 |
| ReviewSession无持久化 | 复盘会话刷新丢失，MLOO核心闭环断裂 |
| A2A Bus纯内存 | 多Agent协作状态不持久 |
| a2aPipeline是假实现 | 返回固定字符串而非调用LLM |
| MCP外部服务器是死链接 | URL全为example.com |
| UsageSummary 4/5维度无数据源 | 显示假数字误导用户 |

---

## 第二部分：底层逻辑分析

### 2.1 MLOO-Lite的核心闭环

MLOO-Lite(Management Loop of OKR-to-Operation)的底层逻辑是**隐性闭环**：

```
目标设定 → 自动进度追踪 → 偏差检测 → AI复盘推荐 → 行动项生成 → 执行跟踪 → 回到目标设定
     ↑                                                                          |
     └──────────────────── 闭环 ──────────────────────────────────────────────┘
```

**当前闭环状态**:
- 目标设定: ✅ GoalsContent可用
- 自动进度追踪: ✅ computeAutoProgress已实现
- 偏差检测: ✅ detectDeviations已实现
- AI复盘推荐: ✅ recommendModels已实现
- **行动项生成: ❌ 不存在 — 复盘后无 actionable 输出**
- **执行跟踪: ❌ 不存在 — 行动项无法追踪**
- **复盘持久化: ❌ 复盘刷新丢失**
- **闭环回调: ❌ 行动项不能关联回目标**

**结论**: R1完成了闭环的前半段(感知层)，R2-R4的核心是闭环的后半段(行动层+持久化+基础设施)。

### 2.2 价值流动的最大约束(TOC分析)

当前产品有5层约束，依影响排序：

```
约束1(最薄): 写操作不经过后端 → 用户一刷新就丢数据 (影响: 100%用户)
约束2: 安全防线仅在客户端 → API Key暴露+无服务端强制执行 (影响: 商业化致命)
约束3: MLOO闭环行动层断裂 → 复盘完无法产生可追踪的行动 (影响: 核心价值)
约束4: 数据模型关系缺失 → Project↔Goal↔Task链断裂 (影响: 穿透视图价值)
约束5: 15个hook无CRUD → 新开发功能每次都要补基础设施 (影响: 开发速度)
```

**约束1和2必须最先解决**——没有数据持久化和安全基础，其他一切改进都是沙上建塔。

### 2.3 依赖关系图(确定执行顺序)

```
Layer 0: 安全基础 (S1 API Key代理 + S2 服务端RLS + S5 认证修复)
    ↓
Layer 1: 数据持久化 (18张新Supabase表 + RLS + 触发器)
    ↓
Layer 2: Hook CRUD补全 (15个hook补create/update/delete)
    ↓
Layer 3: 页面操作对接 (20个页面的写操作从setXxx改为调用hook)
    ↓
Layer 4: MLOO闭环 R2 (行动项模型 + 复盘→行动闭环 + 偏差告警推送)
    ↓
Layer 5: MLOO闭环 R3 (轻量绩效 + 有效性度量 + 复盘知识沉淀)
    ↓
Layer 6: MLOO闭环 R4 (pg_cron定时 + Edge Function + 后端最小化)
```

**关键决策点**: Layer 0-3 是基础工程，Layer 4-6 是核心价值。基础工程应优先完成，但可以与核心价值的**设计阶段**并行。

---

## 第三部分：R2-R4路线图

### R2: 闭环行动层 + 安全基础 (14天)

**目标**: 让产品从"Demo级"升级为"单用户可用级"，同时补全MLOO闭环的后半段。

#### R2-Phase 1: 安全基础 [3天]

| Item | 内容 | 验收标准 |
|------|------|----------|
| R2-P1-1 | Supabase Edge Function `ai-proxy` | API Key不暴露在前端，所有AI调用走Edge |
| R2-P1-2 | 修复isAuthenticated() Bug | `getSession()`改为async await |
| R2-P1-3 | 核心表添加RLS策略 | goals/tasks/projects/members按team_id隔离 |
| R2-P1-4 | 删除前端直接API调用 | aiService.ts的callDirectAPI分支移除 |

**商业化意义**: 没有API Key保护=无法商业化，RLS=多租户前提。

#### R2-Phase 2: 核心数据持久化 [5天]

| Item | 内容 | 验收标准 |
|------|------|----------|
| R2-P2-1 | 新建8张Supabase表 + RLS + 触发器 | schedule_events, reviews, action_items, docs, reports, experiences, predictions, org_settings |
| R2-P2-2 | dataLayer.ts补全CRUD | 每张新表新增create/update/delete函数 |
| R2-P2-3 | useMatrix.ts 15个hook补CRUD | 返回addXxx/editXxx/removeXxx |
| R2-P2-4 | 关键页面写操作对接后端 | ScheduleContent/DocsContent/ReportsContent/OrgContent/RolesContent/AdminContent |
| R2-P2-5 | 复盘会话持久化 | ReviewContent的session保存到reviews表 |

**商业化意义**: 没有数据持久化=用户不会二次打开，留存为零。

#### R2-Phase 3: MLOO行动层闭环 [4天]

| Item | 内容 | 验收标准 |
|------|------|----------|
| R2-P3-1 | ActionItem数据模型+CRUD | action_items表(id, review_id, goal_id, title, assignee, due_date, status) |
| R2-P3-2 | ReviewContent"完成"阶段生成行动项 | 复盘done→可选创建action items关联到goal |
| R2-P3-3 | 偏差告警自动推送 | detectDeviations定期执行→异常时在NotificationsContent生成告警 |
| R2-P3-4 | 行动项追踪视图 | GoalsContent展示关联action items，状态可切换 |

**商业化意义**: 这是MLOO与其他项目管理工具的**核心差异点**——AI驱动的OKR闭环。

#### R2-Phase 4: 死按钮清零 + 硬编码清理 [2天]

| Item | 内容 | 验收标准 |
|------|------|----------|
| R2-P4-1 | 11个页面死按钮修复 | 全部按钮有真实handler |
| R2-P4-2 | 3个最严重硬编码替换 | InsightContent后端化、TeamCalView对接useScheduleEvents、SubscriptionView补真实用量 |

### R3: 协作增强 + 轻量绩效 (14天)

**目标**: 从"单用户可用"升级为"团队可用"，补全MLOO的绩效度量和知识沉淀。

#### R3-Phase 1: 协作模块数据持久化 [4天]

| Item | 内容 | 验收标准 |
|------|------|----------|
| R3-P1-1 | 协作相关Supabase表 | collab_docs(RLS), shared_files, meetings, announcements, approvals, channels |
| R3-P1-2 | 协作hook补CRUD | useCollabDocs/useMeetings/useAnnouncements/useApprovals补写操作 |
| R3-P1-3 | 协作页面写操作对接 | MeetingsView预约/加入、AnnouncementsView发布、ApprovalsView审批、FilesView上传 |
| R3-P1-4 | CollabDocsView对接真后端 | handleSave调updateCollabDoc、handleCreateDoc调createCollabDoc |

#### R3-Phase 2: 轻量绩效系统 [3天]

| Item | 内容 | 验收标准 |
|------|------|----------|
| R3-P2-1 | 绩效度量数据模型 | performance_entries表(member_id, period, goal_achievement_rate, manager_calibration, overall) |
| R3-P2-2 | 目标达成率自动计算 | 每个成员 → 其owner的goals的加权progress平均值 |
| R3-P2-3 | 绩效面板(轻量) | MembersContent新增"绩效"tab，展示个人目标达成率 |
| R3-P2-4 | 经理校准入口 | 管理员可手动调整calibration分数+说明 |

**设计决策**: 360度评估作为Premium插件(50+人团队才需要)，R3只做Goal×Calibration轻量版。

#### R3-Phase 3: 复盘知识沉淀 + 有效性度量 [4天]

| Item | 内容 | 验收标准 |
|------|------|----------|
| R3-P3-1 | 复盘报告自动提取模式 | 复盘done时自动提取"发现问题→根因→解决方案"三元组 |
| R3-P3-2 | 经验库与复盘关联 | ExperienceContent可关联到源review_session |
| R3-P3-3 | 闭环有效性度量 | 追踪: action_item完成率、偏差修复率、复盘→改进转化率 |
| R3-P3-4 | 有效性Dashboard | Workspace新增"闭环健康度"指标卡 |

**商业化意义**: 知识沉淀=组织记忆，是付费续约的关键价值。

#### R3-Phase 4: 订阅计费真实化 [3天]

| Item | 内容 | 验收标准 |
|------|------|----------|
| R3-P4-1 | UsageSummary 5维度真实计算 | agents/members/projects/docs计数从DB聚合 |
| R3-P4-2 | 服务端用量校验 | Edge Function `check-usage`，每次AI调用前检查额度 |
| R3-P4-3 | 升级CTA流程 | SubscriptionView"升级"按钮→说明页→联系销售(早期MVP) |
| R3-P4-4 | 审计日志写Supabase | agentHarness审计从localStorage迁移到audit_logs表 |

### R4: 后端最小化 + 规模准备 (14天)

**目标**: 从"手动触发"升级为"自动运行"，建立可持续的定时任务和事件驱动基础设施。

#### R4-Phase 1: pg_cron定时任务 [3天]

| Item | 内容 | 验收标准 |
|------|------|----------|
| R4-P1-1 | 每日偏差扫描 | pg_cron每天8:00调用detect_deviations()，写入deviation_alerts表 |
| R4-P1-2 | 每周自动复盘建议 | pg_cron每周一8:00生成recomendation写入notifications |
| R4-P1-3 | 目标进度自动更新 | pg_cron每天22:00重新计算active goals的auto_progress |
| R4-P1-4 | 订阅用量日聚合 | pg_cron每天0:00聚合usage_events到usage_daily表 |

#### R4-Phase 2: Edge Function核心服务 [4天]

| Item | 内容 | 验收标准 |
|------|------|----------|
| R4-P2-1 | `ai-proxy` (已在R2创建，此时增强) | 增加流式响应、模型路由、用量扣减 |
| R4-P2-2 | `check-usage` 配额网关 | 每次AI调用前检查，超限返回429 |
| R4-P2-3 | `on-goal-update` 触发器 | 目标进度变更→触发偏差检测→可能触发告警 |
| R4-P2-4 | `daily-digest` 摘要生成 | 替代前端setInterval，服务端生成每日摘要推送 |

#### R4-Phase 3: 数据模型完善 + 多租户 [4天]

| Item | 内容 | 验收标准 |
|------|------|----------|
| R4-P3-1 | Project添加goal_id | 迁移: projects表新增goal_id列，PenetrationView可展示真实关联 |
| R4-P3-2 | Task添加progress | 迁移: tasks表新增progress float列 |
| R4-P3-3 | team_id真实化 | 所有表从'__default__'改为从auth.uid()推导team_id |
| R4-P3-4 | 多团队支持 | 团队创建/邀请/切换流程(MVP: 仅admin创建团队) |

#### R4-Phase 4: 可观测性 + 上架准备 [3天]

| Item | 内容 | 验收标准 |
|------|------|----------|
| R4-P4-1 | 应用健康Dashboard | SRE页面: API延迟/错误率/活跃用户/功能使用top10 |
| R4-P4-2 | Lighthouse评分基线 | 目标: Performance≥85, a11y≥90, PWA≥90 |
| R4-P4-3 | PWA离线基础 | Service Worker缓存核心页面+数据 |
| R4-P4-4 | 隐私清单+i18n基础 | 中国区合规模板+英文UI框架 |

---

## 第四部分：关键设计决策(需讨论)

### 决策1: R2-P2 新增8张Supabase表的详细Schema

哪些表先建？是否全部一次建完？建议分批：
- 第一批(核心): schedule_events, reviews, action_items, docs (与MLOO闭环直接相关)
- 第二批(补充): reports, experiences, predictions, org_settings
- 第三批(协作): R3时再建collaboration相关表

### 决策2: AI API Key代理的架构

两种方案：
- **方案A**: Supabase Edge Function `ai-proxy`(推荐) — Key存在Supabase secrets中，前端只调Edge
- **方案B**: 自建后端Vercel/Cloudflare Worker — 更灵活但需要额外部署

### 决策3: "写操作先行持久化"的最低标准

R2时有20个页面需要对接后端，是否全部在R2完成？
- **方案A**: R2全部完成 — 6周内所有操作走后端，但R2周期长
- **方案B**: R2只做MLOO相关的5-7个页面 + 3个高频协作页面 — 其余R3补齐

### 决策4: 复盘"行动项"与现有Task的关系

ActionItem是独立实体还是复用TaskRow？
- **方案A**: 独立action_items表 — 复盘特有的assignee/due/status/store，与task解耦
- **方案B**: 复用tasks表 + 新增source='review' — 减少表数，但task含义变宽

### 决策5: R2是否需要先修复S1(API Key暴露)再部署

当前线上版本的前端代码包含API Key在bundle中。即使不修复全部安全问题，是否需要：
- 紧急: 立即创建Edge Function代理+移除前端Key → 1天内
- 常规: 与R2-P1一起处理 → 3天内

---

## 第五部分：商业里程碑

| 里程碑 | 对应迭代 | 北极星指标变化 | 付费转化点 |
|--------|----------|---------------|-----------|
| Demo级(当前) | R1 | 无留存数据 | 0% |
| 单用户可用 | R2完成 | 数据持久化，7日留存>20% | Free→Pro: AI查询额度 |
| 团队可用 | R3完成 | 多人协作，周活>3天/周 | Pro→Enterprise: 团队规模+SSO |
| 自动运行 | R4完成 | 自动复盘推送，NPS>30 | 知识沉淀+绩效分析增值 |

---

## 第六部分：守门人预估审查要点

| 维度 | R2预估难度 | 风险 |
|------|-----------|------|
| D1有效性 | 8→9 | 写操作对接量大，容易遗漏edge case |
| D2效率 | 8→9 | 大量重复性工作(hook CRUD补全)，用脚本自动化 |
| D3可进化性 | 7→9 | 新增8张表如果Schema设计不好会成为技术债 |

关键风险:
1. Supabase表设计如果不够前瞻，R3/R4可能需要migration
2. Edge Function冷启动延迟影响AI对话体验
3. RLS策略如果写错，可能导致数据泄漏或查询性能下降

---

## 附录A: 完整死按钮清单(20+)

| # | 页面 | 按钮 | 当前状态 | 修复方案 |
|---|------|------|----------|----------|
| 1 | MembersContent | Mail图标 | 无onClick | 打开mailto链接 |
| 2 | MembersContent | Phone图标 | 无onClick | 打开tel链接 |
| 3 | MembersContent | MoreHorizontal | 无onClick | 展开操作菜单(编辑/删除) |
| 4 | AdminContent | 通用配置"保存" | closeModal空壳 | 写入dataLayer |
| 5 | OrgContent | 编辑组织"保存" | setContext+closeModal | updateOrgInfo API |
| 6 | OrgContent | 添加部门"确认" | closeModal | addDepartment API |
| 7 | OrgContent | 编辑部门"保存" | closeModal | updateDepartment API |
| 8 | OrgContent | 人员设置"保存" | closeModal | updateMember API |
| 9 | RolesContent | 创建/编辑角色"确认" | closeModal | createRole/updateRole API |
| 10 | WorkflowsView | "编辑"按钮 | 无onClick | 打开编辑modal |
| 11 | FilesView | "上传"按钮 | 无onClick | 文件上传dialog |
| 12 | MeetingsView | "+预约会议" | 无onClick | 打开创建会议modal |
| 13 | MeetingsView | "加入会议" | 无onClick | 加入会议逻辑 |
| 14 | AnnouncementsView | "+发布公告" | 无onClick | 打开创建公告modal |
| 15 | DirectoryView | "消息" | 无onClick | 跳转到频道聊天 |
| 16 | DirectoryView | "电话" | 无onClick | tel链接 |
| 17 | DirectoryView | "邮件" | 无onClick | mailto链接 |
| 18 | DirectoryView | 搜索输入框 | 无value绑定 | 绑定searchQuery state |
| 19 | AiAgentsView | "+添加AI同事" | 无onClick | 跳转到AgentMarket |
| 20 | AiAgentsView | 对话/统计/配置/重启 | 4个无onClick | 路由到对应页面 |
| 21 | TeamCalView | 月份切换 | 无onClick | 复用ScheduleContent的monthOffset模式 |

## 附录B: 硬编码Mock清单(13个页面)

| # | 页面 | 硬编码内容 | 替代方案 |
|---|------|-----------|----------|
| 1 | DocsContent | "张工正在编辑/AI同事正在评审" | 从Realtime Presence获取 |
| 2 | ReportsContent | generated_by='当前用户', size='1.2 MB' | 从auth+真实文件大小 |
| 3 | ExperienceContent | "AI已自动提炼3条新经验"、"导出功能..."AI建议 | AI真实生成或从后端取 |
| 4 | AdminContent | API Keys/系统健康/版本号/fieldMap全量 | 后端配置API |
| 5 | InsightContent | 4条洞察+AI摘要(全量) | 专门的insights引擎 |
| 6 | PredictionContent | 置信度"78"、综合预测概览 | 统计模型计算 |
| 7 | SubscriptionView | agents/members/projects/docs用量 | DB聚合查询 |
| 8 | RiskView | AI风险摘要 | AI生成或后端聚合 |
| 9 | KpiDashView | 进度条从status推算、sparkline数学公式 | 真实历史数据 |
| 10 | IndustryView | 4行业视角(focus/trends/benchmarks) | 行业数据服务 |
| 11 | TeamCalView | 10+条整月日程MOCK_EVENTS | useScheduleEvents |
| 12 | MyToday | MOCK_TASKS/MOCK_GOALS/MOCK_INSIGHTS | 已有Supabase查询逻辑 |
| 13 | ApprovalsView | AI提醒文案 | 真实风险引擎输出 |

## 附录C: Supabase新增表设计草案

### 第一批: MLOO核心(R2-P2)

```sql
-- 日程事件
CREATE TABLE schedule_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) DEFAULT '__default__',
  title TEXT NOT NULL,
  time TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'meeting',
  location TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 复盘会话
CREATE TABLE review_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) DEFAULT '__default__',
  goal_id UUID REFERENCES goals(id),
  model TEXT NOT NULL DEFAULT 'grai',
  phase TEXT NOT NULL DEFAULT 'alerts',
  context JSONB DEFAULT '{}',
  alerts JSONB DEFAULT '[]',
  draft TEXT,
  action_items JSONB DEFAULT '[]',
  created_by UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 行动项
CREATE TABLE action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) DEFAULT '__default__',
  review_id UUID REFERENCES review_sessions(id),
  goal_id UUID REFERENCES goals(id),
  title TEXT NOT NULL,
  assignee_id UUID REFERENCES members(id),
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 文档(DocsContent)
CREATE TABLE docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) DEFAULT '__default__',
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'doc',
  status TEXT NOT NULL DEFAULT 'draft',
  content TEXT DEFAULT '',
  author_id UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 第二批: 补充(R2-P2后续)

```sql
-- 报表
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) DEFAULT '__default__',
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'weekly',
  status TEXT NOT NULL DEFAULT 'generating',
  size TEXT DEFAULT '0 KB',
  generated_by UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 经验
CREATE TABLE experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) DEFAULT '__default__',
  title TEXT NOT NULL,
  summary TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  author_id UUID REFERENCES members(id),
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  review_id UUID REFERENCES review_sessions(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 预测
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) DEFAULT '__default__',
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  probability FLOAT DEFAULT 0.5,
  impact TEXT DEFAULT 'medium',
  trend TEXT DEFAULT 'flat',
  reason TEXT DEFAULT '',
  suggestion TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 组织设置
CREATE TABLE org_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) DEFAULT '__default__',
  key TEXT NOT NULL,
  value JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, key)
);
```
