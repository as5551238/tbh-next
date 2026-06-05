---
AIGC:
  ContentProducer: '001191110102MAD55U9H0F10002'
  ContentPropagator: '001191110102MAD55U9H0F10002'
  Label: '1'
  ProduceID: '7b2cef32-c748-4f46-917d-b35d8e3f4d2a'
  PropagateID: '7b2cef32-c748-4f46-917d-b35d8e3f4d2a'
  ReservedCode1: '23b25786-727a-44eb-aa09-7e024cc4b34b'
  ReservedCode2: '23b25786-727a-44eb-aa09-7e024cc4b34b'
---

# TBH Next — Definition of Done (DoD)

> 守门人审查要求：DoD未定义=D1上限7分。本文件为所有功能交付的完成定义。

## 代码质量

- [ ] `pnpm build` 零错误零警告
- [ ] TypeScript strict 模式通过
- [ ] 无 TODO/FIXME/HACK 残留
- [ ] 无 console.log/warn/error 残留（生产环境）
- [ ] 无未使用的 import 和依赖

## 安全基线

- [ ] AI Agent Harness 三要素完整：行为约束 + 审计追踪 + 自动回滚
- [ ] 用户输入经 harness.validateInput() 校验
- [ ] AI 输出经 harness.validateOutput() 校验（含PII过滤）
- [ ] RLS 策略覆盖所有业务表
- [ ] 审计触发器覆盖关键数据变更
- [ ] 无硬编码密钥/凭证

## 测试覆盖

- [ ] 核心数据层函数有单元测试（dataLayer, aiService, auth）
- [ ] 关键页面组件有渲染测试
- [ ] 权限边界有测试（未登录/不同角色）
- [ ] Harness 约束违反路径有测试

## 文档与可维护性

- [ ] 单文件不超过 800 行（超出则拆分）
- [ ] 公共接口有 JSDoc 注释
- [ ] 依赖清单无冗余（所有 deps 都被实际 import）
- [ ] SBOM 存在且可自动生成

## 部署验证

- [ ] 线上 URL 返回 HTTP 200
- [ ] HashRouter 在 GitHub Pages 正常工作
- [ ] Service Worker 注册成功
- [ ] 部署版本可追溯（commit hash 或 version 标识）

## a11y 合规

- [ ] 键盘导航完整（Tab/Enter/Escape）
- [ ] 色彩对比度 ≥ 4.5:1
- [ ] 表单元素有 label 关联
- [ ] 关键交互有 aria 属性

---

**归档门槛**：上述所有检查项通过 + 守门人三维度评分(D1/D2/D3)均 ≥ 9/10

> AI生成