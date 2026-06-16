import { create } from 'zustand';
import type { MatrixData } from '@/matrix/data';
import { getStoredModelId, setStoredModelId } from '@/lib/aiService';
import { trackEvent } from '@/lib/behaviorTracker';

// ═══════════════════════════════════════════════════════════════
// L1: SINGLE SOURCE OF TRUTH for interface↔module mapping
// ═══════════════════════════════════════════════════════════════
// 所有"切换界面"逻辑必须通过 here 的映射，禁止在其他文件硬编码。

/** interface → 默认 module 的唯一映射 */
export const DEFAULT_MODULES: Record<string, string> = {
  workspace: 'overview',
  collab: 'channels',
  ai: 'main',
};

/** interface → 简视图默认 module (member/viewer 用户落地页) */
export const SIMPLE_DEFAULT_MODULES: Record<string, string> = {
  workspace: 'mywork',
  collab: 'channels',
  ai: 'main',
};

/** module → interface 的反向映射（从各页面的 MODULE_MAP 反向生成） */
export const MODULE_TO_INTERFACE: Record<string, string> = {
  // workspace A/B-grade modules
  overview: 'workspace', goals: 'workspace', tasks: 'workspace',
  projects: 'workspace', knowledge: 'workspace', schedule: 'workspace',
  notifications: 'workspace', insight: 'workspace', reports: 'workspace',
  members: 'workspace', org: 'workspace',
  admin: 'workspace', review: 'workspace',
  actionItems: 'workspace', tags: 'workspace',
  mywork: 'workspace',
  commandCenter: 'workspace',
  // C-grade FROZEN (W14) — registered for sidebar "开发中" visibility
  prediction: 'workspace', docs: 'workspace', experience: 'workspace',
  roles: 'workspace', alignment: 'workspace', activities: 'workspace',
  notes: 'workspace', sprints: 'workspace', templates: 'workspace',
  bookmarks: 'workspace', categories: 'workspace', statusFlow: 'workspace',
  // collab modules
  channels: 'collab', teamCal: 'collab', approvals: 'collab',
  announcements: 'collab', collabDocs: 'collab', meetings: 'collab',
  directory: 'collab', aiAgents: 'collab',
  // ai A-grade modules
  main: 'ai', risk: 'ai',
  agentConfig: 'ai', industryView: 'ai',
  subscription: 'ai', dste: 'ai',
  // C-grade AI FROZEN (W14) — registered for sidebar "开发中" visibility
  morning: 'ai', agentList: 'ai', workflows: 'ai', kpiDash: 'ai',
  knowledgeOSP: 'ai', mcpA2a: 'ai', behaviorTracker: 'ai',
  templateWizard: 'ai', usageAlerts: 'ai', systemMonitor: 'ai',
};

/** 根据 module 名推断其所属 interface */
export function getInterfaceForModule(mod: string): string {
  return MODULE_TO_INTERFACE[mod] ?? 'workspace';
}

/** Modules restricted to cockpit viewMode (admin/manager only)
 *  Only truly admin-level modules; DSTE/goals/insight etc. are available to all roles */
export const ADMIN_ONLY_MODULES = new Set([
  'admin', 'org',
]);

/** 根据 role 推导默认 viewMode — admin/owner/leader/manager → cockpit, 其他 → simple */
export function getViewModeForRole(role: string | undefined): 'cockpit' | 'simple' {
  if (!role) return 'simple';
  return ['admin', 'owner', 'leader', 'manager'].includes(role) ? 'cockpit' : 'simple';
}

/** 根据 viewMode 推导默认落地 module — cockpit→overview, simple→tasks */
export function getDefaultModuleForViewMode(viewMode: 'cockpit' | 'simple'): string {
  return viewMode === 'cockpit' ? 'overview' : 'tasks';
}

/** 验证 interface + activeModule 的一致性（L3: 运行时不变量） */
export function isInterfaceModuleConsistent(iface: string, mod: string): boolean {
  return MODULE_TO_INTERFACE[mod] === iface || (iface === 'workspace' && !MODULE_TO_INTERFACE[mod]);
}

// ═══════════════════════════════════════════════════════════════
// L2: UNIFIED NAVIGATION — 暴露给所有组件的唯一导航函数
// ═══════════════════════════════════════════════════════════════
// 组件不应直接组合 setInterface + setActiveModule + navigate，
// 而应调用 navigateTo(iface, module?) 一个函数搞定。

interface AppState {
  // Interface
  interface: 'workspace' | 'collab' | 'ai';
  setInterface: (iface: string) => void;

  // Module
  activeModule: string;
  setActiveModule: (mod: string) => void;

  // Unified navigation state setter (store-only; caller still calls navigate)
  navigateTo: (iface: string, module?: string) => string;

  // Matrix
  industry: string;
  dept: string;
  industryRaw: string;
  deptRaw: string;
  setContext: (industry: string, dept: string, industryRaw?: string, deptRaw?: string) => void;

  // Context panel
  ctxPanelOpen: boolean;
  toggleCtxPanel: () => void;

  // Module sidebar
  modSidebarOpen: boolean;
  toggleModSidebar: () => void;

  // Mobile drawer
  mobileDrawerOpen: boolean;
  setMobileDrawerOpen: (open: boolean) => void;

  // AI Model
  aiModelId: string;
  setAiModelId: (id: string) => void;

  // MLOO deviation alert count (set by Workspace on load)
  deviationAlertCount: number;
  setDeviationAlertCount: (n: number) => void;

  // Auth user info (mirrored from useAuth for global access)
  authUser: { id: string; email: string; role: string; name: string } | null;
  setAuthUser: (user: { id: string; email: string; role: string; name: string } | null) => void;
  teamId: string;

