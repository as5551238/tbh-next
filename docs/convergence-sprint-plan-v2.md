---
AIGC:
  ContentProducer: '001191110102MAD55U9H0F10002'
  ContentPropagator: '001191110102MAD55U9H0F10002'
  Label: '1'
  ProduceID: 'f3458eca-e355-4dff-857c-6ec983902660'
  PropagateID: 'f3458eca-e355-4dff-857c-6ec983902660'
  ReservedCode1: '1d23f48d-79cb-4187-95ec-3907be62d7f2'
  ReservedCode2: '1d23f48d-79cb-4187-95ec-3907be62d7f2'
---

# TBH-Next 收敛冲刺完整执行计划 v2（6周30天）

> 版本：v2.0 | 日期：2026-06-12 | 基于：三技能深度结构性Review v2
> 目标：PARTIAL数从15→0，TRR从71.7%→≥95%
> 总工时：~32h | 可用工时：6周×每天2-3h=60-90h | 余量充裕
> 执行原则：修完立即验证，不积累未验证修改，每日commit

---

## 全局约束

1. 不再新增规则——93条足够，下一条只能出现在PARTIAL=0之后
2. 每个PARTIAL修完立即验证——CRUD+Supabase+UI三方面
3. 每个Phase结束必须构建+部署+验证
4. 每日git commit
5. 构建命令：`pnpm build`（Vite 5.4.21锁定）
6. JSX属性单行（input/select/textarea/button）——esbuild bug

---

## Phase 1: Review模块（W1, 6/15-6/19）

目标：Review TRR 1/5→5/5

### D1: 创建review_sessions表 + initiate持久化

- [ ] Supabase SQL: 创建`review_sessions`表
- [ ] 修改`useReviewDraft.ts`：initiate写入Supabase
- [ ] 修改`ReviewContent.tsx`：使用新API
- 验收：创建review→select * from review_sessions有记录→刷新仍在

### D2: fill-phases持久化

- [ ] Supabase SQL: 创建`review_phase_data`表
- [ ] 5个阶段填写完成时写入Supabase
- [ ] 加载时从Supabase读取
- 验收：填写阶段→Supabase有记录→刷新后数据恢复

### D3: AI-draft持久化

- [ ] AI草稿结果写入Supabase
- [ ] AI草稿从Supabase读取
- 验收：AI生成草稿→Supabase有→刷新后草稿仍在

### D4: export按钮+记录

- [ ] ReviewContent添加导出按钮（markdown下载）
- [ ] 导出时更新review_sessions.exported_at
- 验收：点击导出→文件下载+Supabase记录更新

### D5: 全局验证+构建+部署

- [ ] 完整走通：发起→5阶段→AI草稿→导出→关闭
- [ ] pnpm build
- [ ] git tag sprint-p1-d5
- [ ] push + deploy

---

## Phase 2: Knowledge + Goals（W2, 6/22-6/26）

目标：Knowledge 2/5→5/5, Goals 4/5→5/5

### D1: Knowledge browse改用Supabase查询

- [ ] KnowledgeOSPView浏览逻辑改为Supabase查询
- 验收：浏览页→Network tab可见Supabase请求

### D2: Knowledge uninstall添加Supabase删除

- [ ] 卸载逻辑：Supabase delete + localStorage清理
- 验收：安装→卸载→Supabase记录消失

### D3: Knowledge search服务端搜索

- [ ] 搜索改为Supabase textSearch/ilike
- 验收：搜索→服务端返回结果

### D4: Goals attach-to-project（唯一FAIL）

- [ ] Supabase SQL: goals表添加project_id列
- [ ] GoalsContent添加"关联项目"下拉
- [ ] crud.ts处理project_id
- 验收：创建目标→关联项目→Supabase有project_id

### D5: 全局验证+构建+部署

---

## Phase 3: Risk + Projects（W3, 6/29-7/3）

目标：Risk 3/5→5/5, Projects 4/5→5/5

### D1: Risk evaluate持久化

- [ ] 评估结果写入Supabase risk_snapshots
- [ ] 加载历史评估从Supabase
- 验收：评估→Supabase有→刷新后数据在

### D2: Risk migrate-data触发器+UI

- [ ] RiskView添加"迁移本地数据"按钮
- [ ] 逐条迁移+校验
- 验收：迁移→Supabase有数据→localStorage清空

### D3: Projects manage-members

- [ ] Supabase SQL: 创建project_members关联表
- [ ] ProjectsContent添加成员管理UI
- 验收：项目→添加成员→project_members有记录

### D4-D5: 集成验证+构建+部署

---

## Phase 4: Templates + Permissions + Subscription（W4, 7/6-7/10）

目标：3模块各升1个PARTIAL→PASS

### D1: Templates编辑按钮+表单

- [ ] TemplatesContent添加编辑按钮
- [ ] 编辑表单：名称/描述/payload
- 验收：编辑模板→保存→刷新后保留

### D2: Permissions view-switch跨设备同步

- [ ] Supabase: 创建user_preferences表
- [ ] 视图切换写Supabase+加载时读取
- 验收：设备A切换→设备B刷新一致

### D3: Subscription降级按钮

- [ ] SubscriptionView添加降级按钮
- [ ] 调用cancelSubscription→Supabase更新
- 验收：Pro→降级→免费功能限制生效

### D4-D5: 集成验证+构建+部署

---

## Phase 5: 全局集成验证（W5, 7/13-7/17）

目标：TRR≥90%，PARTIAL=0

### D1: 12×5矩阵逐操作验证

- [ ] 60个操作逐一验证，记录PASS/PARTIAL/FAIL

### D2: 剩余PARTIAL修复

- [ ] 修D1发现的任何残余

### D3: 边缘case验证

- [ ] 空数据/并发/权限边界/网络断开

### D4: 性能验证

- [ ] 首屏/查询/构建时间

### D5: TRR报告+构建+部署

---

## Phase 6: 付费激活+发布（W6, 7/20-7/24）

目标：TRR≥95%+付费可用+tag发布

### D1: 付费模块激活

- [ ] subscription_plans 3条记录确认
- [ ] user_subscriptions RLS确认
- [ ] checkout函数可执行

### D2: 付费流程端到端验证

- [ ] 注册→免费→选Pro→(模拟)支付→Pro可用
- [ ] Pro降级→免费→受限

### D3: 线上部署+冒烟测试

- [ ] gh-pages部署
- [ ] HTTP 200 + DOM + cache-busting

### D4: 用户操作指南

- [ ] 3核心模块使用路径

### D5: 最终验收+tag convergence-v1

- [ ] TRR≥95%确认
- [ ] git tag + 总结报告

> AI生成