import { Pencil, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AiMsg, ChipOption } from './types';

interface UnderstandingLayersProps {
  cell: {
    kpis: { name: string; value: string; status: string }[];
    workflow: string[];
    wfCurrent: number;
  };
  editingLayer: 'vocab' | 'flow' | 'kpi' | null;
  editValue: string;
  onLayerEdit: (layer: 'vocab' | 'flow' | 'kpi', value: string) => void;
  onLayerSave: () => void;
  onEditValueChange: (v: string) => void;
  onCancelEdit: () => void;
}

export function UnderstandingLayers({
  cell,
  editingLayer,
  editValue,
  onLayerEdit,
  onLayerSave,
  onEditValueChange,
  onCancelEdit,
}: UnderstandingLayersProps) {
  return (
    <div className="border-b border-border px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-3">词汇层</span>
        <button onClick={() => onLayerEdit('vocab', cell.kpis.slice(0, 3).map((k) => k.name).join(', '))} aria-label="编辑词汇层" className="text-text-3 hover:text-primary-2 transition-colors"><Pencil size={10} /></button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {cell.kpis.slice(0, 3).map((kpi) => (
          <button key={kpi.name} onClick={() => onLayerEdit('vocab', kpi.name)} className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-text-2 hover:bg-primary/10 hover:text-primary-2 transition-colors cursor-pointer">
            {kpi.name}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-2 mt-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-3">流程层</span>
        <button onClick={() => onLayerEdit('flow', cell.workflow.join(' → '))} aria-label="编辑流程层" className="text-text-3 hover:text-primary-2 transition-colors"><Pencil size={10} /></button>
      </div>
      <div className="flex items-center gap-1 text-[10px] text-text-2">
        {cell.workflow.map((step, i) => (
          <button key={step} onClick={() => onLayerEdit('flow', step)} className="flex items-center gap-1 hover:text-primary-2 transition-colors cursor-pointer">
            <span className={cn(i === cell.wfCurrent && 'font-bold text-accent')}>{step}</span>
            {i < cell.workflow.length - 1 && <ChevronRight size={10} className="text-text-3" />}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-2 mt-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-3">指标层</span>
        <button onClick={() => onLayerEdit('kpi', cell.kpis.map((k) => `${k.name}: ${k.value}`).join(', '))} aria-label="编辑指标层" className="text-text-3 hover:text-primary-2 transition-colors"><Pencil size={10} /></button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {cell.kpis.map((kpi) => (
          <button key={kpi.name} onClick={() => onLayerEdit('kpi', `${kpi.name}: ${kpi.value}`)} className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium hover:opacity-80 transition-opacity cursor-pointer', kpi.status === 'good' && 'bg-success/10 text-success', kpi.status === 'warn' && 'bg-warn/10 text-warn', kpi.status === 'bad' && 'bg-danger/10 text-danger')}>
            {kpi.name} {kpi.value}
          </button>
        ))}
      </div>

      {editingLayer && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="text"
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onLayerSave()}
            placeholder={`修正${editingLayer === 'vocab' ? '词汇' : editingLayer === 'flow' ? '流程' : '指标'}...`}
            className="flex-1 rounded-lg border border-primary/50 bg-surface-2 px-2 py-1 text-[10px] text-text outline-none placeholder:text-text-3"
            autoFocus
          />
          <button onClick={onLayerSave} className="rounded-md bg-primary px-2 py-1 text-[9px] font-semibold text-white">确认</button>
          <button onClick={onCancelEdit} className="text-[9px] text-text-3 hover:text-text">取消</button>
        </div>
      )}
    </div>
  );
}
