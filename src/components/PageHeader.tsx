import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * PageHeader — shared module page header component.
 * Provides a consistent layout: icon + title + description + badge + actions.
 *
 * Usage:
 * <PageHeader icon={<Target size={16} />} title="目标 OKR" badge="3 进行中">
 *   <button>+ 新建目标</button>
 * </PageHeader>
 */
export default function PageHeader({
  icon,
  title,
  description,
  badge,
  children,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  badge?: string | number;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3 border-b border-border px-4 py-3', className)}>
      {icon && <span className="text-text-2">{icon}</span>}
      <span className="text-sm font-bold">{title}</span>
      {badge !== undefined && (
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary-2">
          {badge}
        </span>
      )}
      {description && <span className="text-[10px] text-text-3">{description}</span>}
      {children && <div className="ml-auto flex items-center gap-2">{children}</div>}
    </div>
  );
}
