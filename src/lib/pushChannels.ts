/**
 * 推送渠道：企微 Webhook + 邮件
 * W5-T3: AI周报企业版 - 多渠道推送
 */

/* ── 企微 Webhook ───────────────────────────────────────── */

export interface WeComWebhookConfig {
  url: string;
  /** @example 'markdown' | 'text' */
  msgType?: 'markdown' | 'text';
}

interface WeComMarkdownMsg {
  msgtype: 'markdown';
  markdown: { content: string };
}

interface WeComTextMsg {
  msgtype: 'text';
  text: { content: string; mentioned_list?: string[] };
}

type WeComMessage = WeComMarkdownMsg | WeComTextMsg;

/**
 * 发送企微 Webhook 消息
 * 企微机器人文档: https://developer.work.weixin.qq.com/document/path/91770
 */
export async function sendWeComWebhook(
  config: WeComWebhookConfig,
  content: string,
): Promise<{ success: boolean; error?: string }> {
  if (!config.url) return { success: false, error: 'Webhook URL 未配置' };

  const msgType = config.msgType || 'markdown';
  const body: WeComMessage =
    msgType === 'markdown'
      ? { msgtype: 'markdown', markdown: { content } }
      : { msgtype: 'text', text: { content } };

  try {
    const resp = await fetch(config.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    if (data.errcode === 0) return { success: true };
    return { success: false, error: `企微错误: ${data.errmsg}` };
  } catch (e) {
    return { success: false, error: `网络错误: ${(e as Error).message}` };
  }
}

/**
 * 将周报数据格式化为企微 Markdown
 */
export function formatWeeklyReportForWeCom(report: EnterpriseReportData): string {
  const c = report.company;
  const lines = [
    `## 📊 企业周报 ${c.period}`,
    '',
    `> **任务概览**`,
    `> 总任务: ${c.total_tasks} | 本周完成: ${c.completed_this_week} | 进行中: ${c.in_progress} | 逾期: <font color="warning">${c.overdue_tasks}</font>`,
    `> 阻塞: ${c.blocked} | 目标数: ${c.total_goals} | 目标完成率: ${c.goal_completion_rate}%`,
    '',
  ];

  if (report.departments.length > 0) {
    lines.push('> **部门数据**');
    report.departments.forEach(d => {
      const overdueTag = d.overdue > 0 ? `<font color="warning">${d.overdue}逾期</font>` : '';
      lines.push(`> ${d.department}: ${d.total_tasks}任务/${d.completed_this_week}完成/${d.in_progress}进行中 ${overdueTag}`);
    });
    lines.push('');
  }

  if (c.high_priority_overdue?.length) {
    lines.push('> **高优逾期**');
    c.high_priority_overdue.slice(0, 3).forEach(t => {
      lines.push(`> - ${t.title} (截止${t.due_date})`);
    });
  }

  return lines.join('\n');
}

/* ── 邮件推送 ───────────────────────────────────────────── */

export interface EmailPushConfig {
  /** Supabase RPC function name for email sending */
  rpcFunction?: string;
  /** Direct Resend API key (fallback) */
  resendApiKey?: string;
  from?: string;
}

/**
 * 通过 Supabase RPC 发送邮件（推荐，走 pg_net 异步）
 */
export async function sendEmailViaRPC(
  supabaseUrl: string,
  supabaseKey: string,
  params: {
    to: string;
    subject: string;
    htmlBody: string;
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/send_email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        to_email: params.to,
        subject: params.subject,
        html_body: params.htmlBody,
      }),
    });
    if (resp.ok) return { success: true };
    const text = await resp.text();
    return { success: false, error: `RPC 错误: ${text}` };
  } catch (e) {
    return { success: false, error: `网络错误: ${(e as Error).message}` };
  }
}

/**
 * 直接通过 Resend API 发送邮件（备选方案）
 */
export async function sendEmailViaResend(
  apiKey: string,
  params: {
    from: string;
    to: string;
    subject: string;
    html: string;
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: params.from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });
    if (resp.ok) return { success: true };
    const data = await resp.json();
    return { success: false, error: `Resend 错误: ${JSON.stringify(data)}` };
  } catch (e) {
    return { success: false, error: `网络错误: ${(e as Error).message}` };
  }
}

/**
 * 将周报数据格式化为邮件 HTML
 */
