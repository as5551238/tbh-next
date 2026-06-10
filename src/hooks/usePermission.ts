import { useMemo } from 'react';
import { useAppStore } from '@/stores/appStore';
import { canAccess, getRolePermissions, type PermissionKey } from '@/lib/permissions';

/**
 * usePermission — React hook for permission checks.
 *
 * Usage:
 *   const { can, permissions } = usePermission();
 *   if (can('goals:write')) { ... }
 *
 * Or for a single permission:
 *   const canWriteGoals = usePermission('goals:write');
 */
export function usePermission(permission?: PermissionKey): {
  can: (p: PermissionKey) => boolean;
  permissions: Set<PermissionKey>;
  role: string;
  isAdmin: boolean;
  canValue: boolean; // only when specific permission passed
} {
  const authUser = useAppStore((s) => s.authUser);
  const role = authUser?.role ?? 'member';
  const isAdmin = role === 'admin' || role === 'owner';

  const permissions = useMemo(() => getRolePermissions(role), [role]);

  const can = useMemo(() => {
    return (p: PermissionKey) => {
      if (isAdmin) return true;
      return permissions.has(p);
    };
  }, [permissions, isAdmin]);

  const canValue = permission ? can(permission) : false;

  return { can, permissions, role, isAdmin, canValue };
}

export default usePermission;
