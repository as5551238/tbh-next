import { Sparkles, CheckCircle2, AlertTriangle, RotateCcw, ArrowRight, FileText, X, Clock, Play } from 'lucide-react';
import { REVIEW_MODELS } from '@/lib/reviewEngine';
import type { DeviationAlert } from '@/lib/reviewEngine';
import type { DeviationAlertRow, ReviewSessionRow } from '@/lib/dataLayer/types';
import { cn } from '@/lib/utils';

const sevCls: Record<string, string> = {
  danger: 'border-danger/40 bg-danger/5',
  warn: 'border-warn/40 bg-warn/5',
  info: 'border-primary/40 bg-primary/5',
};
const sevIcon: Record<string, string> = { danger: 'text-danger', warn: 'text-warn', info: 'text-primary-2' };

interface AlertPhaseProps {
  alerts: DeviationAlert[];
  persistedAlerts: DeviationAlertRow[];
  autoProgressMap: Record<string, number>;
  goals: { id: string; title: string; progress: number }[];
  recentSessions: ReviewSessionRow[];
  onStartTimeReview: (alert: DeviationAlert) => void;
  onComputeAlerts: () => void;
  onMarkRead: (alert: DeviationAlert) => void;
  onManualStart: (modelId: string) => void;
  onResumeSession: (session: ReviewSessionRow) => void;
  requireFeature: (feature: string, reason: string) => boolean;
  paywallSlot: React.ReactNode;
}

const statusLabel: Record<string, string> = {
  in_progress: '进行中',
  draft_ready: '草稿已生成',
  completed: '已完成',
};

export function ReviewAlertsPhase({
  alerts, persistedAlerts, autoProgressMap, goals, recentSessions,
  onStartTimeReview, onComputeAlerts, onMarkRead, onManualStart, onResumeSession, requireFeature, paywallSlot,
}: AlertPhaseProps) {
  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <RotateCcw size={18} className="text-primary-2" />
        <span className="text-sm font-bold">MLOO 隐性复盘</span>
        <span className="ml-auto text-[10px] text-text-3">偏差自动检测 + AI复盘</span>
      </div>

      {/* Auto Progress Section */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Sparkles size={13} className="text-accent" />
          <span className="text-xs font-bold text-text-3 uppercase tracking-wider">自动进度推算</span>
        </div>
        <div className="space-y-1.5">
          {Object.entries(autoProgressMap).map(([goalId, autoProg]) => {
            const g = goals.find((gl) => gl.id === goalId);
            if (!g) return null;
            const diff = autoProg - g.progress;
            return (
              <div key={goalId} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2">
                <span className="text-xs text-text-2 flex-1 truncate">{g.title}</span>
                <span className="text-[10px] text-text-3">手动 {g.progress}%</span>
                <ArrowRight size={10} className="text-text-3" />
                <span className={`text-[10px] font-bold ${diff > 5 ? 'text-success' : diff < -5 ? 'text-danger' : 'text-text'}`}>推算 {autoProg}%</span>
                {Math.abs(diff) > 10 && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${diff > 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                    偏差{diff > 0 ? '+' : ''}{diff}%
                  </span>
                )}
              </div>
            );
          })}
          {Object.keys(autoProgressMap).length === 0 && (
            <div className="text-[10px] text-text-3 p-2">暂无目标同时关联任务，无法自动推算进度</div>
          )}
        </div>
      </div>

      {/* Deviation Alerts */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-text-3 uppercase tracking-wider">偏差预警</span>
          <button onClick={onComputeAlerts} className="text-[10px] text-primary-2 hover:underline">刷新</button>
        </div>
        {alerts.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle2 size={24} className="mx-auto text-success mb-2" />
            <div className="text-xs text-text-2">所有目标进度正常</div>
            <div className="text-[10px] text-text-3 mt-1">偏差{'>'}5%时会自动告警</div>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => (
              <div key={a.id} onClick={() => onStartReview(a)}
                 className={`rounded-xl border p-3 cursor-pointer transition-all hover:shadow-lg ${sevCls[a.severity]}`}>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <AlertTriangle size={13} className={sevIcon[a.severity]} />
                  <span className="text-xs font-semibold text-text flex-1">{a.targetTitle}</span>
                  {a.isOverdue && <span className="rounded-full bg-danger/20 px-1.5 py-0.5 text-[8px] font-bold text-danger">逾期</span>}
                  <button
                    onClick={(e) => { e.stopPropagation(); onMarkRead(a); }}
                    className="text-text-3 hover:text-text p-0.5"
                    title="标为已读"
                  >
                    <X size={12} />
                  </button>
                </div>
                <div className="text-[10px] text-text-3 ml-5">{a.message}</div>
                <div className="flex flex-wrap items-center gap-2 mt-2 ml-5">
                  <span className="text-[9px] text-text-3">推荐：</span>
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[9px] font-medium text-primary-2">
                    {REVIEW_MODELS.find((m) => m.id === a.recommendedModel)?.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Review Entry */}
      <div className="border-t border-border pt-3">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <FileText size={13} className="text-text-3" />
          <span className="text-xs font-bold text-text-3 uppercase tracking-wider">手动发起复盘</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {REVIEW_MODELS.map((m) => (
            <button key={m.id} onClick={() => onManualStart(m.id)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-left transition-all hover:border-primary/50 hover:shadow-md">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base">{m.icon}</span>
                <div>
                  <div className="text-[11px] font-semibold text-text">{m.name}</div>
                  <div className="text-[9px] text-text-3">{m.description.slice(0, 20)}...</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Sessions — resume capability */}
      {recentSessions.length > 0 && (
        <div className="border-t border-border pt-3">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Clock size={13} className="text-text-3" />
            <span className="text-xs font-bold text-text-3 uppercase tracking-wider">历史复盘</span>
          </div>
          <div className="space-y-1.5">
            {recentSessions.slice(0, 5).map((rs) => (
              <div key={rs.id} onClick={() => onResumeSession(rs)}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 cursor-pointer hover:border-primary/40 transition-all">
                <span className="text-[11px] font-medium text-text flex-1 truncate">{rs.target_title}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-surface-2 text-text-3">{statusLabel[rs.status] ?? rs.status}</span>
                <span className="text-[9px] text-text-3">{REVIEW_MODELS.find(m => m.id === rs.model_id)?.name ?? rs.model_id}</span>
                {rs.status !== 'completed' && <Play size={11} className="text-primary-2" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {paywallSlot}
    </div>
  );
}
