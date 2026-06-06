import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import { useTasks, useGoals } from '@/hooks/useMatrix';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface QuickTask {
  id: string;
  title: string;
  priority: string;
  status: string;
  due_date: string;
}

interface GoalSummary {
  id: string;
  title: string;
  progress: number;
  status: string;
}

/* ------------------------------------------------------------------ */
/*  Mock fallback data                                                 */
/* ------------------------------------------------------------------ */
const MOCK_TASKS: QuickTask[] = [
  { id: '1', title: '完成Q2 OKR回顾报告', priority: 'high', status: 'todo', due_date: '今天' },
  { id: '2', title: '审核产品需求文档', priority: 'medium', status: 'todo', due_date: '今天' },
  { id: '3', title: '团队周会准备', priority: 'medium', status: 'todo', due_date: '明天' },
  { id: '4', title: '更新项目进度看板', priority: 'low', status: 'done', due_date: '今天' },
  { id: '5', title: '提交技术方案评审', priority: 'high', status: 'todo', due_date: '今天' },
];

const MOCK_GOALS: GoalSummary[] = [
  { id: '1', title: '提升产品用户体验评分至4.5+', progress: 72, status: 'on_track' },
  { id: '2', title: '完成AI助手2.0上线', progress: 45, status: 'at_risk' },
  { id: '3', title: '团队效能提升30%', progress: 88, status: 'ahead' },
];

const MOCK_INSIGHTS = [
  'Q2目标"AI助手2.0"进度滞后，建议本周聚焦核心功能交付',
  '团队本周任务完成率82%，较上周提升5%',
  '新增3个紧急任务需要分配，建议优先处理',
];

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-[#ef4444]/20 text-[#ef4444]',
  medium: 'bg-[#f5a623]/20 text-[#f5a623]',
  low: 'bg-[#00d4aa]/20 text-[#00d4aa]',
};

const PRIORITY_LABELS: Record<string, string> = {
  high: '紧急',
  medium: '中等',
  low: '低',
};

const STATUS_STYLES: Record<string, string> = {
  on_track: 'text-[#00d4aa]',
  at_risk: 'text-[#f5a623]',
  ahead: 'text-[#7b6cf0]',
  off_track: 'text-[#ef4444]',
};

const STATUS_LABELS: Record<string, string> = {
  on_track: '正常',
  at_risk: '有风险',
  ahead: '超前',
  off_track: '滞后',
};

/* ------------------------------------------------------------------ */
/*  Current time greeting                                              */
/* ------------------------------------------------------------------ */
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 9) return '早上好';
  if (h < 12) return '上午好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

