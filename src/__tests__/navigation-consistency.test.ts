import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: () => false,
  supabase: null,
}));

// Mock behaviorTracker
vi.mock('@/lib/behaviorTracker', () => ({
  trackEvent: vi.fn(),
}));

// Mock monitoring
vi.mock('@/lib/monitoring', () => ({
  recordApiCall: vi.fn(),
  recordError: vi.fn(),
  recordRender: vi.fn(),
}));

import {
  useAppStore,
  DEFAULT_MODULES,
  SIMPLE_DEFAULT_MODULES,
  MODULE_TO_INTERFACE,
  ADMIN_ONLY_MODULES,
  getInterfaceForModule,
  isInterfaceModuleConsistent,
  getViewModeForRole,
  getDefaultModuleForViewMode,
} from '@/stores/appStore';

describe('AppStore — Navigation Consistency (L1/L2/L3)', () => {
  beforeEach(() => {
    const store = useAppStore.getState();
    store.setInterface('workspace');
    useAppStore.setState({ activeModule: 'overview', viewMode: 'cockpit' });
  });

  // --- L1: Single Source of Truth ---

  describe('L1: DEFAULT_MODULES and MODULE_TO_INTERFACE are consistent', () => {
    it('each DEFAULT_MODULES entry maps back to its interface', () => {
      for (const [iface, mod] of Object.entries(DEFAULT_MODULES)) {
        expect(MODULE_TO_INTERFACE[mod]).toBe(iface);
      }
    });

    it('each SIMPLE_DEFAULT_MODULES entry maps back to its interface', () => {
      for (const [iface, mod] of Object.entries(SIMPLE_DEFAULT_MODULES)) {
        expect(MODULE_TO_INTERFACE[mod]).toBe(iface);
      }
    });

    it('all MODULE_TO_INTERFACE values are valid interfaces', () => {
      const validInterfaces = new Set(['workspace', 'collab', 'ai']);
      for (const [mod, iface] of Object.entries(MODULE_TO_INTERFACE)) {
        expect(validInterfaces.has(iface), `Module "${mod}" maps to invalid interface "${iface}"`).toBe(true);
      }
    });

    it('ADMIN_ONLY_MODULES are all workspace modules', () => {
      for (const mod of ADMIN_ONLY_MODULES) {
        expect(MODULE_TO_INTERFACE[mod], `Admin module "${mod}" should be in workspace`).toBe('workspace');
      }
    });
  });

  // --- L2: Unified Navigation ---

  describe('L2: navigateTo sets correct interface + module', () => {
    it('navigateTo with only interface uses default module', () => {
      const store = useAppStore.getState();
      const path = store.navigateTo('ai');
      expect(path).toBe('/ai/main');
      expect(useAppStore.getState().interface).toBe('ai');
      expect(useAppStore.getState().activeModule).toBe('main');
    });

    it('navigateTo with explicit module sets both', () => {
      const store = useAppStore.getState();
      const path = store.navigateTo('workspace', 'tasks');
      expect(path).toBe('/workspace/tasks');
      expect(useAppStore.getState().interface).toBe('workspace');
      expect(useAppStore.getState().activeModule).toBe('tasks');
    });

    it('navigateTo with wrong module auto-corrects to default', () => {
      const store = useAppStore.getState();
      // 'channels' belongs to collab, not workspace
      const path = store.navigateTo('workspace', 'channels');
      // Should auto-correct to workspace's default module
      expect(useAppStore.getState().interface).toBe('workspace');
      expect(MODULE_TO_INTERFACE[useAppStore.getState().activeModule]).toBe('workspace');
    });

    it('navigateTo switches interface correctly', () => {
      const store = useAppStore.getState();
      store.navigateTo('collab');
      expect(useAppStore.getState().interface).toBe('collab');
      expect(useAppStore.getState().activeModule).toBe('channels');

      store.navigateTo('ai');
      expect(useAppStore.getState().interface).toBe('ai');
      expect(useAppStore.getState().activeModule).toBe('main');

      store.navigateTo('workspace');
      expect(useAppStore.getState().interface).toBe('workspace');
    });
  });

  // --- L3: Runtime Invariant ---

  describe('L3: isInterfaceModuleConsistent', () => {
    it('valid pairs pass', () => {
      expect(isInterfaceModuleConsistent('workspace', 'tasks')).toBe(true);
      expect(isInterfaceModuleConsistent('collab', 'channels')).toBe(true);
      expect(isInterfaceModuleConsistent('ai', 'main')).toBe(true);
    });

    it('invalid pairs fail', () => {
      expect(isInterfaceModuleConsistent('workspace', 'channels')).toBe(false);
      expect(isInterfaceModuleConsistent('collab', 'tasks')).toBe(false);
      expect(isInterfaceModuleConsistent('ai', 'overview')).toBe(false);
    });
  });

  // --- ViewMode ---

  describe('ViewMode derivation', () => {
    it('admin/owner/leader/manager get cockpit', () => {
      expect(getViewModeForRole('admin')).toBe('cockpit');
      expect(getViewModeForRole('owner')).toBe('cockpit');
      expect(getViewModeForRole('leader')).toBe('cockpit');
      expect(getViewModeForRole('manager')).toBe('cockpit');
    });

    it('member/viewer get simple', () => {
      expect(getViewModeForRole('member')).toBe('simple');
      expect(getViewModeForRole('viewer')).toBe('simple');
      expect(getViewModeForRole(undefined)).toBe('simple');
    });

    it('default module for cockpit is overview', () => {
      expect(getDefaultModuleForViewMode('cockpit')).toBe('overview');
    });

    it('default module for simple is tasks', () => {
      expect(getDefaultModuleForViewMode('simple')).toBe('tasks');
    });
  });
});
