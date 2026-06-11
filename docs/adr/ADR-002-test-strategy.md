---
AIGC:
  ContentProducer: '001191110102MAD55U9H0F10002'
  ContentPropagator: '001191110102MAD55U9H0F10002'
  Label: '1'
  ProduceID: '1ec6a4f7-4f79-44df-b8a3-a31101242bdc'
  PropagateID: '1ec6a4f7-4f79-44df-b8a3-a31101242bdc'
  ReservedCode1: '9cf1f9f5-0170-4d93-ad2d-0d87ad0f2c8c'
  ReservedCode2: '9cf1f9f5-0170-4d93-ad2d-0d87ad0f2c8c'
---

# ADR-002: 测试策略

## 状态
已采纳 (2026-06-11)

## 上下文
TBH-Next 是一个功能密集的 SPA 应用，包含 56+ 模块、AI 集成、Supabase Realtime、离线回退等复杂特性。前期缺少系统性测试，导致多次回归（如 Select 空值崩溃、状态不一致、AI 路由断裂），每次修 bug 可能引入新问题。

## 决策
采用 Vitest + jsdom 作为测试框架，分层覆盖：

### 测试分层
1. **单元测试（L1）** — 纯逻辑函数：`reviewEngine.ts`、`intentParser.ts`、`dsteEngine.ts` 等
2. **集成测试（L2）** — 组件 + Store 联动：`navigateTo()` 不变量、`appStore` 状态机、AI 路由选择
3. **E2E 测试（L3）** — 完整生命周期：CRUD 闭环（创建→读取→更新→删除），覆盖 Goals/Tasks/Projects

### 覆盖重点
- **导航一致性**：`DEFAULT_MODULES` ↔ `MODULE_TO_INTERFACE` ↔ `navigateTo()` 三层不变量
- **AI 安全**：API Key 不泄露到客户端、本地回退不暴露密钥
- **CRUD 闭环**：每个核心实体必须能走完完整生命周期
- **Select 哨兵值**：空字符串统一为 `__EMPTY__`，9 处 Select 已修复

### 技术选择
- **Vitest**（而非 Jest）：Vite 原生支持，零配置路径别名，HMR 加速开发
- **jsdom**（而非 Happy-DOM）：更成熟的 DOM 模拟，兼容 React Testing Library
- **@testing-library/react**：用户视角测试，避免测试实现细节

### 当前指标
- 27 个测试文件，412 个测试用例全部通过
- 测试运行时间 ~11s

## 后果
### 优点
- 快速反馈循环（Vitest HMR），开发体验好
- 三层覆盖确保从逻辑到端到端都有保护
- 不变量测试（L2）直接捕获导航状态不一致问题

### 缺点
- jsdom 不支持真实浏览器 API（如 IntersectionObserver），需手动 mock
- 无 Playwright/Cypress 级别的真实浏览器 E2E 测试
- Supabase Realtime 测试依赖 mock，无法验证真实 WebSocket 行为

### 改进方向
- 逐步提高 L2/L3 比例（当前 L1 占多数）
- 引入 MSW (Mock Service Worker) 替代手动 fetch mock
- CI 中加入 `pnpm test` 门禁（当前为手动执行）

> AI生成