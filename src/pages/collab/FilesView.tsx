import { useState, useRef, type FC, type ChangeEvent } from 'react';
import { useSharedFiles } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { FileText, FileSpreadsheet, Image, FileArchive, Download, Upload, Search, Grid, List, Clock, HardDrive, X, Check, Trash2 } from 'lucide-react';
import { useModal, btnPrimary, btnSecondary, inputCls } from '@/components/Modal';
import ItemDetailModal from '@/components/ItemDetailModal';
import type { FieldDef } from '@/components/ItemDetailModal';
import type { SharedFileRow } from '@/lib/dataLayer';
import { CardSkeleton } from '@/components/Skeleton';



const FILE_ICONS: Record<string, FC<{ size?: number; className?: string }>> = {
  doc: FileText,
  sheet: FileSpreadsheet,
  image: Image,
  archive: FileArchive,
  pdf: FileText,
  other: File as unknown as FC<{ size?: number; className?: string }>,
};

const FILE_COLORS: Record<string, string> = {
  doc: 'bg-blue-500/10 text-blue-400',
  sheet: 'bg-green-500/10 text-green-400',
  image: 'bg-purple-500/10 text-purple-400',
  archive: 'bg-yellow-500/10 text-yellow-400',
  pdf: 'bg-red-500/10 text-red-400',
  other: 'bg-surface-2 text-text-3',
};

const FILE_FIELDS: FieldDef[] = [
  { key: 'name', label: '文件名', type: 'text', editable: true },
  { key: 'type', label: '类型', type: 'text', editable: false },
  { key: 'uploaded_by', label: '上传者', type: 'text', editable: false },
];

