import { useMatrixCell } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { FileText, FileSpreadsheet, FileImage, File, Clock, User, Edit3, Eye } from 'lucide-react';

interface CollabDoc {
  id: string;
  title: string;
  type: 'doc' | 'sheet' | 'slide' | 'other';
  owners: string[];
  lastEdited: string;
  lastEditedBy: string;
  editors: number;
  viewers: number;
  status: 'editing' | 'review' | 'final';
}

const MOCK_DOCS: CollabDoc[] = [
  { id: 'D-001', title: 'Q3产品路线图 v2.3', type: 'doc', owners: ['我', 'AI产品分析师'], lastEdited: '5分钟前', lastEditedBy: '我', editors: 3, viewers: 8, status: 'editing' },
  { id: 'D-002', title: '导出功能优化技术方案', type: 'doc', owners: ['AI技术助手'], lastEdited: '1小时前', lastEditedBy: 'AI技术助手', editors: 2, viewers: 5, status: 'review' },
  { id: 'D-003', title: 'Q3预算表', type: 'sheet', owners: ['财务'], lastEdited: '2小时前', lastEditedBy: '财务-刘', editors: 2, viewers: 12, status: 'final' },
  { id: 'D-004', title: '竞品分析报告', type: 'slide', owners: ['AI竞品侦探'], lastEdited: '1天前', lastEditedBy: 'AI竞品侦探', editors: 1, viewers: 15, status: 'final' },
  { id: 'D-005', title: 'PRD模板v2.0', type: 'doc', owners: ['我'], lastEdited: '3天前', lastEditedBy: '我', editors: 4, viewers: 20, status: 'final' },
  { id: 'D-006', title: '用户反馈汇总（6月）', type: 'sheet', owners: ['AI数据看门人'], lastEdited: '1天前', lastEditedBy: 'AI数据看门人', editors: 1, viewers: 6, status: 'editing' },
];

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
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="text-sm font-bold">协作文档</span>
        <span className="text-[10px] text-text-3">{MOCK_DOCS.length} 个文档</span>
        <button className="ml-auto rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20 transition-colors">+ 新建文档</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {MOCK_DOCS.map((doc) => {
          const Icon = TYPE_ICONS[doc.type] ?? File;
          return (
            <div key={doc.id} className="group rounded-xl border border-border bg-surface p-4 transition-all hover:border-border-2 hover:shadow-lg cursor-pointer">
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
                    <span className="flex items-center gap-1"><Clock size={9} />{doc.lastEdited}</span>
                    <span className="flex items-center gap-1"><User size={9} />{doc.lastEditedBy}</span>
                    <span className="flex items-center gap-1"><Edit3 size={9} />{doc.editors}人编辑</span>
                    <span className="flex items-center gap-1"><Eye size={9} />{doc.viewers}人查看</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
