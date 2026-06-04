import { useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { FileText, FileSpreadsheet, Image, FileArchive, Download, Upload, Search, Grid, List, Clock, HardDrive } from 'lucide-react';

interface SharedFile {
  id: string;
  name: string;
  type: 'doc' | 'sheet' | 'image' | 'archive' | 'pdf' | 'other';
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  downloads: number;
}

const MOCK_FILES: SharedFile[] = [
  { id: 'F-001', name: 'Q3路线图.pdf', type: 'pdf', size: '2.3 MB', uploadedBy: '我', uploadedAt: '1小时前', downloads: 8 },
  { id: 'F-002', name: 'PRD模板v2.0.docx', type: 'doc', size: '156 KB', uploadedBy: '我', uploadedAt: '3小时前', downloads: 12 },
  { id: 'F-003', name: '竞品功能对比.xlsx', type: 'sheet', size: '890 KB', uploadedBy: 'AI竞品侦探', uploadedAt: '1天前', downloads: 15 },
  { id: 'F-004', name: '产品架构图.png', type: 'image', size: '1.2 MB', uploadedBy: '设计-周', uploadedAt: '2天前', downloads: 5 },
  { id: 'F-005', name: '导出功能源码.zip', type: 'archive', size: '4.5 MB', uploadedBy: 'AI技术助手', uploadedAt: '3天前', downloads: 3 },
  { id: 'F-006', name: '用户反馈6月.csv', type: 'sheet', size: '340 KB', uploadedBy: 'AI数据看门人', uploadedAt: '4天前', downloads: 7 },
  { id: 'F-007', name: '会议纪要-06-03.pdf', type: 'pdf', size: '89 KB', uploadedBy: '行政-刘', uploadedAt: '5天前', downloads: 20 },
];

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

export default function FilesView() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = searchQuery
    ? MOCK_FILES.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : MOCK_FILES;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="text-sm font-bold">文件共享</span>
        <span className="text-[10px] text-text-3">{MOCK_FILES.length} 个文件</span>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5">
            <Search size={12} className="text-text-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索文件..."
              className="bg-transparent text-xs text-text outline-none placeholder:text-text-3 w-32"
            />
          </div>
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button onClick={() => setViewMode('list')} className={cn('p-1.5', viewMode === 'list' ? 'bg-primary/10 text-primary-2' : 'text-text-3')}><List size={14} /></button>
            <button onClick={() => setViewMode('grid')} className={cn('p-1.5', viewMode === 'grid' ? 'bg-primary/10 text-primary-2' : 'text-text-3')}><Grid size={14} /></button>
          </div>
          <button className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-[10px] font-semibold text-primary-2 hover:bg-primary/20 transition-colors">
            <Upload size={12} />上传
          </button>
        </div>
      </div>

      {/* Storage Bar */}
      <div className="mx-4 mt-3 flex items-center gap-3 rounded-xl bg-surface-2 px-4 py-2.5">
        <HardDrive size={14} className="text-text-3" />
        <span className="text-[10px] text-text-3">已使用 10.2 GB / 50 GB</span>
        <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
          <div className="h-full w-[20%] rounded-full bg-primary" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[10px] text-text-3 mb-3">
          <span className="text-primary-2 cursor-pointer">全部文件</span>
        </div>

        {viewMode === 'list' ? (
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_80px_100px_60px_60px] gap-2 px-3 py-1.5 text-[9px] font-bold uppercase text-text-3">
              <span>文件名</span><span>大小</span><span>上传者</span><span>时间</span><span>下载</span>
            </div>
            {filtered.map((file) => {
              const Icon = FILE_ICONS[file.type] ?? File;
              return (
                <div key={file.id} className="group grid grid-cols-[1fr_80px_100px_60px_60px] gap-2 items-center rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-2 cursor-pointer">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg shrink-0', FILE_COLORS[file.type])}>
                      <Icon size={14} />
                    </div>
                    <span className="text-xs text-text truncate">{file.name}</span>
                  </div>
                  <span className="text-[10px] text-text-3">{file.size}</span>
                  <span className="text-[10px] text-text-3">{file.uploadedBy}</span>
                  <span className="text-[10px] text-text-3">{file.uploadedAt}</span>
                  <span className="flex items-center gap-1 text-[10px] text-text-3"><Download size={9} />{file.downloads}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {filtered.map((file) => {
              const Icon = FILE_ICONS[file.type] ?? File;
              return (
                <div key={file.id} className="group rounded-xl border border-border bg-surface p-3 transition-all hover:border-border-2 hover:shadow-lg cursor-pointer">
                  <div className={cn('flex h-12 items-center justify-center rounded-lg mb-2', FILE_COLORS[file.type])}>
                    <Icon size={24} />
                  </div>
                  <div className="text-[11px] font-semibold text-text truncate">{file.name}</div>
                  <div className="text-[9px] text-text-3 mt-0.5">{file.size} · {file.uploadedAt}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