export default function FilesView() {
  const { files, setFiles, loading, addFile, editFile, removeFile } = useSharedFiles();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const detailModal = useModal();
  const uploadModal = useModal();
  const [selected, setSelected] = useState<SharedFileRow | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = searchQuery
    ? files.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : files;

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function guessType(file: File): string {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) return 'doc';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'sheet';
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) return 'image';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
    if (ext === 'pdf') return 'pdf';
    return 'other';
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setPendingFile(f);
  }

  function handleUpload() {
    if (!pendingFile) return;
    const sizeStr = formatSize(pendingFile.size);
    const sizeKb = Math.round(pendingFile.size / 1024);
    const fileType = guessType(pendingFile);
    addFile({
      name: pendingFile.name,
      type: fileType,
      size: sizeStr,
      uploaded_by: '我',
      uploaded_at: new Date().toLocaleDateString('zh-CN'),
      downloads: 0,
    } as Partial<SharedFileRow>);
    setPendingFile(null);
    uploadModal.closeModal();
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <span className="text-sm font-bold">文件共享</span>
        <span className="text-[10px] text-text-3">{files.length} 个文件</span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5">
            <Search size={12} className="text-text-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索文件..."
              aria-label="搜索文件"
              className="bg-transparent text-xs text-text outline-none placeholder:text-text-3 w-32"
            />
          </div>
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button onClick={() => setViewMode('list')} className={cn('p-1.5', viewMode === 'list' ? 'bg-primary/10 text-primary-2' : 'text-text-3')}><List size={14} /></button>
            <button onClick={() => setViewMode('grid')} className={cn('p-1.5', viewMode === 'grid' ? 'bg-primary/10 text-primary-2' : 'text-text-3')}><Grid size={14} /></button>
          </div>
          <button onClick={uploadModal.openModal} className="flex flex-wrap items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-[10px] font-semibold text-primary-2 hover:bg-primary/20 transition-colors">
            <Upload size={12} />上传
          </button>
        </div>
      </div>

      {/* Storage Bar — computed from file data */}
      {(() => {
        const totalGB = 50;
        const usedGB = Math.round(files.reduce((sum, f) => { const n = parseFloat(f.size); return sum + (isNaN(n) ? 0 : n > 100 ? n / 1024 : n / 1024); }, 0) * 10) / 10;
        const pct = Math.min(100, Math.round((usedGB / totalGB) * 100));
        return (
          <div className="mx-4 mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-surface-2 px-4 py-2.5">
            <HardDrive size={14} className="text-text-3" />
            <span className="text-[10px] text-text-3">已使用 {usedGB} GB / {totalGB} GB</span>
            <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })()}

      <div className="flex-1 overflow-y-auto p-3 md:p-4">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-text-3 mb-3">
          <span className="text-primary-2 cursor-pointer">全部文件</span>
        </div>

        {loading ? (
          <CardSkeleton />
        ) : (
        viewMode === 'list' ? (
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_80px_100px_60px_60px] gap-2 px-3 py-1.5 text-[9px] font-bold uppercase text-text-3">
              <span>文件名</span><span>大小</span><span>上传者</span><span>时间</span><span>下载</span>
            </div>
            {filtered.map((file) => {
              const Icon = FILE_ICONS[file.type] ?? File;
              return (
                <div key={file.id} className="group grid grid-cols-[1fr_80px_100px_60px_60px] gap-2 items-center rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-2 cursor-pointer"
  onClick={() => { setSelected(file); detailModal.openModal(); }}>
                   <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                    <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg shrink-0', FILE_COLORS[file.type])}>
                      <Icon size={14} />
                    </div>
                    <span className="text-xs text-text truncate">{file.name}</span>
                  </div>
                  <span className="text-[10px] text-text-3">{file.size}</span>
                  <span className="text-[10px] text-text-3">{file.uploaded_by}</span>
                  <span className="text-[10px] text-text-3">{file.uploaded_at}</span>
                  <span className="flex flex-wrap items-center gap-1 text-[10px] text-text-3"><Download size={9} />{file.downloads}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {filtered.map((file) => {
              const Icon = FILE_ICONS[file.type] ?? File;
              return (
                <div key={file.id} className="group rounded-xl border border-border bg-surface p-3 transition-all hover:border-border-2 hover:shadow-lg cursor-pointer"
                  onClick={() => { setSelected(file); detailModal.openModal(); }}>
                  <div className={cn('flex h-12 items-center justify-center rounded-lg mb-2', FILE_COLORS[file.type])}>
                    <Icon size={24} />
                  </div>
                  <div className="text-[11px] font-semibold text-text truncate">{file.name}</div>
                  <div className="text-[9px] text-text-3 mt-0.5">{file.size} · {file.uploaded_at}</div>
                </div>
              );
            })}
          </div>
        )
        )}
      </div>

      <ItemDetailModal open={detailModal.open} onClose={detailModal.closeModal} title="文件详情" fields={FILE_FIELDS} data={selected as unknown as Record<string, unknown> | null} commentTarget={selected?.id ? { type: 'file', id: String(selected.id) } : null} onSave={(updated) => { if (selected) { const updatedFile = { ...selected, ...updated } as SharedFileRow; setSelected(updatedFile); editFile(selected.id, updatedFile); } }} onDelete={() => { if (selected) { removeFile(selected.id); setSelected(null); detailModal.closeModal(); } }} />

      {/* Upload Modal */}
      {uploadModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={uploadModal.closeModal}>
          <div className="w-80 rounded-xl border border-border bg-surface-2 p-3 md:p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold">上传文件</span>
              <button onClick={uploadModal.closeModal} className="text-text-3 hover:text-text"><X size={16} /></button>
            </div>
            <div className="mb-3">
              <button onClick={() => fileInputRef.current?.click()} className="flex flex-wrap w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-6 text-xs text-text-3 hover:border-primary/40 hover:text-primary-2 transition-colors">
                <Upload size={16} />{pendingFile ? pendingFile.name : '点击选择文件'}
              </button>
              {pendingFile && <div className="mt-1.5 text-[10px] text-text-3">{formatSize(pendingFile.size)}</div>}
            </div>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={handleUpload} disabled={!pendingFile} className={`${btnPrimary} disabled:opacity-40`}>
                <Check size={12} className="inline mr-1" />确认上传
              </button>
              <button onClick={uploadModal.closeModal} className={btnSecondary}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
