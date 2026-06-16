import { useState } from 'react';
import { useMembers } from '@/hooks/useMatrix';
import type { MemberRow } from '@/lib/dataLayer';
import { useAppStore } from '@/stores/appStore';
import { getDepartments } from '@/matrix/data';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { hasFeature } from '@/lib/subscription';
import { Users, Plus, Lock, Search, MoreHorizontal, Mail, Phone, Trash2 } from 'lucide-react';
import { CardSkeleton } from '@/components/Skeleton';
import { exportToCSV, exportToJSON } from '@/lib/export';
import { t } from '@/lib/i18nCore';

export default function MembersContent() {
  const isPro = hasFeature('advancedAnalytics' as never);
  const { members, loading, addMember, editMember, removeMember } = useMembers();
  const industry = useAppStore((s) => s.industry);
  const deptOptions = getDepartments(industry);
  const inviteModal = useModal();
  const editModal = useModal();
  const [editingMember, setEditingMember] = useState<{ id: string; name: string; department: string; email: string; role: string; phone: string } | null>(null);
  const [form, setForm] = useState({ name: '', department: '', email: '', role: 'member', phone: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [memberExportOpen, setMemberExportOpen] = useState(false);

  const roleMap: Record<string, { label: string; cls: string }> = {
    admin: { label: t('members.roleAdmin'), cls: 'bg-danger/10 text-danger' },
    manager: { label: t('members.roleManager'), cls: 'bg-warn/10 text-warn' },
    member: { label: t('members.roleMember'), cls: 'bg-primary/10 text-primary-2' },
    agent: { label: t('members.roleAi'), cls: 'bg-accent/10 text-accent' },
  };

  const filteredMembers = searchTerm
    ? members.filter((m) => m.name.includes(searchTerm) || m.department.includes(searchTerm) || m.email.includes(searchTerm))
    : members;

  function handleInvite() {
    if (!form.name.trim() || !form.email.trim()) return;
    addMember({ name: form.name, department: form.department, email: form.email, role: form.role, phone: form.phone, avatar: '', status: 'active', join_date: new Date().toISOString().split('T')[0], nickname: form.name } as Omit<MemberRow, 'id'>);
    setForm({ name: '', department: '', email: '', role: 'member', phone: '' });
    inviteModal.closeModal();
  }

  function handleEdit() {
    if (!editingMember || !form.name.trim()) return;
    editMember(editingMember.id, { name: form.name, department: form.department, role: form.role });
    setEditingMember(null);
    editModal.closeModal();
  }

  function openEdit(m: typeof members[0]) {
    setEditingMember({ id: m.id, name: m.name, department: m.department, email: m.email, role: m.role, phone: m.phone });
    setForm({ name: m.name, department: m.department, email: m.email, role: m.role, phone: m.phone });
    editModal.openModal();
  }

  const selectCls = inputCls.replace('text-text', 'text-text bg-surface-2');

  const memberExportHeaders = [t('members.exportName'), t('members.exportEmail'), t('members.exportRole'), t('members.exportDept'), t('members.exportStatus')];
  function handleExportMembersCSV() {
    const rows = members.map((m) => ({ [t('members.exportName')]: String(m.name ?? ''), [t('members.exportEmail')]: String(m.email ?? ''), [t('members.exportRole')]: String(m.role ?? ''), [t('members.exportDept')]: String(m.department ?? ''), [t('members.exportStatus')]: String(m.status ?? '') }));
    exportToCSV(memberExportHeaders, rows, 'members');
  }
  function handleExportMembersJSON() {
    const rows = members.map((m) => ({ [t('members.exportName')]: String(m.name ?? ''), [t('members.exportEmail')]: String(m.email ?? ''), [t('members.exportRole')]: String(m.role ?? ''), [t('members.exportDept')]: String(m.department ?? ''), [t('members.exportStatus')]: String(m.status ?? '') }));
    exportToJSON(rows, 'members');
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Users size={18} className="text-primary-2" />
        <span className="text-sm font-bold">{t('members.title')}</span>
        <span className="ml-auto text-[10px] text-text-3">{t('members.memberCount', { count: members.length })}</span>
        <button onClick={() => { if (!isPro) return; inviteModal.openModal(); }} className="flex flex-wrap items-center gap-1 rounded-lg bg-primary px-3 py-1 text-[11px] font-semibold text-white hover:bg-primary-2">
          <Plus size={12} />
          {t('members.inviteMember')}
        </button>
        <div className="relative">
          <button className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-text-3 hover:text-text-2" onClick={() => setMemberExportOpen((v) => !v)}>{t('members.exportBtn')}</button>
          {memberExportOpen && (<>
            <div className="fixed inset-0 z-40" onClick={() => setMemberExportOpen(false)} />
            <div className="absolute right-0 top-full z-50 mt-1 min-w-[100px] rounded-lg border border-border bg-surface py-1 shadow-lg">
              <button className="w-full px-3 py-1.5 text-left text-xs text-text-3 hover:bg-surface-2 hover:text-text-2" onClick={() => { setMemberExportOpen(false); handleExportMembersCSV(); }}>{t('members.exportCSV')}</button>
              <button className="w-full px-3 py-1.5 text-left text-xs text-text-3 hover:bg-surface-2 hover:text-text-2" onClick={() => { setMemberExportOpen(false); handleExportMembersJSON(); }}>{t('members.exportJSON')}</button>
            </div>
          </>)}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
        <Search size={14} className="text-text-3" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('members.searchPlaceholder')}
          className="flex-1 bg-transparent text-xs text-text outline-none placeholder:text-text-3"
        />
      </div>

      {loading ? (
        <CardSkeleton />
      ) : (
        <div className="space-y-2">
          {filteredMembers.map((m) => {
            const role = roleMap[m.role] || roleMap.member;
            return (
              <div key={m.id} className="group flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-all hover:border-border-2 hover:shadow-lg cursor-pointer" onClick={() => openEdit(m)}>
                <div className="relative shrink-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary-2">
                    {m.name.charAt(0)}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-text">{m.name}</span>
                    <span className={`rounded-full px-1.5 py-[1px] text-[8px] font-bold ${role.cls}`}>{role.label}</span>
                  </div>
                  <div className="text-[10px] text-text-3">{m.department} · {m.email}</div>
                </div>
                <div className="hidden group-hover:flex flex-wrap items-center gap-1" onClick={(e) => e.stopPropagation()}>
                   <button onClick={() => m.email && (window.location.href = 'mailto:' + m.email)} aria-label={t('members.sendEmail')} className="flex h-7 w-7 items-center justify-center rounded-lg text-text-3 hover:bg-surface-2 hover:text-text"><Mail size={13} /></button>
                   <button onClick={() => m.phone && (window.location.href = 'tel:' + m.phone)} aria-label={t('members.callPhone')} className="flex h-7 w-7 items-center justify-center rounded-lg text-text-3 hover:bg-surface-2 hover:text-text"><Phone size={13} /></button>
                   <button onClick={() => { navigator.clipboard.writeText(m.email); }} title={t('members.copyEmail')} aria-label={t('members.copyEmail')} className="flex h-7 w-7 items-center justify-center rounded-lg text-text-3 hover:bg-surface-2 hover:text-text"><MoreHorizontal size={13} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invite Modal */}
      <Modal open={inviteModal.open} onClose={inviteModal.closeModal} title={t('members.inviteTitle')}
        footer={<><button onClick={inviteModal.closeModal} className={btnSecondary}>{t('common.cancel')}</button><button onClick={handleInvite} className={btnPrimary}>{t('members.sendInvite')}</button></>}>
        <ModalField label={t('members.nameLabel')}>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('members.namePlaceholder')} className={inputCls} />
        </ModalField>
        <ModalField label={t('members.emailLabel')}>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={t('members.emailPlaceholder')} className={inputCls} />
        </ModalField>
        <ModalField label={t('members.phoneLabel')}>
          <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={t('members.phonePlaceholder')} className={inputCls} />
        </ModalField>
        <ModalField label={t('members.deptLabel')}>
          <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value === '__EMPTY__' ? '' : e.target.value })} className={selectCls}>
            <option value="__EMPTY__">{t('members.deptPlaceholder')}</option>
            {deptOptions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </ModalField>
        <ModalField label={t('members.roleLabel')}>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={selectCls}>
            <option value="member">{t('members.roleMember')}</option>
            <option value="manager">{t('members.roleManager')}</option>
            <option value="admin">{t('members.roleAdmin')}</option>
          </select>
        </ModalField>
      </Modal>

      {/* Edit Modal */}
      <Modal open={editModal.open} onClose={editModal.closeModal} title={t('members.editTitle')}
        footer={<><button onClick={() => { if (editingMember) { removeMember(editingMember.id); editModal.closeModal(); } }} className="mr-auto rounded-lg px-3 py-1.5 text-[11px] font-semibold text-danger hover:bg-danger/10">{t('common.delete')}</button><button onClick={editModal.closeModal} className={btnSecondary}>{t('common.cancel')}</button><button onClick={handleEdit} className={btnPrimary}>{t('common.save')}</button></>}>
        <ModalField label={t('members.nameLabel')}>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
        </ModalField>
        <ModalField label={t('members.emailLabel')}>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
        </ModalField>
        <ModalField label={t('members.phoneLabel')}>
          <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
        </ModalField>
        <ModalField label={t('members.deptLabel')}>
          <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value === '__EMPTY__' ? '' : e.target.value })} className={selectCls}>
            <option value="__EMPTY__">{t('members.deptPlaceholder')}</option>
            {deptOptions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </ModalField>
        <ModalField label={t('members.roleLabel')}>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={selectCls}>
            <option value="member">{t('members.roleMember')}</option>
            <option value="manager">{t('members.roleManager')}</option>
            <option value="admin">{t('members.roleAdmin')}</option>
          </select>
        </ModalField>
      </Modal>
    </div>
  );
}
