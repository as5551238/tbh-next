import { useState, useEffect, useCallback } from 'react';
import { fetchAuditLogs } from '@/lib/dataLayer';
import type { AuditLogRow } from '@/lib/dataLayer';

type AuditEntry = AuditLogRow;
const ACTION_COLORS: Record<string, string> = {
  INSERT: 'text-accent',
  UPDATE: 'text-manuf',
  DELETE: 'text-danger-bright',
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
    try {
      const result = await fetchAuditLogs('__default__', {
        table: filter.table || undefined,
        action: filter.action || undefined,
      }, pageNum, PAGE_SIZE);
      setLogs(reset ? result.data : (prev) => [...prev, ...result.data]);
      setHasMore(result.hasMore);
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
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text">审计日志</h1>
          <p className="text-sm text-text-muted mt-1">
            记录所有数据变更操作，确保合规与可追溯性
          </p>
        </div>
        <button onClick={exportLogs} className="px-3 py-1.5 bg-brand-accent text-white text-sm rounded-lg hover:bg-brand-accent-hover transition-colors" disabled={logs.length === 0}>
          导出 CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select value={filter.table} onChange={(e) => setFilter({ ...filter, table: e.target.value })} className="bg-surface text-text border border-border-2 rounded-lg px-3 py-2 text-sm">
          <option value="">全部表</option>
          {Object.entries(TABLE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <select value={filter.action} onChange={(e) => setFilter({ ...filter, action: e.target.value })} className="bg-surface text-text border border-border-2 rounded-lg px-3 py-2 text-sm">
          <option value="">全部操作</option>
          <option value="INSERT">创建</option>
          <option value="UPDATE">更新</option>
          <option value="DELETE">删除</option>
        </select>

        <input type="text" aria-label="搜索审计日志" placeholder="搜索..." value={filter.search} onChange={(e) => setFilter({ ...filter, search: e.target.value })} className="bg-surface text-text border border-border-2 rounded-lg px-3 py-2 text-sm flex-1 max-w-xs" />
      </div>

      {/* Log table */}
      {loading ? (
        <div className="text-center py-12 text-text-muted">加载中...</div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          {logs.length === 0 ? '暂无审计日志（需管理员权限）' : '无匹配记录'}
        </div>
      ) : (
        <div className="border border-border-2 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface">
                <th className="px-4 py-2.5 text-left text-text-muted font-medium">时间</th>
                <th className="px-4 py-2.5 text-left text-text-muted font-medium">操作</th>
                <th className="px-4 py-2.5 text-left text-text-muted font-medium">对象</th>
                <th className="px-4 py-2.5 text-left text-text-muted font-medium">记录ID</th>
                <th className="px-4 py-2.5 text-left text-text-muted font-medium">操作人</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-t hover:bg-surface-deep" style={{ borderColor: 'var(--border-default)' }}>
                  <td className="px-4 py-2 text-text-muted">
                    {new Date(log.created_at).toLocaleString('zh-CN')}
                  </td>
                  <td className={`px-4 py-2 font-medium ${ACTION_COLORS[log.action] || 'text-text'}`}>
                    {log.action === 'INSERT' ? '创建' : log.action === 'UPDATE' ? '更新' : '删除'}
                  </td>
                  <td className="px-4 py-2 text-text">
                    {TABLE_LABELS[log.table_name] || log.table_name}
                  </td>
                  <td className="px-4 py-2 text-text-muted font-mono text-xs">
                    {log.record_id?.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-2 text-text-muted font-mono text-xs">
                    {log.performed_by?.slice(0, 8) || '-'}...
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {hasMore && (
            <div className="p-3 text-center border-t" style={{ borderColor: 'var(--border-default)' }}>
              <button onClick={loadMore} className="text-brand-accent hover:underline text-sm">
                加载更多
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
