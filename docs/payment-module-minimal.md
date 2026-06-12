---
AIGC:
  ContentProducer: '001191110102MAD55U9H0F10002'
  ContentPropagator: '001191110102MAD55U9H0F10002'
  Label: '1'
  ProduceID: '95eb865e-451a-4689-a4d2-57eff083b34d'
  PropagateID: '95eb865e-451a-4689-a4d2-57eff083b34d'
  ReservedCode1: '57af3667-606f-4754-8797-09c0dc0204e8'
  ReservedCode2: '57af3667-606f-4754-8797-09c0dc0204e8'
---

# 付费模块极简落地步骤

> 版本：v1.0 | 创建：2026-06-12 | 来源：8D深度Review外部优化建议
> 约束：Phase 3（W6）实施，仅4个页面+1个Supabase函数，极简闭环

---

## 极简闭环定义

**注册 → 选择计划 → (模拟)支付 → 功能访问**

这是MVP付费的最小可行路径，不涉及真实支付网关集成。

---

## 数据模型

```sql
-- subscription_plans 表（3条硬编码记录）
CREATE TABLE subscription_plans (
  id TEXT PRIMARY KEY,        -- 'free' | 'pro' | 'enterprise'
  name TEXT NOT NULL,
  price_monthly DECIMAL DEFAULT 0,
  max_members INT DEFAULT 5,
  max_projects INT DEFAULT 10,
  ai_calls_daily INT DEFAULT 10,
  features JSONB DEFAULT '{}'
);

-- 插入3条计划
INSERT INTO subscription_plans (id, name, price_monthly, max_members, max_projects, ai_calls_daily, features) VALUES
  ('free', '免费版', 0, 5, 10, 10, '{"export": false, "ai_agent": false, "custom_templates": false}'),
  ('pro', '专业版', 29, 50, 100, 100, '{"export": true, "ai_agent": true, "custom_templates": true}'),
  ('enterprise', '企业版', 99, 999, 999, 999, '{"export": true, "ai_agent": true, "custom_templates": true, "sso": true, "priority_support": true}');

-- user_subscriptions 表
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT REFERENCES subscription_plans(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  current_period_start TIMESTAMPTZ DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscription" ON user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscription" ON user_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

## 4个页面

### 页面1: 定价页 (`/pricing`)
- 展示3个计划卡片（免费/专业/企业）
- 当前计划高亮
- "选择此计划"按钮→跳转结账页

### 页面2: 结账页 (`/checkout/:planId`)
- 显示计划详情+价格
- 模拟支付表单（仅收集意向，不接真实支付）
- 提交→调用Supabase RPC→创建subscription记录

### 页面3: 订阅管理页 (`/settings/subscription`)
- 显示当前计划+到期时间
- 升级/降级/取消按钮
- 功能对比表

### 页面4: 功能受限提示（组件级）
- 当免费用户访问Pro功能时，弹出升级提示
- 集成到已有模块的权限检查中

---

## 1个Supabase函数

```sql
-- checkout 函数（模拟支付）
CREATE OR REPLACE FUNCTION checkout(plan_id TEXT)
RETURNS UUID AS $$
DECLARE
  new_sub_id UUID;
BEGIN
  -- 取消旧订阅
  UPDATE user_subscriptions SET status = 'cancelled' WHERE user_id = auth.uid() AND status = 'active';
  -- 创建新订阅
  INSERT INTO user_subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
  VALUES (auth.uid(), plan_id, 'active', now(), now() + INTERVAL '30 days')
  RETURNING id INTO new_sub_id;
  RETURN new_sub_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 功能访问控制

```typescript
// 前端权限检查（与现有permissions系统整合）
function canAccess(feature: string, userPlan: PlanId): boolean {
  const planFeatures: Record<PlanId, Set<string>> = {
    free: new Set(['tasks', 'goals', 'basic_ai']),
    pro: new Set(['tasks', 'goals', 'basic_ai', 'ai_agent', 'export', 'custom_templates']),
    enterprise: new Set(['tasks', 'goals', 'basic_ai', 'ai_agent', 'export', 'custom_templates', 'sso', 'priority_support'])
  };
  return planFeatures[userPlan]?.has(feature) ?? false;
}
```

---

## 实施检查清单

| 步骤 | 工作量 | 验收标准 |
|------|--------|----------|
| 1. SQL建表+RLS | 1h | 3条计划+RLS策略+RPC函数在Supabase可执行 |
| 2. 定价页 | 2h | 3卡片展示+当前计划高亮+选择按钮可点击 |
| 3. 结账页 | 2h | 计划详情+模拟支付+subscription创建成功 |
| 4. 订阅管理页 | 1h | 当前计划+升级/降级/取消可操作 |
| 5. 功能受限组件 | 2h | 免费用户访问Pro功能→升级提示 |
| 6. 端到端验证 | 1h | 注册→选计划→(模拟)支付→Pro功能可访问 |
| **总计** | **9h** | |

> AI生成