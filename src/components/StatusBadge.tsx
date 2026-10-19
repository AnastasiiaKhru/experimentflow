import type { ExperimentStatus } from '../types.ts';
import { cn } from './ui.ts';

const styles: Record<ExperimentStatus, string> = {
  draft: 'bg-[#f3f2f1] text-[#323130]',
  running: 'bg-[#e7f5e9] text-[#0b6a0b]',
  paused: 'bg-[#fff4ce] text-[#8a6d00]',
  archived: 'bg-[#f3f2f1] text-[#605e5c]',
};

const labels: Record<ExperimentStatus, string> = {
  draft: 'Draft',
  running: 'Running',
  paused: 'Paused',
  archived: 'Archived',
};

export function StatusBadge({ status }: { status: ExperimentStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold',
        styles[status],
      )}
    >
      {status === 'running' && <span className="live-dot h-1.5 w-1.5 rounded-full bg-[#107c10]" />}
      {labels[status]}
    </span>
  );
}

export function KindBadge({ kind }: { kind: 'assignment' | 'click' | 'conversion' | 'error' }) {
  const map = {
    assignment: 'bg-[#f0f6fc] text-[#0f6cbd]',
    click: 'bg-[#f4f3fc] text-[#5b5fc7]',
    conversion: 'bg-[#e7f5e9] text-[#0b6a0b]',
    error: 'bg-[#fdf3f4] text-[#a4262c]',
  } as const;
  const labels = {
    assignment: 'Assignment',
    click: 'Click',
    conversion: 'Conversion',
    error: 'Error',
  } as const;
  return (
    <span className={cn('rounded px-1.5 py-0.5 text-[11px] font-semibold', map[kind])}>
      {labels[kind]}
    </span>
  );
}
