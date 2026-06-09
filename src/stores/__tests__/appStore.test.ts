import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useAppStore,
  DEFAULT_MODULES,
  MODULE_TO_INTERFACE,
  getInterfaceForModule,
  isInterfaceModuleConsistent,
} from '@/stores/appStore';

vi.mock('@/lib/aiService', () => ({
  getStoredModelId: () => 'default',
  setStoredModelId: vi.fn(),
}));

describe('DEFAULT_MODULES', () => {
  it('has workspace, collab, and ai keys', () => {
    expect(DEFAULT_MODULES).toHaveProperty('workspace');
    expect(DEFAULT_MODULES).toHaveProperty('collab');
    expect(DEFAULT_MODULES).toHaveProperty('ai');
  });

  it('each value is a string', () => {
    for (const val of Object.values(DEFAULT_MODULES)) {
      expect(typeof val).toBe('string');
      expect(val.length).toBeGreaterThan(0);
    }
  });
});

describe('MODULE_TO_INTERFACE', () => {
  it('every DEFAULT_MODULES value exists as a key in MODULE_TO_INTERFACE', () => {
    for (const [iface, mod] of Object.entries(DEFAULT_MODULES)) {
      expect(MODULE_TO_INTERFACE[mod]).toBe(iface);
    }
  });

  it('all mapped interfaces are valid interface names', () => {
    const validInterfaces = new Set(Object.keys(DEFAULT_MODULES));
    for (const [mod, iface] of Object.entries(MODULE_TO_INTERFACE)) {
      expect(validInterfaces.has(iface)).toBe(true);
    }
  });

  it('DEFAULT_MODULES keys are a subset of MODULE_TO_INTERFACE values', () => {
    const interfacesFromModuleMap = new Set(Object.values(MODULE_TO_INTERFACE));
    for (const iface of Object.keys(DEFAULT_MODULES)) {
      expect(interfacesFromModuleMap.has(iface)).toBe(true);
    }
  });
});

describe('getInterfaceForModule', () => {
  it('returns correct interface for known modules', () => {
    expect(getInterfaceForModule('overview')).toBe('workspace');
    expect(getInterfaceForModule('channels')).toBe('collab');
    expect(getInterfaceForModule('main')).toBe('ai');
  });

  it('returns workspace for unknown modules', () => {
    expect(getInterfaceForModule('unknown_module')).toBe('workspace');
  });
});

describe('isInterfaceModuleConsistent', () => {
  it('returns true for consistent pairs', () => {
    expect(isInterfaceModuleConsistent('workspace', 'goals')).toBe(true);
    expect(isInterfaceModuleConsistent('collab', 'channels')).toBe(true);
    expect(isInterfaceModuleConsistent('ai', 'main')).toBe(true);
  });

  it('returns false for inconsistent pairs', () => {
    expect(isInterfaceModuleConsistent('collab', 'goals')).toBe(false);
    expect(isInterfaceModuleConsistent('ai', 'channels')).toBe(false);
  });
});

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      interface: 'workspace',
      activeModule: 'overview',
      ctxPanelOpen: false,
      modSidebarOpen: true,
      mobileDrawerOpen: false,
      deviationAlertCount: 0,
      authUser: null,
      teamId: '__default__',
    });
  });

  it('navigateTo sets correct interface and activeModule', () => {
    const path = useAppStore.getState().navigateTo('collab', 'channels');
    const state = useAppStore.getState();
    expect(state.interface).toBe('collab');
    expect(state.activeModule).toBe('channels');
    expect(path).toBe('/collab/channels');
  });

  it('navigateTo uses default module when only interface given', () => {
    const path = useAppStore.getState().navigateTo('ai');
    const state = useAppStore.getState();
    expect(state.interface).toBe('ai');
    expect(state.activeModule).toBe(DEFAULT_MODULES['ai']);
    expect(path).toBe('/ai/main');
  });

  it('toggleCtxPanel toggles context panel', () => {
    expect(useAppStore.getState().ctxPanelOpen).toBe(false);
    useAppStore.getState().toggleCtxPanel();
    expect(useAppStore.getState().ctxPanelOpen).toBe(true);
    useAppStore.getState().toggleCtxPanel();
    expect(useAppStore.getState().ctxPanelOpen).toBe(false);
  });

  it('toggleModSidebar toggles module sidebar', () => {
    expect(useAppStore.getState().modSidebarOpen).toBe(true);
    useAppStore.getState().toggleModSidebar();
    expect(useAppStore.getState().modSidebarOpen).toBe(false);
  });

  it('setMobileDrawerOpen sets drawer state', () => {
    useAppStore.getState().setMobileDrawerOpen(true);
    expect(useAppStore.getState().mobileDrawerOpen).toBe(true);
  });

  it('setContext updates industry and dept', () => {
    useAppStore.getState().setContext('制造业', '研发部');
    const state = useAppStore.getState();
    expect(state.industry).toBe('制造业');
    expect(state.dept).toBe('研发部');
  });

  it('setAuthUser updates auth user', () => {
    const user = { id: '1', email: 'a@b.com', role: 'admin', name: 'Test' };
    useAppStore.getState().setAuthUser(user);
    expect(useAppStore.getState().authUser).toEqual(user);
  });

  it('setDeviationAlertCount updates count', () => {
    useAppStore.getState().setDeviationAlertCount(5);
    expect(useAppStore.getState().deviationAlertCount).toBe(5);
  });
});

describe('navigateTo edge cases', () => {
  beforeEach(() => {
    useAppStore.setState({
      interface: 'workspace',
      activeModule: 'overview',
      ctxPanelOpen: false,
      modSidebarOpen: true,
      mobileDrawerOpen: false,
      deviationAlertCount: 0,
      authUser: null,
      teamId: '__default__',
    });
  });

  it('navigateTo returns correct path for workspace with explicit module', () => {
    const path = useAppStore.getState().navigateTo('workspace', 'goals');
    const state = useAppStore.getState();
    expect(state.interface).toBe('workspace');
    expect(state.activeModule).toBe('goals');
    expect(path).toBe('/workspace/goals');
  });

  it('navigateTo falls back to overview for unknown interface', () => {
    const path = useAppStore.getState().navigateTo('workspace');
    const state = useAppStore.getState();
    expect(state.activeModule).toBe('overview');
    expect(path).toBe('/workspace/overview');
  });

  it('setInterface updates activeModule to default for that interface', () => {
    useAppStore.getState().setInterface('collab');
    const state = useAppStore.getState();
    expect(state.interface).toBe('collab');
    expect(state.activeModule).toBe('channels');
  });
});
