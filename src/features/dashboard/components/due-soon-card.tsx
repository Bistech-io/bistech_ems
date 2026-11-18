import { AlertCircle, ArrowRight } from 'lucide-react';
import type { EmployeeTaskItem } from '../types';

interface DueSoonCardProps {
  tasks: EmployeeTaskItem[];
}

export function DueSoonCard({ tasks }: DueSoonCardProps) {
  const urgentItems = tasks
    .filter((t) => t.status !== 'done' && (t.isOverdue || t.isDueSoon))
    .slice(0, 3);

  return (
    <section className="flex flex-col gap-4 rounded-[2rem] border border-[#23302B] bg-[#131A17] p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#F59E0B]/30 bg-[#F59E0B]/15 text-[#F59E0B]">
            <AlertCircle className="h-4 w-4" />
          </span>
          <h3 className="font-heading text-base font-bold text-[#F0F5F2]">
            Due Soon &amp; Overdue
          </h3>
        </div>
        <span className="rounded-full border border-[#2E8B57]/40 bg-[#1F5C3A]/50 px-3 py-1 text-xs font-bold text-[#4CAF7D]">
          {urgentItems.length} Attention
        </span>
      </div>

      <p className="text-xs text-[#A3B3AC]">Open assignments overdue or due within 3 days</p>

      <div className="flex flex-col gap-3">
        {urgentItems.length === 0 ? (
          <div className="rounded-2xl border border-[#23302B] bg-[#0B0F0E]/60 p-4 text-center text-xs text-[#A3B3AC]">
            You are all caught up on upcoming deadlines.
          </div>
        ) : (
          urgentItems.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-2 rounded-2xl border border-[#23302B] bg-[#1A2420]/70 p-3.5 transition-colors hover:border-[#2E8B57]/50"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                    item.isOverdue
                      ? 'border-[#EF4444]/30 bg-[#EF4444]/15 text-[#EF4444]'
                      : 'border-[#F59E0B]/30 bg-[#F59E0B]/15 text-[#F59E0B]'
                  }`}
                >
                  {item.isOverdue ? 'Overdue' : 'Due Soon'}
                </span>
                <span className="font-mono text-[11px] text-[#A3B3AC]">{item.dueLabel}</span>
              </div>

              <h4 className="text-xs leading-snug font-semibold text-[#F0F5F2]">{item.title}</h4>

              <div className="flex items-center justify-between pt-1 text-[11px] text-[#6E8078]">
                <span>{item.projectOrTeam}</span>
                <span className="inline-flex items-center gap-1 font-semibold text-[#4CAF7D]">
                  Open <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