function getProgressColor(progress: number): string {
  if (progress >= 80) return '#00d4aa';
  if (progress >= 50) return '#f5a623';
  return '#ef4444';
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function MyToday() {
  const navigate = useNavigate();
  const setInterface = useAppStore((s) => s.setInterface);
  const setActiveModule = useAppStore((s) => s.setActiveModule);
  const { tasks: dbTasks } = useTasks();
  const { goals: dbGoals } = useGoals();

  const [now, setNow] = useState(new Date());

  // Map DB data to local types, with fallback to defaults when loading
  const tasks: QuickTask[] = useMemo(() => dbTasks.length > 0 ? dbTasks.map((t) => ({
    id: t.id, title: t.title, priority: t.priority ?? 'medium', status: t.status, due_date: t.due_date ?? '',
  })) : MOCK_TASKS, [dbTasks]);

  const goals: GoalSummary[] = useMemo(() => dbGoals.length > 0 ? dbGoals.map((g) => ({
    id: g.id, title: g.title, progress: g.progress ?? 0, status: g.status,
  })) : MOCK_GOALS, [dbGoals]);

  // Derive insights from actual data
  const insights = useMemo(() => {
    const items: string[] = [];
    const atRiskGoals = goals.filter((g) => g.status === 'at_risk' || g.status === 'off_track');
    if (atRiskGoals.length > 0) items.push(`目标"${atRiskGoals[0].title}"进度滞后，建议本周聚焦推进`);
    const pendingHigh = tasks.filter((t) => t.priority === 'high' && t.status !== 'done');
    if (pendingHigh.length > 0) items.push(`有 ${pendingHigh.length} 个紧急任务待处理，建议优先安排`);
    const doneRate = tasks.length > 0 ? Math.round((tasks.filter((t) => t.status === 'done').length / tasks.length) * 100) : 0;
    items.push(`当前任务完成率 ${doneRate}%，持续保持专注`);
    return items.length > 0 ? items : MOCK_INSIGHTS;
  }, [tasks, goals]);

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const pendingTasks = tasks.filter((t) => t.status !== 'done');
  const completedTasks = tasks.filter((t) => t.status === 'done');
  const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  function goToModule(iface: string, mod: string) {
    setInterface(iface);
    setActiveModule(mod);
    navigate(`/${iface}/${mod}`);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#eaecf4]">
            {getGreeting()} 👋
          </h1>
          <p className="text-[#9ca3b8] mt-1">
            {now.toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
            &nbsp;&middot;&nbsp;
            {now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-[#7b6cf0]">{pendingTasks.length}</div>
          <div className="text-xs text-[#9ca3b8]">待办任务</div>
        </div>
      </div>

      {/* Quick stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => goToModule('workspace', 'tasks')}
          className="bg-[#13161f] border border-[#2a2d3a] rounded-xl p-4 text-left hover:border-[#7b6cf0] transition-colors"
        >
          <div className="text-2xl font-bold text-[#7b6cf0]">{pendingTasks.length}</div>
          <div className="text-xs text-[#9ca3b8] mt-1">今日待办</div>
        </button>

        <button
          onClick={() => goToModule('workspace', 'goals')}
          className="bg-[#13161f] border border-[#2a2d3a] rounded-xl p-4 text-left hover:border-[#00d4aa] transition-colors"
        >
          <div className="text-2xl font-bold text-[#00d4aa]">{completionRate}%</div>
          <div className="text-xs text-[#9ca3b8] mt-1">完成率</div>
        </button>

        <button
          onClick={() => goToModule('workspace', 'goals')}
          className="bg-[#13161f] border border-[#2a2d3a] rounded-xl p-4 text-left hover:border-[#f5a623] transition-colors"
        >
          <div className="text-2xl font-bold text-[#f5a623]">
            {goals.filter((g) => g.status === 'at_risk' || g.status === 'off_track').length}
          </div>
          <div className="text-xs text-[#9ca3b8] mt-1">风险目标</div>
        </button>

        <button
          onClick={() => goToModule('ai', 'main')}
          className="bg-[#13161f] border border-[#2a2d3a] rounded-xl p-4 text-left hover:border-[#7b6cf0] transition-colors"
        >
          <div className="text-2xl font-bold">🧠</div>
          <div className="text-xs text-[#9ca3b8] mt-1">AI助手</div>
        </button>
      </div>

      {/* Main content grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Tasks section */}
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#eaecf4]">今日任务</h2>
            <button
              onClick={() => goToModule('workspace', 'tasks')}
              className="text-sm text-[#7b6cf0] hover:underline"
            >
              查看全部 →
            </button>
          </div>

          <div className="space-y-2">
            {pendingTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => goToModule('workspace', 'tasks')}
                className="w-full flex items-center gap-3 bg-[#13161f] border border-[#2a2d3a] rounded-lg p-3 text-left hover:border-[#7b6cf0]/50 transition-colors"
              >
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    task.priority === 'high'
                      ? 'bg-[#ef4444]'
                      : task.priority === 'medium'
                      ? 'bg-[#f5a623]'
                      : 'bg-[#00d4aa]'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[#eaecf4] truncate">{task.title}</div>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_STYLES[task.priority]}`}
                >
                  {PRIORITY_LABELS[task.priority]}
                </span>
                {task.due_date && (
                  <span className="text-xs text-[#9ca3b8] shrink-0">{task.due_date}</span>
                )}
              </button>
            ))}

            {completedTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 bg-[#0d0f16] rounded-lg p-3 opacity-60"
              >
                <div className="w-2 h-2 rounded-full bg-[#00d4aa] shrink-0" />
                <span className="text-sm text-[#9ca3b8] line-through flex-1 truncate">
                  {task.title}
                </span>
                <span className="text-xs text-[#00d4aa]">✓</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar: Goals + AI Insights */}
        <div className="space-y-6">
          {/* Goals */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-[#eaecf4]">目标进度</h2>
              <button
                onClick={() => goToModule('workspace', 'goals')}
                className="text-sm text-[#7b6cf0] hover:underline"
              >
                全部 →
              </button>
            </div>

            <div className="space-y-3">
              {goals.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => goToModule('workspace', 'goals')}
                  className="w-full bg-[#13161f] border border-[#2a2d3a] rounded-lg p-3 text-left hover:border-[#7b6cf0]/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#eaecf4] truncate flex-1">{goal.title}</span>
                    <span className={`text-xs ml-2 ${STATUS_STYLES[goal.status]}`}>
                      {STATUS_LABELS[goal.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-[#1e2030] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${goal.progress}%`,
                          backgroundColor: getProgressColor(goal.progress),
                        }}
                      />
                    </div>
                    <span className="text-xs text-[#9ca3b8] w-8 text-right">{goal.progress}%</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-[#eaecf4]">今日提示</h2>
              <button
                onClick={() => goToModule('ai', 'morning')}
                className="text-sm text-[#7b6cf0] hover:underline"
              >
                早安简报 →
              </button>
            </div>

            <div className="space-y-2">
              {insights.map((insight, i) => (
                <div
                  key={i}
                  className="bg-[#13161f] border border-[#2a2d3a] rounded-lg p-3"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-[#7b6cf0] text-sm mt-0.5">💡</span>
                    <p className="text-sm text-[#9ca3b8] leading-relaxed">{insight}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
