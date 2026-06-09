/**
 * CommentSection — Inline comment thread for any entity (goal, task, action item).
 *
 * Props:
 * - targetType: 'goal' | 'task' | 'action_item' | etc.
 * - targetId: the entity's ID
 */
import { useState, useCallback } from 'react';
import { useComments } from '@/hooks/useMatrix';
import { cn } from '@/lib/utils';
import { MessageSquare, Send, Trash2, Reply } from 'lucide-react';

interface Props {
  targetType: string;
  targetId: string;
}

export default function CommentSection({ targetType, targetId }: Props) {
  const { comments, loading, addComment, removeComment } = useComments(targetType, targetId);
  const [newContent, setNewContent] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!newContent.trim()) return;
    await addComment({
      content: newContent.trim(),
      author_id: null,
      target_type: targetType,
      target_id: targetId,
      parent_id: replyTo,
      team_id: '__default__',
    });
    setNewContent('');
    setReplyTo(null);
  }, [newContent, targetType, targetId, replyTo, addComment]);

  // Build thread tree
  const rootComments = comments.filter((c) => !c.parent_id);
  const getReplies = (parentId: string) => comments.filter((c) => c.parent_id === parentId);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return `${Math.floor(diff / 86400000)}天前`;
  };

  const renderComment = (c: typeof comments[number], depth = 0) => {
    const replies = getReplies(c.id);
    return (
      <div key={c.id} className={cn(depth > 0 && 'ml-6 border-l border-border pl-3')}>
        <div className="flex items-start gap-2 py-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary-2 shrink-0">
            {(c.author_id || '我')[0]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-text">{c.author_id || '我'}</span>
              <span className="text-[9px] text-text-3">{timeAgo(c.created_at)}</span>
            </div>
            <p className="text-xs text-text-2 mt-0.5 leading-relaxed">{c.content}</p>
            <div className="flex items-center gap-2 mt-1">
              <button className="flex items-center gap-0.5 text-[9px] text-text-3 hover:text-primary-2" onClick={() => setReplyTo(c.id)}>
                <Reply size={9} />回复
              </button>
              <button className="flex items-center gap-0.5 text-[9px] text-text-3 hover:text-danger" onClick={() => removeComment(c.id)}>
                <Trash2 size={9} />删除
              </button>
            </div>
          </div>
        </div>
        {replies.map((r) => renderComment(r, depth + 1))}
      </div>
    );
  };

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare size={14} className="text-text-3" />
        <span className="text-xs font-bold text-text">评论 ({comments.length})</span>
      </div>

      {loading ? (
        <div className="text-[10px] text-text-3">加载评论...</div>
      ) : comments.length === 0 ? (
        <div className="text-[10px] text-text-3 mb-2">暂无评论，发表第一条吧</div>
      ) : (
        <div className="max-h-60 overflow-y-auto mb-2">
          {rootComments.map((c) => renderComment(c))}
        </div>
      )}

      {/* Reply indicator */}
      {replyTo && (
        <div className="flex items-center gap-1 mb-1 text-[9px] text-primary-2">
          <Reply size={9} />
          回复 {comments.find((c) => c.id === replyTo)?.author_id || '某条评论'}
          <button className="text-text-3 hover:text-danger" onClick={() => setReplyTo(null)}>取消</button>
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2">
        <input
          className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs text-text outline-none placeholder-text-3 focus:border-primary/50"
          placeholder="发表评论..."
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
        />
        <button
          className="rounded-lg bg-primary p-1.5 text-white hover:opacity-80 disabled:opacity-30"
          disabled={!newContent.trim()}
          onClick={handleSubmit}
        >
          <Send size={12} />
        </button>
      </div>
    </div>
  );
}
