# P0 事故复盘：React is not defined — 全站白屏

## 事故时间线
- T0: 子代理(E3)执行 Workspace.tsx 拆分 + 懒加载改造
- T1: 子代理添加 30+ 行 `React.lazy(() => import(...))` 但未 import React
- T2: 主线程执行 `pnpm build` → 构建成功（Vite 不检查运行时变量是否存在）
- T3: 部署到 GitHub Pages → 全站白屏
- T4: 用户报障

## 根因 5-Why

1. **为何白屏？** → 构建产物中 `React.lazy()` 引用全局 `React` 对象，运行时 `React is not defined`
2. **为何未导入 React？** → `tsconfig.json` 配置 `"jsx": "react-jsx"` 新 JSX Transform 自动注入 JSX 运行时，不需要 `import React`——开发者因此**省略了 React import**
3. **为何新 JSX Transform 不覆盖 `React.lazy()`？** → 新 Transform 只自动注入 `_jsx` 和 `_jsxs`，不处理 `React.xxx` 的属性访问（`lazy`, `FC`, `ReactNode` 等仍是全局引用）
4. **为何 Vite 构建未报错？** → esbuild 在 bundling 阶段遇到 `React.lazy` 时，假设 `React` 是全局变量（因为 `react` 包被 vendor chunk 独立提取，未被该模块 import），minifier 保留 `React.lazy` 引用而不报错
5. **底因** → **缺乏"运行时变量存在性"的构建门禁**——TypeScript 类型检查不覆盖运行时全局引用，Vite/esbuild 不校验未声明的全局变量

## 认知偏差分析

| 偏差类型 | 表现 |
|---------|------|
| **确认偏差** | "构建成功 = 代码正确"，未验证运行时行为 |
| **能力错觉** | 新 JSX Transform 让人误以为 React 完全不需要 import |
| **假设盲区** | 假设 esbuild/Vite 会像 TypeScript 一样检查未定义变量 |
| **分工盲区** | 子代理修改了 import 但不负责构建验证；主线程验证了构建但未做运行时检查 |

## 系统性漏洞

| 层级 | 漏洞 | 说明 |
|------|------|------|
| L1 工具链 | esbuild 不警告未声明全局引用 | `React.lazy` 作为全局属性访问被保留，不报错 |
| L2 CI/CD | 无运行时冒烟测试 | CI 只有 `pnpm build`，没有 puppeteer/playwright 检查页面是否渲染 |
| L3 Agent | 子代理代码无运行时验证 | 子代理只检查 `pnpm build`，不检查构建产物内容 |
| L4 流程 | 无"构建产物内容审查"门禁 | 交付标准是"构建成功"而非"页面可渲染" |

## 可执行规则 (写入 verifiable-rules.md)

### DR-22: 禁止未导入的 React 命名空间引用
- **规则**: 在 `.tsx`/`.ts` 文件中，禁止使用 `React.xxx` 除非文件首行有 `import React from 'react'` 或对应的命名导入 (`lazy`, `FC`, `ReactNode` 等)
- **替换模式**: `React.lazy` → `lazy`, `React.FC` → `FC`, `React.ReactNode` → `ReactNode`, `React.FormEvent` → `FormEvent`, `React.CSSProperties` → `CSSProperties` 等
- **CI检查**: `rg "React\." src/ -g '*.tsx' -g '*.ts' -g '!*.d.ts' | grep -v "import React"` — 非零输出=阻断

### DR-23: 构建产物运行时引用审查
- **规则**: 每次 `pnpm build` 后，必须检查构建产物中是否存在未绑定的全局变量引用
- **CI检查**: `rg "React\.(lazy|createElement|Fragment|FC|ReactNode|CSSProperties|FormEvent|MouseEvent|ChangeEvent)\b" dist/assets/` — 非零输出=阻断
- **例外**: vendor chunk (react 库自身) 中的 `React.` 是正常的，排除 `vendor-*.js`

### DR-24: 运行时冒烟测试门禁
- **规则**: 每次部署后必须在 headed 浏览器中确认首页不白屏
- **最低标准**: 页面 `<div id="root">` 内有非空子元素 = PASS
- **长期**: 添加 Playwright 冒烟测试到 CI

### DR-25: JSX Transform 感知规则
- **规则**: 所有写入代码的工具（Agent/脚本/模板）必须理解 `react-jsx` Transform 的边界——它只自动注入 JSX 运行时，不处理 `React.xxx` 命名空间访问
- **自检**: 每次添加新 `.tsx` 文件或修改 import 时，验证 `React.` 引用是否被覆盖

## 修复记录

修复 15 个文件，将所有 `React.xxx` 替换为命名导入：
- `React.lazy` → `lazy` (30处，Workspace.tsx)
- `React.FC` → `FC` (3处，Collab/PersonalAI/CollabDocsView/FilesView)
- `React.ReactNode` → `ReactNode` (6处)
- `React.LazyExoticComponent` → `LazyExoticComponent` (2处)
- `React.CSSProperties` → `CSSProperties` (2处)
- `React.FormEvent` → `FormEvent` (2处)
- `React.MouseEvent` → `MouseEvent` (1处)
- `React.ChangeEvent` → `ChangeEvent` (1处)

## 预防措施

1. **ESLint 规则**: 添加 `no-restricted-properties` 禁止 `React.lazy` 等，强制命名导入
2. **CI 门禁**: 部署前 `rg "React\." src/` 检查
3. **代码模板**: 新建 .tsx 文件的标准 import 模板明确列出常用命名导入
4. **Agent 约束**: 写入所有 Skill 的规则——`React.xxx` 必须对应命名导入，禁止依赖全局 React
