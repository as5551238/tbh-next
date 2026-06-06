---
AIGC:
  ContentProducer: '001191110102MAD55U9H0F10002'
  ContentPropagator: '001191110102MAD55U9H0F10002'
  Label: '1'
  ProduceID: '585d332b-bbdc-4397-b298-d175b2848402'
  PropagateID: '585d332b-bbdc-4397-b298-d175b2848402'
  ReservedCode1: '5e60b8a4-5938-468b-90b2-332eaaef39d4'
  ReservedCode2: '5e60b8a4-5938-468b-90b2-332eaaef39d4'
---

# localStorage → Supabase 迁移计划

> 状态：PENDING | 创建日期：2026-06-06 | 目标：消除所有用户业务数据对 localStorage 的依赖

## 1. 现状分析

当前共 12 处 localStorage 存储用户业务数据（非 UI 偏好），存在以下风险：
- **数据丢失**：浏览器清除缓存即丢失所有用户数据
- **XSS 安全**：API Key 明文存储于 localStorage（`tbh_resend_key`）
- **跨设备不一致**：安装/配置状态仅存于单设备
- **无审计追踪**：Agent 运行日志仅限客户端，无法回溯

## 2. 迁移优先级与方案

### P0 — 安全风险，立即迁移

| # | localStorage Key | 当前文件 | 迁移方案 | 新增 DB 对象 |
|---|-----------------|---------|---------|-------------|
| A6 | `tbh_resend_key`, `tbh_sender_email`, `tbh_smtp_server` | AdminContent.tsx | 移至 `email_config` 表，API Key 用 Supabase Vault 存储或仅存于 Edge Function 环境变量 | `email_config` 表 (team_id, resend_key_ref, sender_email, smtp_server) |

### P1 — 核心业务数据，R5 迁移

| # | localStorage Key | 当前文件 | 迁移方案 | 新增 DB 对象 |
|---|-----------------|---------|---------|-------------|
| A2 | `tbh-profile`, `tbh-prefs` | GlobalSidebar.tsx | 扩展 `members` 表或新建 `user_profiles` 表（notify, lang, tz 列） | ALTER members ADD notify/lang/tz 列，或新 `user_profiles` 表 |
| A3 | `tbh-experiences` | ExperienceContent.tsx | 新建 `experiences` 表，结构与 MeetingRow 类似 | `experiences` 表 (id, team_id, title, summary, author, tags, created_at) |
| A4 | `tbh-predictions` | PredictionContent.tsx | 新建 `predictions` 表 | `predictions` 表 (id, team_id, title, impact, probability, reason, suggestion, created_at) |
| A5 | `tbh-insights` | InsightContent.tsx | 新建 `insights` 表 | `insights` 表 (id, team_id, title, description, impact, kpi, created_at) |
| A8 | `tbh-agent-configs` | AgentConfigView.tsx | 新建 `agent_configs` 表，FK 到 agents | `agent_configs` 表 (id, agent_id, team_id, model, temperature, max_tokens, system_prompt, schedule) |

### P2 — 功能状态，R5-R6 迁移

| # | localStorage Key | 当前文件 | 迁移方案 | 新增 DB 对象 |
|---|-----------------|---------|---------|-------------|
| A9 | `tbh-installed-agents` | AgentMarketView.tsx | 新建 `installed_agents` 表或使用 `subscriptions` 扩展 | `installed_agents` 表 (team_id, agent_id, installed_at) |
| A10 | `tbh-installed-packs` | KnowledgeOSPView.tsx | 新建 `installed_packs` 表 | `installed_packs` 表 (team_id, pack_id, installed_at) |
| A7 | `tbh-config-{title}` | AdminContent.tsx | 新建 `app_settings` 表 | `app_settings` 表 (team_id, key, value_json, updated_at) |
| A11 | `tbh-mcp-status` | MCPA2AView.tsx | 新建 `mcp_connections` 表（状态由后端管理） | `mcp_connections` 表 (team_id, server_id, status, last_check) |
| A12 | `tbh-agent-audit` | agentHarness.ts | 复用 `audit_logs` 或新建 `agent_audit_logs` | `agent_audit_logs` 表 (id, team_id, agent_id, action, input_summary, output_summary, duration_ms, created_at) |

### P3 — 低优先级

| # | localStorage Key | 当前文件 | 迁移方案 |
|---|-----------------|---------|---------|
| A1 | `tbh-next-auth`/`tbh-next-user` | auth.tsx | 仅 Demo 模式使用，Supabase Auth 模式下无需迁移 |
| B1 | `tbh_ai_model` | aiService.ts | 可同步到 `user_profiles.preferences`，非紧急 |

## 3. 迁移策略

### 3.1 渐进式迁移（推荐）

每张新表遵循以下步骤，逐步替换 localStorage：

```
Step 1: 创建 Supabase 表 + RLS 策略
Step 2: 在 dataLayer.ts 中添加 CRUD 函数（如 fetchExperiences, createExperience）
Step 3: 在 useMatrix.ts 中添加对应 hook（如 useExperiences）
Step 4: 修改页面组件，使用 hook 替代 localStorage 读写
Step 5: 添加一次性数据迁移逻辑：启动时检查 localStorage 残留数据 → 写入 Supabase → 清除 localStorage
Step 6: 移除 localStorage 相关代码
```

### 3.2 数据迁移脚本（一次性）

