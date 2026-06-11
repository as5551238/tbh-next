---
AIGC:
  ContentProducer: '001191110102MAD55U9H0F10002'
  ContentPropagator: '001191110102MAD55U9H0F10002'
  Label: '1'
  ProduceID: 'ae7d411e-04a3-4d28-8944-bfc029ebbc57'
  PropagateID: 'ae7d411e-04a3-4d28-8944-bfc029ebbc57'
  ReservedCode1: '81129f59-96c7-481d-9d53-9e88a3c9128c'
  ReservedCode2: '81129f59-96c7-481d-9d53-9e88a3c9128c'
---

# ADR-003: 功能收敛与模块瘦身

## 状态
已采纳 (2026-06-11)

## 上下文
TBH-Next 从 MVP 快速迭代而来，功能不断堆砌导致模块膨胀：
- 56 个模块平铺在 ModuleSidebar 中，用户认知负荷极高
- 新用户进入后不知从何下手，高频操作被淹没
- 开发者维护 56 个路由和入口，修改一处影响面大
- Cockpit 视图下侧边栏需要大量滚动才能找到目标模块

7 技能联合复盘一致将"功能堆砌无收敛"列为第三大根因。

## 决策
采用**两级折叠**架构：

### 第一级：核心入口（PRIMARY_MODULES）
- workspace 界面：10 个一级模块（goals, tasks, projects, actionItems, review, schedule, overview, kpiDash, reports, dste）
- collab 界面：3 个一级模块（channels, approvals, members）
- ai 界面：4 个一级模块（chat, risk, prediction, agentMarket）

### 第二级：折叠入口
- 非核心模块收入"更多模块 (N)"折叠区，点击展开
- Collapsed sidebar（图标模式）增加"···"按钮快速展开
- Simple 视图不变（已天然精简约 9 项）

### 实施细节
- `PRIMARY_MODULES` Map 在 `ModuleSidebar.tsx` 中定义，按界面分组
- `moreExpanded` state 控制折叠区展开/收起
- 折叠区用 `collapsed: true` 标记 + 按钮 toggle
- 非核心模块仍可通过 URL 直接访问，不丢失功能

## 后果
### 优点
- 用户第一眼只看到 10 个核心入口，认知负荷大幅降低
- 折叠区保留完整功能，高级用户不受限
- 新增模块只需在 `PRIMARY_MODULES` 中决定是否升为一级
- 开发者聚焦核心路径，减少回归风险

### 缺点
- 折叠区模块的可发现性降低，需要用户主动探索
- 一级/二级的划分需要持续维护，随功能演进可能需要调整
- 如果用户高频使用的模块被归入二级，体验会变差

### 监控指标
- 跟踪折叠区模块的点击率（通过 behaviorTracker）
- 如果某二级模块周点击 > 首页一级模块平均值的 50%，考虑升级为一级
- 每季度 review PRIMARY_MODULES 映射，根据实际使用数据调整

> AI生成