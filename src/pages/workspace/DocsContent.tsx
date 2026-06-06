import { useState } from 'react';
import { useDocs, useMatrixCell } from '@/hooks/useMatrix';
import { cn } from '@/lib/utils';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import ItemDetailModal from '@/components/ItemDetailModal';
import { FileText, Plus, Clock, Users, MoreHorizontal, Loader2 } from 'lucide-react';
import { createDoc } from '@/lib/dataLayer';

const statusMap: Record<string, { label: string; cls: string }> = {
  editing: { label: '编辑中', cls: 'bg-success/10 text-success' },
  review: { label: '评审中', cls: 'bg-warn/10 text-warn' },
  draft: { label: '草稿', cls: 'bg-surface-2 text-text-3' },
  published: { label: '已发布', cls: 'bg-primary/10 text-primary-2' },
};

export default function DocsContent() {
  const { cell, loading: cellLoading } = useMatrixCell();
  const { docs, setDocs, loading } = useDocs();

  const createModal = useModal();
  const editModal = useModal();
  const { toasts, success, error: toastError } = useToast();
  const [selectedDoc, setSelectedDoc] = useState<(typeof docs)[number] | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('doc');

  const [statusFilter, setStatusFilter] = useState('全部');
  const filters = ['全部', '正在编辑', '评审中', '草稿', '已发布'];

  async function handleCreate() {
    if (!newTitle.trim()) return;
    const newDoc = {
      id: `doc-${Date.now()}`,
      title: newTitle.trim(),
      type: newType,
      status: 'draft' as const,
      updated: new Date().toLocaleDateString('zh-CN'),
      editors: 0,
    };
    setDocs((prev) => [newDoc, ...prev]);
    try {
      await createDoc(newDoc);
      success(`文档"${newDoc.title}"已创建`);
    } catch (e) {
      toastError('创建失败，数据仅保存在本地');
    }
    setNewTitle('');
    setNewType('doc');
    createModal.closeModal();
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary-2" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <ToastOverlay toasts={toasts} />
      <div className="flex items-center gap-2">
        <FileText size={18} className="text-primary-2" />
        <span className="text-sm font-bold">文档协作</span>
        <button onClick={createModal.openModal} className="ml-auto flex items-center gap-1 rounded-lg bg-primary px-3 py-1 text-[11px] font-semibold text-white transition-all hover:bg-primary-2">
          <Plus size={12} />
          新建文档
        </button>
      </div>

      <div className="flex items-center gap-2">
        {filters.map((f) => (
          <button key={f} onClick={() => setStatusFilter(f)}
            className={`rounded-lg px-3 py-1 text-[11px] font-medium transition-all ${statusFilter === f ? 'bg-primary/10 text-primary-2' : 'text-text-3 hover:bg-surface-2'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {docs.map((d) => {
          const st = statusMap[d.status];
          return (
            <div key={d.id} className="group flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-all hover:border-border-2 hover:shadow-lg cursor-pointer" onClick={() => { setSelectedDoc(d); editModal.openModal(); }}>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <FileText size={15} className="text-primary-2" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-text truncate">{d.title}</div>
                <div className="flex items-center gap-2 text-[10px] text-text-3 mt-0.5">
                  <span>{d.type}</span>
                  <span>·</span>
                  <Clock size={9} />
                  <span>{d.updated}</span>
                  {d.editors > 0 && (
                    <>
                      <span>·</span>
                      <Users size={9} />
                      <span>{d.editors}人编辑</span>
                    </>
                  )}
                </div>
              </div>
              {st && <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold', st.cls)}>{st.label}</span>}
              <button onClick={(e) => { e.stopPropagation(); setSelectedDoc(d); editModal.openModal(); }} className="opacity-0 group-hover:opacity-100 transition-opacity text-text-3 hover:text-text">
                <MoreHorizontal size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <Modal open={createModal.open} onClose={createModal.closeModal} title="新建文档"
        footer={
          <>
            <button onClick={createModal.closeModal} className={btnSecondary}>取消</button>
            <button onClick={handleCreate} className={btnPrimary} disabled={!newTitle.trim()}>创建</button>
          </>
        }>
        <ModalField label="文档标题">
          <input className={inputCls} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="输入文档标题" />
        </ModalField>
        <ModalField label="文档类型">
          <select className={inputCls} value={newType} onChange={(e) => setNewType(e.target.value)}>
            <option value="doc">文档</option>
            <option value="sheet">表格</option>
            <option value="slide">幻灯片</option>
            <option value="other">其他</option>
          </select>
        </ModalField>
      </Modal>

      <ItemDetailModal
        open={editModal.open}
        onClose={editModal.closeModal}
        title="编辑文档"
        fields={[
          { key: 'title', label: '标题', type: 'text' },
          { key: 'type', label: '类型', type: 'select', options: [
            { value: 'doc', label: '文档' }, { value: 'sheet', label: '表格' }, { value: 'slide', label: '幻灯片' },
          ]},
          { key: 'status', label: '状态', type: 'select', options: [
            { value: 'editing', label: '编辑中' }, { value: 'review', label: '评审中' }, { value: 'draft', label: '草稿' }, { value: 'published', label: '已发布' },
          ]},
          { key: 'content', label: '内容', type: 'textarea' },
        ]}
        data={selectedDoc as Record<string, unknown> | null}
        onSave={(updated) => {
          const id = updated.id as string;
          setDocs(prev => prev.map(doc => doc.id === id ? { ...doc, ...updated } as (typeof docs)[number] : doc));
        }}
        onDelete={() => {
          if (selectedDoc) setDocs(prev => prev.filter(doc => doc.id !== selectedDoc.id));
        }}
      />
    </div>
  );
}
