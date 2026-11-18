import { Activity } from 'lucide-react';
import type { ActivityFeedItem } from '../types';

interface ActivityFeedCardProps {
  items: ActivityFeedItem[];
}

const TONE_DOT_CLASSES: Record<ActivityFeedItem['tone'], string> = {
  success: 'bg-[#4CAF7D]',
  warning: 'bg-[#F59E0B]',
  info: 'bg-[#38BDF8]',
  neutral: 'bg-[#A3B3AC]',
};

export function ActivityFeedCard({ items }: ActivityFeedCardProps) {
  return (
    <section className="flex flex-col gap-4 rounded-[2rem] border border-[#23302B] bg-[#131A17] p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2E8B57]/40 bg-[#1F5C3A]/50 text-[#4CAF7D]">
            <Activity className="h-4 w-4" />
          </span>
          <h3 className="font-heading text-base font-bold text-[#F0F5F2]">Recent Activity</h3>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2E8B57]/40 bg-[#1F5C3A]/40 px-2.5 py-1 text-[11px] font-semibold text-[#4CAF7D]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#4CAF7D]" />
          Synced
        </span>
      </div>

      <div className="relative flex flex-col gap-4 pt-1 pl-3">
        <div className="absolute top-2 bottom-2 left-[15px] w-px bg-[#23302B]" />

        {items.map((item) => (
          <div key={item.id} className="relative flex items-start gap-3">
            <span
              className={`z-10 mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-[#131A17] ${TONE_DOT_CLASSES[item.tone]}`}
            />
            <div className="flex min-w-0 flex-col">
              <span className="text-xs font-semibold text-[#F0F5F2]">{item.title}</span>
              <p className="mt-0.5 text-[11px] leading-relaxed text-[#A3B3AC]">
                {item.description}
              </p>
              <span className="mt-1 font-mono text-[10px] text-[#6E8078]">
                {item.timestampLabel}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
