import { useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { useIndustryColor, useContacts } from '@/hooks/useMatrix';
import { cn } from '@/lib/utils';
import { Phone, Mail, MessageSquare, Search, User, Loader2, X } from 'lucide-react';
import { useModal } from '@/components/Modal';
import ItemDetailModal from '@/components/ItemDetailModal';
import type { FieldDef } from '@/components/ItemDetailModal';
import type { ContactRow } from '@/lib/dataLayer';



const STATUS_STYLES: Record<string, string> = {
  online: 'bg-success',
  busy: 'bg-danger',
  away: 'bg-warn',
  offline: 'bg-text-3',
};

const STATUS_LABELS: Record<string, string> = {
  online: '在线',
  busy: '忙碌',
  away: '离开',
  offline: '离线',
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
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);
  const { contacts, loading } = useContacts();
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);
  const detailModal = useModal();
  const [selected, setSelected] = useState<ContactRow | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredContacts = searchQuery
    ? contacts.filter((c) => c.name.includes(searchQuery) || c.department?.includes(searchQuery) || c.role?.includes(searchQuery))
    : contacts;

  const humanContacts = filteredContacts.filter((c) => !c.role.includes('AI'));
  const aiContacts = filteredContacts.filter((c) => c.role.includes('AI'));

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="text-sm font-bold">通讯录</span>
        <span className="text-[10px] text-text-3">{contacts.length} 人</span>
        <div className="ml-auto flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5">
          <Search size={12} className="text-text-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索联系人..."
            aria-label="搜索联系人"
            className="bg-transparent text-xs text-text outline-none placeholder:text-text-3 w-40"
          />
          {searchQuery && <button onClick={() => setSearchQuery('')} className="text-text-3 hover:text-text"><X size={12} /></button>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-text-3" size={24} /></div>
        ) : (
        <>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-text-3 mb-2">团队成员</div>
          <div className="grid grid-cols-2 gap-2">
            {humanContacts.map((contact) => (
              <div key={contact.id} className="group rounded-xl border border-border bg-surface p-3 transition-all hover:border-border-2 hover:shadow-lg cursor-pointer"
                onClick={() => { setSelected(contact); detailModal.openModal(); }}>
                <div className="flex items-center gap-3">
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
                <div className="flex items-center gap-2 mt-2">
                  <span className="rounded-full px-1.5 py-0.5 text-[8px] font-semibold bg-surface-2 text-text-3">{contact.department}</span>
                  <span className={cn('ml-auto rounded-full px-1.5 py-0.5 text-[8px] font-semibold',
                    contact.status === 'online' ? 'bg-success/10 text-success' : 'text-text-3'
                  )}>{STATUS_LABELS[contact.status]}</span>
                </div>
                <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); setCurrentPage('main-chat'); }} className="flex items-center gap-1 rounded bg-surface-2 px-2 py-1 text-[9px] text-text-3 hover:text-text"><MessageSquare size={9} />消息</button>
                  <button onClick={(e) => { e.stopPropagation(); if (contact.phone) window.location.href = 'tel:' + contact.phone; }} className="flex items-center gap-1 rounded bg-surface-2 px-2 py-1 text-[9px] text-text-3 hover:text-text"><Phone size={9} />电话</button>
                  <button onClick={(e) => { e.stopPropagation(); if (contact.email) window.location.href = 'mailto:' + contact.email; }} className="flex items-center gap-1 rounded bg-surface-2 px-2 py-1 text-[9px] text-text-3 hover:text-text"><Mail size={9} />邮件</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Contacts */}
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-text-3 mb-2 flex items-center gap-1.5">
            <span style={{ color: indColor }}>AI</span> 同事
          </div>
          <div className="grid grid-cols-2 gap-2">
            {aiContacts.map((contact) => (
              <div key={contact.id} className="rounded-xl border border-primary/20 bg-primary/5 p-3 transition-all hover:border-primary/30 hover:shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary-2">
                    AI
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-primary-2">{contact.name}</div>
                    <div className="text-[10px] text-text-3">{contact.role}</div>
                  </div>
                  <span className={cn('ml-auto rounded-full px-1.5 py-0.5 text-[8px] font-semibold',
                    contact.status === 'online' ? 'bg-success/10 text-success' : 'bg-warn/10 text-warn'
                  )}>{STATUS_LABELS[contact.status]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        </>
        )}
      </div>

      <ItemDetailModal open={detailModal.open} onClose={detailModal.closeModal} title="联系人详情" fields={CONTACT_FIELDS} data={selected} onSave={(updated) => { setSelected(updated); }} />
    </div>
  );
}
