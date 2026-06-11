import { useState, useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';
import { useNavigate } from 'react-router-dom';
import { useMatrixCell, useIndustryColor, useGoals, useTasks, useActionItems, useDeviationAlerts } from '@/hooks/useMatrix';
import type { ActionItemRow } from '@/lib/dataLayer';
import { useAuth } from '@/lib/auth';
import { useRealtime } from '@/hooks/useRealtime';
import { createMessage, fetchMessages, type MessageRow } from '@/lib/dataLayer';

export interface ChatMsg {
  id: number;
  role: 'user' | 'ai' | 'tool';
  text: string;
  time: string;
  agent?: string;
  agentIcon?: string;
  streaming?: boolean;
  toolName?: string;
  toolResult?: Record<string, unknown>[];
  actions?: Array<{ label: string; module: string; iface: string }>;
}

const AI_ASSISTANT_CHANNEL = 'ai-assistant';

// --- Session persistence (localStorage fallback) ---

const SESSION_KEY = 'tbh-ai-sessions';
const MAX_SESSIONS = 5;
const MAX_MESSAGES_PER_SESSION = 30;

interface PersistedSession {
  id: string;
  title: string;
  messages: ChatMsg[];
  updatedAt: string;
}

function loadSessions(): PersistedSession[] {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSessions(sessions: PersistedSession[]): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
  } catch { /* localStorage full, silently ignore */ }
}

function getCurrentSessionId(): string {
  return sessionStorage.getItem('tbh-current-session-id') || `s_${Date.now()}`;
}

function setCurrentSessionId(id: string): void {
  sessionStorage.setItem('tbh-current-session-id', id);
}

function saveCurrentSession(messages: ChatMsg[]): void {
  if (messages.length === 0) return;
  const sessions = loadSessions();
  const sessionId = getCurrentSessionId();
  const userMsgs = messages.filter((m) => m.role === 'user');
  const title = userMsgs.length > 0 ? userMsgs[0].text.slice(0, 30) : '新对话';
  const existing = sessions.findIndex((s) => s.id === sessionId);
  const session: PersistedSession = {
    id: sessionId,
    title,
    messages: messages.slice(-MAX_MESSAGES_PER_SESSION),
    updatedAt: new Date().toISOString(),
  };
  if (existing >= 0) {
    sessions[existing] = session;
  } else {
    sessions.unshift(session);
  }
  // Keep only MAX_SESSIONS
  while (sessions.length > MAX_SESSIONS) sessions.pop();
  saveSessions(sessions);
}

function loadCurrentSession(): ChatMsg[] | null {
  const sessions = loadSessions();
  const sessionId = getCurrentSessionId();
  const found = sessions.find((s) => s.id === sessionId);
  return found ? found.messages : null;
}

export function getPreviousSessions(): PersistedSession[] {
  return loadSessions();
}

export function startNewSession(): string {
  const id = `s_${Date.now()}`;
  setCurrentSessionId(id);
  return id;
}

export function useChatMessages() {
  const navigate = useNavigate();
  const storeNavigateTo = useAppStore((s) => s.navigateTo);
  const { cell, loading } = useMatrixCell();
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, []);

  function navTo(iface: string, mod: string) {
    const path = storeNavigateTo(iface, mod);
    navigate(path);
  }

  // Load historical messages on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Try Supabase history first
      const rows = await fetchMessages(AI_ASSISTANT_CHANNEL);
      if (cancelled) return;
      const loaded: ChatMsg[] = rows.map((m, i) => ({
        id: i + 1,
        role: m.sender_type === 'ai' ? 'ai' as const : m.sender_type === 'system' ? 'ai' as const : 'user' as const,
        text: m.content,
        time: m.created_at ? new Date(m.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '',
        agent: m.sender_type === 'ai' ? 'general' : undefined,
        agentIcon: m.sender_type === 'ai' ? '🧠' : undefined,
      }));

      // Fallback to localStorage if Supabase returns empty
      if (loaded.length === 0) {
        const persisted = loadCurrentSession();
        if (persisted && persisted.length > 0) {
          setMessages(persisted);
          setHistoryLoaded(true);
          scrollToBottom();
          return;
        }
      }

      if (loaded.length === 0 && cell.morning) {
        loaded.push({
          id: 1,
          role: 'ai',
          text: `☀️ 晨间播报\n\n${cell.morning}\n\n📊 业务概览: ${cell.ribbon}\n\n有什么需要我帮你分析的？`,
          time: '08:00',
          agent: 'morning-brief',
          agentIcon: '☀️',
        });
      }
      setMessages(loaded);
      setHistoryLoaded(true);
      scrollToBottom();
    })();
    return () => { cancelled = true; };
  }, [cell.morning, cell.ribbon, scrollToBottom]);

  // Auto-save session to localStorage on message changes
  useEffect(() => {
    if (messages.length > 0 && historyLoaded) {
      saveCurrentSession(messages);
    }
  }, [messages, historyLoaded]);

  // Subscribe to realtime messages for this channel
  useRealtime(
    'messages',
    useCallback((payload) => {
      if (payload.new?.channel !== AI_ASSISTANT_CHANNEL) return;
      if (payload.eventType !== 'INSERT') return;
      const m = payload.new;
      setMessages((prev) => {
        if (prev.some((ex) => ex.text === (m.content as string) && ex.role === (m.sender_type === 'ai' ? 'ai' : 'user'))) return prev;
        return [
          ...prev,
          {
            id: Date.now(),
            role: m.sender_type === 'ai' ? 'ai' as const : 'user' as const,
            text: m.content as string ?? '',
            time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          },
        ];
      });
      scrollToBottom();
    }, [scrollToBottom]),
    { column: 'channel', value: AI_ASSISTANT_CHANNEL },
  );

  return {
    messages, setMessages, scrollRef, scrollToBottom,
    historyLoaded, cell, user, navTo,
    AI_ASSISTANT_CHANNEL,
    startNewSession,
  };
}
