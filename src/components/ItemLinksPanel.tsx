/**
 * ItemLinksPanel — Show and manage links between entities.
 *
 * Props:
 * - sourceId: the entity's ID
 * - sourceType: 'goal' | 'task' | 'risk' | 'action_item' | etc.
 */
import { useState } from 'react';
import { useItemLinks } from '@/hooks/useMatrix';
import { cn } from '@/lib/utils';
import { Link2, Plus, X, ExternalLink } from 'lucide-react';

const TYPE_OPTIONS = [
  { value: 'goal', label: '目标', icon: '🎯' },
  { value: 'task', label: '任务', icon: '✅' },
  { value: 'risk', label: '风险', icon: '⚠️' },
  { value: 'action_item', label: '行动项', icon: '⚡' },
  { value: 'project', label: '项目', icon: '📁' },
  { value: 'doc', label: '文档', icon: '📄' },
];

export default function ItemLinksPanel({ sourceId, sourceType }: { sourceId: string; sourceType: string }) {
  const { links, loading, addLink, removeLink } = useItemLinks(sourceId, sourceType);
  const [adding, setAdding] = useState(false);
  const [targetType, setTargetType] = useState('task');
  const [targetId, setTargetId] = useState('');
  const [label, setLabel] = useState('');

  const handleAdd = async () => {
    if (!targetId.trim()) return;
    await addLink({
      source_id: sourceId,
      source_type: sourceType,
      target_id: targetId.trim(),
      target_type: targetType,
      label: label.trim() || null,
      team_id: '__default__',
    });
    setTargetId('');
    setLabel('');
    setAdding(false);
  };

  const typeIcon = (t: string) => TYPE_OPTIONS.find((o) => o.value === t)?.icon || '🔗';
  const typeLabel = (t: string) => TYPE_OPTIONS.find((o) => o.value === t)?.label || t;

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="flex items-center gap-2 mb-2">
        <Link2 size={14} className="text-text-3" />
        <span className="text-xs font-bold text-text">关联 ({links.length})</span>
        <button className="ml-auto rounded-md p-1 text-text-3 hover:bg-primary/10 hover:text-primary-2" onClick={() => setAdding(!adding)} title="添加关联" aria-label="添加关联">
          <Plus size={12} />
        </button>
      </div>

      {loading ? (
        <div className="text-[10px] text-text-3">加载关联...</div>
      ) : links.length === 0 && !adding ? (
        <div className="text-[10px] text-text-3 mb-2">暂无关联，点击 + 添加</div>
      ) : (
        <div className="space-y-1 mb-2">
          {links.map((l) => (
            <div key={l.id} className="group flex items-center gap-2 rounded-lg bg-surface-2 px-2 py-1.5">
              <span className="text-xs">{typeIcon(l.target_type)}</span>
              <span className="text-[11px] font-semibold text-text">{typeLabel(l.target_type)}</span>
              <span className="text-[10px] text-text-3 truncate">{l.target_id}</span>
              {l.label && <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary-2">{l.label}</span>}
              <button className="ml-auto rounded p-0.5 text-text-3 opacity-0 group-hover:opacity-100 hover:text-danger transition-opacity" onClick={() => removeLink(l.id)} aria-label="移除关联">
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="space-y-2 rounded-lg border border-border bg-surface-2 p-2">
          <div className="flex items-center gap-2">
            <select className="h-7 rounded-md border border-border bg-bg px-2 text-[11px] text-text" value={targetType} onChange={(e) => setTargetType(e.target.value)}>
              {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.icon} {o.label}</option>)}
            </select>
            <input type="text" aria-label="关联目标ID" placeholder="目标ID" value={targetId} onChange={(e) => setTargetId(e.target.value)} className="h-7 flex-1 rounded-md border border-border bg-bg px-2 text-[11px] text-text" />
          </div>
          <input type="text" aria-label="关联标签" placeholder="标签（可选，如：阻塞、依赖）" value={label} onChange={(e) => setLabel(e.target.value)} className="h-7 w-full rounded-md border border-border bg-bg px-2 text-[11px] text-text" />
          <div className="flex items-center gap-2 justify-end">
            <button className="h-7 rounded-md px-3 text-[11px] text-text-3 hover:text-text" onClick={() => setAdding(false)}>取消</button>
            <button className="h-7 rounded-md bg-primary px-3 text-[11px] font-bold text-white hover:opacity-80 disabled:opacity-30" disabled={!targetId.trim()} onClick={handleAdd}>关联</button>
          </div>
        </div>
      )}
    </div>
  );
}
