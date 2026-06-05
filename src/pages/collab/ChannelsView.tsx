import { useState, useEffect, useCallback, useRef } from 'react';
import { useMatrixCell, useIndustryColor } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { useAuth } from '@/lib/auth';
import { useRealtime, usePresence } from '@/hooks/useRealtime';
import { cn } from '@/lib/utils';
import { Send, Bot, User, Hash, Users, ChevronDown, Circle } from 'lucide-react';
import { chatCompletion, buildSystemPrompt, type ChatMessage } from '@/lib/aiService';

interface ChatMsg {
  id: number;
  role: 'user' | 'ai' | 'system';
  sender: string;
  text: string;
  time: string;
  avatar?: string;
}

interface OnlineUser {
  user: string;
  online_at: string;
}

export default function ChannelsView() {
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);
  const indColor = useIndustryColor();
  const { cell, loading } = useMatrixCell();
  const channels = cell.channels;
  const { user } = useAuth();

  const [activeCh, setActiveCh] = useState(channels[0]);
  const [msgInput, setMsgInput] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: 1, role: 'system', sender: '系统', text: `欢迎来到「${channels[0]}」频道，当前行业：${industry} · ${dept}`, time: '09:00' },
    { id: 2, role: 'ai', sender: 'AI同事', text: cell.morning, time: '09:01' },
  ]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
  }, []);

  // Subscribe to realtime messages for this channel
  useRealtime(
    'messages',
    useCallback((payload) => {
      if (payload.new?.channel === activeCh) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            role: payload.new.sender_type === 'ai' ? 'ai' : 'user',
            sender: payload.new.sender_name as string ?? 'Unknown',
            text: payload.new.content as string ?? '',
            time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        scrollToBottom();
      }
    }, [activeCh, scrollToBottom]),
    { column: 'channel', value: activeCh },
  );

  // Subscribe to presence (who's online)
  usePresence(
    `channel-${activeCh}`,
    user?.id ?? `anon-${Date.now()}`,
    useCallback((states) => {
      const users: OnlineUser[] = [];
      for (const stateArr of Object.values(states)) {
        if (Array.isArray(stateArr)) {
          for (const s of stateArr) {
            users.push(s as OnlineUser);
          }
        }
      }
      setOnlineUsers(users);
    }, []),
  );

  async function handleSend() {
    if (!msgInput.trim() || isTyping) return;
    const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMsg = { id: Date.now(), role: 'user', sender: user?.name ?? '我', text: msgInput.trim(), time: now };

    setMessages((prev) => [...prev, userMsg]);
    setMsgInput('');
    setIsTyping(true);
    scrollToBottom();

    // AI colleague responds
    const systemPrompt = buildSystemPrompt(cell, industry, dept);
    const aiMessages: ChatMessage[] = [
      { role: 'system', content: `${systemPrompt}\n\n你正在「#${activeCh}」频道中作为AI同事与团队成员对话。语气像一位资深同事，简洁专业。` },
      ...messages
        .filter((m) => m.role === 'user' || m.role === 'ai')
        .slice(-10)
        .map((m) => ({ role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant', content: m.text })),
      { role: 'user', content: msgInput.trim() },
    ];

    try {
      const res = await chatCompletion(aiMessages, {
        stream: true,
        onChunk: () => {}, // We'll load the full response
      });

      const aiMsg: ChatMsg = {
        id: Date.now() + 1,
        role: 'ai',
        sender: 'AI同事',
        text: res.text,
        time: now,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'ai', sender: 'AI同事', text: `收到，我会持续关注「${dept}」相关进展，有异常会及时提醒。`, time: now },
      ]);
    } finally {
      setIsTyping(false);
      scrollToBottom();
    }
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
              className={cn('flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors', activeCh === ch ? 'bg-primary/10 font-semibold text-primary-2' : 'text-text-2 hover:bg-surface-2')}
            >
              <Hash size={13} className="shrink-0 text-text-3" />
              <span className="truncate">{ch}</span>
              {activeCh === ch && onlineUsers.length > 0 && (
                <span className="ml-auto text-[8px] text-success font-bold">{onlineUsers.length} 在线</span>
              )}
            </button>
          ))}
          <div className="px-3 py-1.5 mt-2 text-[9px] font-bold uppercase tracking-wider text-text-3">
            在线成员 ({onlineUsers.length + cell.agents.filter((a) => a.status === '在线').length})
          </div>
          {cell.agents.filter((a) => a.status === '在线').map((agent) => (
            <div key={agent.name} className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-2">
              <Bot size={13} className="shrink-0 text-primary-2" />
              <span className="truncate">{agent.name}</span>
              <Circle size={6} className="ml-auto fill-success text-success" />
            </div>
          ))}
          {onlineUsers.map((ou, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-2">
              <User size={13} className="shrink-0 text-text-3" />
              <span className="truncate">{ou.user}</span>
              <Circle size={6} className="ml-auto fill-success text-success" />
            </div>
          ))}
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-2">
            <User size={13} className="shrink-0 text-text-3" />
            <span>{user?.name ?? '我'}</span>
            <Circle size={6} className="ml-auto fill-success text-success" />
          </div>
        </div>
      </div>

      {/* Message Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <Hash size={15} className="text-text-3" />
          <span className="text-sm font-bold">{activeCh}</span>
          <span className="text-[10px] text-text-3 ml-2"><Users size={11} className="inline mr-1" />{cell.agents.length + 1 + onlineUsers.length} 人</span>
          {onlineUsers.length > 0 && (
            <span className="rounded-full bg-success/10 px-2 py-0.5 text-[8px] font-bold text-success">实时在线</span>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
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
          {isTyping && (
            <div className="flex gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary-2"><Bot size={14} /></div>
              <div className="rounded-xl bg-primary/10 px-3 py-2 text-xs text-primary-2">
                <span className="inline-flex gap-1"><span className="animate-bounce">·</span><span className="animate-bounce" style={{ animationDelay: '0.15s' }}>·</span><span className="animate-bounce" style={{ animationDelay: '0.3s' }}>·</span></span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
            <input
              type="text"
              value={msgInput}
              onChange={(e) => setMsgInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={`在 #${activeCh} 中发言...`}
              aria-label="频道消息输入"
              className="flex-1 bg-transparent text-xs text-text outline-none placeholder:text-text-3"
              disabled={isTyping}
            />
            <button onClick={handleSend} className="rounded-lg bg-primary p-1.5 text-white transition-opacity hover:opacity-80 disabled:opacity-50" disabled={isTyping || !msgInput.trim()}>
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
