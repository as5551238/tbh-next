import { useState } from 'react';
import { useAppStore, ADMIN_ONLY_MODULES } from '@/stores/appStore';
import { useDepartments } from '@/hooks/useMatrix';
import { canAccess } from '@/lib/permissions';
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
  collapsed?: boolean; // if true, items are hidden behind "更多" toggle
}

/** Primary module IDs shown as first-level entries per interface.
 *  All other modules are accessible via "更多模块" expandable section. */
const PRIMARY_MODULES: Record<string, Set<string>> = {
  workspace: new Set([
    'overview', 'goals', 'tasks', 'projects', 'schedule',
    'insight', 'review', 'knowledge', 'members', 'admin',
  ]),
  // simple view keeps its own set (already compact)
  simple: new Set(['mywork', 'schedule', 'notifications', 'goals', 'tasks', 'actionItems', 'knowledge', 'docs', 'notes']),
  collab: new Set(['channels', 'teamCal', 'approvals']),
  ai: new Set(['main', 'morning', 'risk', 'agentList']),
};

function getModules(iface: string, industry: string, dept: string, deviationAlertCount: number, viewMode: 'cockpit' | 'simple'): ModuleGroup[] {
  if (iface === 'workspace') {
    const allGroups: ModuleGroup[] = [
      { group: '我的', items: [
        { icon: '🏠', name: '工作台首页', id: 'overview' },
        { icon: '📡', name: '全景指挥', id: 'commandCenter' },
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
        { icon: '⚡', name: '行动项', id: 'actionItems' },
        { icon: '🔄', name: '隐性复盘', id: 'review', ai: true, badge: deviationAlertCount > 0 ? String(deviationAlertCount) : undefined },
        { icon: '🏃', name: 'Sprint', id: 'sprints' },
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
        { icon: '📋', name: '模板库', id: 'templates' },
        { icon: '🗒️', name: '便签', id: 'notes' },
      ]},
      { group: '动态与收藏', items: [
        { icon: '📡', name: '动态流', id: 'activities' },
        { icon: '🔖', name: '收藏夹', id: 'bookmarks' },
      ]},
      { group: '管理', items: [
        { icon: '👥', name: '成员管理', id: 'members' },
        { icon: '🔐', name: '角色权限', id: 'roles' },
        { icon: '🏢', name: '组织设置', id: 'org' },
        { icon: '⚙️', name: '系统配置', id: 'admin' },
      ]},
      { group: '配置中心', items: [
        { icon: '🏷️', name: '标签管理', id: 'tags' },
        { icon: '📂', name: '分类管理', id: 'categories' },
        { icon: '🔀', name: '状态流转', id: 'statusFlow' },
      ]},
    ];

    // Simple view: dedicated simple layout (unchanged — already compact)
    if (viewMode === 'simple') {
      return [
        { group: '我的', items: [
          { icon: '🏠', name: '我的工作', id: 'mywork' },
          { icon: '📅', name: '日程', id: 'schedule' },
          { icon: '🔔', name: '通知', id: 'notifications', badge: '3' },
        ]},
        { group: '核心业务', items: [
          { icon: '🎯', name: '目标 OKR', id: 'goals' },
          { icon: '✅', name: '任务中心', id: 'tasks', badge: '5' },
          { icon: '⚡', name: '行动项', id: 'actionItems' },
        ]},
        { group: '知识', items: [
          { icon: '📚', name: '知识库', id: 'knowledge' },
          { icon: '📝', name: '文档协作', id: 'docs' },
          { icon: '🗒️', name: '便签', id: 'notes' },
        ]},
      ];
    }

    // Cockpit view: split into primary (shown) and secondary (collapsed behind "更多")
    const primarySet = PRIMARY_MODULES.workspace;
    const primaryItems: ModuleItem[] = [];
    const secondaryItems: ModuleItem[] = [];
    for (const g of allGroups) {
      for (const item of g.items) {
        (primarySet.has(item.id) ? primaryItems : secondaryItems).push(item);
      }
    }
    return [
      { group: '核心', items: primaryItems },
      { group: '更多模块', items: secondaryItems, collapsed: true },
    ];
  }
  if (iface === 'collab') {
    const allGroups: ModuleGroup[] = [
      { group: `${industry} · ${dept}`, items: [
        { icon: '#', name: '频道列表', id: 'channels' },
        { icon: '📅', name: '团队日历', id: 'teamCal' },
        { icon: '📋', name: '审批中心', id: 'approvals', badge: '2' },
        { icon: '📣', name: '公告板', id: 'announcements', badge: '1' },
      ]},
      { group: '协作', items: [
        { icon: '📄', name: '协作文档', id: 'collabDocs' },
        { icon: '🎥', name: '会议', id: 'meetings' },
      ]},
      { group: '管理', items: [
        { icon: '👤', name: '通讯录', id: 'directory' },
        { icon: '🤖', name: 'AI同事', id: 'aiAgents', ai: true },
      ]},
    ];
    const primarySet = PRIMARY_MODULES.collab;
    const primaryItems: ModuleItem[] = [];
    const secondaryItems: ModuleItem[] = [];
    for (const g of allGroups) {
      for (const item of g.items) {
        (primarySet.has(item.id) ? primaryItems : secondaryItems).push(item);
      }
    }
    return [
      { group: '核心', items: primaryItems },
      { group: '更多模块', items: secondaryItems, collapsed: true },
    ];
  }
  // AI
  const allAiGroups: ModuleGroup[] = [
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
      { icon: '📚', name: '行业知识库', id: 'knowledgeOSP', ai: true },
    ]},
    { group: '设置', items: [
      { icon: '👑', name: '订阅管理', id: 'subscription' },
      { icon: '🔌', name: 'MCP & A2A', id: 'mcpA2a', ai: true },
      { icon: '📊', name: '行为追踪', id: 'behaviorTracker' },
      { icon: '🏆', name: 'DSTE赛季', id: 'dste' },
      { icon: '🧙', name: '模板向导', id: 'templateWizard' },
      { icon: '🛡️', name: '用量预警', id: 'usageAlerts' },
      { icon: '📊', name: '系统监控', id: 'systemMonitor' },
    ]},
  ];
  const primarySet = PRIMARY_MODULES.ai;
  const aiPrimaryItems: ModuleItem[] = [];
  const aiSecondaryItems: ModuleItem[] = [];
  for (const g of allAiGroups) {
    for (const item of g.items) {
      (primarySet.has(item.id) ? aiPrimaryItems : aiSecondaryItems).push(item);
    }
  }
  return [
    { group: '核心', items: aiPrimaryItems },
    { group: '更多模块', items: aiSecondaryItems, collapsed: true },
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
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);
  const deviationAlertCount = useAppStore((s) => s.deviationAlertCount);
  const viewMode = useAppStore((s) => s.viewMode);
  const modSidebarOpen = useAppStore((s) => s.modSidebarOpen);
  const toggleModSidebar = useAppStore((s) => s.toggleModSidebar);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const [moreExpanded, setMoreExpanded] = useState(false);

  const groups = getModules(iface, industry, dept, deviationAlertCount, viewMode);
  const title = { workspace: '模块', collab: '协作', ai: 'AI' }[iface];

  function handleModuleClick(id: string) {
    // Navigation guard: block admin modules in simple viewMode
    if (viewMode === 'simple' && ADMIN_ONLY_MODULES.has(id)) {
      return; // Silently ignore — the module isn't in the simple sidebar, but guard against direct URL
    }
    navigateTo(iface, id);
  }

  /** Flatten visible items: primary groups + expanded "更多" items */
  const visibleItems = groups.flatMap((g) =>
    g.collapsed && !moreExpanded ? [] : g.items
  );

  if (!modSidebarOpen) {
    return (
      <div className="flex w-10 flex-col items-center border-r border-border bg-surface py-2 shrink-0 gap-1">
        <button onClick={toggleModSidebar} aria-label="展开侧边栏" className="flex h-7 w-7 items-center justify-center rounded-lg text-text-3 hover:bg-surface-2 hover:text-text transition-colors text-xs">
          ▶
        </button>
        {visibleItems.slice(0, 8).map((item) => (
          <button
            key={item.id}
            onClick={() => handleModuleClick(item.id)}
            aria-label={item.name}
            aria-current={activeModule === item.id ? 'page' : undefined}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-lg text-xs transition-colors',
              activeModule === item.id ? 'bg-primary/10 text-primary-2' : 'text-text-3 hover:bg-surface-2'
            )}
            title={item.name}
          >
            {item.icon}
          </button>
        ))}
        {!moreExpanded && groups.some((g) => g.collapsed) && (
          <button
            onClick={() => setMoreExpanded(true)}
            aria-label="显示更多模块"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[9px] text-text-3 hover:bg-surface-2 hover:text-text transition-colors"
            title="更多模块"
          >
            ···
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex w-[220px] flex-col border-r border-border bg-surface shrink-0 overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
        <span className="text-xs font-bold">{title}</span>
        <button onClick={toggleModSidebar} aria-label="收起侧边栏" className="flex h-6 w-6 items-center justify-center rounded text-text-3 hover:bg-surface-2 hover:text-text transition-colors text-xs">
          ◀
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-1.5">
        {groups.map((g) => {
          if (g.collapsed && !moreExpanded) {
            // Render collapsed "更多模块" toggle button
            return (
              <div key={g.group} className="px-3.5 py-2">
                <button
                  onClick={() => setMoreExpanded(true)}
                  className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border px-3 py-1.5 text-[10px] text-text-3 hover:bg-surface-2 hover:text-text transition-colors"
                >
                  <span>{g.group}</span>
                  <span className="text-[8px]">({g.items.length})</span>
                  <span>▸</span>
                </button>
              </div>
            );
          }
          if (g.collapsed && moreExpanded) {
            // Render expanded "更多模块" section with collapse toggle
            return (
              <div key={g.group}>
                <div className="flex items-center justify-between px-3.5 py-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-text-3">
                    {g.group}
                  </span>
                  <button
                    onClick={() => setMoreExpanded(false)}
                    className="flex h-4 items-center gap-0.5 text-[8px] text-text-3 hover:text-text transition-colors"
                  >
                    <span>收起</span>
                    <span>▾</span>
                  </button>
                </div>
                {g.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleModuleClick(item.id)}
                    aria-current={activeModule === item.id ? 'page' : undefined}
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
            );
          }
          // Regular (non-collapsed) group
          return (
            <div key={g.group}>
              <div className="px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-text-3">
                {g.group}
              </div>
              {g.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleModuleClick(item.id)}
                  aria-current={activeModule === item.id ? 'page' : undefined}
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
          );
        })}
      </div>
    </div>
  );
}