```typescript
// 迁移辅助函数，调用一次后移除
async function migrateLocalStorageToSupabase() {
  const keys = [
    { lsKey: 'tbh-experiences', tableName: 'experiences' },
    { lsKey: 'tbh-predictions', tableName: 'predictions' },
    { lsKey: 'tbh-insights', tableName: 'insights' },
    { lsKey: 'tbh-agent-configs', tableName: 'agent_configs' },
    { lsKey: 'tbh-installed-agents', tableName: 'installed_agents' },
    { lsKey: 'tbh-installed-packs', tableName: 'installed_packs' },
  ];

  for (const { lsKey, tableName } of keys) {
    const raw = localStorage.getItem(lsKey);
    if (!raw) continue;
    try {
      const data = JSON.parse(raw);
      // Batch insert into Supabase
      const { error } = await supabase.from(tableName).upsert(data, { onConflict: 'id' });
      if (!error) localStorage.removeItem(lsKey);
    } catch { /* skip corrupted data */ }
  }
}
```

### 3.3 回退机制

迁移期间保留 localStorage 作为离线/降级回退：
- Supabase 请求失败 → 读取 localStorage → 显示数据 + 标记"离线模式"
- 与现有 `fetchXxx → catch → localFallback` 模式一致

## 4. 新增 DB Schema

```sql
-- P0: 邮件配置
CREATE TABLE email_config (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  team_id TEXT NOT NULL REFERENCES teams(id),
  resend_key_ref TEXT,  -- Supabase Vault reference, not plain text
  sender_email TEXT,
  smtp_server TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- P1: 用户配置扩展
CREATE TABLE user_profiles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES auth.users(id),
  team_id TEXT NOT NULL REFERENCES teams(id),
  name TEXT,
  email TEXT,
  phone TEXT,
  notify_enabled BOOLEAN DEFAULT true,
  language TEXT DEFAULT 'zh-CN',
  timezone TEXT DEFAULT 'Asia/Shanghai',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- P1: 经验沉淀
CREATE TABLE experiences (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  team_id TEXT NOT NULL REFERENCES teams(id),
  title TEXT NOT NULL,
  summary TEXT,
  author TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- P1: 预测洞察
CREATE TABLE predictions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  team_id TEXT NOT NULL REFERENCES teams(id),
  title TEXT NOT NULL,
  impact TEXT,
  probability TEXT,
  reason TEXT,
  suggestion TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- P1: 洞察
CREATE TABLE insights (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  team_id TEXT NOT NULL REFERENCES teams(id),
  title TEXT NOT NULL,
  description TEXT,
  impact TEXT,
  kpi TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- P1: Agent 运行配置
CREATE TABLE agent_configs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  team_id TEXT NOT NULL REFERENCES teams(id),
  agent_id TEXT NOT NULL,
  model TEXT DEFAULT 'deepseek-chat',
  temperature REAL DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2048,
  system_prompt TEXT,
  schedule TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- P2: 安装状态
CREATE TABLE installed_agents (
  team_id TEXT NOT NULL REFERENCES teams(id),
  agent_id TEXT NOT NULL,
  installed_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (team_id, agent_id)
);

CREATE TABLE installed_packs (
  team_id TEXT NOT NULL REFERENCES teams(id),
  pack_id TEXT NOT NULL,
  installed_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (team_id, pack_id)
);

-- P2: 应用设置
CREATE TABLE app_settings (
  team_id TEXT NOT NULL REFERENCES teams(id),
  key TEXT NOT NULL,
  value_json JSONB,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (team_id, key)
);

-- P2: MCP 连接状态
CREATE TABLE mcp_connections (
  team_id TEXT NOT NULL REFERENCES teams(id),
  server_id TEXT NOT NULL,
  status TEXT DEFAULT 'disconnected',
  last_check TIMESTAMPTZ,
  PRIMARY KEY (team_id, server_id)
);

-- P2: Agent 审计日志
CREATE TABLE agent_audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  team_id TEXT NOT NULL REFERENCES teams(id),
  agent_id TEXT NOT NULL,
  action TEXT NOT NULL,
  input_summary TEXT,
  output_summary TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 策略（对每张新表）
ALTER TABLE email_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE installed_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE installed_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS: team_members 可访问本团队数据
CREATE POLICY "team_members_access" ON experiences FOR ALL USING (
  team_id IN (SELECT team_id FROM team_members WHERE member_id = auth.uid()::text)
);
-- (类似策略应用于其他新表)
```

## 5. 时间线

| 阶段 | 时间 | 范围 |
|------|------|------|
| R5 | Week 1 | P0 (email_config) + P1 (user_profiles, experiences, predictions, insights, agent_configs) 创建表+CRUD+hook+页面替换 |
| R5-R6 | Week 2 | P2 (installed_agents, installed_packs, app_settings, mcp_connections, agent_audit_logs) |
| R6 | Week 3 | P3 + 移除迁移辅助代码 + 全面回归测试 |

## 6. 验收标准

- [ ] 所有 P0-P1 localStorage 读写替换为 Supabase 调用
- [ ] 浏览器清除缓存后数据不丢失
- [ ] `tbh_resend_key` 不再出现在 localStorage 中
- [ ] 跨设备登录数据一致
- [ ] 所有新表有 RLS 策略
- [ ] 迁移脚本成功将遗留 localStorage 数据导入 Supabase

> AI生成