import { useState, useCallback, useRef, useEffect } from 'react';
import { useCollabDocs } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { useAuth } from '@/lib/auth';
import { useRealtime, usePresence } from '@/hooks/useRealtime';
import { cn } from '@/lib/utils';
import { FileText, FileSpreadsheet, FileImage, File, Clock, User, Edit3, Eye, Loader2, X, Save, Users } from 'lucide-react';

const TYPE_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  doc: FileText,
  sheet: FileSpreadsheet,
  slide: FileImage,
  other: File,
};

const STATUS_STYLES: Record<string, string> = {
  editing: 'bg-success/10 text-success',
  review: 'bg-warn/10 text-warn',
  final: 'bg-primary/10 text-primary-2',
};

export default function CollabDocsView() {
  const { docs, loading } = useCollabDocs();
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);
  const { user } = useAuth();

  const [activeDoc, setActiveDoc] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [coEditors, setCoEditors] = useState<{ user: string; online_at: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Subscribe to realtime changes on collab_docs
  useRealtime(
    'collab_docs',
    useCallback((payload) => {
      if (payload.new?.id === activeDoc && payload.new?.content) {
        setEditContent(payload.new.content as string);
      }
    }, [activeDoc]),
  );

  // Presence for collaborative editing
  usePresence(
    `doc-${activeDoc ?? 'none'}`,
    user?.id ?? `anon-${Date.now()}`,
    useCallback((states) => {
      const editors: { user: string; online_at: string }[] = [];
      for (const stateArr of Object.values(states)) {
        if (Array.isArray(stateArr)) {
          for (const s of stateArr) {
            editors.push(s as { user: string; online_at: string });
          }
        }
      }
      setCoEditors(editors);
    }, []),
  );

  // Load doc content when selected
  useEffect(() => {
    if (activeDoc) {
      const doc = docs.find((d) => d.id === activeDoc);
      if (doc) setEditContent(doc.content || `# ${doc.title}\n\n在此编辑文档内容...`);
    }
  }, [activeDoc, docs]);

  async function handleSave() {
    setSaving(true);
    // Simulate save with debounce (real version would call dataLayer.updateCollabDoc)
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
  }

  const activeDocData = docs.find((d) => d.id === activeDoc);

  // Document editor view
  if (activeDoc && activeDocData) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
          <button onClick={() => setActiveDoc(null)} className="flex h-7 w-7 items-center justify-center rounded-lg text-text-3 hover:bg-surface-2">
            <X size={14} />
          </button>
          <span className="text-sm font-bold">{activeDocData.title}</span>
          <span className={cn('rounded-full px-1.5 py-0.5 text-[8px] font-bold', STATUS_STYLES[activeDocData.status])}>
            {activeDocData.status === 'editing' ? '编辑中' : activeDocData.status === 'review' ? '评审中' : '已定稿'}
          </span>
          {coEditors.length > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[8px] font-bold text-success">
              <Users size={9} /> {coEditors.length + 1} 人协作中
            </span>
          )}
          <button onClick={handleSave} className="ml-auto flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20 transition-colors disabled:opacity-50" disabled={saving}>
            <Save size={12} /> {saving ? '保存中...' : '保存'}
          </button>
        </div>

        <div className="flex-1 overflow-hidden p-4">
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="h-full w-full resize-none bg-transparent text-sm text-text leading-relaxed outline-none font-mono"
            placeholder="输入文档内容..."
            aria-label="文档内容编辑器"
          />
        </div>
      </div>
    );
  }

  // Document list view
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="text-sm font-bold">协作文档</span>
        <span className="text-[10px] text-text-3">{docs.length} 个文档</span>
        <button className="ml-auto rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20 transition-colors">+ 新建文档</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-text-3" size={24} /></div>
        ) : (
        docs.map((doc) => {
          const Icon = TYPE_ICONS[doc.type] ?? File;
          return (
            <div key={doc.id} onClick={() => setActiveDoc(doc.id)} className="group rounded-xl border border-border bg-surface p-4 transition-all hover:border-primary/30 hover:shadow-lg cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <Icon size={16} className="text-primary-2" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-text truncate">{doc.title}</span>
                    <span className={cn('rounded-full px-1.5 py-0.5 text-[8px] font-bold shrink-0', STATUS_STYLES[doc.status])}>
                      {doc.status === 'editing' ? '编辑中' : doc.status === 'review' ? '评审中' : '已定稿'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-text-3">
                    <span className="flex items-center gap-1"><Clock size={9} />{doc.last_edited}</span>
                    <span className="flex items-center gap-1"><User size={9} />{doc.last_edited_by}</span>
                    <span className="flex items-center gap-1"><Edit3 size={9} />{doc.editors}人编辑</span>
                    <span className="flex items-center gap-1"><Eye size={9} />{doc.viewers}人查看</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })
        )}
      </div>
    </div>
  );
}
