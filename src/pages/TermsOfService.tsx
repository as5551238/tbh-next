import { useState } from 'react';

const LAST_UPDATED = '2026-06-05';

export default function TermsOfService() {
  const [expanded, setExpanded] = useState<number | null>(null);

  const sections = [
    {
      title: '1. 服务描述',
      content: `TBH Next 是一个AI原生的团队业务管理平台，提供：

• OKR目标管理 & 任务追踪
• 项目管理 & 团队协作
• AI智能助手（风险预警、早安简报、KPI分析等）
• 知识库 & 文档管理
• 团队通讯（频道消息）

服务通过Web浏览器提供，支持PWA离线访问。`,
    },
    {
      title: '2. 账户与访问',
      content: `• 用户需注册账户方可使用服务
• Free计划：最多5名成员，每日AI查询50次
• Pro计划：不限成员，每日AI查询500次，高级功能
• Enterprise计划：私有部署、无限AI查询、SLA保障
• 用户对账户安全负责，应保管好登录凭据
• 禁止共享账户或将账户转让给第三方`,
    },
    {
      title: '3. 可接受使用',
      content: `您同意不会：

• 上传恶意软件或攻击性内容
• 尝试未授权访问其他用户数据
• 使用自动化脚本批量抓取数据
• 绕过安全措施或访问限制
• 将AI功能用于违法目的
• 侵犯他人知识产权

违规将导致账户暂停或终止，并保留追究法律责任的权利。`,
    },
    {
      title: '4. 知识产权',
      content: `• 用户对其创建的内容（OKR、任务、文档等）保留所有权
• TBH Next 对平台代码、设计、品牌标识拥有知识产权
• 用户授权TBH Next 为提供服务之必要而处理其内容
• AI生成内容的知识产权归属按使用场景确定：
  - 建议性内容：用户所有
  - 系统性分析：双方共有`,
    },
    {
      title: '5. 服务级别与可用性',
      content: `• Free计划：无SLA保证，尽力而为
• Pro计划：99.5%月度可用性SLA
• Enterprise计划：99.9%月度可用性SLA + 专属支持
• 计划内维护提前48小时通知
• 服务中断超SLA的Pro/Enterprise用户可获得服务延期`,
    },
    {
      title: '6. 付费与退款',
      content: `• Pro/Enterprise计划按月/年计费
• 年付享受8折优惠
• 7天无理由退款（首次订阅）
• 超额使用（AI查询/成员数）按量计费
• 逾期15天未付款，服务降级至Free计划
• 降级后数据保留30天，之后自动清除`,
    },
    {
      title: '7. 数据备份与恢复',
      content: `• 所有付费计划包含自动每日备份
• 备份保留30天
• 用户可随时导出自己的数据
• Free计划不保证数据备份
• 因用户操作导致的数据删除，7天内可申请恢复`,
    },
    {
      title: '8. 终止',
      content: `• 用户可随时终止账户（设置 > 账户 > 删除账户）
• 删除后30天内可恢复（联系支持），之后永久删除
• 我们保留因违规终止账户的权利
• 终止后：
  - 立即停止服务访问
  - 30天数据保留期
  - 退还按比例计算的未使用费用(Pro/Enterprise)`,
    },
    {
      title: '9. 免责声明',
      content: `• AI建议仅供参考，不构成专业意见
• 服务按"现状"提供，不作适销性保证
• 我们不对以下情况负责：
  - 因不可抗力导致的服务中断
  - 第三方服务(Supabase/LLM)的故障
  - 用户自身操作导致的数据丢失
  - AI生成内容的准确性`,
    },
    {
      title: '10. 争议解决',
      content: `• 首先通过 support@tbh-next.com 协商解决
• 协商不成，提交中国国际经济贸易仲裁委员会(CIETAC)仲裁
• 仲裁语言：中文
• 仲裁地点：北京
• 本条款受中华人民共和国法律管辖`,
    },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text mb-2">服务条款</h1>
        <p className="text-sm text-text-muted">最后更新：{LAST_UPDATED}</p>
        <p className="text-sm text-text-muted mt-2">
          使用 TBH Next 即表示您同意以下条款。请仔细阅读。
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

      <div className="mt-8 p-4 bg-surface rounded-lg border border-border-2">
        <h3 className="text-sm font-bold text-text mb-2">联系方式</h3>
        <p className="text-sm text-text-muted">
          客户支持：support@tbh-next.com
        </p>
        <p className="text-sm text-text-muted mt-1">
          法律事务：legal@tbh-next.com
        </p>
      </div>
    </div>
  );
}
