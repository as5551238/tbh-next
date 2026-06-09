import { useState } from 'react';

const LAST_UPDATED = '2026-06-05';

export default function PrivacyPolicy() {
  const [expanded, setExpanded] = useState<number | null>(null);

  const sections = [
    {
      title: '1. 信息收集',
      content: `我们收集以下类型的信息：

• 账户信息：邮箱、手机号、昵称、头像
• 团队信息：团队名称、成员关系、角色权限
• 业务数据：目标(OKR)、任务、项目、知识文档、消息
• 使用数据：AI查询次数、功能使用频率、会话时长
• 设备信息：浏览器类型、操作系统、屏幕分辨率

我们不收集：位置信息、通讯录、照片库访问权限。`,
    },
    {
      title: '2. 数据存储与安全',
      content: `• 所有数据存储于 Supabase (AWS ap-southeast-1) 托管的 PostgreSQL 数据库
• 数据库启用行级安全策略(RLS)，确保用户仅可访问其团队数据
• 传输层使用 TLS 1.3 加密
• 静态数据使用 AES-256 加密
• AI 对话内容经过注入检测(16种模式)后处理
• 审计日志记录所有数据变更操作(IP、时间、操作类型)`,
    },
    {
      title: '3. 数据使用目的',
      content: `收集的数据仅用于以下目的：

• 提供核心服务：团队管理、OKR追踪、AI助手
• 改善服务质量：错误诊断、性能优化
• AI功能：基于用户上下文提供智能建议（用户可关闭）
• 安全防护：异常行为检测、审计追踪

我们不会将数据用于：广告投放、用户画像出售、第三方数据共享。`,
    },
    {
      title: '4. AI数据处理',
      content: `• AI查询发送至第三方LLM服务时，不包含用户身份信息
• AI响应经过安全过滤后才展示给用户
• 用户可随时在设置中关闭AI功能
• AI操作受Agent约束器限制：行为边界+审计追踪+自动回滚
• 所有AI操作记录在audit_logs中，管理员可审计`,
    },
    {
      title: '5. 数据共享',
      content: `我们不会出售、出租或交易用户数据。仅在以下情况下共享：

• 团队内共享：团队成员可查看同团队的业务数据（受RLS策略控制）
• 法律要求：收到有效法律文书时
• 服务提供商：仅为运行服务所需（Supabase、LLM API）
  - 每个服务提供商均有独立的数据处理协议

第三方服务清单：
• Supabase (数据库托管) - 通过DPA保护
• LLM API (AI推理) - 不传输身份信息`,
    },
    {
      title: '6. 用户权利（GDPR/PIPL）',
      content: `根据《通用数据保护条例》(GDPR)和《个人信息保护法》(PIPL)，您有权：

• 访问权：随时查看您的个人数据（设置 > 数据管理）
• 更正权：修改不准确的信息
• 删除权：请求删除您的账户和所有关联数据（7个工作日内处理）
• 可携带权：导出您的数据为JSON/CSV格式
• 限制处理权：暂时停止特定数据处理
• 反对权：反对基于合法利益的数据处理

行使权利方式：设置 > 隐私 > 数据管理，或联系 privacy@tbh-next.com`,
    },
    {
      title: '7. 数据保留期限',
      content: `• 活跃账户数据：持续保留至账户删除
• 删除账户后：30天内完全清除所有关联数据
• 审计日志：保留180天（合规要求），之后自动清除
• 匿名化统计数据：可永久保留，不可逆关联至个人
• AI对话历史：7天，可手动清除`,
    },
    {
      title: '8. Cookie与本地存储',
      content: `我们使用以下本地存储技术：

• LocalStorage：保存Supabase会话令牌、用户偏好设置
• Service Worker缓存：离线访问应用外壳(HTML/CSS/JS)
• 不使用第三方Cookie或追踪Cookie

用户可随时清除浏览器数据来移除所有本地存储。`,
    },
    {
      title: '9. 儿童隐私',
      content: `TBH Next面向企业用户，不面向14岁以下儿童。我们不会故意收集儿童的个人信息。如发现误收集，将立即删除。`,
    },
    {
      title: '10. 政策更新',
      content: `如本政策发生重大变更，我们将：

• 在应用内以显著方式通知用户
• 通过邮件通知所有活跃用户
• 在本页面更新"最后更新"日期
• 重大变更给予30天过渡期

继续使用服务即视为同意更新后的政策。`,
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text mb-2">隐私政策</h1>
        <p className="text-sm text-text-muted">最后更新：{LAST_UPDATED}</p>
        <p className="text-sm text-text-muted mt-2">
          TBH Next 致力于保护您的隐私。本政策说明我们如何收集、使用和保护您的个人信息。
        </p>
      </div>

      <div className="space-y-3">
        {sections.map((section, i) => (
          <div
            key={i}
            className="border border-border-2 rounded-lg overflow-hidden"
          >
            <button
              className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-surface transition-colors"
              onClick={() => setExpanded(expanded === i ? null : i)}
            >
              <span className="text-text font-medium">{section.title}</span>
              <span className="text-text-muted text-lg">
                {expanded === i ? '−' : '+'}
              </span>
            </button>
            {expanded === i && (
              <div className="px-4 py-3 bg-surface-deep border-t border-border-2">
                <pre className="text-sm text-text-muted whitespace-pre-wrap font-sans leading-relaxed">
                  {section.content}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 p-3 md:p-4 bg-surface rounded-lg border border-border-2">
        <h3 className="text-sm font-bold text-text mb-2">联系方式</h3>
        <p className="text-sm text-text-muted">
          如有隐私相关问题，请联系：privacy@tbh-next.com
        </p>
        <p className="text-sm text-text-muted mt-1">
          数据保护官(DPO)：可在设置中提交请求
        </p>
      </div>
    </div>
  );
}
