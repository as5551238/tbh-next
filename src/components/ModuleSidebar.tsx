import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import { useDepartments } from '@/hooks/useMatrix';
import { cn } from '@/lib/utils';

interface ModuleItem {
  icon: string;
  name: string;
  id: string;
  badge?: string;
  ai?: boolean;
}

interface ModuleGroup {
  group: string;
  items: ModuleItem[];
}

function getModules(iface: string, industry: string, dept: string, deviationAlertCount: number): ModuleGroup[] {
  if (iface === 'workspace') {
    return [
      { group: '我的', items: [
        { icon: '🏠', name: '工作台首页', id: 'overview' },
        { icon: '📅', name: '日程', id: 'schedule' },
        { icon: '🔔', name: '通知', id: 'notifications', badge: '3' },
      ]},
      { group: '核心业务', items: [
        { icon: '🎯', name: '目标 OKR', id: 'goals' },
        { icon: '📁', name: '项目管理', id: 'projects', badge: '2' },
        { icon: '✅', name: '任务中心', id: 'tasks', badge: '5' },
        { icon: '🔗', name: '穿透视图', id: 'alignment' },
      ]},
      { group: 'MLOO闭环', items: [
        { icon: '🔄', name: '隐性复盘', id: 'review', ai: true, badge: deviationAlertCount > 0 ? String(deviationAlertCount) : undefined },
      ]},
      { group: '智能分析', items: [
        { icon: '💡', name: '数据洞察', id: 'insight', ai: true },
        { icon: '📊', name: '报表中心', id: 'reports' },
        { icon: '🔮', name: '预测引擎', id: 'prediction', ai: true },
      ]},
      { group: '知识沉淀', items: [
        { icon: '📚', name: '知识库', id: 'knowledge' },
        { icon: '📝', name: '文档协作', id: 'docs' },
        { icon: '🏷️', name: '经验库', id: 'experience', ai: true },
      ]},
      { group: '管理', items: [
        { icon: '👥', name: '成员管理', id: 'members' },
        { icon: '🔐', name: '角色权限', id: 'roles' },
        { icon: '🏢', name: '组织设置', id: 'org' },
        { icon: '⚙️', name: '系统配置', id: 'admin' },
      ]},
    ];
  }
  if (iface === 'collab') {
    return [
      { group: `${industry} · ${dept}`, items: [
        { icon: '#', name: '频道列表', id: 'channels' },
        { icon: '📅', name: '团队日历', id: 'teamCal' },
        { icon: '📋', name: '审批中心', id: 'approvals', badge: '2' },
        { icon: '📣', name: '公告板', id: 'announcements', badge: '1' },
      ]},
      { group: '协作', items: [
        { icon: '📄', name: '协作文档', id: 'collabDocs' },
        { icon: '🎥', name: '会议', id: 'meetings' },
        { icon: '📎', name: '文件共享', id: 'files' },
      ]},
      { group: '管理', items: [
        { icon: '👤', name: '通讯录', id: 'directory' },
        { icon: '🤖', name: 'AI同事', id: 'aiAgents', ai: true },
      ]},
    ];
  }
  // AI
  return [
    { group: 'AI对话', items: [
      { icon: '🧠', name: '工作助手', id: 'main' },
      { icon: '☀️', name: '晨间聚焦', id: 'morning', ai: true },
      { icon: '⚠️', name: '风险预警', id: 'risk', badge: '2', ai: true },
    ]},
    { group: 'AI同事', items: [
      { icon: '🤖', name: 'Agent列表', id: 'agentList', ai: true },
      { icon: '🔧', name: 'Agent配置', id: 'agentConfig' },
    ]},
    { group: '行业视角', items: [
      { icon: '🏭', name: '行业视图', id: 'industryView', ai: true },
      { icon: '📐', name: '工作流模板', id: 'workflows' },
      { icon: '📈', name: 'KPI仪表盘', id: 'kpiDash' },
    ]},
  ];
}

const BADGE_STYLES: Record<string, string> = {
  '3': 'bg-danger/10 text-danger',
  '5': 'bg-danger/10 text-danger',
  '2': 'bg-warn/10 text-warn',
  '1': 'bg-primary/10 text-primary-2',
};

function getBadgeStyle(badge: string): string {
  const n = Number(badge);
  if (!Number.isNaN(n) && n >= 3) return 'bg-danger/10 text-danger';
  if (!Number.isNaN(n) && n >= 2) return 'bg-warn/10 text-warn';
  if (!Number.isNaN(n) && n >= 1) return 'bg-primary/10 text-primary-2';
  return BADGE_STYLES[badge] ?? 'bg-primary/10 text-primary-2';
}

export default function ModuleSidebar() {
  const iface = useAppStore((s) => s.interface);
  const activeModule = useAppStore((s) => s.activeModule);
  const setActiveModule = useAppStore((s) => s.setActiveModule);
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);
  const deviationAlertCount = useAppStore((s) => s.deviationAlertCount);
  const modSidebarOpen = useAppStore((s) => s.modSidebarOpen);
  const toggleModSidebar = useAppStore((s) => s.toggleModSidebar);
  const navigate = useNavigate();

  const groups = getModules(iface, industry, dept, deviationAlertCount);
  const title = { workspace: '模块', collab: '协作', ai: 'AI' }[iface];

  function handleModuleClick(id: string) {
    setActiveModule(id);
    navigate(`/${iface}/${id}`);
  }

  if (!modSidebarOpen) {
    return (
      <div className="flex w-10 flex-col items-center border-r border-border bg-surface py-2 shrink-0 gap-1">
        <button onClick={toggleModSidebar} className="flex h-7 w-7 items-center justify-center rounded-lg text-text-3 hover:bg-surface-2 hover:text-text transition-colors text-xs">
          ▶
        </button>
        {groups.flatMap((g) => g.items).slice(0, 8).map((item) => (
          <button
            key={item.id}
            onClick={() => handleModuleClick(item.id)}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-lg text-xs transition-colors',
              activeModule === item.id ? 'bg-primary/10 text-primary-2' : 'text-text-3 hover:bg-surface-2'
            )}
            title={item.name}
          >
            {item.icon}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex w-[220px] flex-col border-r border-border bg-surface shrink-0 overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
        <span className="text-xs font-bold">{title}</span>
        <button onClick={toggleModSidebar} className="flex h-6 w-6 items-center justify-center rounded text-text-3 hover:bg-surface-2 hover:text-text transition-colors text-xs">
          ◀
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-1.5">
        {groups.map((g) => (
          <div key={g.group}>
            <div className="px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-text-3">
              {g.group}
            </div>
            {g.items.map((item) => (
              <button
                key={item.id}
                onClick={() => handleModuleClick(item.id)}
                className={cn(
                  'flex w-full items-center gap-2 px-3.5 py-1.5 text-xs transition-colors',
                  activeModule === item.id
                    ? 'bg-primary/10 font-semibold text-primary-2'
                    : 'text-text-2 hover:bg-surface-2 hover:text-text'
                )}
              >
                <span className="w-[18px] text-center text-sm">{item.icon}</span>
                <span>{item.name}</span>
                {item.ai && (
                  <span className="ml-1 rounded bg-accent/10 px-1 py-[1px] text-[7px] font-bold uppercase tracking-wider text-accent">
                    AI
                  </span>
                )}
                {item.badge && (
                  <span className={cn('ml-auto rounded px-1.5 py-[1px] text-[9px] font-semibold', getBadgeStyle(item.badge))}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
