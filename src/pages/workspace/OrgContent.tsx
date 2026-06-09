import { useState } from 'react';
import { useOrgInfo, useMembers } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { getDepartments, getAllIndustries, getIndustryColor } from '@/matrix/data';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { Building2, Globe, Users, Calendar, Settings, Loader2, Plus, Pencil, UserCog, Trash2 } from 'lucide-react';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import { generateMatrixCellAI, saveCustomCell, getColorForIndustry } from '@/lib/matrixGenerator';
import { CardSkeleton } from '@/components/Skeleton';

export default function OrgContent() {
  const { orgInfo, save, loading } = useOrgInfo();
  const { members, editMember } = useMembers();
  const setContext = useAppStore((s) => s.setContext);
  const industry = useAppStore((s) => s.industry);
  const allIndustries = getAllIndustries();
  const deptOptions = getDepartments(industry);
  const editOrgModal = useModal();
  const addDeptModal = useModal();
  const editDeptModal = useModal();
  const personModal = useModal();
  const [orgForm, setOrgForm] = useState({ name: '', industry: '', size: '' });
  const [deptForm, setDeptForm] = useState({ name: '', head: '', color: 'var(--brand-accent)' });
  const [editingDept, setEditingDept] = useState<string | null>(null);
  const [personForm, setPersonForm] = useState({ id: '', name: '', department: '', role: 'member', email: '', phone: '' });
  const { toasts, success, error: toastError } = useToast();

  if (loading || !orgInfo) {
    return <CardSkeleton />;
  }

  const departments = orgInfo!.departments ?? [];

  function openEditOrg() {
    setOrgForm({ name: orgInfo!.name, industry: orgInfo!.industry, size: orgInfo!.size });
    editOrgModal.openModal();
  }

  function handleEditOrg() {
    if (orgForm.name.trim()) {
      const depts = getDepartments(orgForm.industry || 'IT业');
      setContext(orgForm.industry || 'IT业', depts[0] || '产品部');
      try {
        save({ name: orgForm.name, industry: orgForm.industry, size: orgForm.size });
        success('组织信息已保存');
      } catch {
        toastError('保存失败，请重试');
      }
    }
    editOrgModal.closeModal();
  }

  function handleAddDept() {
    if (!deptForm.name.trim()) return;
    try {
      save({ departments: [...(orgInfo!.departments ?? []), { name: deptForm.name, head: deptForm.head, color: deptForm.color, members: 0, goals: 0 }] });
      success(`部门"${deptForm.name}"已创建`);
    } catch {
      toastError('创建部门失败，请重试');
    }
    addDeptModal.closeModal();
    setDeptForm({ name: '', head: '', color: 'var(--brand-accent)' });
  }

  function openEditDept(d: typeof departments[0]) {
    setEditingDept(d.name);
    setDeptForm({ name: d.name, head: d.head, color: d.color });
    editDeptModal.openModal();
  }

  function handleEditDept() {
    try {
      save({ departments: (orgInfo!.departments ?? []).map((d) => d.name === editingDept ? { ...d, name: deptForm.name, head: deptForm.head, color: deptForm.color } : d) });
      success('部门信息已更新');
    } catch {
      toastError('保存部门失败，请重试');
    }
    editDeptModal.closeModal();
    setEditingDept(null);
  }

  function handleDeleteDept() {
    if (!editingDept) return;
    try {
      save({ departments: (orgInfo!.departments ?? []).filter((d) => d.name !== editingDept) });
      success(`部门"${editingDept}"已删除`);
    } catch {
      toastError('删除部门失败，请重试');
    }
    editDeptModal.closeModal();
    setEditingDept(null);
    setDeptForm({ name: '', head: '', color: 'var(--brand-accent)' });
  }

  function openPersonSettings(m: typeof members[0]) {
    setPersonForm({ id: m.id, name: m.name, department: m.department, role: m.role, email: m.email, phone: m.phone || '' });
    personModal.openModal();
  }

  function handleSavePerson() {
    editMember(personForm.id, { name: personForm.name, department: personForm.department, role: personForm.role, email: personForm.email, phone: personForm.phone });
    success('个人设置已保存');
    personModal.closeModal();
  }

  const selectCls = inputCls.replace('text-text', 'text-text bg-surface-2');

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <ToastOverlay toasts={toasts} />
      <div className="flex items-center gap-2">
        <Building2 size={18} className="text-primary-2" />
        <span className="text-sm font-bold">组织设置</span>
      </div>

      {/* Org Info Card */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-xl font-bold text-primary-2">
            {orgInfo!.name[0]}
          </div>
          <div>
            <div className="text-base font-bold text-text">{orgInfo!.name}</div>
            <div className="text-[11px] text-text-3">{orgInfo!.industry} · {orgInfo!.size} · {orgInfo!.plan}</div>
          </div>
          <button onClick={openEditOrg} className="ml-auto flex items-center gap-1 rounded-lg bg-surface-2 px-3 py-1 text-[11px] text-text-2 hover:bg-surface-2/80">
            <Pencil size={11} />
            编辑
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg bg-surface-2/50 p-2.5 text-center">
            <div className="text-xs font-bold text-text">{orgInfo!.size}</div>
            <div className="text-[9px] text-text-3">团队规模</div>
          </div>
          <div className="rounded-lg bg-surface-2/50 p-2.5 text-center">
            <div className="text-xs font-bold text-text">{departments.length}</div>
            <div className="text-[9px] text-text-3">部门数</div>
          </div>
          <div className="rounded-lg bg-surface-2/50 p-2.5 text-center">
            <div className="text-xs font-bold text-text">{orgInfo!.plan}</div>
            <div className="text-[9px] text-text-3">当前版本</div>
          </div>
        </div>
      </div>

      {/* Department Structure */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-text-3 uppercase tracking-wider">部门架构</span>
          <button onClick={addDeptModal.openModal} className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary-2 hover:bg-primary/20">
            <Plus size={11} /> 新建部门
          </button>
        </div>
        <div className="space-y-2">
          {departments.map((d) => (
            <div key={d.name} className="group flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-all hover:border-border-2 hover:shadow-lg cursor-pointer" onClick={() => openEditDept(d)}>
              <div className="h-9 w-9 flex items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: d.color + '15' }}>
                <Users size={15} style={{ color: d.color }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-text">{d.name}</div>
                <div className="text-[10px] text-text-3">负责人: {d.head} · {d.members}人 · {d.goals}个目标</div>
              </div>
              <div className="h-6 w-16 rounded-full overflow-hidden bg-surface-2">
                <div className="h-full rounded-full" style={{ width: `${Math.min(d.members / 12 * 100, 100)}%`, backgroundColor: d.color }} />
              </div>
              <button className="opacity-0 group-hover:opacity-100 text-text-3 hover:text-text transition-opacity" onClick={(e) => { e.stopPropagation(); openEditDept(d); }}>
                <Settings size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Org Settings */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-text-3 uppercase tracking-wider">组织配置</span>
        {[
          { label: '行业类型', value: orgInfo!.industry, icon: <Globe size={13} /> },
          { label: '创建时间', value: orgInfo!.created, icon: <Calendar size={13} /> },
          { label: '订阅方案', value: `${orgInfo!.plan} (年付)`, icon: <Settings size={13} /> },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-2.5">
            <span className="text-text-3">{s.icon}</span>
            <span className="text-xs text-text-2">{s.label}</span>
            <span className="ml-auto text-xs font-medium text-text">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Individual Person Settings */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-text-3 uppercase tracking-wider">个人层级设置</span>
        </div>
        <div className="space-y-1.5">
          {members.map((m) => (
            <div key={m.id} onClick={() => openPersonSettings(m)} className="group flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 transition-all hover:border-border-2 hover:shadow-lg cursor-pointer">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary-2">{m.name.charAt(0)}</div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-text">{m.name}</div>
                <div className="text-[10px] text-text-3">{m.department} · {m.role === 'admin' ? '管理员' : m.role === 'manager' ? '经理' : m.role === 'agent' ? 'AI同事' : '成员'}</div>
              </div>
              <UserCog size={14} className="text-text-3 group-hover:text-primary-2 transition-colors" />
            </div>
          ))}
        </div>
      </div>

      {/* Edit Org Modal */}
      <Modal open={editOrgModal.open} onClose={editOrgModal.closeModal} title="编辑组织信息"
        footer={<><button onClick={editOrgModal.closeModal} className={btnSecondary}>取消</button><button onClick={handleEditOrg} className={btnPrimary}>保存</button></>}>
        <ModalField label="组织名称">
          <input type="text" value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} className={inputCls} />
        </ModalField>
        <ModalField label="行业">
           <select value={orgForm.industry} onChange={(e) => {
             const newInd = e.target.value;
             const depts = getDepartments(newInd);
             setOrgForm({ ...orgForm, industry: newInd });
           }} className={selectCls}>
             {allIndustries.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
           </select>
        </ModalField>
        <ModalField label="团队规模">
          <input type="text" value={orgForm.size} onChange={(e) => setOrgForm({ ...orgForm, size: e.target.value })} className={inputCls} />
        </ModalField>
      </Modal>

      {/* Add Department Modal */}
      <Modal open={addDeptModal.open} onClose={addDeptModal.closeModal} title="新建部门"
        footer={<><button onClick={addDeptModal.closeModal} className={btnSecondary}>取消</button><button onClick={handleAddDept} className={btnPrimary}>创建</button></>}>
        <ModalField label="部门名称">
          <input type="text" value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} placeholder="输入部门名称" className={inputCls} />
        </ModalField>
        <ModalField label="负责人">
          <input type="text" value={deptForm.head} onChange={(e) => setDeptForm({ ...deptForm, head: e.target.value })} placeholder="输入负责人" className={inputCls} />
        </ModalField>
      </Modal>

      {/* Edit Department Modal */}
      <Modal open={editDeptModal.open} onClose={editDeptModal.closeModal} title={`编辑部门: ${editingDept ?? ''}`}
        footer={<><button onClick={handleDeleteDept} className="flex items-center gap-1 rounded-lg bg-danger/10 px-3 py-1.5 text-[10px] text-danger hover:bg-danger/20 mr-auto"><Trash2 size={10} />删除部门</button><div className="flex-1" /><button onClick={editDeptModal.closeModal} className={btnSecondary}>取消</button><button onClick={handleEditDept} className={btnPrimary}>保存</button></>}>
        <ModalField label="部门名称">
          <input type="text" value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} className={inputCls} />
        </ModalField>
        <ModalField label="负责人">
          <input type="text" value={deptForm.head} onChange={(e) => setDeptForm({ ...deptForm, head: e.target.value })} className={inputCls} />
        </ModalField>
      </Modal>

      {/* Person Settings Modal */}
      <Modal open={personModal.open} onClose={personModal.closeModal} title={`个人设置: ${personForm.name}`}
        footer={<><button onClick={personModal.closeModal} className={btnSecondary}>取消</button><button onClick={handleSavePerson} className={btnPrimary}>保存</button></>}>
        <ModalField label="姓名">
          <input type="text" value={personForm.name} onChange={(e) => setPersonForm({ ...personForm, name: e.target.value })} className={inputCls} />
        </ModalField>
        <ModalField label="部门">
          <select value={personForm.department} onChange={(e) => setPersonForm({ ...personForm, department: e.target.value })} className={selectCls}>
            <option value="">选择部门</option>
            {deptOptions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </ModalField>
        <ModalField label="角色">
          <select value={personForm.role} onChange={(e) => setPersonForm({ ...personForm, role: e.target.value })} className={selectCls}>
            <option value="member">成员</option>
            <option value="manager">经理</option>
            <option value="admin">管理员</option>
            <option value="agent">AI同事</option>
          </select>
        </ModalField>
        <ModalField label="邮箱">
          <input type="email" value={personForm.email} onChange={(e) => setPersonForm({ ...personForm, email: e.target.value })} className={inputCls} />
        </ModalField>
        <ModalField label="电话">
          <input type="tel" value={personForm.phone} onChange={(e) => setPersonForm({ ...personForm, phone: e.target.value })} className={inputCls} />
        </ModalField>
      </Modal>
    </div>
  );
}
