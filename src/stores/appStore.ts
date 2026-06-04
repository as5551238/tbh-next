import { create } from 'zustand';
import type { MatrixData } from '@/matrix/data';

interface AppState {
  // Interface
  interface: 'workspace' | 'collab' | 'ai';
  setInterface: (iface: string) => void;

  // Module
  activeModule: string;
  setActiveModule: (mod: string) => void;

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
}

export const useAppStore = create<AppState>((set) => ({
  interface: 'workspace',
  setInterface: (iface) => set({ interface: iface as AppState['interface'] }),

  activeModule: 'overview',
  setActiveModule: (mod) => set({ activeModule: mod }),

  industry: 'IT业',
  dept: '产品部',
  setContext: (industry, dept) => set({ industry, dept }),

  ctxPanelOpen: false,
  toggleCtxPanel: () => set((s) => ({ ctxPanelOpen: !s.ctxPanelOpen })),

  modSidebarOpen: true,
  toggleModSidebar: () => set((s) => ({ modSidebarOpen: !s.modSidebarOpen })),

  mobileDrawerOpen: false,
  setMobileDrawerOpen: (open) => set({ mobileDrawerOpen: open }),
}));
