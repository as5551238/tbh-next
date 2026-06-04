import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { clearAuth } from '@/lib/auth';
import { LogOut, User, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'workspace', icon: '📊', label: '模块工作台' },
  { id: 'collab', icon: '💬', label: '团队协作台' },
  { id: 'ai', icon: '🧠', label: '个人AI台' },
];

const QUICK_ITEMS = [
  { icon: '🎯', label: '目标 OKR', module: 'goals', iface: 'workspace' },
  { icon: '✅', label: '任务中心', module: 'tasks', iface: 'workspace' },
  { icon: '📁', label: '项目管理', module: 'projects', iface: 'workspace' },
  { icon: '💡', label: '数据洞察', module: 'insight', iface: 'workspace' },
  { icon: '📚', label: '知识库', module: 'knowledge', iface: 'workspace' },
  { icon: '⚙️', label: '管理后台', module: 'admin', iface: 'workspace' },
];

function Tooltip({ children, label }: { children: React.ReactNode; label: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="pointer-events-none absolute left-14 top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-lg border border-border bg-surface-3 px-3 py-1.5 text-xs text-text shadow-lg">
          {label}
        </div>
      )}
    </div>
  );
}

function UserMenu({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  function handleLogout() {
    clearAuth();
    navigate('/login', { replace: true });
    onClose();
  }

  return (
    <div ref={menuRef} className="absolute bottom-14 left-14 z-50 w-48 rounded-xl border border-border bg-surface-3 shadow-xl overflow-hidden">
      <div className="px-3 py-2.5 border-b border-border">
        <div className="text-xs font-semibold text-text">用户</div>
        <div className="text-[10px] text-text-3">demo@tbh-next.com</div>
      </div>
      <button className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-2 hover:bg-surface-2 transition-colors">
        <User size={14} />
        <span>个人信息</span>
      </button>
      <button className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-2 hover:bg-surface-2 transition-colors">
        <Settings size={14} />
        <span>偏好设置</span>
      </button>
      <div className="border-t border-border" />
      <button onClick={handleLogout} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-danger hover:bg-danger/5 transition-colors">
        <LogOut size={14} />
        <span>退出登录</span>
      </button>
    </div>
  );
}

export default function GlobalSidebar() {
  const iface = useAppStore((s) => s.interface);
  const setInterface = useAppStore((s) => s.setInterface);
  const setActiveModule = useAppStore((s) => s.setActiveModule);
  const toggleCtxPanel = useAppStore((s) => s.toggleCtxPanel);
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  function handleInterfaceSwitch(id: string) {
    setInterface(id);
    navigate(`/${id}`);
  }

  function handleQuickNav(item: typeof QUICK_ITEMS[number]) {
    setInterface(item.iface);
    setActiveModule(item.module);
    navigate(`/${item.iface}/${item.module}`);
  }

  return (
    <div className="flex w-16 flex-col items-center border-r border-border bg-surface py-3 z-50 shrink-0">
      {/* Logo */}
      <Tooltip label="TBH Next">
        <div onClick={() => navigate('/workspace/overview')} className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-sm font-extrabold text-white cursor-pointer hover:scale-110 transition-transform">
          T
        </div>
      </Tooltip>

      {/* Main nav */}
      <div className="flex flex-1 flex-col items-center gap-1">
        {NAV_ITEMS.map((item) => (
          <Tooltip key={item.id} label={item.label}>
            <button
              onClick={() => handleInterfaceSwitch(item.id)}
              className={cn(
                'relative flex h-11 w-11 items-center justify-center rounded-xl text-lg transition-all',
                iface === item.id
                  ? 'bg-primary/10 text-primary-2 shadow-[0_0_12px_rgba(123,108,240,0.15)]'
                  : 'text-text-3 hover:bg-surface-2 hover:text-text-2'
              )}
            >
              {item.icon}
              {iface === item.id && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-primary" />
              )}
            </button>
          </Tooltip>
        ))}

        <div className="my-2 h-px w-6 bg-border" />

        {QUICK_ITEMS.map((item) => (
          <Tooltip key={item.label} label={item.label}>
            <button
              onClick={() => handleQuickNav(item)}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-lg text-text-3 transition-all hover:bg-surface-2 hover:text-text-2 hover:scale-105"
            >
              {item.icon}
            </button>
          </Tooltip>
        ))}
      </div>

      {/* Bottom */}
      <div className="flex flex-col items-center gap-1 relative">
        <Tooltip label="AI 理解">
          <button
            onClick={toggleCtxPanel}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-lg text-text-3 transition-all hover:bg-surface-2 hover:text-text-2 hover:scale-105"
          >
            🤖
          </button>
        </Tooltip>
        <Tooltip label="我的">
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-xs font-bold text-white cursor-pointer hover:scale-110 transition-transform border-2 border-transparent hover:border-primary-2"
          >
            W
          </button>
        </Tooltip>
        {userMenuOpen && <UserMenu onClose={() => setUserMenuOpen(false)} />}
      </div>
    </div>
  );
}
