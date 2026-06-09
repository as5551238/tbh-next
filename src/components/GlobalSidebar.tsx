import { useState, useRef, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore, DEFAULT_MODULES } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { clearAuth } from '@/lib/auth';
import { LogOut, User, Settings } from 'lucide-react';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { AI_MODEL_PRESETS } from '@/lib/aiService';
import { isSupabaseConfigured } from '@/lib/supabase';
import { PresenceIndicator } from '@/components/PresenceIndicator';
import { useLocale } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

const NAV_ITEMS = [
  { id: 'workspace', icon: '📊', labelKey: 'nav.workspace' },
  { id: 'collab', icon: '💬', labelKey: 'nav.collab' },
  { id: 'ai', icon: '🧠', labelKey: 'nav.ai' },
];

const QUICK_ITEMS = [
  { icon: '🎯', labelKey: 'nav.goals', module: 'goals', iface: 'workspace' },
  { icon: '✅', labelKey: 'nav.tasks', module: 'tasks', iface: 'workspace' },
  { icon: '📁', labelKey: 'nav.projects', module: 'projects', iface: 'workspace' },
  { icon: '💡', labelKey: 'nav.insight', module: 'insight', iface: 'workspace' },
  { icon: '📚', labelKey: 'nav.knowledge', module: 'knowledge', iface: 'workspace' },
  { icon: '⚙️', labelKey: 'nav.admin', module: 'admin', iface: 'workspace' },
];

function Tooltip({ children, label }: { children: ReactNode; label: string }) {
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
  const authUser = useAppStore((s) => s.authUser);
  const { t } = useLocale();
  const [profile, setProfile] = useState<{ name: string; email: string; phone: string }>(() => {
    try { const s = localStorage.getItem('tbh-profile'); return s ? JSON.parse(s) : { name: '', email: 'demo@tbh-next.com', phone: '' }; } catch { return { name: '', email: 'demo@tbh-next.com', phone: '' }; }
  });
  const [prefs, setPrefs] = useState<{ notify: string; lang: string; tz: string }>(() => {
    try { const s = localStorage.getItem('tbh-prefs'); return s ? JSON.parse(s) : { notify: 'browser', lang: 'zh', tz: 'Asia/Shanghai' }; } catch { return { notify: 'browser', lang: 'zh', tz: 'Asia/Shanghai' }; }
  });
  const aiModelId = useAppStore((s) => s.aiModelId);
  const setAiModelId = useAppStore((s) => s.setAiModelId);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
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
          <div className="text-xs font-semibold text-text">{authUser?.name || t('userMenu.user')}</div>
          <div className="text-[10px] text-text-3">{authUser?.email || 'demo@tbh-next.com'}</div>
        </div>
        <button onClick={profileModal.openModal} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-2 hover:bg-surface-2 transition-colors">
          <User size={14} />
          <span>{t('userMenu.profile')}</span>
        </button>
        <button onClick={prefModal.openModal} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-2 hover:bg-surface-2 transition-colors">
          <Settings size={14} />
          <span>{t('userMenu.preferences')}</span>
        </button>
        <div className="border-t border-border" />
        <button onClick={handleLogout} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-danger hover:bg-danger/5 transition-colors">
          <LogOut size={14} />
          <span>{t('userMenu.logout')}</span>
        </button>
      </div>

      <Modal open={profileModal.open} onClose={profileModal.closeModal} title={t('userMenu.profile')}
        footer={
          <>
            <button onClick={profileModal.closeModal} className={btnSecondary}>{t('common.cancel')}</button>
            <button onClick={() => { try { localStorage.setItem('tbh-profile', JSON.stringify(profile)); } catch {} profileModal.closeModal(); }} className={btnPrimary}>{t('common.save')}</button>
          </>
        }>
        <ModalField label={t('login.name')}>
          <input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} className={inputCls} placeholder={t('userMenu.namePlaceholder')} />
        </ModalField>
        <ModalField label={t('login.email')}>
          <input value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} className={inputCls} placeholder={t('userMenu.emailPlaceholder')} />
        </ModalField>
        <ModalField label={t('userMenu.phone')}>
          <input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} className={inputCls} placeholder={t('userMenu.phonePlaceholder')} />
        </ModalField>
      </Modal>

      <Modal open={prefModal.open} onClose={prefModal.closeModal} title={t('userMenu.preferences')}
        footer={
          <>
            <button onClick={prefModal.closeModal} className={btnSecondary}>{t('common.cancel')}</button>
            <button onClick={() => { try { localStorage.setItem('tbh-prefs', JSON.stringify(prefs)); } catch {} prefModal.closeModal(); }} className={btnPrimary}>{t('common.save')}</button>
          </>
        }>
        <ModalField label={t('userMenu.notificationMethod')}>
          <select value={prefs.notify} onChange={(e) => setPrefs((p) => ({ ...p, notify: e.target.value }))} className={inputCls}>
            <option value="browser">{t('userMenu.browser')}</option>
            <option value="wecom">{t('userMenu.wecom')}</option>
            <option value="email">{t('userMenu.email')}</option>
          </select>
        </ModalField>
        <ModalField label={t('userMenu.language')}>
          <select value={prefs.lang} onChange={(e) => setPrefs((p) => ({ ...p, lang: e.target.value }))} className={inputCls}>
            <option value="zh">中文</option>
            <option value="en">English</option>
          </select>
        </ModalField>
        <ModalField label={t('userMenu.timezone')}>
          <select value={prefs.tz} onChange={(e) => setPrefs((p) => ({ ...p, tz: e.target.value }))} className={inputCls}>
            <option value="Asia/Shanghai">Asia/Shanghai (UTC+8)</option>
            <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
            <option value="America/New_York">America/New_York (UTC-5)</option>
            <option value="America/Los_Angeles">America/Los_Angeles (UTC-8)</option>
            <option value="Europe/London">Europe/London (UTC+0)</option>
          </select>
        </ModalField>
        <ModalField label={t('userMenu.aiModel')}>
          <select value={aiModelId} onChange={(e) => setAiModelId(e.target.value)} className={inputCls}>
            {AI_MODEL_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.provider})
              </option>
            ))}
          </select>
          <div className="mt-1 text-[10px] text-text-3">
            {t('userMenu.currentModel', { name: AI_MODEL_PRESETS.find((p) => p.id === aiModelId)?.name ?? aiModelId })}
            {!isSupabaseConfigured() && t('userMenu.offlineMode')}
          </div>
        </ModalField>
      </Modal>
    </>
  );
}

