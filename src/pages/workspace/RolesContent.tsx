import { useState } from 'react';
import { useRoles } from '@/hooks/useMatrix';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { Shield, Plus, Users, Lock, Eye, Trash2 } from 'lucide-react';
import { CardSkeleton } from '@/components/Skeleton';
import { ALL_PERMISSION_KEYS, getRolePermissions, canAccess } from '@/lib/permissions';
import type { PermissionKey } from '@/lib/permissions';
import { t } from '@/lib/i18nCore';

/** Lazy i18n lookup for permission labels — same pattern as ActivitiesContent TYPE_CFG */
const PERM_LABEL: Record<PermissionKey, () => string> = {
  'system:admin': () => t('roles.permSystemAdmin'),
  'system:config': () => t('roles.permSystemConfig'),
  'system:audit': () => t('roles.permSystemAudit'),
  'team:manage': () => t('roles.permTeamManage'),
  'team:members': () => t('roles.permTeamMembers'),
  'team:roles': () => t('roles.permTeamRoles'),
  'goals:read': () => t('roles.permGoalsRead'),
  'goals:write': () => t('roles.permGoalsWrite'),
  'goals:delete': () => t('roles.permGoalsDelete'),
  'tasks:read': () => t('roles.permTasksRead'),
  'tasks:write': () => t('roles.permTasksWrite'),
  'tasks:delete': () => t('roles.permTasksDelete'),
  'tasks:assign': () => t('roles.permTasksAssign'),
  'projects:read': () => t('roles.permProjectsRead'),
  'projects:write': () => t('roles.permProjectsWrite'),
  'projects:delete': () => t('roles.permProjectsDelete'),
  'knowledge:read': () => t('roles.permKnowledgeRead'),
  'knowledge:write': () => t('roles.permKnowledgeWrite'),
  'ai:chat': () => t('roles.permAiChat'),
  'ai:agents': () => t('roles.permAiAgents'),
  'ai:config': () => t('roles.permAiConfig'),
  'reports:read': () => t('roles.permReportsRead'),
  'reports:export': () => t('roles.permReportsExport'),
  'data:import': () => t('roles.permDataImport'),
  'data:export': () => t('roles.permDataExport'),
};

const DEFAULT_PERMS: PermissionKey[] = ['goals:read', 'tasks:read', 'projects:read', 'knowledge:read', 'ai:chat', 'reports:read'];

