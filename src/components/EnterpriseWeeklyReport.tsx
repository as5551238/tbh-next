/**
 * 企业周报组件 - 部门/公司级数据聚合+多渠道推送
 * W5-T3
 */
import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Building2,
  Send,
  RefreshCw,
  Settings,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  Target,
  Download,
} from 'lucide-react';
import type { EnterpriseReportData, PushChannelConfig } from '@/lib/pushChannels';
import { loadPushConfig, savePushConfig, pushReportToAllChannels, formatWeeklyReportForWeCom } from '@/lib/pushChannels';
import { supabase } from '@/lib/supabase';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';

interface EnterpriseWeeklyReportProps {
  teamId?: string;
}

export default function EnterpriseWeeklyReport({ teamId = '__default__' }: EnterpriseWeeklyReportProps) {
  const [report, setReport] = useState<EnterpriseReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState<{ wecom?: { success: boolean; error?: string }; email?: { success: boolean; error?: string } } | null>(null);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const configModal = useModal();
  const [pushConfig, setPushConfig] = useState<PushChannelConfig>(loadPushConfig());

  const generateReport = useCallback(async () => {
    setLoading(true);
    setPushResult(null);
    try {
      if (!supabase) {
        // 无 Supabase 时使用 demo 数据
        setReport(createDemoReport());
        return;
      }
      const { data, error } = await supabase.rpc('weekly_report_enterprise', {
        p_team_id: teamId,
        p_week_offset: 0,
      });
      if (error) throw error;
      setReport(data as EnterpriseReportData);
    } catch {
      setReport(createDemoReport());
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  const handlePush = useCallback(async () => {
    if (!report) return;
    setPushing(true);
    try {
      const result = await pushReportToAllChannels(report);
      setPushResult(result);
    } finally {
      setPushing(false);
    }
  }, [report]);

  const handleSaveConfig = useCallback(() => {
    savePushConfig(pushConfig);
    configModal.closeModal();
  }, [pushConfig, configModal]);

  // 周报健康度评分
  const healthScore = useMemo(() => {
    if (!report) return null;
    const c = report.company;
    let score = 100;
    // 逾期扣分
    if (c.total_tasks > 0) {
      score -= Math.min(30, (c.overdue_tasks / c.total_tasks) * 100);
    }
    // 阻塞扣分
    if (c.total_tasks > 0) {
      score -= Math.min(20, (c.blocked / c.total_tasks) * 50);
    }
    // 完成率加分
    if (c.total_tasks > 0) {
      score += Math.min(10, (c.completed_this_week / c.total_tasks) * 20);
    }
    return Math.max(0, Math.min(100, Math.round(score)));
  }, [report]);

  if (!report && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Building2 size={40} className="text-text-3" />
        <p className="text-sm text-text-3">点击生成企业周报，查看部门级数据聚合</p>
        <button className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-4 py-2 text-xs font-semibold text-primary-2 hover:bg-primary/20" onClick={generateReport}>
          <RefreshCw size={14} />生成企业周报
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-text">企业周报</h3>
          {report && <span className="text-[10px] text-text-3">{report.company.period}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[10px] text-text-3 hover:bg-surface-2" onClick={() => { setPushConfig(loadPushConfig()); configModal.openModal(); }}>
            <Settings size={12} />推送设置
          </button>
          {report && (
            <button className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary-2 hover:bg-primary/20 disabled:opacity-50" onClick={handlePush} disabled={pushing}>
              <Send size={12} />{pushing ? '推送中...' : '一键推送'}
            </button>
          )}
          <button className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[10px] text-text-3 hover:bg-surface-2" onClick={generateReport} disabled={loading}>
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />刷新
          </button>
          {report && (
            <button className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[10px] text-text-3 hover:bg-surface-2" onClick={() => {
              if (!report) return;
              const md = `# 企业周报 - ${report.company.period}\n\n` +
                `## 公司概览\n` +
                `- 目标完成率: ${report.company.goal_completion_rate}%\n` +
                `- 总任务数: ${report.company.total_tasks}\n` +
                `- 本周完成: ${report.company.completed_this_week}\n` +
                `- 逾期任务: ${report.company.overdue_tasks}\n\n` +
                `## 部门概览\n` +
                `| 部门 | 人数 | 总任务 | 本周完成 | 逾期 |\n|------|------|--------|---------|------|\n` +
                (report.departments ?? []).map((d: {department: string; member_count: number; total_tasks: number; completed_this_week: number; overdue: number}) => `| ${d.department} | ${d.member_count} | ${d.total_tasks} | ${d.completed_this_week} | ${d.overdue} |`).join('\n') + '\n\n' +
                `## 高优先级逾期任务\n` +
                (report.company.high_priority_overdue ?? []).map((t: {title: string; priority: string; due_date: string}) => `- [${t.priority}] ${t.title} (截止${t.due_date})`).join('\n');
              const blob = new Blob([md], { type: 'text/markdown' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `enterprise-report-${report.company.period}.md`;
              a.click(); URL.revokeObjectURL(url);
            }}>
              <Download size={12} />导出
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          <div className="h-24 rounded-xl bg-surface-2/30 animate-pulse" />
          <div className="h-16 rounded-xl bg-surface-2/20 animate-pulse" />
        </div>
      )}

      {/* Push Result */}
      {pushResult && (
        <div className={cn('rounded-lg px-3 py-2 text-[11px]', pushResult.wecom?.success || pushResult.email?.success ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger')}>
          {pushResult.wecom && `企微: ${pushResult.wecom.success ? '已推送' : pushResult.wecom.error} `}
          {pushResult.email && `邮件: ${pushResult.email.success ? '已发送' : pushResult.email.error}`}
        </div>
      )}

      {report && !loading && (
        <>
          {/* Company Overview - 4 stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={<CheckCircle2 size={14} />} label="本周完成" value={report.company.completed_this_week} sub={`总任务 ${report.company.total_tasks}`} color="text-success" />
            <StatCard icon={<Clock size={14} />} label="进行中" value={report.company.in_progress} sub={`阻塞 ${report.company.blocked}`} color="text-warn" />
            <StatCard icon={<AlertTriangle size={14} />} label="逾期" value={report.company.overdue_tasks} sub="需关注" color="text-danger" />
            <StatCard icon={<Target size={14} />} label="目标进度" value={`${report.company.goal_completion_rate}%`} sub={`${report.company.total_goals} 个目标`} color="text-primary-2" />
          </div>

          {/* Health Score */}
          {healthScore !== null && (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
              <div className={cn('text-2xl font-black', healthScore >= 80 ? 'text-success' : healthScore >= 60 ? 'text-warn' : 'text-danger')}>
                {healthScore}
              </div>
              <div>
                <div className="text-xs font-bold text-text">团队健康度</div>
                <div className="text-[10px] text-text-3">
                  {healthScore >= 80 ? '运行良好' : healthScore >= 60 ? '需关注逾期任务' : '逾期严重，需立即干预'}
                </div>
              </div>
              <div className="ml-auto flex-1 max-w-[200px] h-2 bg-surface-2 rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full transition-all', healthScore >= 80 ? 'bg-success' : healthScore >= 60 ? 'bg-warn' : 'bg-danger')} style={{ width: `${healthScore}%` }} />
              </div>
            </div>
          )}

          {/* Department Breakdown */}
          {report.departments.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-text-2 flex items-center gap-1.5">
                <Users size={12} />部门数据
              </h4>
              {report.departments.map(dept => (
                <div key={dept.department} className="rounded-xl border border-border bg-surface overflow-hidden">
                  <div className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-surface-2/30" onClick={() => setExpandedDept(expandedDept === dept.department ? null : dept.department)}>
                    <span className="text-xs font-semibold text-text flex-1">{dept.department}</span>
                    <span className="text-[10px] text-text-3">{dept.member_count}人</span>
                    <span className={cn('text-[10px] font-bold', dept.completed_this_week > 0 ? 'text-success' : 'text-text-3')}>{dept.completed_this_week}完成</span>
                    {dept.overdue > 0 && <span className="text-[10px] font-bold text-danger">{dept.overdue}逾期</span>}
                    {expandedDept === dept.department ? <ChevronUp size={12} className="text-text-3" /> : <ChevronDown size={12} className="text-text-3" />}
                  </div>
                  {expandedDept === dept.department && (
                    <div className="border-t border-border px-3 py-2 grid grid-cols-3 md:grid-cols-5 gap-2">
                      <MiniStat label="任务" value={dept.total_tasks} />
                      <MiniStat label="完成" value={dept.completed_this_week} color="text-success" />
                      <MiniStat label="进行中" value={dept.in_progress} color="text-warn" />
                      <MiniStat label="逾期" value={dept.overdue} color="text-danger" />
                      <MiniStat label="高优" value={dept.high_priority} color="text-danger" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* High Priority Overdue */}
          {report.company.high_priority_overdue?.length > 0 && (
            <div className="rounded-xl border border-danger/20 bg-danger/5 p-3">
              <h4 className="text-xs font-bold text-danger mb-2 flex items-center gap-1.5">
                <AlertTriangle size={12} />高优逾期任务
              </h4>
              <div className="space-y-1.5">
                {report.company.high_priority_overdue.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <span className="text-danger font-bold shrink-0">P{t.priority === 'urgent' ? '0' : '1'}</span>
                    <span className="text-text truncate flex-1">{t.title}</span>
                    <span className="text-text-3 shrink-0">{t.due_date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Push Config Modal */}
      <Modal open={configModal.open} onClose={configModal.closeModal} title="推送渠道设置"
        footer={
          <div className="flex gap-2">
            <button className={btnSecondary} onClick={configModal.closeModal}>取消</button>
            <button className={btnPrimary} onClick={handleSaveConfig}>保存</button>
          </div>
        }>
        <ModalField label="企微 Webhook URL">
          <input className={inputCls} placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..." value={pushConfig.wecom?.url || ''} onChange={(e) => setPushConfig(p => ({ ...p, wecom: e.target.value ? { url: e.target.value } : null }))} />
        </ModalField>
        <ModalField label="企微消息格式">
          <select className={inputCls} value={pushConfig.wecom?.msgType || 'markdown'} onChange={(e) => setPushConfig(p => ({ ...p, wecom: p.wecom ? { ...p.wecom, msgType: e.target.value as 'markdown' | 'text' } : { url: '', msgType: e.target.value as 'markdown' | 'text' } }))}>
            <option value="markdown">Markdown</option>
            <option value="text">纯文本</option>
          </select>
        </ModalField>
        <ModalField label="邮件推送">
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={pushConfig.email.enabled} onChange={(e) => setPushConfig(p => ({ ...p, email: { ...p.email, enabled: e.target.checked } }))} className="accent-primary" />
            启用邮件推送
          </label>
        </ModalField>
        <ModalField label="收件人（逗号分隔）">
          <input className={inputCls} placeholder="a@company.com, b@company.com" value={pushConfig.email.recipients.join(', ')} onChange={(e) => setPushConfig(p => ({ ...p, email: { ...p.email, recipients: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } }))} />
        </ModalField>
      </Modal>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────── */

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: number | string; sub: string; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span className={color}>{icon}</span>
        <span className="text-[10px] text-text-3">{label}</span>
      </div>
      <div className={cn('text-xl font-black', color)}>{value}</div>
      <div className="text-[9px] text-text-3">{sub}</div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="text-center">
      <div className={cn('text-sm font-bold', color || 'text-text')}>{value}</div>
      <div className="text-[9px] text-text-3">{label}</div>
    </div>
  );
}

/* ── Demo data ───────────────────────────────────────── */

function createDemoReport(): EnterpriseReportData {
  return {
    type: 'enterprise_weekly',
    company: {
      period: '2026-06-08 ~ 2026-06-14',
      week_start: '2026-06-08',
      week_end: '2026-06-14',
      total_tasks: 68,
      completed_this_week: 5,
      overdue_tasks: 20,
      in_progress: 23,
      blocked: 2,
      total_goals: 8,
      goal_completion_rate: 45.5,
      total_members: 17,
      high_priority_overdue: [
        { title: '新功能开发-支付模块', priority: 'urgent', due_date: '2026-06-09', assignee_id: null },
        { title: '性能优化-首屏加载', priority: 'high', due_date: '2026-06-10', assignee_id: null },
        { title: '安全漏洞修复-XSS', priority: 'urgent', due_date: '2026-06-08', assignee_id: null },
      ],
    },
    departments: [
      { department: '研发部', member_count: 6, total_tasks: 28, completed_this_week: 3, overdue: 8, in_progress: 12, blocked: 1, high_priority: 2 },
      { department: '产品部', member_count: 3, total_tasks: 15, completed_this_week: 1, overdue: 5, in_progress: 6, blocked: 0, high_priority: 1 },
      { department: '设计部', member_count: 2, total_tasks: 10, completed_this_week: 1, overdue: 3, in_progress: 3, blocked: 1, high_priority: 0 },
      { department: '运营部', member_count: 4, total_tasks: 12, completed_this_week: 0, overdue: 4, in_progress: 2, blocked: 0, high_priority: 0 },
      { department: '管理层', member_count: 2, total_tasks: 3, completed_this_week: 0, overdue: 0, in_progress: 0, blocked: 0, high_priority: 0 },
    ],
    generated_at: new Date().toISOString(),
  };
}
