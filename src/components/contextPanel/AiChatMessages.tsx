import { Bot, Loader2, Wand2 } from 'lucide-react';
import { getIndustryColor } from '@/matrix/data';
import type { AiMsg, ChipOption } from './types';

interface AiChatMessagesProps {
  messages: AiMsg[];
  isThinking: boolean;
  chips: ChipOption[];
  onChipSelect: (chip: ChipOption) => void;
}

export function AiChatMessages({ messages, isThinking, chips, onChipSelect }: AiChatMessagesProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-3">
      <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-3">对话设定</div>
      <div className="flex flex-col gap-2 mb-3">
        {messages.map((msg, i) => (
          <div key={i} className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${msg.role === 'ai' ? 'bg-primary/10 text-primary-2' : 'bg-surface-2 text-text-2 ml-6'}`}>
            {msg.role === 'ai' && <Bot size={12} className="inline mr-1 opacity-50" />}
            {msg.text}
          </div>
        ))}
        {isThinking && (
          <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary-2">
            <Loader2 size={12} className="animate-spin" />
            <span>正在理解...</span>
          </div>
        )}
      </div>

      {chips.length > 0 && (
        <div className="space-y-1.5 mb-2">
          <div className="text-[9px] font-bold uppercase tracking-wider text-text-3">选择你的上下文</div>
          {chips.map((chip) => (
            <button
              key={chip.label}
              onClick={() => onChipSelect(chip)}
              className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-left transition-all hover:border-primary/50 hover:bg-primary/5"
            >
              <span className="rounded-md px-1.5 py-0.5 text-[9px] font-bold" style={{ backgroundColor: getIndustryColor(chip.industry) + '18', color: getIndustryColor(chip.industry) }}>
                {Math.round(chip.confidence * 100)}%
              </span>
              <span className="text-xs font-medium text-text">{chip.label}</span>
              {chip.isNew && (
                <span className="ml-auto flex items-center gap-1 rounded-full bg-accent/10 px-1.5 py-0.5 text-[8px] font-bold text-accent">
                  <Wand2 size={8} />AI共创
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
