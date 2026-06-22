import { useState, useEffect, useCallback } from 'react';
import { fetchAuditLogs } from '@/lib/dataLayer';
import type { AuditLogRow } from '@/lib/dataLayer';
import { t } from '@/lib/i18n';

type AuditEntry = AuditLogRow;
const ACTION_COLORS: Record<string, string> = {
  INSERT: 'text-accent',
  UPDATE: 'text-manuf',
  DELETE: 'text-danger-bright',
};

const TABLE_LABELS: Record<string, () => string> = {
  goals: () => t('auditLog.tableGoals'),
  tasks: () => t('auditLog.tableTasks'),
  projects: () => t('auditLog.tableProjects'),
  members: () => t('auditLog.tableMembers'),
  knowledge: () => t('auditLog.tableKnowledge'),
  comments: () => t('auditLog.tableComments'),
  categories: () => t('auditLog.tableCategories'),
  tags: () => t('auditLog.tableTags'),
  templates: () => t('auditLog.tableTemplates'),
  sprints: () => t('auditLog.tableSprints'),
  notifications: () => t('auditLog.tableNotifications'),
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
      [t('auditLog.csvTime'), t('auditLog.csvAction'), t('auditLog.csvTable'), t('auditLog.csvRecordId'), t('auditLog.csvOperator')].join(','),
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
          <h1 className="text-xl font-bold text-text">{t('auditLog.title')}</h1>
          <p className="text-sm text-text-muted mt-1">
            {t('auditLog.subtitle')}
          </p>
        </div>
        <button onClick={exportLogs} className="px-3 py-1.5 bg-brand-accent text-white text-sm rounded-lg hover:bg-brand-accent-hover transition-colors" disabled={logs.length === 0}>
          {t('auditLog.exportCSV')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select value={filter.table} onChange={(e) => setFilter({ ...filter, table: e.target.value === '__EMPTY__' ? '' : e.target.value })} className="bg-surface text-text border border-border-2 rounded-lg px-3 py-2 text-sm">
          <option value="__EMPTY__">{t('auditLog.allTables')}</option>
          {Object.entries(TABLE_LABELS).map(([key, labelFn]) => (
            <option key={key} value={key}>{labelFn()}</option>
          ))}
        </select>

        <select value={filter.action} onChange={(e) => setFilter({ ...filter, action: e.target.value === '__EMPTY__' ? '' : e.target.value })} className="bg-surface text-text border border-border-2 rounded-lg px-3 py-2 text-sm">
          <option value="__EMPTY__">{t('auditLog.allActions')}</option>
          <option value="INSERT">{t('auditLog.actionCreate')}</option>
          <option value="UPDATE">{t('auditLog.actionUpdate')}</option>
          <option value="DELETE">{t('auditLog.actionDelete')}</option>
        </select>

        <input type="text" aria-label={t('auditLog.searchAria')} placeholder={t('auditLog.searchPlaceholder')} value={filter.search} onChange={(e) => setFilter({ ...filter, search: e.target.value })} className="bg-surface text-text border border-border-2 rounded-lg px-3 py-2 text-sm flex-1 max-w-xs" />
      </div>

      {/* Log table */}
      {loading ? (
        <div className="text-center py-12 text-text-muted">{t('common.loading')}</div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          {logs.length === 0 ? t('auditLog.noLogs') : t('auditLog.noMatch')}
        </div>
      ) : (
        <div className="border border-border-2 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface">
                <th className="px-4 py-2.5 text-left text-text-muted font-medium">{t('auditLog.colTime')}</th>
                <th className="px-4 py-2.5 text-left text-text-muted font-medium">{t('auditLog.colAction')}</th>
                <th className="px-4 py-2.5 text-left text-text-muted font-medium">{t('auditLog.colObject')}</th>
                <th className="px-4 py-2.5 text-left text-text-muted font-medium">{t('auditLog.colRecordId')}</th>
                <th className="px-4 py-2.5 text-left text-text-muted font-medium">{t('auditLog.colOperator')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-t hover:bg-surface-deep" style={{ borderColor: 'var(--border-default)' }}>
                  <td className="px-4 py-2 text-text-muted">
                    {new Date(log.created_at).toLocaleString('zh-CN')}
                  </td>
                  <td className={`px-4 py-2 font-medium ${ACTION_COLORS[log.action] || 'text-text'}`}>
                    {log.action === 'INSERT' ? t('auditLog.actionCreate') : log.action === 'UPDATE' ? t('auditLog.actionUpdate') : t('auditLog.actionDelete')}
                  </td>
                  <td className="px-4 py-2 text-text">
                    {TABLE_LABELS[log.table_name] ? TABLE_LABELS[log.table_name]() : log.table_name}
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
                {t('auditLog.loadMore')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
