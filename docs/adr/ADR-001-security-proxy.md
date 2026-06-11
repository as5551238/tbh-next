---
AIGC:
  ContentProducer: '001191110102MAD55U9H0F10002'
  ContentPropagator: '001191110102MAD55U9H0F10002'
  Label: '1'
  ProduceID: 'fe11659a-93d7-4260-84aa-cc778507a2aa'
  PropagateID: 'fe11659a-93d7-4260-84aa-cc778507a2aa'
  ReservedCode1: '1b7fdd66-dfcd-42c9-b973-9fcd209c625d'
  ReservedCode2: '1b7fdd66-dfcd-42c9-b973-9fcd209c625d'
---

# ADR-001: API Key 安全代理方案

## 状态
已采纳 (2026-06-11)

## 上下文
TBH-Next 需要调用 DeepSeek 等 LLM API 来提供 AI 功能（复盘草稿生成、意图解析、风险预测等）。API Key 如果暴露在前端客户端，会被 Vite 打包进 JS bundle，任何人都能通过浏览器 DevTools 获取。

在 P0-3 安全审计中发现：
- `.env` 中的 `VITE_DEEPSEEK_API_KEY` 被 Vite 内联到客户端 bundle
- `src/lib/aiPresets.ts` 导出了 `DEEPSEEK_API_KEY` 和 `PROVIDER_ENDPOINTS`
- `scripts/ai-proxy.mjs` 包含硬编码的 API Key

## 决策
采用三层 AI 路由架构，API Key 只存在于服务端：

1. **Edge Function（Supabase Edge Function）** — 首选路由，API Key 存储在 Edge Function 的 secrets 中，客户端通过 Supabase RPC 调用
2. **SQL Proxy（Supabase PL/pgSQL + pg_net）** — 备选路由，API Key 内嵌在 PL/pgSQL 函数体中（仅服务端可见），但受 PgBouncer 连接池限制，轮询超时不稳定
3. **本地回退（directLLMFallback）** — 最后兜底，用于离线/演示模式，不使用 API Key

关键实施：
- `.env` 中 Key 前缀从 `VITE_` 改为无前缀（不被 Vite 内联）
- 客户端代码移除所有 Key 的 export
- `.gitignore` 添加 `.env` 和 `.env.*.local`
- 构建产物中 `rg 'sk-' dist/` 确认无 Key 泄露

## 后果
### 优点
- API Key 完全不出现在客户端 bundle
- 三层路由提供渐进式降级，保证功能可用性
- 符合安全最佳实践（Secret 不入前端代码）

### 缺点
- SQL Proxy 受 PgBouncer 限制不可靠，生产环境必须部署 Edge Function
- Edge Function 需通过 Supabase Dashboard 手动部署（CLI 在本机 macOS 不可用）
- DeepSeek API Key 目前余额不足（402），需要充值才能端到端验证

### 风险
- 如果用户不部署 Edge Function，AI 功能只能走本地回退
- API Key 存储在 PL/pgSQL 函数体中属于临时方案，长期应迁移到 Edge Function Secrets

> AI生成