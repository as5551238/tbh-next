const TABLE_COLUMNS: Record<string, Set<string>> = {
  goals: new Set([
    'id', 'title', 'description', 'type', 'status', 'parent_id', 'level',
    'start_date', 'end_date', 'owner_id', 'key_results', 'progress',
    'created_at', 'updated_at', 'leader_id', 'supporter_ids',
    'canvas_x', 'canvas_y', 'priority', 'tags', 'category',
    'repeat_cycle', 'discussion_thread_id', 'summary',
    'tracking_records', 'attachments', 'selected_kr_ids', 'team_id', 'deleted_at',
  ]),
  tasks: new Set([
    'id', 'title', 'description', 'project_id', 'goal_id', 'status', 'priority',
    'assignee_id', 'owner_id', 'start_date', 'due_date', 'reminder_date',
    'completed_at', 'subtasks', 'tags', 'created_at', 'updated_at',
    'leader_id', 'supporter_ids', 'canvas_x', 'canvas_y', 'parent_id',
    'category', 'repeat_cycle', 'discussion_thread_id', 'summary',
    'tracking_records', 'attachments', 'blocked_by', 'sprint_id', 'team_id', 'deleted_at',
  ]),
  projects: new Set([
    'id', 'title', 'description', 'goal_id', 'status', 'start_date', 'end_date',
    'owner_id', 'member_ids', 'task_count', 'progress', 'created_at', 'updated_at',
    'leader_id', 'supporter_ids', 'parent_id', 'canvas_x', 'canvas_y', 'priority',
    'tags', 'category', 'repeat_cycle', 'discussion_thread_id', 'summary',
    'tracking_records', 'attachments', 'team_id', 'deleted_at',
  ]),
  members: new Set([
    'id', 'name', 'role', 'department', 'avatar', 'email', 'status',
    'join_date', 'created_at', 'updated_at', 'nickname', 'phone',
    'wechat_id', 'permissions', 'team_id',
  ]),
  notifications: new Set([
    'id', 'type', 'title', 'message', 'related_id', 'related_type',
    'member_id', 'read', 'created_at', 'team_id', 'level',
  ]),
  knowledge: new Set([
    'id', 'title', 'content', 'tags', 'member_id', 'related_items',
    'created_at', 'updated_at', 'team_id', 'color',
  ]),
  action_items: new Set([
    'id', 'title', 'description', 'source', 'source_id', 'goal_id',
    'assignee_id', 'status', 'priority', 'due_date', 'completed_at',
    'closed_loop', 'team_id', 'created_by', 'created_at', 'updated_at',
  ]),
  deviation_alerts: new Set([
    'id', 'goal_id', 'task_id', 'alert_type', 'severity', 'message',
    'is_read', 'is_resolved', 'resolved_at', 'action_item_id', 'team_id', 'created_at',
  ]),
  risks: new Set([
    'id', 'title', 'description', 'level', 'source', 'detected_at',
    'status', 'affected_kpi', 'team_id', 'created_at', 'updated_at',
  ]),
  approvals: new Set([
    'id', 'title', 'type', 'status', 'applicant_id', 'approver_id',
    'description', 'created_at', 'updated_at', 'team_id',
  ]),
  reports: new Set([
    'id', 'title', 'type', 'content', 'status', 'generated_at',
    'created_at', 'updated_at', 'team_id',
  ]),
  predictions: new Set([
    'id', 'title', 'impact', 'probability', 'trend', 'reason',
    'suggestion', 'created_at', 'updated_at', 'team_id',
  ]),
  experiences: new Set([
    'id', 'title', 'content', 'category', 'tags', 'created_at',
    'updated_at', 'team_id',
  ]),
  roles: new Set([
    'id', 'name', 'key', 'members', 'permissions', 'color',
    'description', 'sort_order', 'created_at', 'updated_at', 'team_id',
  ]),
  channels: new Set([
    'id', 'industry', 'dept', 'name', 'sort_order', 'created_at', 'updated_at',
  ]),
  org_info: new Set([
    'id', 'name', 'industry', 'size', 'plan', 'created', 'departments',
    'team_id', 'created_at', 'updated_at',
  ]),
  agent_details: new Set([
    'id', 'name', 'description', 'model', 'status', 'avatar', 'skills', 'config',
    'tasks_completed', 'uptime', 'enabled', 'capabilities', 'team_id', 'created_by',
    'sort_order', 'created_at', 'updated_at',
  ]),
  insights: new Set([
    'id', 'title', 'description', 'impact', 'kpi', 'team_id', 'created_at', 'updated_at',
  ]),
  workflow_instances: new Set([
    'id', 'workflow_id', 'name', 'status', 'current_step', 'usage_count', 'category', 'steps', 'is_built_in', 'team_id', 'created_at', 'updated_at',
  ]),
  messages: new Set([
    'id', 'channel', 'sender_id', 'sender_name', 'sender_type', 'content', 'team_id', 'created_at',
  ]),
  announcements: new Set([
    'id', 'title', 'content', 'priority', 'author', 'department', 'is_pinned', 'team_id', 'created_at', 'updated_at',
  ]),
  meetings: new Set([
    'id', 'title', 'time', 'duration', 'location', 'organizer', 'attendees', 'status', 'type', 'team_id', 'created_at', 'updated_at',
  ]),
  collab_docs: new Set([
    'id', 'title', 'content', 'last_editor', 'editors_count', 'status', 'team_id', 'created_at', 'updated_at',
  ]),
  shared_files: new Set([
    'id', 'name', 'size', 'type', 'uploader', 'category', 'team_id', 'created_at', 'updated_at',
  ]),
  contacts: new Set([
    'id', 'name', 'role', 'department', 'email', 'phone', 'avatar', 'team_id', 'created_at', 'updated_at',
  ]),
  docs: new Set([
    'id', 'title', 'type', 'status', 'author', 'editors', 'team_id', 'created_at', 'updated_at',
  ]),
  schedule_events: new Set([
    'id', 'title', 'time', 'type', 'location', 'team_id', 'created_at', 'updated_at',
  ]),
  agents: new Set([
    'id', 'industry', 'dept', 'name', 'description', 'status', 'sort_order', 'created_at', 'updated_at',
  ]),
  departments: new Set([
    'id', 'industry', 'name', 'sort_order', 'created_at', 'updated_at',
  ]),
  industries: new Set([
    'id', 'name', 'sort_order', 'color', 'created_at', 'updated_at',
  ]),
  kpis: new Set([
    'id', 'industry', 'dept', 'name', 'value', 'target', 'status', 'trend', 'sort_order', 'created_at', 'updated_at',
  ]),
  matrix_cells: new Set([
    'id', 'industry', 'dept', 'workflow', 'wf_current', 'top3', 'morning', 'ribbon', 'next_step', 'created_at', 'updated_at',
  ]),
  activities: new Set([
    'id', 'title', 'description', 'type', 'actor', 'target_type', 'target_id', 'team_id', 'created_at',
  ]),
  notes: new Set([
    'id', 'title', 'content', 'tags', 'color', 'pinned', 'member_id', 'team_id', 'created_at', 'updated_at',
  ]),
  sprints: new Set([
    'id', 'name', 'goal_id', 'status', 'start_date', 'end_date', 'total_tasks', 'completed_tasks', 'team_id', 'created_at', 'updated_at',
  ]),
  templates: new Set([
    'id', 'name', 'category', 'content', 'usage_count', 'is_built_in', 'team_id', 'created_at', 'updated_at',
  ]),
  bookmarks: new Set([
    'id', 'title', 'url', 'target_type', 'target_id', 'category', 'member_id', 'team_id', 'created_at',
  ]),
  comments: new Set([
    'id', 'content', 'author_id', 'target_type', 'target_id', 'parent_id', 'team_id', 'created_at', 'updated_at',
  ]),
  tags: new Set([
    'id', 'name', 'color', 'target_type', 'usage_count', 'team_id', 'created_at', 'updated_at',
  ]),
  categories: new Set([
    'id', 'name', 'type', 'icon', 'color', 'sort_order', 'team_id', 'created_at', 'updated_at',
  ]),
  feature_flags: new Set([
    'id', 'key', 'name', 'description', 'enabled', 'rollout_percentage', 'target_plan', 'team_id', 'created_at', 'updated_at',
  ]),
  saved_views: new Set([
    'id', 'name', 'module', 'filters', 'sort_by', 'columns', 'is_default', 'member_id', 'team_id', 'created_at', 'updated_at',
  ]),
  automation_rules: new Set([
    'id', 'name', 'trigger_type', 'trigger_config', 'action_type', 'action_config', 'is_active', 'priority', 'team_id', 'created_at', 'updated_at',
  ]),
  status_flow_rules: new Set([
    'id', 'entity_type', 'from_status', 'to_status', 'condition_config', 'auto_transition', 'require_comment', 'team_id', 'created_at', 'updated_at',
  ]),
  audit_logs: new Set([
    'id', 'table_name', 'record_id', 'action', 'performed_by',
    'old_data', 'new_data', 'team_id', 'created_at',
  ]),
  subscriptions: new Set([
    'id', 'user_id', 'plan', 'status', 'current_period_end',
    'created_at', 'updated_at',
  ]),
  usage_events: new Set([
    'id', 'user_id', 'event_type', 'detail', 'created_at',
  ]),
  item_links: new Set([
    'id', 'source_id', 'source_type', 'target_id', 'target_type', 'label', 'created_at', 'team_id',
  ]),
  api_keys: new Set([
    'id', 'team_id', 'user_id', 'provider', 'encrypted_key', 'created_at',
  ]),
  agent_configs: new Set([
    'id', 'name', 'model', 'temperature', 'max_tokens', 'system_prompt',
    'schedule', 'enabled', 'sort_order', 'team_id', 'member_id',
    'created_at', 'updated_at',
  ]),
  installed_agents: new Set([
    'id', 'agent_id', 'team_id', 'member_id', 'installed_at',
  ]),
  running_workflows: new Set([
    'id', 'user_id', 'workflow_id', 'started_at',
  ]),
  mcp_status: new Set([
    'id', 'user_id', 'server_id', 'status', 'updated_at',
  ]),
  installed_packs: new Set([
    'id', 'user_id', 'pack_id', 'installed_at',
  ]),
  knowledge_packs: new Set([
    'id', 'industry', 'title', 'description', 'category', 'content',
    'tags', 'author', 'version', 'downloads', 'rating',
    'is_official', 'plan', 'updated_at', 'team_id',
  ]),
  marketplace_agents: new Set([
    'id', 'name', 'icon', 'author', 'category', 'description',
    'long_description', 'version', 'downloads', 'rating',
    'review_count', 'tags', 'system_prompt', 'capabilities',
    'is_official', 'price', 'team_id',
  ]),
  review_sessions: new Set([
    'id', 'model_id', 'target_type', 'target_id', 'target_title',
    'current_step', 'inputs', 'status', 'draft', 'action_items',
    'effectiveness_score', 'performance_score', 'team_id',
    'created_at', 'updated_at',
  ]),
};

const FK_COLUMNS = new Set([
  'owner_id', 'leader_id', 'supporter_ids', 'assignee_id', 'parent_id',
  'goal_id', 'project_id', 'member_id', 'linked_item_id', 'source_id',
  'target_id', 'related_id', 'item_id', 'created_by', 'updated_by',
]);

function filterColumns(table: string, data: Record<string, unknown>): Record<string, unknown> {
  const allowed = TABLE_COLUMNS[table];
  if (!allowed) return data;
  const filtered: Record<string, unknown> = {};
  for (const key of Object.keys(data)) {
    if (allowed.has(key)) {
      filtered[key] = data[key];
    }
  }
  return filtered;
}

export { TABLE_COLUMNS, FK_COLUMNS, filterColumns };
