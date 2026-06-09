/**
 * AppLogo — 经验教训L6转化：品牌统一
 *
 * TBH硬编码了多处Logo(TB图标+文字)，不一致且难维护。
 * tbh-next统一为AppLogo组件，所有引用点复用同一组件。
 */

import { cn } from '@/lib/utils';

type LogoSize = 'sm' | 'md' | 'lg' | 'xl';

interface AppLogoProps {
  size?: LogoSize;
  showText?: boolean;
  className?: string;
}

const SIZE_MAP: Record<LogoSize, { icon: string; text: string }> = {
  sm: { icon: 'h-5 w-5', text: 'text-xs' },
  md: { icon: 'h-7 w-7', text: 'text-sm' },
  lg: { icon: 'h-10 w-10', text: 'text-lg' },
  xl: { icon: 'h-14 w-14', text: 'text-xl' },
};

export const APP_NAME_CN = '团队业务中台';
export const APP_NAME_EN = 'Team Business Hub';

export default function AppLogo({ size = 'md', showText = false, className }: AppLogoProps) {
  const s = SIZE_MAP[size];
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn(
        s.icon,
        'rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0'
      )}>
        T
      </div>
      {showText && (
        <span className={cn(s.text, 'font-semibold text-text-primary whitespace-nowrap')}>
          {APP_NAME_CN}
        </span>
      )}
    </div>
  );
}