export default function RolesContent() {
  const { roles, addRole, editRole, removeRole, loading } = useRoles();
  const { open, openModal, closeModal } = useModal();
  const [activeRole, setActiveRole] = useState<typeof roles[number] | null>(null);
  const [form, setForm] = useState({ key: '', name: '', description: '' });
  const [formPerms, setFormPerms] = useState<string[]>([]);

  function openCreate() {
    setActiveRole(null);
    setForm({ key: '', name: '', description: '' });
    setFormPerms(DEFAULT_PERMS);
    openModal();
  }

  function openEdit(r: typeof roles[number]) {
    setActiveRole(r);
    setForm({ key: r.key, name: r.name, description: r.description ?? '' });
    setFormPerms([...r.permissions]);
    openModal();
  }

  function togglePerm(perm: string) {
    setFormPerms((prev) => prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]);
  }

  async function handleSave() {
    if (activeRole) {
      await editRole(activeRole.id, { key: form.key, name: form.name, permissions: formPerms, description: form.description });
    } else {
      await addRole({ key: form.key, name: form.name, members: 0, permissions: formPerms, color: `hsl(${Math.random() * 360},60%,50%)` });
    }
    closeModal();
  }

  async function handleDelete(id: string) {
    await removeRole(id);
  }

  if (loading) {
    return (
      <CardSkeleton />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <Shield size={18} className="text-primary-2" />
        <span className="text-sm font-bold">{t('roles.title')}</span>
        <button onClick={openCreate} className="ml-auto flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20">
          <Plus size={12} />
          {t('roles.createRole')}
        </button>
      </div>

      {/* Permission Matrix */}
      <div className="rounded-xl border border-border bg-surface overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-surface-2/50">
              <th className="px-3 py-2 text-left font-semibold text-text-3 whitespace-nowrap">{t('roles.permItem')}</th>
              {roles.map((r) => (
                <th key={r.key} className="px-2 py-2 text-center font-semibold whitespace-nowrap" style={{ color: r.color }}>
                  {r.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_PERMISSION_KEYS.map((permKey, i) => (
              <tr key={permKey} className={i % 2 === 0 ? '' : 'bg-surface-2/30'}>
                <td className="px-3 py-1.5 text-text-2 whitespace-nowrap">{PERM_LABEL[permKey]()}</td>
                {roles.map((r) => {
                  const hasSystemPerms = getRolePermissions(r.key).size > 0;
                  const hasPerm = hasSystemPerms
                    ? canAccess(permKey, r.key)
                    : r.permissions.includes(permKey);
                  return (
                    <td key={r.key} className="px-2 py-1.5 text-center">
                      {hasPerm ? (
                        <span className="inline-block h-4 w-4 rounded-full bg-success/20 text-success text-[9px] leading-4">&#10003;</span>
                      ) : (
                        <span className="inline-block h-4 w-4 rounded-full bg-surface-2 text-text-3 text-[9px] leading-4">&#8212;</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role Cards */}
      <div className="space-y-3">
        {roles.map((r) => (
          <div key={r.key} onClick={() => openEdit(r)} className="rounded-xl border border-border bg-surface p-3 md:p-4 transition-all hover:border-border-2 hover:shadow-lg cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: r.color }} />
                <span className="text-sm font-semibold text-text">{r.name}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1 text-text-3">
                <Users size={12} />
                <span className="text-[10px]">{t('roles.memberCount', { count: r.members })}</span>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} aria-label={t('roles.deleteRole')} className="ml-2 rounded p-1 text-text-3 hover:text-danger hover:bg-danger/10 transition-colors"><Trash2 size={12} /></button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {r.permissions.map((p) => {
                const permKey = p as PermissionKey;
                const label = PERM_LABEL[permKey] ? PERM_LABEL[permKey]() : p;
                const isReadonly = p.endsWith(':read');
                return (
                  <span key={p} className="rounded-full px-2 py-0.5 text-[9px] bg-surface-2 text-text-2 flex items-center gap-1">
                    {isReadonly ? <Eye size={9} /> : <Lock size={9} />}
                    {label}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Role Modal */}
      <Modal
        open={open}
        onClose={closeModal}
        title={activeRole ? t('roles.editRole') : t('roles.createRole')}
        footer={
          <>
            <button onClick={closeModal} className={btnSecondary}>{t('roles.cancel')}</button>
            <button onClick={handleSave} className={btnPrimary}>{activeRole ? t('roles.save') : t('roles.create')}</button>
          </>
        }
      >
        <ModalField label={t('roles.roleKey')}>
          <input className={inputCls} value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))} placeholder={t('roles.roleKeyPlaceholder')} />
        </ModalField>
        <ModalField label={t('roles.displayName')}>
          <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t('roles.displayNamePlaceholder')} />
        </ModalField>
        <ModalField label={t('roles.description')}>
          <input className={inputCls} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={t('roles.descriptionPlaceholder')} />
        </ModalField>
        <div className="mt-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-text-3 mb-2">{t('roles.permConfig')}</div>
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {ALL_PERMISSION_KEYS.map((permKey) => {
              const label = PERM_LABEL[permKey]();
              return (
                <label key={permKey} className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 cursor-pointer hover:border-border-2 transition-colors" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={formPerms.includes(permKey)} onChange={() => togglePerm(permKey)} className="accent-primary-2 h-3 w-3" />
                  <span className="text-[11px] text-text-2">{label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </Modal>
    </div>
  );
}
