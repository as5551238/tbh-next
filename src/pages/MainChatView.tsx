import { useState, useEffect } from 'react';
import { useGateCheck } from '@/hooks/useGateCheck';
import PaywallModal from '@/components/PaywallModal';
import { useAppStore } from '@/stores/appStore';
import { useIndustryColor, useDeviationAlerts } from '@/hooks/useMatrix';
import { isSupabaseConfigured } from '@/lib/supabase';
import { recordRender } from '@/lib/monitoring';
import { IntentFallbackForm } from '@/components/IntentFallbackForm';
import { Bot, Send, AlertTriangle } from 'lucide-react';
import { useChatMessages, getPreviousSessions, startNewSession } from './ai/chat/useChatMessages';
import { useAgentLoop } from './ai/chat/useAgentLoop';
import { ChatMessageItem } from './ai/chat/ChatMessageItem';
import { ChatContextBar } from './ai/chat/ChatContextBar';
import { QuickActionCards } from './ai/chat/QuickActionCards';
import { AgentSwitcherPanel } from './ai/chat/AgentSwitcherPanel';

function getAiRouteLabel(): { label: string; color: string } {
  if (isSupabaseConfigured()) return { label: 'AI代理', color: 'text-purple-400 bg-purple-400/10' };
  return { label: '本地模式', color: 'text-warn bg-warn/10' };
}

function MainChatView() {
  const { showPaywall: mcShow, paywallReason: mcReason, paywallFeature: mcFeat, closePaywall: mcClose, requireFeature: mcRequire } = useGateCheck();
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);
  const indColor = useIndustryColor();
  const { alerts: deviationAlerts } = useDeviationAlerts(true);
  const [chatInput, setChatInput] = useState('');

  const { messages, setMessages, scrollRef, scrollToBottom, cell, navTo, AI_ASSISTANT_CHANNEL, startNewSession: handleNewSession } = useChatMessages();
  const {
    isTyping, activeAgent, setActiveAgent,
    fallbackOpen, setFallbackOpen, fallbackIntent, fallbackRawText,
    limitWarning, isOfflineMode, pendingConfirmation,
    overdueTasks, atRiskGoals, openActionItems,
    handleToolAction, handleFallbackSubmit,
    handleConfirmExecution, handleRejectExecution,
    handleSend,
  } = useAgentLoop(messages, setMessages, cell, scrollToBottom, AI_ASSISTANT_CHANNEL);

  // Monitor render timing
  useEffect(() => {
    const t0 = performance.now();
    return () => { recordRender('MainChatView', performance.now() - t0); };
  }, []);

  async function onSend() {
    const newInput = await handleSend(chatInput);
    setChatInput(newInput);
  }

  return (
    <div className="flex h-full">
      {/* Left: Chat area */}
      <div className="flex flex-1 flex-col border-r border-border min-w-0">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
            <Bot size={14} className="text-primary-2" />
          </div>
          <span className="text-sm font-bold">工作助手</span>
          {activeAgent ? (
            <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ backgroundColor: activeAgent.color + '20', color: activeAgent.color }}>
              {activeAgent.icon} {activeAgent.name}
            </span>
          ) : (
            <span className="rounded-full bg-success/10 px-2 py-0.5 text-[9px] font-bold text-success">在线</span>
          )}
          {(() => { const r = getAiRouteLabel(); return <span className={`ml-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${r.color}`}>{r.label}</span>; })()}
          <span className="ml-2 rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ backgroundColor: indColor + '20', color: indColor }}>{industry} · {dept}</span>
          <button onClick={() => { handleNewSession(); setMessages([]); }} className="ml-auto rounded-md bg-surface-3 px-2 py-0.5 text-[9px] font-semibold text-text-2 hover:bg-surface-3/80 transition-colors" aria-label="新对话">+ 新对话</button>
        </div>

        {/* Offline mode banner */}
        {isOfflineMode && (
          <div className="flex items-center gap-2 bg-warn/10 border-b border-warn/20 px-4 py-1.5 text-[10px] text-warn">
            <AlertTriangle size={12} />
            <span>AI服务不可用，当前为离线模式</span>
            <button onClick={() => navTo('ai', 'subscription')} className="ml-auto rounded bg-warn/20 px-2 py-0.5 text-[9px] font-semibold hover:bg-warn/30">配置API Key</button>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((msg) => (
            <ChatMessageItem key={msg.id} msg={msg} onNavTo={navTo} />
          ))}
          {isTyping && messages[messages.length - 1]?.streaming !== true && (
            <div className="flex flex-wrap gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary-2"><Bot size={14} /></div>
              <div className="rounded-xl bg-primary/10 px-3 py-2.5 text-xs text-primary-2">
                <span className="inline-flex flex-wrap gap-1"><span className="animate-bounce">·</span><span className="animate-bounce" style={{ animationDelay: '0.15s' }}>·</span><span className="animate-bounce" style={{ animationDelay: '0.3s' }}>·</span></span>
              </div>
            </div>
          )}
        </div>

        {/* Smart context bar */}
        <ChatContextBar
          overdueTasks={overdueTasks}
          atRiskGoals={atRiskGoals}
          deviationAlerts={deviationAlerts}
          openActionItems={openActionItems}
          onNavTo={navTo}
          isTyping={isTyping}
        />

        {/* Quick action cards */}
        <QuickActionCards
          onToolAction={handleToolAction}
          onNavTo={navTo}
          onSetInput={setChatInput}
          isTyping={isTyping}
        />

        {/* Agent Loop: Confirmation prompt */}
        {pendingConfirmation && (
          <div className="flex flex-wrap items-center gap-2 mx-4 my-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
            <span className="text-[10px] text-primary-2 font-semibold">确认执行？</span>
            <button onClick={handleConfirmExecution} className="rounded-md bg-primary px-3 py-1 text-[10px] text-white font-semibold hover:bg-primary/80 transition-colors">确认</button>
            <button onClick={handleRejectExecution} className="rounded-md bg-surface-3 px-3 py-1 text-[10px] text-text-2 font-semibold hover:bg-surface-3/80 transition-colors">取消</button>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border px-4 py-3">
          {limitWarning && (
            <div className="mb-2 flex items-center justify-between rounded-lg bg-danger/10 px-3 py-2 text-[10px] text-danger">
              <span>{limitWarning}</span>
              <button onClick={() => navTo('ai', 'subscription')} className="rounded-md bg-danger/20 px-2 py-0.5 text-[9px] font-semibold text-danger hover:bg-danger/30">升级方案</button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
            <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSend()} placeholder="问我任何关于你工作的事..." aria-label="AI聊天输入框" className="flex-1 bg-transparent text-xs text-text outline-none placeholder:text-text-3" disabled={isTyping} />
            <button onClick={onSend} className="rounded-lg bg-primary p-1.5 text-white transition-opacity hover:opacity-80 disabled:opacity-50" disabled={isTyping || !chatInput.trim()} aria-label="发送">
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Right: Context panel */}
      <AgentSwitcherPanel
        activeAgent={activeAgent}
        onSelectAgent={(agent) => { setActiveAgent(agent); setChatInput(''); }}
        cell={cell}
        indColor={indColor}
        industry={industry}
        dept={dept}
      />

      <PaywallModal open={mcShow} onClose={mcClose} reason={mcReason} feature={mcFeat} />
      <IntentFallbackForm
        open={fallbackOpen}
        onClose={() => setFallbackOpen(false)}
        guessedIntent={fallbackIntent}
        rawText={fallbackRawText}
        onSubmit={handleFallbackSubmit}
      />
    </div>
  );
}

export default MainChatView;
