import { useState } from 'react';
import { useMembers } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { getDepartments } from '@/matrix/data';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { hasFeature } from '@/lib/subscription';
import { Users, Plus, Lock, Search, MoreHorizontal, Mail, Phone, Loader2, Trash2 } from 'lucide-react';
import { CardSkeleton } from '@/components/Skeleton';

export default function MembersContent() {
  const isPro = hasFeature('advancedAnalytics' as never);
  const { members, loading, addMember, editMember, removeMember } = useMembers();
  const industry = useAppStore((s) => s.industry);
  const deptOptions = getDepartments(industry);
  const inviteModal = useModal();
  const editModal = useModal();
  const [editingMember, setEditingMember] = useState<{ id: string; name: string; department: string; email: string; role: string } | null>(null);
  const [form, setForm] = useState({ name: '', department: '', email: '', role: 'member', phone: '' });
  const [searchTerm, setSearchTerm] = useState('');

  const roleMap: Record<string, { label: string; cls: string }> = {
    admin: { label: '管理员', cls: 'bg-danger/10 text-danger' },
    manager: { label: '经理', cls: 'bg-warn/10 text-warn' },
    member: { label: '成员', cls: 'bg-primary/10 text-primary-2' },
    agent: { label: 'AI同事', cls: 'bg-accent/10 text-accent' },
  };

  const filteredMembers = searchTerm
    ? members.filter((m) => m.name.includes(searchTerm) || m.department.includes(searchTerm) || m.email.includes(searchTerm))
    : members;

  function handleInvite() {
    if (!form.name.trim() || !form.email.trim()) return;
    addMember({ name: form.name, department: form.department, email: form.email, role: form.role, phone: form.phone, avatar: '', status: 'active', join_date: new Date().toISOString().split('T')[0] });
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
    setEditingMember({ id: m.id, name: m.name, department: m.department, email: m.email, role: m.role });
    setForm({ name: m.name, department: m.department, email: m.email, role: m.role });
    editModal.openModal();
  }

  const selectCls = inputCls.replace('text-text', 'text-text bg-surface-2');

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Users size={18} className="text-primary-2" />
        <span className="text-sm font-bold">成员管理</span>
        <span className="ml-auto text-[10px] text-text-3">{members.length} 人</span>
        <button onClick={() => { if (!isPro) return; inviteModal.openModal(); }} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1 text-[11px] font-semibold text-white hover:bg-primary-2">
          <Plus size={12} />
          邀请成员
        </button>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
        <Search size={14} className="text-text-3" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="搜索成员..."
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
              <div key={m.id} className="group flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-all hover:border-border-2 hover:shadow-lg cursor-pointer" onClick={() => openEdit(m)}>
                <div className="relative shrink-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary-2">
                    {m.name.charAt(0)}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-text">{m.name}</span>
                    <span className={`rounded-full px-1.5 py-[1px] text-[8px] font-bold ${role.cls}`}>{role.label}</span>
                  </div>
                  <div className="text-[10px] text-text-3">{m.department} · {m.email}</div>
                </div>
                <div className="hidden group-hover:flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                   <button onClick={() => m.email && (window.location.href = 'mailto:' + m.email)} className="flex h-7 w-7 items-center justify-center rounded-lg text-text-3 hover:bg-surface-2 hover:text-text"><Mail size={13} /></button>
                   <button onClick={() => m.phone && (window.location.href = 'tel:' + m.phone)} className="flex h-7 w-7 items-center justify-center rounded-lg text-text-3 hover:bg-surface-2 hover:text-text"><Phone size={13} /></button>
                   <button onClick={() => { navigator.clipboard.writeText(m.email); }} title="复制邮箱" className="flex h-7 w-7 items-center justify-center rounded-lg text-text-3 hover:bg-surface-2 hover:text-text"><MoreHorizontal size={13} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invite Modal */}
      <Modal open={inviteModal.open} onClose={inviteModal.closeModal} title="邀请成员"
        footer={<><button onClick={inviteModal.closeModal} className={btnSecondary}>取消</button><button onClick={handleInvite} className={btnPrimary}>发送邀请</button></>}>
        <ModalField label="姓名">
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="输入姓名" className={inputCls} />
        </ModalField>
        <ModalField label="邮箱">
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="输入邮箱" className={inputCls} />
        </ModalField>
        <ModalField label="电话">
          <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="输入电话号码" className={inputCls} />
        </ModalField>
        <ModalField label="部门">
          <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className={selectCls}>
            <option value="">选择部门</option>
            {deptOptions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </ModalField>
        <ModalField label="角色">
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={selectCls}>
            <option value="member">成员</option>
            <option value="manager">经理</option>
            <option value="admin">管理员</option>
          </select>
        </ModalField>
      </Modal>

      {/* Edit Modal */}
      <Modal open={editModal.open} onClose={editModal.closeModal} title="编辑成员"
        footer={<><button onClick={() => { if (editingMember) { removeMember(editingMember.id); editModal.closeModal(); } }} className="mr-auto rounded-lg px-3 py-1.5 text-[11px] font-semibold text-danger hover:bg-danger/10">删除</button><button onClick={editModal.closeModal} className={btnSecondary}>取消</button><button onClick={handleEdit} className={btnPrimary}>保存</button></>}>
        <ModalField label="姓名">
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
        </ModalField>
        <ModalField label="邮箱">
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
        </ModalField>
        <ModalField label="电话">
          <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
        </ModalField>
        <ModalField label="部门">
          <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className={selectCls}>
            <option value="">选择部门</option>
            {deptOptions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </ModalField>
        <ModalField label="角色">
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={selectCls}>
            <option value="member">成员</option>
            <option value="manager">经理</option>
            <option value="admin">管理员</option>
          </select>
        </ModalField>
      </Modal>
    </div>
  );
}
