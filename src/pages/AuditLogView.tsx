import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuditEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  performed_by: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  team_id: string | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  INSERT: 'text-[#00d4aa]',
  UPDATE: 'text-[#f5a623]',
  DELETE: 'text-[#ef4444]',
};

const TABLE_LABELS: Record<string, string> = {
  goals: '目标',
  tasks: '任务',
  projects: '项目',
  members: '成员',
  knowledge: '知识库',
  comments: '评论',
  categories: '分类',
  tags: '标签',
  templates: '模板',
  sprints: '迭代',
  notifications: '通知',
};

export default function AuditLogView() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ table: '', action: '', search: '' });
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

  const fetchLogs = useCallback(async (pageNum: number, reset = false) => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      let query = supabase!
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (filter.table) query = query.eq('table_name', filter.table);
      if (filter.action) query = query.eq('action', filter.action);

      const { data, error } = await query;
      if (error) throw error;

      const entries = (data || []) as AuditEntry[];
      setLogs(reset ? entries : (prev) => [...prev, ...entries]);
      setHasMore(entries.length === PAGE_SIZE);
    } catch {
      // Silently fail - audit logs may not be accessible for non-admins
    } finally {
      setLoading(false);
    }
  }, [filter.table, filter.action]);

  useEffect(() => {
    setLoading(true);
    setPage(0);
    fetchLogs(0, true);
  }, [fetchLogs]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchLogs(nextPage);
  };

  const exportLogs = () => {
    const csv = [
      ['时间', '操作', '表', '记录ID', '操作人'].join(','),
      ...logs.map((l) =>
        [l.created_at, l.action, l.table_name, l.record_id, l.performed_by].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter(
    (l) =>
      !filter.search ||
      l.table_name.includes(filter.search) ||
      l.record_id.includes(filter.search) ||
      l.action.includes(filter.search)
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#eaecf4]">审计日志</h1>
          <p className="text-sm text-[#9ca3b8] mt-1">
            记录所有数据变更操作，确保合规与可追溯性
          </p>
        </div>
        <button
          onClick={exportLogs}
          className="px-3 py-1.5 bg-[#7b6cf0] text-white text-sm rounded-lg hover:bg-[#6b5ce0] transition-colors"
          disabled={logs.length === 0}
        >
          导出 CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={filter.table}
          onChange={(e) => setFilter({ ...filter, table: e.target.value })}
          className="bg-[#13161f] text-[#eaecf4] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm"
        >
          <option value="">全部表</option>
          {Object.entries(TABLE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <select
          value={filter.action}
          onChange={(e) => setFilter({ ...filter, action: e.target.value })}
          className="bg-[#13161f] text-[#eaecf4] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm"
        >
          <option value="">全部操作</option>
          <option value="INSERT">创建</option>
          <option value="UPDATE">更新</option>
          <option value="DELETE">删除</option>
        </select>

        <input
          type="text"
          placeholder="搜索..."
          value={filter.search}
          onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          className="bg-[#13161f] text-[#eaecf4] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm flex-1 max-w-xs"
        />
      </div>

      {/* Log table */}
      {loading ? (
        <div className="text-center py-12 text-[#9ca3b8]">加载中...</div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-12 text-[#9ca3b8]">
          {logs.length === 0 ? '暂无审计日志（需管理员权限）' : '无匹配记录'}
        </div>
      ) : (
        <div className="border border-[#2a2d3a] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#13161f]">
                <th className="px-4 py-2.5 text-left text-[#9ca3b8] font-medium">时间</th>
                <th className="px-4 py-2.5 text-left text-[#9ca3b8] font-medium">操作</th>
                <th className="px-4 py-2.5 text-left text-[#9ca3b8] font-medium">对象</th>
                <th className="px-4 py-2.5 text-left text-[#9ca3b8] font-medium">记录ID</th>
                <th className="px-4 py-2.5 text-left text-[#9ca3b8] font-medium">操作人</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-t border-[#1e2030] hover:bg-[#0d0f16]">
                  <td className="px-4 py-2 text-[#9ca3b8]">
                    {new Date(log.created_at).toLocaleString('zh-CN')}
                  </td>
                  <td className={`px-4 py-2 font-medium ${ACTION_COLORS[log.action] || 'text-[#eaecf4]'}`}>
                    {log.action === 'INSERT' ? '创建' : log.action === 'UPDATE' ? '更新' : '删除'}
                  </td>
                  <td className="px-4 py-2 text-[#eaecf4]">
                    {TABLE_LABELS[log.table_name] || log.table_name}
                  </td>
                  <td className="px-4 py-2 text-[#9ca3b8] font-mono text-xs">
                    {log.record_id?.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-2 text-[#9ca3b8] font-mono text-xs">
                    {log.performed_by?.slice(0, 8) || '-'}...
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {hasMore && (
            <div className="p-3 text-center border-t border-[#1e2030]">
              <button
                onClick={loadMore}
                className="text-[#7b6cf0] hover:underline text-sm"
              >
                加载更多
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
