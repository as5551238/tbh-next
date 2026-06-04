import { useState } from 'react';
import { useMatrixCell, useIndustryColor } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { Send, Bot, User, Hash, Users, ChevronDown } from 'lucide-react';

interface ChatMsg {
  id: number;
  role: 'user' | 'ai' | 'system';
  sender: string;
  text: string;
  time: string;
}

export default function ChannelsView() {
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);
  const indColor = useIndustryColor();
  const cell = useMatrixCell();
  const channels = cell.channels;

  const [activeCh, setActiveCh] = useState(channels[0]);
  const [msgInput, setMsgInput] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: 1, role: 'system', sender: '系统', text: `欢迎来到「${channels[0]}」频道，当前行业：${industry} · ${dept}`, time: '09:00' },
    { id: 2, role: 'ai', sender: 'AI同事', text: cell.morning, time: '09:01' },
    { id: 3, role: 'user', sender: '我', text: '收到，我来处理重点事项。', time: '09:03' },
  ]);

  function handleSend() {
    if (!msgInput.trim()) return;
    const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: 'user', sender: '我', text: msgInput.trim(), time: now },
      { id: Date.now() + 1, role: 'ai', sender: 'AI同事', text: `已收到你的消息，我会持续关注「${dept}」相关进展，有异常会及时提醒。`, time: now },
    ]);
    setMsgInput('');
  }

  return (
    <div className="flex h-full">
      {/* Channel List */}
      <div className="flex w-56 shrink-0 flex-col border-r border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <span className="text-xs font-bold">{industry} · {dept}</span>
          <ChevronDown size={14} className="text-text-3" />
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-text-3">频道</div>
          {channels.map((ch) => (
            <button
              key={ch}
              onClick={() => setActiveCh(ch)}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors',
                activeCh === ch ? 'bg-primary/10 font-semibold text-primary-2' : 'text-text-2 hover:bg-surface-2'
              )}
            >
              <Hash size={13} className="shrink-0 text-text-3" />
              <span className="truncate">{ch}</span>
            </button>
          ))}
          <div className="px-3 py-1.5 mt-2 text-[9px] font-bold uppercase tracking-wider text-text-3">成员</div>
          {cell.agents.map((agent) => (
            <div key={agent.name} className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-2">
              <Bot size={13} className="shrink-0 text-primary-2" />
              <span className="truncate">{agent.name}</span>
              <span className={cn('ml-auto rounded-full px-1.5 py-[1px] text-[8px] font-bold',
                agent.status === '在线' ? 'bg-success/10 text-success' : 'bg-warn/10 text-warn'
              )}>{agent.status}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-2">
            <User size={13} className="shrink-0 text-text-3" />
            <span>我</span>
          </div>
        </div>
      </div>

      {/* Message Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <Hash size={15} className="text-text-3" />
          <span className="text-sm font-bold">{activeCh}</span>
          <span className="text-[10px] text-text-3 ml-2"><Users size={11} className="inline mr-1" />{cell.agents.length + 1} 人</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className={cn('flex gap-2.5', msg.role === 'user' && 'flex-row-reverse')}>
              <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                msg.role === 'ai' && 'bg-primary/10 text-primary-2',
                msg.role === 'system' && 'bg-surface-2 text-text-3',
                msg.role === 'user' && 'bg-accent/10 text-accent'
              )}>
                {msg.role === 'ai' ? <Bot size={14} /> : msg.role === 'system' ? '⚡' : <User size={14} />}
              </div>
              <div className={cn('max-w-[70%] rounded-xl px-3 py-2 text-xs leading-relaxed',
                msg.role === 'ai' && 'bg-primary/10 text-primary-2',
                msg.role === 'system' && 'bg-surface-2 text-text-3',
                msg.role === 'user' && 'bg-accent/10 text-text'
              )}>
                <div className="mb-0.5 text-[9px] font-semibold opacity-60">{msg.sender} · {msg.time}</div>
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
            <input
              type="text"
              value={msgInput}
              onChange={(e) => setMsgInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={`在 #${activeCh} 中发言...`}
              className="flex-1 bg-transparent text-xs text-text outline-none placeholder:text-text-3"
            />
            <button onClick={handleSend} className="rounded-lg bg-primary p-1.5 text-white transition-opacity hover:opacity-80">
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