export default function GlobalSidebar() {
  const iface = useAppStore((s) => s.interface);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const toggleCtxPanel = useAppStore((s) => s.toggleCtxPanel);
  const authUser = useAppStore((s) => s.authUser);
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { locale, setLocale, t } = useLocale();

  function handleInterfaceSwitch(id: string) {
    navigate(navigateTo(id));
  }

  function handleQuickNav(item: typeof QUICK_ITEMS[number]) {
    navigate(navigateTo(item.iface, item.module));
  }

  function toggleLocale() {
    setLocale(locale === 'zh' ? 'en' : 'zh');
  }

  return (
    <nav aria-label="主导航" className="flex w-16 flex-col items-center border-r border-border bg-surface py-3 z-50 shrink-0">
      {/* Logo */}
      <Tooltip label="TBH Next">
        <button onClick={() => navigate(navigateTo('workspace', 'overview'))} aria-label={t('nav.home')} className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-sm font-extrabold text-white cursor-pointer hover:scale-110 transition-transform">
          T
        </button>
      </Tooltip>

      {/* Main nav */}
      <div className="flex flex-1 flex-col items-center gap-1">
        {NAV_ITEMS.map((item) => (
          <Tooltip key={item.id} label={t(item.labelKey)}>
            <button
              onClick={() => handleInterfaceSwitch(item.id)}
              aria-label={t(item.labelKey)}
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
          <Tooltip key={item.labelKey} label={t(item.labelKey)}>
            <button
              onClick={() => handleQuickNav(item)}
              aria-label={t(item.labelKey)}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-lg text-text-3 transition-all hover:bg-surface-2 hover:text-text-2 hover:scale-105"
            >
              {item.icon}
            </button>
          </Tooltip>
        ))}
      </div>

      {/* Bottom */}
      <div className="flex flex-col items-center gap-1 relative">
        <PresenceIndicator userId={authUser?.id || 'demo'} />
        <Tooltip label={t('nav.aiUnderstanding')}>
          <button
            onClick={toggleCtxPanel}
            aria-label={t('nav.aiUnderstanding')}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-lg text-text-3 transition-all hover:bg-surface-2 hover:text-text-2 hover:scale-105"
          >
            🤖
          </button>
        </Tooltip>
        <Tooltip label={locale === 'zh' ? 'EN' : '中文'}>
          <button
            onClick={toggleLocale}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-sm transition-all hover:bg-surface-2 hover:text-text-2 hover:scale-105"
            aria-label={t('nav.toggleLanguage')}
          >
            🌐
          </button>
        </Tooltip>
        <Tooltip label={t('nav.myAccount')}>
          <button
            onClick={(e) => { if (e.shiftKey) { localStorage.removeItem('tbh-onboarded'); localStorage.removeItem('tbh-onboarded-overlay'); window.dispatchEvent(new CustomEvent('tbh-onboarding-reset', { detail: { type: 'reset-onboarding' } })); return; } setUserMenuOpen((v) => !v); }}
            aria-label={t('nav.myAccount')}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-xs font-bold text-white cursor-pointer hover:scale-110 transition-transform border-2 border-transparent hover:border-primary-2"
          >
            W
          </button>
        </Tooltip>
        {userMenuOpen && <UserMenu onClose={() => setUserMenuOpen(false)} />}
      </div>
    </nav>
  );
}
