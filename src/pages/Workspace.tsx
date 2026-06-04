import { useAppStore } from '@/stores/appStore';
import { useMatrixCell, useIndustryColor } from '@/hooks/useMatrix';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, Target, CheckCircle2, FolderKanban, BarChart3, BookOpen, Brain, ArrowRight, Bot } from 'lucide-react';

// Lazy-load heavier sub-views
import ScheduleContent from '@/pages/workspace/ScheduleContent';
import NotificationsContent from '@/pages/workspace/NotificationsContent';
import InsightContent from '@/pages/workspace/InsightContent';
import ReportsContent from '@/pages/workspace/ReportsContent';
import PredictionContent from '@/pages/workspace/PredictionContent';
import DocsContent from '@/pages/workspace/DocsContent';
import ExperienceContent from '@/pages/workspace/ExperienceContent';
import MembersContent from '@/pages/workspace/MembersContent';
import RolesContent from '@/pages/workspace/RolesContent';
import OrgContent from '@/pages/workspace/OrgContent';
import AdminContent from '@/pages/workspace/AdminContent';
import ModulePageStub from '@/pages/ModulePageStub';

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus };

/** Overview: default workspace landing */
function OverviewContent() {
  const setInterface = useAppStore((s) => s.setInterface);
  const indColor = useIndustryColor();
  const cell = useMatrixCell();

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Morning Brief */}
      <div className="rounded-xl border border-border p-4 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${indColor}08 0%, ${indColor}03 100%)` }}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10" style={{ backgroundColor: indColor }} />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">☀️</span>
            <span className="text-sm font-bold">晨间聚焦</span>
            <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ backgroundColor: indColor + '20', color: indColor }}>AI生成</span>
          </div>
          <p className="text-sm leading-relaxed text-text-2">{cell.morning}</p>
        </div>
      </div>

      {/* KPIs */}
      <div>
        <div className="mb-2 text-xs font-bold text-text-3 uppercase tracking-wider">核心指标</div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {cell.kpis.map((kpi) => {
            const TrendIcon = TREND_ICON[kpi.trend];
            return (
              <div key={kpi.name} className="rounded-xl border border-border bg-surface p-3 transition-all hover:border-border-2 hover:shadow-lg hover:-translate-y-0.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-text-3">{kpi.name}</span>
                  <TrendIcon size={13} className={kpi.status === 'good' ? 'text-success' : kpi.status === 'warn' ? 'text-warn' : 'text-danger'} />
                </div>
                <div className={cn('text-xl font-extrabold', kpi.status === 'good' ? 'text-success' : kpi.status === 'warn' ? 'text-warn' : 'text-danger')}>
                  {kpi.value}
                </div>
                <div className="mt-1 text-[10px] text-text-3">目标 {kpi.target}</div>
                <div className="mt-2 h-1 rounded-full bg-surface-2 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{
                    width: kpi.status === 'good' ? '90%' : kpi.status === 'warn' ? '60%' : '30%',
                    backgroundColor: kpi.status === 'good' ? '#22c984' : kpi.status === 'warn' ? '#ffc44d' : '#ff5c6a',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button onClick={() => setInterface('collab')} className="group flex items-center justify-between rounded-xl border border-border bg-surface p-4 transition-all hover:border-primary/30 hover:shadow-lg">
          <div><div className="text-xs font-semibold text-text">团队协作台</div><div className="text-[10px] text-text-3 mt-0.5">{cell.channels.length} 个频道活跃</div></div>
          <ArrowRight size={16} className="text-text-3 transition-transform group-hover:translate-x-1 group-hover:text-primary-2" />
        </button>
        <button onClick={() => setInterface('ai')} className="group flex items-center justify-between rounded-xl border border-border bg-surface p-4 transition-all hover:border-primary/30 hover:shadow-lg">
          <div><div className="text-xs font-semibold text-text">个人AI台</div><div className="text-[10px] text-text-3 mt-0.5">{cell.agents.length} 个AI同事在线</div></div>
          <ArrowRight size={16} className="text-text-3 transition-transform group-hover:translate-x-1 group-hover:text-primary-2" />
        </button>
      </div>
    </div>
  );
}

/** Goals / OKR module */
function GoalsContent() {
  const cell = useMatrixCell();
  const goals = [
    { name: 'Q3 路线图定稿', progress: 75, status: 'on_track', keyResults: ['3个核心需求确认', '技术评审通过', '排期完成'] },
    { name: '导出功能优化', progress: 30, status: 'at_risk', keyResults: ['使用率提升至60%', '3种格式支持', '用户NPS≥40'] },
    { name: 'PRD标准化', progress: 90, status: 'on_track', keyResults: ['模板制定', '3个PRD评审', '团队采纳率80%'] },
  ];
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Target size={18} className="text-primary-2" />
        <span className="text-sm font-bold">目标 OKR</span>
        <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary-2">3 个进行中</span>
      </div>
      {goals.map((g) => (
        <div key={g.name} className="rounded-xl border border-border bg-surface p-4 transition-all hover:border-border-2 hover:shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-text">{g.name}</span>
            <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold', g.status === 'on_track' ? 'bg-success/10 text-success' : 'bg-warn/10 text-warn')}>
              {g.status === 'on_track' ? '正常' : '风险'}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-2 mb-3 overflow-hidden">
            <div className={cn('h-full rounded-full transition-all', g.status === 'on_track' ? 'bg-success' : 'bg-warn')} style={{ width: `${g.progress}%` }} />
          </div>
          <div className="space-y-1">
            {g.keyResults.map((kr, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-text-3">
                <CheckCircle2 size={12} className={i < Math.ceil(g.progress / 40) ? 'text-success' : 'text-border'} />
                <span>{kr}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
        <div className="flex items-center gap-2 text-xs text-primary-2">
          <Brain size={14} />
          <span className="font-semibold">AI 建议</span>
        </div>
        <p className="mt-1 text-[11px] text-text-2">"导出功能优化"进度仅30%，建议本周优先投入资源。</p>
      </div>
    </div>
  );
}

/** Tasks module */
function TasksContent() {
  const cell = useMatrixCell();
  const tasks = [
    { title: 'Q3路线图待确认需求评审', priority: 'urgent', assignee: '我', due: '明天', done: false },
    { title: '导出功能使用率分析报告', priority: 'high', assignee: 'AI同事', due: '周五', done: false },
    { title: 'PRD模板v2.0更新', priority: 'medium', assignee: '我', due: '下周', done: false },
    { title: 'NPS问卷设计', priority: 'medium', assignee: '团队', due: '下周三', done: true },
    { title: '竞品功能对比表', priority: 'low', assignee: 'AI同事', due: '下周五', done: true },
  ];
  const priorityStyle: Record<string, string> = { urgent: 'bg-danger/10 text-danger', high: 'bg-warn/10 text-warn', medium: 'bg-primary/10 text-primary-2', low: 'bg-surface-2 text-text-3' };
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 size={18} className="text-primary-2" />
        <span className="text-sm font-bold">任务中心</span>
        <span className="ml-auto text-[10px] text-text-3">5 项 · 2 完成 · 3 进行中</span>
      </div>
      {tasks.map((t) => (
        <div key={t.title} className={cn('flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-all hover:border-border-2', t.done && 'opacity-50')}>
          <div className={cn('h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center', t.done ? 'bg-success border-success' : 'border-border')}>
            {t.done && <CheckCircle2 size={12} className="text-white" />}
          </div>
          <span className={cn('flex-1 text-xs text-text', t.done && 'line-through')}>{t.title}</span>
          <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold', priorityStyle[t.priority])}>{t.priority === 'urgent' ? '紧急' : t.priority === 'high' ? '高' : t.priority === 'medium' ? '中' : '低'}</span>
          <span className="text-[10px] text-text-3 shrink-0">{t.due}</span>
        </div>
      ))}
    </div>
  );
}

/** Projects module */
function ProjectsContent() {
  const projects = [
    { name: '导出功能优化', status: 'active', progress: 30, members: 3, deadline: '7/15' },
    { name: 'PRD标准化', status: 'active', progress: 90, members: 2, deadline: '6/30' },
    { name: 'Q3路线图', status: 'review', progress: 75, members: 5, deadline: '6/20' },
  ];
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <FolderKanban size={18} className="text-primary-2" />
        <span className="text-sm font-bold">项目管理</span>
        <button className="ml-auto rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 transition-all hover:bg-primary/20">+ 新建项目</button>
      </div>
      {projects.map((p) => (
        <div key={p.name} className="rounded-xl border border-border bg-surface p-4 transition-all hover:border-border-2 hover:shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-text">{p.name}</span>
            <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold', p.status === 'active' ? 'bg-success/10 text-success' : 'bg-warn/10 text-warn')}>
              {p.status === 'active' ? '进行中' : '评审中'}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-2 mb-2 overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${p.progress}%` }} />
          </div>
          <div className="flex items-center justify-between text-[10px] text-text-3">
            <span>👥 {p.members} 人</span>
            <span>截止 {p.deadline}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Knowledge module */
function KnowledgeContent() {
  const docs = [
    { title: 'Q3产品路线图', type: '文档', updated: '2小时前', author: '我' },
    { title: '导出功能技术方案', type: '技术方案', updated: '1天前', author: 'AI同事' },
    { title: '竞品分析：飞书/Notion/ClickUp', type: '研究', updated: '3天前', author: 'AI同事' },
    { title: 'PRD模板v2.0', type: '模板', updated: '5天前', author: '我' },
  ];
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <BookOpen size={18} className="text-primary-2" />
        <span className="text-sm font-bold">知识库</span>
        <button className="ml-auto rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 transition-all hover:bg-primary/20">+ 新建</button>
      </div>
      <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 mb-3">
        <BarChart3 size={14} className="text-text-3" />
        <span className="text-xs text-text-3">搜索知识库...</span>
      </div>
      {docs.map((d) => (
        <div key={d.title} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-all hover:border-border-2 hover:shadow-lg cursor-pointer">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0"><BookOpen size={14} className="text-primary-2" /></div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-text truncate">{d.title}</div>
            <div className="text-[10px] text-text-3">{d.type} · {d.author} · {d.updated}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

const WORKSPACE_MODULES: Record<string, React.FC> = {
  overview: OverviewContent,
  goals: GoalsContent,
  tasks: TasksContent,
  projects: ProjectsContent,
  knowledge: KnowledgeContent,
  schedule: ScheduleContent,
  notifications: NotificationsContent,
  insight: InsightContent,
  reports: ReportsContent,
  prediction: PredictionContent,
  docs: DocsContent,
  experience: ExperienceContent,
  members: MembersContent,
  roles: RolesContent,
  org: OrgContent,
  admin: AdminContent,
};

export default function Workspace() {
  const activeModule = useAppStore((s) => s.activeModule);
  const Content = WORKSPACE_MODULES[activeModule];
  if (Content) return <Content />;
  return <ModulePageStub title={activeModule} icon='🚧' description='此模块正在开发中' />;
}
