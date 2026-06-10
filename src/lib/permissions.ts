/**
 * Permission system for TBH-Next.
 *
 * Design:
 * - Permission keys are machine-readable strings (not Chinese labels)
 * - Each role has a set of permission keys
 * - usePermission() hook checks current user's role against permissions
 * - Admin/owner/leader always pass all checks
 * - This is CLIENT-SIDE only; server-side RLS is the real security layer
 *
 * To add a new permission:
 * 1. Add key to PermissionKey type
 * 2. Add it to the appropriate role's permission set below
 * 3. Use usePermission('your:permission') or canAccess('your:permission') in components
 */

// --- Permission Key Enum ---

export type PermissionKey =
  // System
  | 'system:admin'
  | 'system:config'
  | 'system:audit'
  // Team
  | 'team:manage'
  | 'team:members'
  | 'team:roles'
  // Goals & OKR
  | 'goals:read'
  | 'goals:write'
  | 'goals:delete'
  // Tasks
  | 'tasks:read'
  | 'tasks:write'
  | 'tasks:delete'
  | 'tasks:assign'
  // Projects
  | 'projects:read'
  | 'projects:write'
  | 'projects:delete'
  // Knowledge
  | 'knowledge:read'
  | 'knowledge:write'
  // AI
  | 'ai:chat'
  | 'ai:agents'
  | 'ai:config'
  // Reports & Data
  | 'reports:read'
  | 'reports:export'
  | 'data:import'
  | 'data:export';

// --- Role Permission Sets ---

const ADMIN_PERMISSIONS: Set<PermissionKey> = new Set([
  'system:admin', 'system:config', 'system:audit',
  'team:manage', 'team:members', 'team:roles',
  'goals:read', 'goals:write', 'goals:delete',
  'tasks:read', 'tasks:write', 'tasks:delete', 'tasks:assign',
  'projects:read', 'projects:write', 'projects:delete',
  'knowledge:read', 'knowledge:write',
  'ai:chat', 'ai:agents', 'ai:config',
  'reports:read', 'reports:export', 'data:import', 'data:export',
]);

const MANAGER_PERMISSIONS: Set<PermissionKey> = new Set([
  'team:members', 'team:roles',
  'goals:read', 'goals:write', 'goals:delete',
  'tasks:read', 'tasks:write', 'tasks:delete', 'tasks:assign',
  'projects:read', 'projects:write', 'projects:delete',
  'knowledge:read', 'knowledge:write',
  'ai:chat', 'ai:agents',
  'reports:read', 'reports:export',
]);

const MEMBER_PERMISSIONS: Set<PermissionKey> = new Set([
  'goals:read', 'goals:write',
  'tasks:read', 'tasks:write',
  'projects:read', 'projects:write',
  'knowledge:read', 'knowledge:write',
  'ai:chat',
  'reports:read',
]);

const VIEWER_PERMISSIONS: Set<PermissionKey> = new Set([
  'goals:read',
  'tasks:read',
  'projects:read',
  'knowledge:read',
  'ai:chat',
  'reports:read',
]);

const AGENT_PERMISSIONS: Set<PermissionKey> = new Set([
  'tasks:read', 'tasks:write',
  'goals:read',
  'projects:read',
  'knowledge:read', 'knowledge:write',
  'ai:chat', 'ai:agents', 'ai:config',
  'reports:read', 'data:export',
]);

// Role key → permission set mapping
const ROLE_PERMISSIONS: Record<string, Set<PermissionKey>> = {
  admin: ADMIN_PERMISSIONS,
  owner: ADMIN_PERMISSIONS,
  leader: MANAGER_PERMISSIONS,
  manager: MANAGER_PERMISSIONS,
  member: MEMBER_PERMISSIONS,
  viewer: VIEWER_PERMISSIONS,
  agent: AGENT_PERMISSIONS,
};

// Admin roles that bypass all permission checks
const ADMIN_ROLES = new Set(['admin', 'owner']);

/**
 * canAccess — synchronous permission check.
 * Uses the provided role string; if omitted, falls back to appStore.
 * Admin/owner always returns true.
 */
export function canAccess(permission: PermissionKey, roleOverride?: string): boolean {
  const userRole = roleOverride ?? getAppRole();

  // Admin bypass
  if (ADMIN_ROLES.has(userRole)) return true;

  const permSet = ROLE_PERMISSIONS[userRole];
  if (!permSet) return false;
  return permSet.has(permission);
}

/**
 * getRolePermissions — get all permissions for a role key.
 * Returns empty set for unknown roles.
 */
export function getRolePermissions(roleKey: string): Set<PermissionKey> {
  return ROLE_PERMISSIONS[roleKey] ?? new Set();
}

// Lazily resolve role from appStore (only when no override is provided).
// Uses dynamic import() to avoid circular dependency at module load time,
// and caches the store reference after first resolution.
let _storeRef: typeof import('@/stores/appStore') | null = null;

function getAppRole(): string {
  if (!_storeRef) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy store resolution to break circular dep
    _storeRef = require('@/stores/appStore');
  }
  return _storeRef.useAppStore.getState().authUser?.role ?? 'member';
}

/**
 * ALL_PERMISSION_KEYS — for admin UI to list all available permissions.
 */
export const ALL_PERMISSION_KEYS: PermissionKey[] = [
  'system:admin', 'system:config', 'system:audit',
  'team:manage', 'team:members', 'team:roles',
  'goals:read', 'goals:write', 'goals:delete',
  'tasks:read', 'tasks:write', 'tasks:delete', 'tasks:assign',
  'projects:read', 'projects:write', 'projects:delete',
  'knowledge:read', 'knowledge:write',
  'ai:chat', 'ai:agents', 'ai:config',
  'reports:read', 'reports:export', 'data:import', 'data:export',
];

/**
 * PERMISSION_LABELS — Chinese labels for admin UI display.
 */
export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  'system:admin': '系统管理',
  'system:config': '系统配置',
  'system:audit': '审计日志',
  'team:manage': '团队管理',
  'team:members': '成员管理',
  'team:roles': '角色权限',
  'goals:read': '查看目标',
  'goals:write': '编辑目标',
  'goals:delete': '删除目标',
  'tasks:read': '查看任务',
  'tasks:write': '编辑任务',
  'tasks:delete': '删除任务',
  'tasks:assign': '分配任务',
  'projects:read': '查看项目',
  'projects:write': '编辑项目',
  'projects:delete': '删除项目',
  'knowledge:read': '查看知识库',
  'knowledge:write': '编辑知识库',
  'ai:chat': 'AI对话',
  'ai:agents': 'Agent管理',
  'ai:config': 'AI配置',
  'reports:read': '查看报表',
  'reports:export': '导出报表',
  'data:import': '数据导入',
  'data:export': '数据导出',
};
