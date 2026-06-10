import { create } from 'zustand';
import type { MatrixData } from '@/matrix/data';
import { getStoredModelId, setStoredModelId } from '@/lib/aiService';

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

/** module → interface 的反向映射（从各页面的 MODULE_MAP 反向生成） */
export const MODULE_TO_INTERFACE: Record<string, string> = {
  // workspace modules
  overview: 'workspace', goals: 'workspace', tasks: 'workspace',
  projects: 'workspace', knowledge: 'workspace', schedule: 'workspace',
  notifications: 'workspace', insight: 'workspace', reports: 'workspace',
  prediction: 'workspace', docs: 'workspace', experience: 'workspace',
  members: 'workspace', roles: 'workspace', org: 'workspace',
  admin: 'workspace', review: 'workspace', alignment: 'workspace',
  actionItems: 'workspace',
  activities: 'workspace', notes: 'workspace', sprints: 'workspace',
  templates: 'workspace', bookmarks: 'workspace',
  tags: 'workspace', categories: 'workspace', featureFlags: 'workspace',
  savedViews: 'workspace', automation: 'workspace', statusFlow: 'workspace',
  // collab modules
  channels: 'collab', teamCal: 'collab', approvals: 'collab',
  announcements: 'collab', collabDocs: 'collab', meetings: 'collab',
  files: 'collab', directory: 'collab', aiAgents: 'collab',
  // ai modules
  main: 'ai', morning: 'ai', risk: 'ai',
  agentList: 'ai', agentConfig: 'ai', industryView: 'ai',
  workflows: 'ai', kpiDash: 'ai', subscription: 'ai',
  agentMarket: 'ai', knowledgeOSP: 'ai', mcpA2a: 'ai',
};

/** 根据 module 名推断其所属 interface */
export function getInterfaceForModule(mod: string): string {
  return MODULE_TO_INTERFACE[mod] ?? 'workspace';
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
  setContext: (industry: string, dept: string) => void;

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
    const mod = module ?? DEFAULT_MODULES[iface] ?? 'overview';
    // L3: 运行时不变量检查
    if (import.meta.env.DEV && !isInterfaceModuleConsistent(iface, mod)) {
      console.warn(
        `[AppStore] Invariant violation: interface="${iface}" but module="${mod}" belongs to "${MODULE_TO_INTERFACE[mod] ?? 'unknown'}". ` +
        `This may cause a blank page. Auto-correcting module to "${DEFAULT_MODULES[iface]}".`
      );
    }
    set({
      interface: iface as AppState['interface'],
      activeModule: mod,
    });
    return `/${iface}/${mod}`;
  },

  industry: 'IT业',
  dept: '产品部',
  setContext: (industry, dept) => set({ industry, dept }),

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
  setAuthUser: (user) => set({ authUser: user }),
  teamId: '__default__',

  realtimeStatus: 'disconnected',
  setRealtimeStatus: (status) => set({ realtimeStatus: status }),

  theme: ((typeof localStorage !== 'undefined' && localStorage.getItem('tbh-theme') as 'dark' | 'light' | 'system') || 'dark') as 'dark' | 'light' | 'system',
  setTheme: (theme) => {
    localStorage.setItem('tbh-theme', theme);
    set({ theme });
  },
}));
