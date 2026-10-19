export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatPercent(rate: number, digits = 1): string {
  if (!Number.isFinite(rate)) return '—';
  return `${(rate * 100).toFixed(digits)}%`;
}

export function formatLift(lift: number | null): string {
  if (lift === null || !Number.isFinite(lift)) return '—';
  const sign = lift > 0 ? '+' : '';
  return `${sign}${(lift * 100).toFixed(1)}%`;
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatMs(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${Math.round(value)} ms`;
}
