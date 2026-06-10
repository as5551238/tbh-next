import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  connected: { color: 'bg-[#00d4aa]', label: '实时已连接', pulse: false },
  reconnecting: { color: 'bg-amber-400', label: '重连中...', pulse: true },
  degraded: { color: 'bg-amber-400', label: '降级模式(轮询)', pulse: true },
  disconnected: { color: 'bg-gray-500', label: '未连接', pulse: false },
} as const;

export default function RealtimeIndicator() {
  const status = useAppStore((s) => s.realtimeStatus);
  const config = STATUS_CONFIG[status];

  // Only show when not connected (reduce visual noise)
  if (status === 'connected') return null;

  return (
    <div
      className={cn('flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium', status === 'degraded' ? 'bg-amber-500/10 text-amber-300' : 'bg-surface-2 text-text-3')}
      role="status"
      aria-label={config.label}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.color, config.pulse && 'animate-pulse')} />
      <span>{config.label}</span>
    </div>
  );
}
