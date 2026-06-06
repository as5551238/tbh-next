import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { clearAuth } from '@/lib/auth';
import { LogOut, User, Settings } from 'lucide-react';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { AI_MODEL_PRESETS } from '@/lib/aiService';
import { isSupabaseConfigured } from '@/lib/supabase';

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
  const profileModal = useModal();
  const prefModal = useModal();
  const [profile, setProfile] = useState(() => {
    try { const s = localStorage.getItem('tbh-profile'); return s ? JSON.parse(s) : { name: '', email: 'demo@tbh-next.com', phone: '' }; } catch { return { name: '', email: 'demo@tbh-next.com', phone: '' }; }
  });
  const [prefs, setPrefs] = useState(() => {
    try { const s = localStorage.getItem('tbh-prefs'); return s ? JSON.parse(s) : { notify: 'browser', lang: 'zh', tz: 'Asia/Shanghai' }; } catch { return { notify: 'browser', lang: 'zh', tz: 'Asia/Shanghai' }; }
  });
  const aiModelId = useAppStore((s) => s.aiModelId);
  const setAiModelId = useAppStore((s) => s.setAiModelId);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      // Don't close when a modal is open — clicking inside modal shouldn't dismiss UserMenu
      if (profileModal.open || prefModal.open) return;
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose, profileModal.open, prefModal.open]);

  function handleLogout() {
    clearAuth();
    navigate('/login', { replace: true });
    onClose();
  }

  return (
    <>
      <div ref={menuRef} className="absolute bottom-14 left-14 z-50 w-48 rounded-xl border border-border bg-surface-3 shadow-xl overflow-hidden">
        <div className="px-3 py-2.5 border-b border-border">
          <div className="text-xs font-semibold text-text">用户</div>
          <div className="text-[10px] text-text-3">demo@tbh-next.com</div>
        </div>
        <button onClick={profileModal.openModal} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-2 hover:bg-surface-2 transition-colors">
          <User size={14} />
          <span>个人信息</span>
        </button>
        <button onClick={prefModal.openModal} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-2 hover:bg-surface-2 transition-colors">
          <Settings size={14} />
          <span>偏好设置</span>
        </button>
        <div className="border-t border-border" />
        <button onClick={handleLogout} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-danger hover:bg-danger/5 transition-colors">
          <LogOut size={14} />
          <span>退出登录</span>
        </button>
      </div>

      <Modal open={profileModal.open} onClose={profileModal.closeModal} title="个人信息"
        footer={
          <>
            <button onClick={profileModal.closeModal} className={btnSecondary}>取消</button>
            <button onClick={() => { try { localStorage.setItem('tbh-profile', JSON.stringify(profile)); } catch {} profileModal.closeModal(); }} className={btnPrimary}>保存</button>
          </>
        }>
        <ModalField label="姓名">
          <input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} className={inputCls} placeholder="请输入姓名" />
        </ModalField>
        <ModalField label="邮箱">
          <input value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} className={inputCls} placeholder="请输入邮箱" />
        </ModalField>
        <ModalField label="手机号">
          <input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} className={inputCls} placeholder="请输入手机号" />
        </ModalField>
      </Modal>

      <Modal open={prefModal.open} onClose={prefModal.closeModal} title="偏好设置"
        footer={
          <>
            <button onClick={prefModal.closeModal} className={btnSecondary}>取消</button>
            <button onClick={() => { try { localStorage.setItem('tbh-prefs', JSON.stringify(prefs)); } catch {} prefModal.closeModal(); }} className={btnPrimary}>保存</button>
          </>
        }>
        <ModalField label="通知方式">
          <select value={prefs.notify} onChange={(e) => setPrefs((p) => ({ ...p, notify: e.target.value }))} className={inputCls}>
            <option value="browser">浏览器推送</option>
            <option value="wecom">企微</option>
            <option value="email">邮件</option>
          </select>
        </ModalField>
        <ModalField label="语言">
          <select value={prefs.lang} onChange={(e) => setPrefs((p) => ({ ...p, lang: e.target.value }))} className={inputCls}>
            <option value="zh">中文</option>
            <option value="en">English</option>
          </select>
        </ModalField>
        <ModalField label="时区">
          <select value={prefs.tz} onChange={(e) => setPrefs((p) => ({ ...p, tz: e.target.value }))} className={inputCls}>
            <option value="Asia/Shanghai">Asia/Shanghai (UTC+8)</option>
            <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
            <option value="America/New_York">America/New_York (UTC-5)</option>
            <option value="America/Los_Angeles">America/Los_Angeles (UTC-8)</option>
            <option value="Europe/London">Europe/London (UTC+0)</option>
          </select>
        </ModalField>
        <ModalField label="AI 模型">
          <select value={aiModelId} onChange={(e) => setAiModelId(e.target.value)} className={inputCls}>
            {AI_MODEL_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.provider})
              </option>
            ))}
          </select>
          <div className="mt-1 text-[10px] text-text-3">
            当前: {AI_MODEL_PRESETS.find((p) => p.id === aiModelId)?.name ?? aiModelId}
            {!isSupabaseConfigured() && ' — 未连接Supabase，将使用离线模式'}
          </div>
        </ModalField>
      </Modal>
    </>
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
        <button onClick={() => navigate('/workspace/overview')} aria-label="返回首页" className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-sm font-extrabold text-white cursor-pointer hover:scale-110 transition-transform">
          T
        </button>
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
