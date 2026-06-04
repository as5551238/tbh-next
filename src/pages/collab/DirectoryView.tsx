import { useAppStore } from '@/stores/appStore';
import { useIndustryColor } from '@/hooks/useMatrix';
import { cn } from '@/lib/utils';
import { Phone, Mail, MessageSquare, Search, User } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  status: 'online' | 'busy' | 'away' | 'offline';
  avatar?: string;
}

const MOCK_CONTACTS: Contact[] = [
  { id: 'C-001', name: '张明', role: '高级产品经理', department: '产品部', email: 'zhangming@team.com', phone: '138****1234', status: 'online' },
  { id: 'C-002', name: '李工', role: '技术负责人', department: '研发部', email: 'ligong@team.com', phone: '139****5678', status: 'busy' },
  { id: 'C-003', name: '王琳', role: 'UI设计师', department: '设计部', email: 'wanglin@team.com', phone: '137****9012', status: 'online' },
  { id: 'C-004', name: '陈亮', role: '销售总监', department: '销售部', email: 'chenliang@team.com', phone: '136****3456', status: 'away' },
  { id: 'C-005', name: '赵磊', role: '市场经理', department: '市场部', email: 'zhaolei@team.com', phone: '135****7890', status: 'offline' },
  { id: 'C-006', name: '孙婷', role: '行政主管', department: '行政部', email: 'sunting@team.com', phone: '134****2345', status: 'online' },
  { id: 'C-007', name: 'AI产品分析师', role: 'AI同事', department: 'AI Team', email: '-', phone: '-', status: 'online' },
  { id: 'C-008', name: 'AI竞品侦探', role: 'AI同事', department: 'AI Team', email: '-', phone: '-', status: 'online' },
  { id: 'C-009', name: 'AI数据看门人', role: 'AI同事', department: 'AI Team', email: '-', phone: '-', status: 'busy' },
];

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

export default function DirectoryView() {
  const indColor = useIndustryColor();
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);

  const humanContacts = MOCK_CONTACTS.filter((c) => !c.role.includes('AI'));
  const aiContacts = MOCK_CONTACTS.filter((c) => c.role.includes('AI'));

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="text-sm font-bold">通讯录</span>
        <span className="text-[10px] text-text-3">{MOCK_CONTACTS.length} 人</span>
        <div className="ml-auto flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5">
          <Search size={12} className="text-text-3" />
          <input
            type="text"
            placeholder="搜索联系人..."
            className="bg-transparent text-xs text-text outline-none placeholder:text-text-3 w-40"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Human Contacts */}
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-text-3 mb-2">团队成员</div>
          <div className="grid grid-cols-2 gap-2">
            {humanContacts.map((contact) => (
              <div key={contact.id} className="group rounded-xl border border-border bg-surface p-3 transition-all hover:border-border-2 hover:shadow-lg">
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
                  <button className="flex items-center gap-1 rounded bg-surface-2 px-2 py-1 text-[9px] text-text-3 hover:text-text"><MessageSquare size={9} />消息</button>
                  <button className="flex items-center gap-1 rounded bg-surface-2 px-2 py-1 text-[9px] text-text-3 hover:text-text"><Phone size={9} />电话</button>
                  <button className="flex items-center gap-1 rounded bg-surface-2 px-2 py-1 text-[9px] text-text-3 hover:text-text"><Mail size={9} />邮件</button>
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
      </div>
    </div>
  );
}
