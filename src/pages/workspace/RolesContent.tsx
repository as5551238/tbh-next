import { useState } from 'react';
import { useRoles } from '@/hooks/useMatrix';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { Shield, Plus, Users, Lock, Eye, Trash2 } from 'lucide-react';
import { CardSkeleton } from '@/components/Skeleton';
import { ALL_PERMISSION_KEYS, PERMISSION_LABELS, getRolePermissions, canAccess } from '@/lib/permissions';
import type { PermissionKey } from '@/lib/permissions';

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
        <span className="text-sm font-bold">角色权限</span>
        <button onClick={openCreate} className="ml-auto flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20">
          <Plus size={12} />
          新建角色
        </button>
      </div>

      {/* Permission Matrix — uses system-defined role permission sets */}
      <div className="rounded-xl border border-border bg-surface overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-surface-2/50">
              <th className="px-3 py-2 text-left font-semibold text-text-3 whitespace-nowrap">权限项</th>
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
                <td className="px-3 py-1.5 text-text-2 whitespace-nowrap">{PERMISSION_LABELS[permKey]}</td>
                {roles.map((r) => {
                  // System roles use getRolePermissions; custom roles check r.permissions array
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
                <span className="text-[10px]">{r.members} 人</span>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} className="ml-2 rounded p-1 text-text-3 hover:text-danger hover:bg-danger/10 transition-colors"><Trash2 size={12} /></button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {r.permissions.map((p) => {
                const label = (PERMISSION_LABELS as Record<string, string>)[p] ?? p;
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
        title={activeRole ? '编辑角色' : '新建角色'}
        footer={
          <>
            <button onClick={closeModal} className={btnSecondary}>取消</button>
            <button onClick={handleSave} className={btnPrimary}>{activeRole ? '保存' : '创建'}</button>
          </>
        }
      >
        <ModalField label="角色名称 (Key)">
          <input className={inputCls} value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))} placeholder="如 admin、member" />
        </ModalField>
        <ModalField label="显示名称">
          <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="如 管理员、成员" />
        </ModalField>
        <ModalField label="描述 (可选)">
          <input className={inputCls} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="角色的简要描述" />
        </ModalField>
        <div className="mt-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-text-3 mb-2">权限配置</div>
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {ALL_PERMISSION_KEYS.map((permKey) => {
              const label = PERMISSION_LABELS[permKey];
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
