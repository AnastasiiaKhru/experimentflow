import type { ReactNode } from 'react';
import { card } from './ui.ts';

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
}) {
  return (
    <article className={`${card} px-4 py-4`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#605e5c]">{label}</p>
          <p className="mt-2 text-[28px] font-semibold leading-none tracking-tight text-[#201f1e]">
            {value}
          </p>
          <p className="mt-2 text-xs leading-5 text-[#605e5c]">{hint}</p>
        </div>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#f0f6fc] text-[#0f6cbd]">
          {icon}
        </div>
      </div>
    </article>
  );
}
