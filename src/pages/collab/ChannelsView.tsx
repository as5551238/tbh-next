import { useState, useEffect, useCallback, useRef } from 'react';
import { useMatrixCell, useIndustryColor } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { useAuth } from '@/lib/auth';
import { useRealtime, usePresence } from '@/hooks/useRealtime';
import { cn } from '@/lib/utils';
import { getCurrentPlan, PLAN_LIMITS } from '@/lib/subscription';
import PaywallModal from '@/components/PaywallModal';
import { Send, Bot, User, Hash, Users, ChevronDown, Circle, Plus, X } from 'lucide-react';
import { chatCompletion, buildSystemPrompt, type ChatMessage } from '@/lib/aiService';
import { createMessage, fetchChannels, createChannel, type ChannelRow } from '@/lib/dataLayer';
import { addChannelMember, removeChannelMember, fetchChannelMembers, type ChannelMemberRow } from '@/lib/dataLayer/extended-insights';
import { useModal, btnPrimary, btnSecondary, inputCls } from '@/components/Modal';
import { useLocale } from '@/lib/i18n';

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
  const { t } = useLocale();
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);
  const industryRaw = useAppStore((s) => s.industryRaw);
  const deptRaw = useAppStore((s) => s.deptRaw);
  const indColor = useIndustryColor();
  const { cell, loading } = useMatrixCell();
  const defaultChannels = cell.channels;
  const { user } = useAuth();

  const [channels, setChannels] = useState<string[]>(defaultChannels);
  const [channelRows, setChannelRows] = useState<ChannelRow[]>([]);
  const [channelsLoaded, setChannelsLoaded] = useState(false);
  const [activeCh, setActiveCh] = useState('');
  const [msgInput, setMsgInput] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [channelMembers, setChannelMembers] = useState<ChannelMemberRow[]>([]);
  const [inviteMemberId, setInviteMemberId] = useState('');
  const [inviteError, setInviteError] = useState('');
  const inviteModal = useModal();
  const scrollRef = useRef<HTMLDivElement>(null);
  const createChModal = useModal();
  const [newChName, setNewChName] = useState('');
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const rows = await fetchChannels(industry, dept);
      if (cancelled) return;
      if (rows.length > 0) {
        setChannelRows(rows);
        setChannels(rows.map((r) => r.name));
      } else {
        setChannels(defaultChannels);
      }
      setChannelsLoaded(true);
    }
    load();
    return () => { cancelled = true; };
  }, [industry, dept, defaultChannels]);

  useEffect(() => {
    if (channelsLoaded && channels.length > 0 && !activeCh) {
      setActiveCh(channels[0]);
      setMessages([
        { id: 1, role: 'system', sender: '系统', text: `欢迎来到「${channels[0]}」频道，当前行业：${industry} · ${dept}`, time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) },
      ]);
    }
  }, [channelsLoaded, channels, activeCh, industry, dept]);

  // Load channel members when active channel changes
  useEffect(() => {
    if (!activeCh || !channelRows.length) return;
    const currentRow = channelRows.find((r) => r.name === activeCh);
    if (!currentRow) return;
    fetchChannelMembers(currentRow.id).then(setChannelMembers).catch(() => setChannelMembers([]));
  }, [activeCh, channelRows]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
  }, []);

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

    createMessage({
      channel: activeCh,
      content: msgInput.trim(),
      sender_type: 'user',
      sender_name: user?.name ?? '我',
    });

    setMsgInput('');
    setIsTyping(true);
    scrollToBottom();

    const systemPrompt = buildSystemPrompt(cell, industry, dept, undefined, industryRaw, deptRaw);
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
        onChunk: (_chunk: string, _done: boolean) => { /* intentional no-op */ },
      });

      const aiMsg: ChatMsg = {
        id: Date.now() + 1,
        role: 'ai',
        sender: 'AI同事',
        text: res.text,
        time: now,
      };
      setMessages((prev) => [...prev, aiMsg]);

      createMessage({
        channel: activeCh,
        content: res.text,
        sender_type: 'ai',
        sender_name: 'AI同事',
      });
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'system', sender: '系统', text: 'AI暂时无法回复，请稍后再试。', time: now },
      ]);
    } finally {
      setIsTyping(false);
      scrollToBottom();
    }
  }

  async function handleInviteMember() {
    if (!inviteMemberId.trim()) return;
    setInviteError('');
    const currentRow = channelRows.find((r) => r.name === activeCh);
    if (!currentRow) { setInviteError('频道信息未找到'); return; }
    try {
      const newMember = await addChannelMember(currentRow.id, inviteMemberId.trim());
      if (newMember) {
        setChannelMembers((prev) => [...prev, newMember]);
      }
      setInviteMemberId('');
      inviteModal.closeModal();
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : '邀请失败');
    }
  }

  async function handleCreateChannel() {
    if (!newChName.trim()) return;
    const plan = getCurrentPlan();
    const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
    if (onlineUsers.length + 1 >= limits.maxTeamMembers && limits.maxTeamMembers !== -1) {
      setShowPaywall(true);
      return;
    }
    const name = newChName.trim();
    const row = await createChannel({ industry, dept, name });
    if (row) {
      setChannelRows((prev) => [...prev, row]);
      setChannels((prev) => [...prev, name]);
      // Auto-add creator as channel member
      try { await addChannelMember(row.id, user?.id ?? 'admin_001', 'creator'); } catch { /* ignore */ }
    } else {
      setChannels((prev) => [...prev, name]);
    }
    setActiveCh(name);
    setMessages((prev) => [...prev, { id: Date.now(), role: 'system' as const, sender: '系统', text: `频道「#${name}」已创建`, time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }]);
    setNewChName('');
    createChModal.closeModal();
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
          <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-text-3">{t('channels.channels')}</div>
          {channels.map((ch) => (
            <button
              key={ch}
              onClick={() => setActiveCh(ch)}
              className={cn('flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors', activeCh === ch ? 'bg-primary/10 font-semibold text-primary-2' : 'text-text-2 hover:bg-surface-2')}
            >
              <Hash size={13} className="shrink-0 text-text-3" />
              <span className="truncate">{ch}</span>
              {activeCh === ch && onlineUsers.length > 0 && (
                <span className="ml-auto text-[8px] text-success font-bold">{t('channels.onlineCount', { count: onlineUsers.length })}</span>
              )}
            </button>
          ))}
          <button onClick={createChModal.openModal} className="flex flex-wrap w-full items-center gap-2 px-3 py-1.5 text-xs text-text-3 hover:text-primary-2 transition-colors">
            <Plus size={13} className="shrink-0" />
            <span>{t('channels.newChannel')}</span>
          </button>
          <div className="px-3 py-1.5 mt-2 text-[9px] font-bold uppercase tracking-wider text-text-3">
            {t('channels.aiColleagues')} ({cell.agents.length})
          </div>
          {cell.agents.map((agent) => (
            <div key={agent.name} className="flex flex-wrap items-center gap-2 px-3 py-1.5 text-xs text-text-2">
              <Bot size={13} className="shrink-0 text-primary-2" />
              <span className="truncate">{agent.name}</span>
              <span className="ml-auto text-[8px] text-text-3">{agent.status}</span>
            </div>
          ))}
          {onlineUsers.map((ou, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 px-3 py-1.5 text-xs text-text-2">
              <User size={13} className="shrink-0 text-text-3" />
              <span className="truncate">{ou.user}</span>
              <Circle size={6} className="ml-auto fill-success text-success" />
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 text-xs text-text-2">
            <User size={13} className="shrink-0 text-text-3" />
            <span>{user?.name ?? '我'}</span>
            <Circle size={6} className="ml-auto fill-success text-success" />
          </div>
        </div>
      </div>

      {/* Message Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
          <Hash size={15} className="text-text-3" />
          <span className="text-sm font-bold">{activeCh}</span>
          <span className="text-[10px] text-text-3 ml-2"><Users size={11} className="inline mr-1" />{t('channels.memberCount', { count: 1 + onlineUsers.length + channelMembers.length, aiCount: cell.agents.length })}</span>
          <button onClick={inviteModal.openModal} className="ml-auto flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[10px] text-primary-2 hover:bg-primary/20">
            <Plus size={10} />{t('channels.inviteMember')}
          </button>
          {onlineUsers.length > 0 && (
            <span className="rounded-full bg-success/10 px-2 py-0.5 text-[8px] font-bold text-success">{t('channels.membersOnline')}</span>
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
            <div className="flex flex-wrap gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary-2"><Bot size={14} /></div>
              <div className="rounded-xl bg-primary/10 px-3 py-2 text-xs text-primary-2">
                <span className="inline-flex flex-wrap gap-1"><span className="animate-bounce">·</span><span className="animate-bounce" style={{ animationDelay: '0.15s' }}>·</span><span className="animate-bounce" style={{ animationDelay: '0.3s' }}>·</span></span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
            <input
              type="text"
              value={msgInput}
              onChange={(e) => setMsgInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={t('channels.msgPlaceholder', { channel: activeCh })}
              aria-label={t('channels.msgInputAria')}
              className="flex-1 bg-transparent text-xs text-text outline-none placeholder:text-text-3"
              disabled={isTyping}
            />
            <button onClick={handleSend} aria-label={t('channels.sendAria')} className="rounded-lg bg-primary p-1.5 text-white transition-opacity hover:opacity-80 disabled:opacity-50" disabled={isTyping || !msgInput.trim()}>
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Create Channel Modal */}
      {createChModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={createChModal.closeModal}>
          <div className="w-80 rounded-xl border border-border bg-surface-2 p-3 md:p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold">{t('channels.createChannelTitle')}</span>
              <button onClick={createChModal.closeModal} aria-label={t('channels.closeAria')} className="text-text-3 hover:text-text"><X size={16} /></button>
            </div>
            <div>
              <label className="text-[10px] text-text-3 mb-1 block">{t('channels.channelName')}</label>
              <input value={newChName} onChange={(e) => setNewChName(e.target.value)} placeholder={t('channels.channelNamePlaceholder')} className={inputCls + ' w-full'} onKeyDown={(e) => e.key === 'Enter' && handleCreateChannel()} />
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <button onClick={handleCreateChannel} disabled={!newChName.trim()} className={`${btnPrimary} disabled:opacity-40`}>{t('common.create')}</button>
              <button onClick={createChModal.closeModal} className={btnSecondary}>{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}
      {/* Invite Member Modal */}
      {inviteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={inviteModal.closeModal}>
          <div className="w-80 rounded-xl border border-border bg-surface-2 p-3 md:p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold">{t('channels.inviteTitle', { channel: activeCh })}</span>
              <button onClick={inviteModal.closeModal} aria-label={t('channels.closeAria')} className="text-text-3 hover:text-text"><X size={16} /></button>
            </div>
            <div>
              <label className="text-[10px] text-text-3 mb-1 block">{t('channels.memberId')}</label>
              <input value={inviteMemberId} onChange={(e) => { setInviteMemberId(e.target.value); setInviteError(''); }} placeholder={t('channels.memberIdPlaceholder')} className={inputCls + ' w-full'} onKeyDown={(e) => e.key === 'Enter' && handleInviteMember()} />
            </div>
            {inviteError && <div className="mt-2 text-[10px] text-danger">{inviteError}</div>}
            {channelMembers.length > 0 && (
              <div className="mt-3 space-y-1">
                <div className="text-[9px] text-text-3 font-bold">{t('channels.currentMembers')}</div>
                {channelMembers.map((cm) => (
                  <div key={cm.id} className="flex items-center justify-between text-[10px] text-text-2">
                    <span>{cm.member_id} <span className="text-text-3">({cm.role})</span></span>
                    {cm.role !== 'creator' && (
                      <button onClick={async () => { await removeChannelMember(cm.channel_id, cm.member_id); setChannelMembers((prev) => prev.filter((m) => m.id !== cm.id)); }} className="text-danger hover:underline">{t('channels.remove')}</button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <button onClick={handleInviteMember} disabled={!inviteMemberId.trim()} className={`${btnPrimary} disabled:opacity-40`}>{t('channels.invite')}</button>
              <button onClick={inviteModal.closeModal} className={btnSecondary}>{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}
      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} reason={t('channels.paywallReason')} feature="maxTeamMembers" />
    </div>
  );
}
