import { cn } from '@/lib/utils';
import { useMatrixCell } from '@/hooks/useMatrix';

interface ModulePageProps {
  title: string;
  icon: string;
  description: string;
}

export default function ModulePageStub({ title, icon, description }: ModulePageProps) {
  const cell = useMatrixCell();
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="text-4xl mb-3">{icon}</div>
        <h2 className="text-lg font-bold text-text mb-2">{title}</h2>
        <p className="text-sm text-text-3 mb-4">{description}</p>
        <div className="rounded-xl border border-border bg-surface p-4 text-left">
          <div className="text-[10px] font-bold uppercase tracking-wider text-text-3 mb-2">当前行业关联</div>
          <div className="flex flex-wrap gap-1.5">
            {cell.kpis.slice(0, 3).map((kpi) => (
              <span key={kpi.name} className="rounded-full bg-surface-2 px-2.5 py-1 text-[10px] text-text-2">
                {kpi.name}: {kpi.value}
              </span>
            ))}
          </div>
        </div>
        <p className="mt-4 text-[11px] text-text-3">此模块正在开发中，即将上线</p>
      </div>
    </div>
  );
}
