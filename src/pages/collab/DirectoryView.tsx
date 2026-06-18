import { useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { useIndustryColor, useContacts } from '@/hooks/useMatrix';
import { cn } from '@/lib/utils';
import { Phone, Mail, MessageSquare, Search, User, X, Plus } from 'lucide-react';
import { useModal, btnPrimary, btnSecondary, inputCls } from '@/components/Modal';
import ItemDetailModal from '@/components/ItemDetailModal';
import type { FieldDef } from '@/components/ItemDetailModal';
import type { ContactRow } from '@/lib/dataLayer';
import { CardSkeleton } from '@/components/Skeleton';
import { t } from '@/lib/i18n';



const STATUS_STYLES: Record<string, string> = {
  online: 'bg-success',
  busy: 'bg-danger',
  away: 'bg-warn',
  offline: 'bg-text-3',
};

const STATUS_LABELS: Record<string, () => string> = {
  online: () => t('directory.statusOnline'),
  busy: () => t('directory.statusBusy'),
  away: () => t('directory.statusAway'),
  offline: () => t('directory.statusOffline'),
};

const CONTACT_FIELDS: FieldDef[] = [
  { key: 'name', label: '姓名', type: 'text' },
  { key: 'department', label: '部门', type: 'text' },
  { key: 'role', label: '职位', type: 'text' },
  { key: 'email', label: '邮箱', type: 'text' },
  { key: 'phone', label: '电话', type: 'text' },
];

export default function DirectoryView() {
  const indColor = useIndustryColor();
  const navigateTo = useAppStore((s) => s.navigateTo);
  const { contacts, addContact, editContact, removeContact, loading } = useContacts();
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);
  const detailModal = useModal();
  const createModal = useModal();
  const [selected, setSelected] = useState<ContactRow | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({ name: '', department: '', role: '', email: '', phone: '', status: 'online' });

  const filteredContacts = searchQuery
    ? contacts.filter((c) => c.name.includes(searchQuery) || c.department?.includes(searchQuery) || c.role?.includes(searchQuery))
    : contacts;

  const humanContacts = filteredContacts.filter((c) => !(c.role || '').toLowerCase().includes('ai'));
  const aiContacts = filteredContacts.filter((c) => (c.role || '').toLowerCase().includes('ai'));

  async function handleCreate() {
    if (!form.name.trim()) return;
    await addContact({
      name: form.name.trim(),
      department: form.department || dept,
      role: form.role || t('directory.defaultRole'),
      email: form.email,
      phone: form.phone,
      status: form.status as ContactRow['status'],
    } as Partial<ContactRow>);
    setForm({ name: '', department: '', role: '', email: '', phone: '', status: 'online' });
    createModal.closeModal();
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <span className="text-sm font-bold">{t('directory.title')}</span>
        <span className="text-[10px] text-text-3">{t('directory.contactCount', { count: contacts.length })}</span>
        <button onClick={createModal.openModal} className="ml-2 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20 transition-colors">+ {t('directory.add')}</button>
        <div className="ml-auto flex flex-wrap items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5">
          <Search size={12} className="text-text-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('directory.searchPlaceholder')}
            aria-label={t('directory.searchAria')}
            className="bg-transparent text-xs text-text outline-none placeholder:text-text-3 w-40"
          />
          {searchQuery && <button onClick={() => setSearchQuery('')} aria-label={t('directory.clearSearchAria')} className="text-text-3 hover:text-text"><X size={12} /></button>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
        {loading ? (
          <CardSkeleton />
        ) : (
        <>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-text-3 mb-2">{t('directory.teamMembers')}</div>
          <div className="grid grid-cols-2 gap-2">
            {humanContacts.map((contact) => (
              <div key={contact.id} className="group rounded-xl border border-border bg-surface p-3 transition-all hover:border-border-2 hover:shadow-lg cursor-pointer"
                onClick={() => { setSelected(contact); detailModal.openModal(); }}>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-xs font-bold text-text-2">
                      {contact.name.charAt(0)}
                    </div>
                    <div className={cn('absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface', STATUS_STYLES[contact.status])} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-text">{contact.name}</div>
                    <div className="text-[10px] text-text-3">{contact.role}</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="rounded-full px-1.5 py-0.5 text-[8px] font-semibold bg-surface-2 text-text-3">{contact.department}</span>
                  <span className={cn('ml-auto rounded-full px-1.5 py-0.5 text-[8px] font-semibold',
                    contact.status === 'online' ? 'bg-success/10 text-success' : 'text-text-3'
                   )}>{STATUS_LABELS[contact.status]?.() ?? contact.status}</span>
                 </div>
                 <div className="flex flex-wrap gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={(e) => { e.stopPropagation(); navigateTo('ai', 'main'); }} className="flex flex-wrap items-center gap-1 rounded bg-surface-2 px-2 py-1 text-[9px] text-text-3 hover:text-text"><MessageSquare size={9} />{t('directory.msg')}</button>
                   <button onClick={(e) => { e.stopPropagation(); if (contact.phone) window.location.href = 'tel:' + contact.phone; }} className="flex flex-wrap items-center gap-1 rounded bg-surface-2 px-2 py-1 text-[9px] text-text-3 hover:text-text"><Phone size={9} />{t('directory.call')}</button>
                   <button onClick={(e) => { e.stopPropagation(); if (contact.email) window.location.href = 'mailto:' + contact.email; }} className="flex flex-wrap items-center gap-1 rounded bg-surface-2 px-2 py-1 text-[9px] text-text-3 hover:text-text"><Mail size={9} />{t('directory.email')}</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Contacts */}
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-text-3 mb-2 flex flex-wrap items-center gap-1.5">
            <span style={{ color: indColor }}>AI</span> {t('directory.aiColleagues')}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {aiContacts.map((contact) => (
              <div key={contact.id} className="rounded-xl border border-primary/20 bg-primary/5 p-3 transition-all hover:border-primary/30 hover:shadow-lg">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary-2">
                    AI
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-primary-2">{contact.name}</div>
                    <div className="text-[10px] text-text-3">{contact.role}</div>
                  </div>
                  <span className={cn('ml-auto rounded-full px-1.5 py-0.5 text-[8px] font-semibold',
                    contact.status === 'online' ? 'bg-success/10 text-success' : 'bg-warn/10 text-warn'
                   )}>{STATUS_LABELS[contact.status]?.() ?? contact.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        </>
        )}
      </div>

      <ItemDetailModal open={detailModal.open} onClose={detailModal.closeModal} title={t('directory.detailTitle')} fields={CONTACT_FIELDS} data={selected as unknown as Record<string, unknown> | null} commentTarget={selected?.id ? { type: 'contact', id: String(selected.id) } : null} onSave={(updated) => { if (selected) { editContact(selected.id, updated); setSelected({ ...selected, ...updated } as ContactRow); } }} onDelete={() => { if (selected) { removeContact(selected.id); detailModal.closeModal(); } }} />

      {/* Create Contact Modal */}
      {createModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={createModal.closeModal}>
          <div className="w-96 rounded-xl border border-border bg-surface-2 p-3 md:p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold">{t('directory.addContact')}</span>
              <button onClick={createModal.closeModal} aria-label={t('directory.closeAria')} className="text-text-3 hover:text-text"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-text-3 mb-1 block">{t('directory.nameRequired')}</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={t('directory.namePlaceholder')} className={inputCls + ' w-full'} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-text-3 mb-1 block">{t('directory.deptLabel')}</label>
                  <input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} placeholder={t('directory.deptPlaceholder')} className={inputCls + ' w-full'} />
                </div>
                <div>
                  <label className="text-[10px] text-text-3 mb-1 block">{t('directory.roleLabel')}</label>
                  <input value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} placeholder={t('directory.rolePlaceholder')} className={inputCls + ' w-full'} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-text-3 mb-1 block">{t('directory.emailLabel')}</label>
                  <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder={t('directory.emailPlaceholder')} className={inputCls + ' w-full'} />
                </div>
                <div>
                  <label className="text-[10px] text-text-3 mb-1 block">{t('directory.phoneLabel')}</label>
                  <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder={t('directory.phonePlaceholder')} className={inputCls + ' w-full'} />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <button onClick={handleCreate} disabled={!form.name.trim()} className={`${btnPrimary} disabled:opacity-40`}>{t('directory.addBtn')}</button>
              <button onClick={createModal.closeModal} className={btnSecondary}>{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