  // View mode (derived from role, toggle-able for admin users)
  viewMode: 'cockpit' | 'simple';
  setViewMode: (mode: 'cockpit' | 'simple') => void;

  // Theme (dark/light/system)
  theme: 'dark' | 'light' | 'system';
  setTheme: (theme: 'dark' | 'light' | 'system') => void;

  // Realtime connection status (updated by useRealtime hook)
  realtimeStatus: 'connected' | 'reconnecting' | 'degraded' | 'disconnected';
  setRealtimeStatus: (status: 'connected' | 'reconnecting' | 'degraded' | 'disconnected') => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  interface: 'workspace',
  setInterface: (iface) => {
    set({
      interface: iface as AppState['interface'],
      activeModule: DEFAULT_MODULES[iface] ?? 'overview',
    });
  },

  activeModule: 'overview',
  setActiveModule: (mod) => set({ activeModule: mod }),

  /** 统一导航入口：设置 interface + activeModule，返回应 navigate 到的路径 */
  navigateTo: (iface, module) => {
    const state = get();
    const defaults = state.viewMode === 'simple' ? SIMPLE_DEFAULT_MODULES : DEFAULT_MODULES;
    let mod = module ?? defaults[iface] ?? 'overview';
    // L3: 运行时不变量检查 + 真正自动纠偏
    if (!isInterfaceModuleConsistent(iface, mod)) {
      const corrected = defaults[iface] ?? 'overview';
      if (import.meta.env.DEV) {
        console.warn(
          `[AppStore] Invariant violation: interface="${iface}" but module="${mod}" belongs to "${MODULE_TO_INTERFACE[mod] ?? 'unknown'}". ` +
          `Auto-correcting module to "${corrected}".`
        );
      }
      mod = corrected;
    }
    // Behavior tracking
    if (mod !== state.activeModule) {
      trackEvent('module_switch', { from: state.activeModule, to: mod, interface: iface });
    }
    set({
      interface: iface as AppState['interface'],
      activeModule: mod,
    });
    return `/${iface}/${mod}`;
  },

  industry: 'IT业',
  dept: '产品部',
  industryRaw: 'IT业',
  deptRaw: '产品部',
  setContext: (industry, dept, industryRaw, deptRaw) => set({
    industry,
    dept,
    industryRaw: industryRaw ?? industry,
    deptRaw: deptRaw ?? dept,
  }),

  ctxPanelOpen: false,
  toggleCtxPanel: () => set((s) => ({ ctxPanelOpen: !s.ctxPanelOpen })),

  modSidebarOpen: true,
  toggleModSidebar: () => set((s) => ({ modSidebarOpen: !s.modSidebarOpen })),

  mobileDrawerOpen: false,
  setMobileDrawerOpen: (open) => set({ mobileDrawerOpen: open }),

  aiModelId: getStoredModelId(),
  setAiModelId: (id) => {
    setStoredModelId(id);
    set({ aiModelId: id });
  },

  deviationAlertCount: 0,
  setDeviationAlertCount: (n) => set({ deviationAlertCount: n }),

  authUser: null,
  setAuthUser: (user) => set((s) => {
    const viewMode = getViewModeForRole(user?.role);
    return {
      authUser: user,
      // Auto-switch viewMode when role changes (e.g., login/logout)
      viewMode: s.viewMode !== viewMode ? viewMode : s.viewMode,
    };
  }),
  teamId: '__default__',

  viewMode: (typeof localStorage !== 'undefined' && (localStorage.getItem('tbh-view-mode') as 'cockpit' | 'simple')) || 'simple' as 'cockpit' | 'simple',
  setViewMode: (mode) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem('tbh-view-mode', mode);
    set({ viewMode: mode });
  },

  realtimeStatus: 'disconnected',
  setRealtimeStatus: (status) => set({ realtimeStatus: status }),

  theme: ((typeof localStorage !== 'undefined' && localStorage.getItem('tbh-theme') as 'dark' | 'light' | 'system') || 'dark') as 'dark' | 'light' | 'system',
  setTheme: (theme) => {
    localStorage.setItem('tbh-theme', theme);
    set({ theme });
  },
}));

// ═══════════════════════════════════════════════════════════════
// L0: SYNCHRONOUS URL → STORE HYDRATION (before first React render)
// ═══════════════════════════════════════════════════════════════
// Solves: direct URL navigation (e.g. #/ai/dste) shows wrong page
// because zustand defaults (workspace/overview) are used on first render
// before RouteSync's useEffect fires.
// Call this ONCE in main.tsx before createRoot().render().

const VALID_INTERFACES = ['workspace', 'collab', 'ai'] as const;

export function hydrateStoreFromUrl(): void {
  let pathname: string;
  if (window.location.hash) {
    // HashRouter: parse hash fragment, e.g. "#/ai/dste" → "/ai/dste"
    pathname = window.location.hash.replace(/^#\/?/, '/') || '/';
  } else {
    pathname = window.location.pathname;
  }

  const segments = pathname.split('/').filter(Boolean);
  if (!segments[0] || !VALID_INTERFACES.includes(segments[0] as any)) return;

  const iface = segments[0] as AppState['interface'];
  const mod = segments[1];

  const store = useAppStore.getState();
  const defaults = store.viewMode === 'simple' ? SIMPLE_DEFAULT_MODULES : DEFAULT_MODULES;
  const resolvedMod = mod && MODULE_TO_INTERFACE[mod] === iface
    ? mod
    : (defaults[iface] ?? 'overview');

  // Only set if different from defaults
  if (store.interface !== iface || store.activeModule !== resolvedMod) {
    useAppStore.setState({
      interface: iface,
      activeModule: resolvedMod,
    });
  }
}
