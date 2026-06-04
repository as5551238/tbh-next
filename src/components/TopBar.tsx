import { useAppStore } from '@/stores/appStore';
import { useIndustryColor, useMatrixCell } from '@/hooks/useMatrix';
import { useDepartments, useIndustries } from '@/hooks/useMatrix';
import { cn } from '@/lib/utils';
import { Search, Bell, Settings, ChevronRight } from 'lucide-react';

const IFACE_LABELS: Record<string, string> = {
  workspace: '模块工作台',
  collab: '团队协作台',
  ai: '个人AI台',
};

const MODULE_LABELS: Record<string, string> = {
  overview: '工作台首页', schedule: '日程', notifications: '通知',
  goals: '目标 OKR', projects: '项目管理', tasks: '任务中心',
  insight: '数据洞察', reports: '报表中心', prediction: '预测引擎',
  knowledge: '知识库', docs: '文档协作', experience: '经验库',
  members: '成员管理', roles: '角色权限', org: '组织设置', admin: '系统配置',
  channels: '频道列表', teamCal: '团队日历', approvals: '审批中心',
  announcements: '公告板', collabDocs: '协作文档', meetings: '会议',
  files: '文件共享', directory: '通讯录', aiAgents: 'AI同事',
  main: '工作助手', morning: '晨间聚焦', risk: '风险预警',
  agentList: 'Agent列表', agentConfig: 'Agent配置',
  industryView: '行业视图', workflows: '工作流模板', kpiDash: 'KPI仪表盘',
};

export default function TopBar() {
  const iface = useAppStore((s) => s.interface);
  const activeModule = useAppStore((s) => s.activeModule);
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);
  const toggleCtxPanel = useAppStore((s) => s.toggleCtxPanel);

  const indColor = useIndustryColor();
  const cell = useMatrixCell();

  return (
    <div className="flex h-12 shrink-0 items-center border-b border-border bg-surface px-3 gap-3">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs min-w-0">
        <span className="font-semibold text-primary-2">{IFACE_LABELS[iface] ?? iface}</span>
        <ChevronRight size={12} className="text-text-3 shrink-0" />
        <span className="text-text-3 truncate">{MODULE_LABELS[activeModule] ?? activeModule}</span>
      </div>

      {/* Context Pill */}
      <button
        onClick={toggleCtxPanel}
        className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium transition-all hover:border-primary/50 hover:bg-primary/5 ml-2 shrink-0"
      >
        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: indColor }} />
        <span className="text-text-2">{industry}</span>
        <span className="text-text-3">·</span>
        <span className="text-text">{dept}</span>
      </button>

      {/* Ribbon */}
      <div className="hidden lg:block text-[10px] text-text-3 truncate flex-1 min-w-0">
        {cell.ribbon}
      </div>

      <div className="flex-1" />

      {/* Search */}
      <div className="flex items-center gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs text-text-3 w-44">
        <Search size={13} />
        <span>搜索...</span>
      </div>

      {/* Notifications */}
      <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-text-3 transition-colors hover:bg-surface-2 hover:text-text">
        <Bell size={16} />
        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white">
          3
        </span>
      </button>

      {/* Settings */}
      <button className="flex h-8 w-8 items-center justify-center rounded-lg text-text-3 transition-colors hover:bg-surface-2 hover:text-text">
        <Settings size={16} />
      </button>
    </div>
  );
}
