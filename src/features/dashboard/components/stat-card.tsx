import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: ReactNode;
  iconTone?: 'primary' | 'success' | 'warning' | 'info';
  badgeText?: string;
  badgeTone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  footerText?: string;
  progressPercent?: number;
}

const ICON_TONE_CLASSES: Record<NonNullable<StatCardProps['iconTone']>, string> = {
  primary: 'bg-[#1F5C3A]/40 text-[#4CAF7D] border border-[#2E8B57]/30',
  success: 'bg-[#1F5C3A]/45 text-[#4CAF7D] border border-[#4CAF7D]/30',
  warning: 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30',
  info: 'bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30',
};

const BADGE_TONE_CLASSES: Record<NonNullable<StatCardProps['badgeTone']>, string> = {
  primary: 'bg-[#1F5C3A]/50 text-[#4CAF7D] border border-[#2E8B57]/40',
  success: 'bg-[#4CAF7D]/15 text-[#4CAF7D] border border-[#4CAF7D]/30',
  warning: 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30',
  danger: 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30',
  neutral: 'bg-[#1A2420] text-[#A3B3AC] border border-[#23302B]',
};

export function StatCard({
  label,
  value,
  unit,
  icon,
  iconTone = 'primary',
  badgeText,
  badgeTone = 'neutral',
  footerText,
  progressPercent,
}: StatCardProps) {
  return (
    <div className="flex flex-col justify-between rounded-3xl border border-[#23302B] bg-[#131A17] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2E8B57]/50 hover:bg-[#1A2420]/70">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-wider text-[#A3B3AC] uppercase">
          {label}
        </span>
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            ICON_TONE_CLASSES[iconTone],
          )}
        >
          {icon}
        </span>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline gap-1.5">
          <span className="font-heading text-3xl font-bold tracking-tight text-[#F0F5F2]">
            {value}
          </span>
          {unit ? <span className="text-xs font-medium text-[#A3B3AC]">{unit}</span> : null}
        </div>

        {typeof progressPercent === 'number' ? (
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full border border-[#23302B] bg-[#0B0F0E]">
            <div
              className="h-full rounded-full bg-[#4CAF7D] transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>
        ) : null}

        {(badgeText || footerText) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {badgeText ? (
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                  BADGE_TONE_CLASSES[badgeTone],
                )}
              >
                {badgeText}
              </span>
            ) : null}
            {footerText ? <span className="text-xs text-[#A3B3AC]">{footerText}</span> : null}
          </div>
        )}
      </div>
    </div>
  );
}
