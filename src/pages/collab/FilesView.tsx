import { useState, useRef } from 'react';
import { useSharedFiles } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { FileText, FileSpreadsheet, Image, FileArchive, Download, Upload, Search, Grid, List, Clock, HardDrive, Loader2, X, Check } from 'lucide-react';
import { useModal, btnPrimary, btnSecondary, inputCls } from '@/components/Modal';
import ItemDetailModal from '@/components/ItemDetailModal';
import type { FieldDef } from '@/components/ItemDetailModal';
import type { SharedFileRow } from '@/lib/dataLayer';
import { createSharedFile } from '@/lib/dataLayer';



const FILE_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  doc: FileText,
  sheet: FileSpreadsheet,
  image: Image,
  archive: FileArchive,
  pdf: FileText,
  other: File,
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
  { key: 'name', label: '文件名', type: 'text', editable: false },
  { key: 'type', label: '类型', type: 'text', editable: false },
];

export default function FilesView() {
  const { files, setFiles, loading } = useSharedFiles();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const detailModal = useModal();
  const uploadModal = useModal();
  const [selected, setSelected] = useState<SharedFileRow | null>(null);
  const [uploadName, setUploadName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = searchQuery
    ? files.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : files;

  function handleUpload() {
    if (!uploadName.trim()) return;
    const newFile = {
      id: `f_${Date.now()}`,
      name: uploadName.trim(),
      type: 'doc' as const,
      size: '0 KB',
      uploaded_by: '我',
      uploaded_at: new Date().toLocaleDateString('zh-CN'),
      downloads: 0,
    };
    setFiles((prev: SharedFileRow[]) => [...prev, newFile]);
    createSharedFile({ id: newFile.id, name: newFile.name, type: newFile.type, size_kb: 0 });
    setUploadName('');
    uploadModal.closeModal();
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="text-sm font-bold">文件共享</span>
        <span className="text-[10px] text-text-3">{files.length} 个文件</span>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5">
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
          <button onClick={uploadModal.openModal} className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-[10px] font-semibold text-primary-2 hover:bg-primary/20 transition-colors">
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
          <div className="mx-4 mt-3 flex items-center gap-3 rounded-xl bg-surface-2 px-4 py-2.5">
            <HardDrive size={14} className="text-text-3" />
            <span className="text-[10px] text-text-3">已使用 {usedGB} GB / {totalGB} GB</span>
            <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })()}

      <div className="flex-1 overflow-y-auto p-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[10px] text-text-3 mb-3">
          <span className="text-primary-2 cursor-pointer">全部文件</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-text-3" size={24} /></div>
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
                   <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg shrink-0', FILE_COLORS[file.type])}>
                      <Icon size={14} />
                    </div>
                    <span className="text-xs text-text truncate">{file.name}</span>
                  </div>
                  <span className="text-[10px] text-text-3">{file.size}</span>
                  <span className="text-[10px] text-text-3">{file.uploaded_by}</span>
                  <span className="text-[10px] text-text-3">{file.uploaded_at}</span>
                  <span className="flex items-center gap-1 text-[10px] text-text-3"><Download size={9} />{file.downloads}</span>
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

      <ItemDetailModal open={detailModal.open} onClose={detailModal.closeModal} title="文件详情" fields={FILE_FIELDS} data={selected} onSave={(updated) => { if (selected) { const updatedFile = { ...selected, ...updated } as SharedFileRow; setSelected(updatedFile); setFiles((prev) => prev.map((f) => f.id === selected.id ? updatedFile : f)); } }} />

      {/* Upload Modal */}
      {uploadModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={uploadModal.closeModal}>
          <div className="w-80 rounded-xl border border-border bg-surface-2 p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold">上传文件</span>
              <button onClick={uploadModal.closeModal} className="text-text-3 hover:text-text"><X size={16} /></button>
            </div>
            <input
              type="text"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              placeholder="输入文件名"
              className={inputCls + ' mb-3 w-full'}
              onKeyDown={(e) => { if (e.key === 'Enter') handleUpload(); }}
            />
            <input ref={fileInputRef} type="file" className="hidden" />
            <div className="flex items-center gap-2">
              <button onClick={handleUpload} disabled={!uploadName.trim()} className={`${btnPrimary} disabled:opacity-40`}>
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
