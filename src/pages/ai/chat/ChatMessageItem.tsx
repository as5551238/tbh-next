import { Bot, User, Zap, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMsg } from './useChatMessages';

interface ChatMessageItemProps {
  msg: ChatMsg;
  onNavTo: (iface: string, module: string) => void;
}

export function ChatMessageItem({ msg, onNavTo }: ChatMessageItemProps) {
  return (
    <div className={cn('flex gap-2.5', msg.role === 'user' && 'flex-row-reverse')}>
      <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold', msg.role === 'ai' ? 'bg-primary/10 text-primary-2' : msg.role === 'tool' ? 'bg-accent/10 text-accent' : 'bg-accent/10 text-accent')}>
        {msg.role === 'ai' ? <Bot size={14} /> : msg.role === 'tool' ? <Zap size={14} /> : <User size={14} />}
      </div>
      <div className={cn('max-w-[75%] rounded-xl px-3 py-2.5 text-xs leading-relaxed whitespace-pre-line', msg.role === 'ai' ? 'bg-primary/10 text-primary-2' : msg.role === 'tool' ? 'bg-accent/10 text-accent' : 'bg-accent/10 text-text')}>
        {msg.text}
        {msg.streaming && <span className="inline-block w-1.5 h-4 ml-1 bg-primary-2 animate-pulse align-text-bottom" />}
      </div>
      {msg.actions && msg.actions.length > 0 && (
        <div className="flex flex-col justify-end gap-1">
          {msg.actions.map((act) => (
            <button key={act.label} onClick={() => onNavTo(act.iface, act.module)} className="flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[10px] text-primary-2 transition-all hover:bg-primary/20">
              {act.label}<ArrowRight size={10} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
