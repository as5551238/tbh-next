import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore, getInterfaceForModule } from '@/stores/appStore';
import { useIndustryColor, useMatrixCell } from '@/hooks/useMatrix';
import { cn } from '@/lib/utils';
import { Search, Bell, Settings, ChevronRight, X, Menu, User } from 'lucide-react';
import { useNotifications } from '@/hooks/useMatrix';
import { clearAuth } from '@/lib/auth';
import RealtimeIndicator from '@/components/RealtimeIndicator';

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
  tags: '标签管理', categories: '分类管理', featureFlags: '功能开关',
  savedViews: '保存视图', automation: '自动化规则', statusFlow: '状态流转',
};

export default function TopBar() {
  const iface = useAppStore((s) => s.interface);
  const activeModule = useAppStore((s) => s.activeModule);
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);
  const toggleCtxPanel = useAppStore((s) => s.toggleCtxPanel);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const setMobileDrawerOpen = useAppStore((s) => s.setMobileDrawerOpen);
  const navigate = useNavigate();

  const indColor = useIndustryColor();
  const { cell } = useMatrixCell();
  const { notifications } = useNotifications();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    function handleClick() { setMobileMenuOpen(false); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [mobileMenuOpen]);

  const handleSearch = (query: string) => {
    if (!query.trim()) return;
    const q = query.trim().toLowerCase();
    const match = Object.entries(MODULE_LABELS).find(([key, label]) => key.toLowerCase().includes(q) || label.toLowerCase().includes(q));
    if (match) {
      const [modKey] = match;
      const targetIface = getInterfaceForModule(modKey);
      navigate(navigateTo(targetIface, modKey));
    }
    setSearchQuery('');
    setSearchOpen(false);
  };

  function handleLogout() {
    clearAuth();
    navigate('/login', { replace: true });
    setMobileMenuOpen(false);
  }

  return (
    <div className="flex h-12 shrink-0 items-center border-b border-border bg-surface px-2 md:px-3 gap-1.5 md:gap-3">

      {/* Hamburger — mobile only */}
      <button
        onClick={() => setMobileDrawerOpen(true)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-3 transition-colors hover:bg-surface-2 hover:text-text md:hidden"
      >
        <Menu size={18} />
      </button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs min-w-0">
        <span className="font-semibold text-primary-2 hidden sm:inline">{IFACE_LABELS[iface] ?? iface}</span>
        <span className="font-semibold text-primary-2 sm:hidden">{(IFACE_LABELS[iface] ?? iface).slice(0, 2)}</span>
        <ChevronRight size={12} className="text-text-3 shrink-0" />
        <span className="text-text-3 truncate max-w-[100px] md:max-w-none">{MODULE_LABELS[activeModule] ?? activeModule}</span>
      </div>

      {/* Realtime status indicator */}
      <RealtimeIndicator />

      {/* Context Pill — full on md+, dot-only on mobile */}
      <button
        onClick={toggleCtxPanel}
        className="hidden md:flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium transition-all hover:border-primary/50 hover:bg-primary/5 ml-2 shrink-0"
      >
        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: indColor }} />
        <span className="text-text-2">{industry}</span>
        <span className="text-text-3">·</span>
        <span className="text-text">{dept}</span>
      </button>
      <button
        onClick={toggleCtxPanel}
        className="flex md:hidden items-center justify-center h-7 w-7 rounded-full border border-border transition-all hover:border-primary/50 shrink-0"
      >
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: indColor }} />
      </button>

      {/* Ribbon */}
      <div className="hidden lg:block text-[10px] text-text-3 truncate flex-1 min-w-0">
        {cell.ribbon}
      </div>

      <div className="flex-1" />

      {/* Search — icon-only on mobile, expanded on md+ */}
      {searchOpen ? (
        <div className="flex items-center gap-1.5 rounded-lg bg-surface-2 px-2 py-1.5 w-44 md:w-48">
          <Search size={13} className="text-text-3 shrink-0" />
          <input ref={searchRef} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(searchQuery); if (e.key === 'Escape') setSearchOpen(false); }} placeholder="搜索模块..." className="bg-transparent text-xs text-text outline-none flex-1 min-w-0" />
          <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }} className="text-text-3 hover:text-text shrink-0"><X size={12} /></button>
        </div>
      ) : (
        <>
          <button onClick={() => setSearchOpen(true)} className="flex md:hidden items-center justify-center h-8 w-8 rounded-lg bg-surface-2 text-text-3 hover:bg-surface-2/80 transition-colors shrink-0">
            <Search size={14} />
          </button>
          <button onClick={() => setSearchOpen(true)} className="hidden md:flex items-center gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs text-text-3 w-44 hover:bg-surface-2/80 transition-colors shrink-0">
            <Search size={13} />
            <span>搜索...</span>
          </button>
        </>
      )}

      {/* Notifications */}
      <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-text-3 transition-colors hover:bg-surface-2 hover:text-text shrink-0" onClick={() => { navigate(navigateTo('workspace', 'notifications')); }}>
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Settings — hidden on mobile, accessible via mobile user menu */}
      <button className="hidden md:flex h-8 w-8 items-center justify-center rounded-lg text-text-3 transition-colors hover:bg-surface-2 hover:text-text shrink-0" onClick={() => { navigate(navigateTo('workspace', 'org')); }}>
        <Settings size={16} />
      </button>

      {/* User menu toggle — mobile only */}
      <div className="relative md:hidden">
        <button
          onClick={(e) => { e.stopPropagation(); setMobileMenuOpen((v) => !v); }}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-3 transition-colors hover:bg-surface-2 hover:text-text shrink-0"
        >
          <User size={16} />
        </button>
        {mobileMenuOpen && (
          <div className="absolute right-0 top-10 z-50 w-40 rounded-xl border border-border bg-surface-3 shadow-xl overflow-hidden">
            <button onClick={() => { navigate(navigateTo('workspace', 'org')); setMobileMenuOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-text-2 hover:bg-surface-2 transition-colors">
              <Settings size={14} />
              <span>偏好设置</span>
            </button>
            <div className="border-t border-border" />
            <button onClick={handleLogout} className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-danger hover:bg-danger/5 transition-colors">
              <User size={14} />
              <span>退出登录</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