export function formatWeeklyReportForEmail(report: EnterpriseReportData): string {
  const c = report.company;
  const deptRows = report.departments
    .map(
      d => `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;">${d.department}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;">${d.member_count}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;">${d.total_tasks}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;color:#16a34a;">${d.completed_this_week}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;${d.overdue > 0 ? 'color:#dc2626;font-weight:bold;' : ''}">${d.overdue}</td>
      </tr>`,
    )
    .join('');

  const overdueItems = (c.high_priority_overdue || [])
    .slice(0, 5)
    .map(
      t => `<li style="margin:4px 0;">${t.title} <span style="color:#999;">(截止: ${t.due_date})</span></li>`,
    )
    .join('');

  return `
    <div style="max-width:640px;margin:0 auto;font-family:-apple-system,sans-serif;">
      <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:24px;border-radius:12px 12px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:20px;">📊 企业周报</h1>
        <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">${c.period}</p>
      </div>
      <div style="padding:20px;background:#fff;border:1px solid #eee;border-top:none;">
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr>
            <td style="padding:12px;background:#f8fafc;text-align:center;border-radius:8px 0 0 8px;">
              <div style="font-size:24px;font-weight:bold;color:#667eea;">${c.total_tasks}</div>
              <div style="font-size:12px;color:#666;">总任务</div>
            </td>
            <td style="padding:12px;background:#f8fafc;text-align:center;">
              <div style="font-size:24px;font-weight:bold;color:#16a34a;">${c.completed_this_week}</div>
              <div style="font-size:12px;color:#666;">本周完成</div>
            </td>
            <td style="padding:12px;background:#f8fafc;text-align:center;">
              <div style="font-size:24px;font-weight:bold;color:#f59e0b;">${c.in_progress}</div>
              <div style="font-size:12px;color:#666;">进行中</div>
            </td>
            <td style="padding:12px;background:#f8fafc;text-align:center;border-radius:0 8px 8px 0;">
              <div style="font-size:24px;font-weight:bold;color:#dc2626;">${c.overdue_tasks}</div>
              <div style="font-size:12px;color:#666;">逾期</div>
            </td>
          </tr>
        </table>
        ${report.departments.length > 0 ? `
        <h3 style="font-size:14px;margin:0 0 8px;">部门数据</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px;">
          <tr style="background:#f1f5f9;">
            <th style="padding:8px 10px;text-align:left;">部门</th>
            <th style="padding:8px 10px;text-align:center;">人数</th>
            <th style="padding:8px 10px;text-align:center;">任务</th>
            <th style="padding:8px 10px;text-align:center;">完成</th>
            <th style="padding:8px 10px;text-align:center;">逾期</th>
          </tr>
          ${deptRows}
        </table>` : ''}
        ${overdueItems ? `
        <h3 style="font-size:14px;margin:0 0 8px;">高优逾期任务</h3>
        <ul style="padding-left:20px;font-size:13px;">${overdueItems}</ul>` : ''}
      </div>
      <div style="padding:12px;text-align:center;font-size:11px;color:#999;background:#f8fafc;border-radius:0 0 12px 12px;">
        由 TBH-Next 智企中台自动生成
      </div>
    </div>
  `;
}

/* ── 推送配置管理 ──────────────────────────────────────── */

export interface PushChannelConfig {
  wecom: WeComWebhookConfig | null;
  email: {
    enabled: boolean;
    recipients: string[];
  };
}

const PUSH_CONFIG_KEY = 'tbh-enterprise-push-config';

export function loadPushConfig(): PushChannelConfig {
  try {
    const raw = localStorage.getItem(PUSH_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    wecom: null,
    email: { enabled: false, recipients: [] },
  };
}

export function savePushConfig(config: PushChannelConfig): void {
  localStorage.setItem(PUSH_CONFIG_KEY, JSON.stringify(config));
}

/* ── 统一推送到所有已配置渠道 ──────────────────────────── */

export async function pushReportToAllChannels(
  report: EnterpriseReportData,
): Promise<{ wecom?: { success: boolean; error?: string }; email?: { success: boolean; error?: string } }> {
  const config = loadPushConfig();
  const results: ReturnType<typeof pushReportToAllChannels> extends Promise<infer T> ? T : never = {};

  if (config.wecom?.url) {
    const md = formatWeeklyReportForWeCom(report);
    results.wecom = await sendWeComWebhook(config.wecom, md);
  }

  if (config.email.enabled && config.email.recipients.length > 0) {
    const html = formatWeeklyReportForEmail(report);
    const subject = `企业周报 ${report.company.period}`;
    // 尝试 RPC，失败则回退到本地记录
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      for (const to of config.email.recipients) {
        results.email = await sendEmailViaRPC(supabaseUrl, supabaseKey, {
          to,
          subject,
          htmlBody: html,
        });
      }
    } else {
      results.email = { success: false, error: 'Supabase 未配置，无法发送邮件' };
    }
  }

  return results;
}

/* ── 类型 ──────────────────────────────────────────────── */

export interface EnterpriseReportData {
  type: 'enterprise_weekly';
  company: {
    period: string;
    week_start: string;
    week_end: string;
    total_tasks: number;
    completed_this_week: number;
    overdue_tasks: number;
    in_progress: number;
    blocked: number;
    total_goals: number;
    goal_completion_rate: number;
    total_members: number;
    high_priority_overdue: Array<{
      title: string;
      priority: string;
      due_date: string;
      assignee_id: string | null;
    }>;
  };
  departments: Array<{
    department: string;
    member_count: number;
    total_tasks: number;
    completed_this_week: number;
    overdue: number;
    in_progress: number;
    blocked: number;
    high_priority: number;
  }>;
  generated_at: string;
}
