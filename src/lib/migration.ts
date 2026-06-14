/**
 * TBH → TBH-Next Data Migration
 *
 * Migrates data from legacy TBH localStorage keys to TBH-Next format.
 * Maps old data structures to new Supabase schema where possible.
 *
 * DR-19: Data persistence defaults to Supabase; localStorage only for UI preferences.
 */

// ── Key mapping: TBH old → TBH-Next new ──

const KEY_MIGRATION_MAP: Record<string, string> = {
  'tbh-goals': 'tbh-next-goals',
  'tbh-tasks': 'tbh-next-tasks',
  'tbh-projects': 'tbh-next-projects',
  'tbh-members': 'tbh-next-members',
  'tbh-action-items': 'tbh-next-action-items',
  'tbh-deviation-alerts': 'tbh-next-deviation-alerts',
  'tbh-knowledge': 'tbh-next-knowledge',
  'tbh-notes': 'tbh-next-notes',
  'tbh-sprints': 'tbh-next-sprints',
  'tbh-tags': 'tbh-next-tags',
  'tbh-bookmarks': 'tbh-next-bookmarks',
};

// ── Field mapping for tasks ──

const TASK_FIELD_MAP: Record<string, string> = {
  'parentId': 'parent_id',
  'assigneeId': 'assignee_id',
  'leaderId': 'leader_id',
  'dueDate': 'due_date',
  'goalId': 'goal_id',
  'projectId': 'project_id',
  'createdAt': 'created_at',
  'updatedAt': 'updated_at',
  'completedAt': 'completed_at',
  'dependencyIds': 'dependency_ids',
  'subtaskIds': 'subtask_ids',
  'estimatedHours': 'estimated_hours',
  'actualHours': 'actual_hours',
};

// ── Field mapping for goals ──

const GOAL_FIELD_MAP: Record<string, string> = {
  'ownerId': 'owner_id',
  'leaderId': 'leader_id',
  'endDate': 'end_date',
  'startDate': 'start_date',
  'keyResults': 'key_results',
};

// ── Core migration functions ──

function renameKeys(obj: Record<string, unknown>, fieldMap: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = fieldMap[key] ?? key;
    result[newKey] = value;
  }
  return result;
}

function migrateItems(items: unknown[], fieldMap: Record<string, string>): unknown[] {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    if (typeof item === 'object' && item !== null) {
      return renameKeys(item as Record<string, unknown>, fieldMap);
    }
    return item;
  });
}

export interface MigrationResult {
  success: boolean;
  migratedKeys: string[];
  errors: string[];
  totalItems: number;
}

/**
 * Run full migration from TBH to TBH-Next.
 * Returns a summary of what was migrated.
 */
export function migrateFromTBH(): MigrationResult {
  const result: MigrationResult = {
    success: true,
    migratedKeys: [],
    errors: [],
    totalItems: 0,
  };

  // Step 1: Rename localStorage keys
  for (const [oldKey, newKey] of Object.entries(KEY_MIGRATION_MAP)) {
    try {
      const oldData = localStorage.getItem(oldKey);
      if (!oldData) continue;

      // Only migrate if new key doesn't already have data
      const existingData = localStorage.getItem(newKey);
      if (existingData) {
        result.errors.push(`跳过 ${oldKey}: 新键 ${newKey} 已有数据`);
        continue;
      }

      // Parse and migrate field names
      let data: unknown;
      try {
        data = JSON.parse(oldData);
      } catch {
        // If can't parse, just copy as-is
        localStorage.setItem(newKey, oldData);
        result.migratedKeys.push(oldKey);
        continue;
      }

      // Apply field mapping for known entity types
      let migrated: unknown = data;
      if (oldKey.includes('tasks') && Array.isArray(data)) {
        migrated = migrateItems(data, TASK_FIELD_MAP);
      } else if (oldKey.includes('goals') && Array.isArray(data)) {
        migrated = migrateItems(data, GOAL_FIELD_MAP);
      }

      localStorage.setItem(newKey, JSON.stringify(migrated));
      result.migratedKeys.push(oldKey);

      if (Array.isArray(migrated)) {
        result.totalItems += migrated.length;
      }
    } catch (err) {
      result.errors.push(`迁移 ${oldKey} 失败: ${String(err)}`);
      result.success = false;
    }
  }

  // Step 2: Mark migration as complete
  localStorage.setItem('tbh-next-migration-complete', new Date().toISOString());

  return result;
}

/**
 * Check if migration has already been completed.
 */
export function isMigrationComplete(): boolean {
  return !!localStorage.getItem('tbh-next-migration-complete');
}

/**
 * Get migration status for display.
 */
export function getMigrationStatus(): {
  hasOldData: boolean;
  oldKeys: string[];
  migrationComplete: boolean;
} {
  const oldKeys: string[] = [];
  for (const oldKey of Object.keys(KEY_MIGRATION_MAP)) {
    if (localStorage.getItem(oldKey)) {
      oldKeys.push(oldKey);
    }
  }

  return {
    hasOldData: oldKeys.length > 0,
    oldKeys,
    migrationComplete: isMigrationComplete(),
  };
}
// FROZEN (W14) — 0 active consumers; kept for potential M2 reactivation
