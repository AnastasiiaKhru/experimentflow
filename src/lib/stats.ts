import type { VariantKey, VariantStats } from '../types.ts';

export type ComparisonCall = 'leading-a' | 'leading-b' | 'inconclusive' | 'needs-data';

export interface Interval {
  low: number;
  high: number;
}

export interface Comparison {
  call: ComparisonCall;
  rateA: number;
  rateB: number;
  ciA: Interval | null;
  ciB: Interval | null;
  lift: number | null;
}

export function emptyVariantStats(): Record<VariantKey, VariantStats> {
  return {
    A: { participants: 0, clicks: 0, conversions: 0, errors: 0 },
    B: { participants: 0, clicks: 0, conversions: 0, errors: 0 },
  };
}

export function ratio(part: number, total: number): number {
  if (total <= 0) return 0;
  return part / total;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function wilson(successes: number, total: number): Interval | null {
  if (total < 30) return null;
  const z = 1.96;
  const p = successes / total;
  const z2 = z * z;
  const denom = 1 + z2 / total;
  const center = (p + z2 / (2 * total)) / denom;
  const margin =
    (z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total)) / denom;
  return {
    low: clamp(center - margin, 0, 1),
    high: clamp(center + margin, 0, 1),
  };
}

export function intervalsOverlap(a: Interval | null, b: Interval | null): boolean {
  if (!a || !b) return true;
  return a.low <= b.high && b.low <= a.high;
}

export function relativeLift(rateA: number, rateB: number): number | null {
  if (rateA <= 0) return null;
  return (rateB - rateA) / rateA;
}

export function compareVariants(a: VariantStats, b: VariantStats): Comparison {
  const rateA = ratio(a.conversions, a.participants);
  const rateB = ratio(b.conversions, b.participants);
  const ciA = wilson(a.conversions, a.participants);
  const ciB = wilson(b.conversions, b.participants);
  const lift = relativeLift(rateA, rateB);
  const base = { rateA, rateB, ciA, ciB, lift };

  if (a.participants < 100 || b.participants < 100 || !ciA || !ciB) {
    return { call: 'needs-data', ...base };
  }

  const separated =
    !intervalsOverlap(ciA, ciB) && Math.abs(rateB - rateA) >= 0.015;
  if (a.participants < 200 || b.participants < 200 || !separated) {
    return { call: 'inconclusive', ...base };
  }

  return { call: rateB > rateA ? 'leading-b' : 'leading-a', ...base };
}

export function callLabel(call: ComparisonCall): string {
  switch (call) {
    case 'leading-a':
      return 'Control leading';
    case 'leading-b':
      return 'Treatment leading';
    case 'inconclusive':
      return 'Inconclusive';
    case 'needs-data':
      return 'Needs data';
  }
}

export function errorRate(a: VariantStats, b: VariantStats): number {
  const errors = a.errors + b.errors;
  const total =
    a.participants +
    b.participants +
    a.clicks +
    b.clicks +
    a.conversions +
    b.conversions +
    errors;
  return ratio(errors, total);
}

export function countProcessed(
  stats: Record<string, Record<VariantKey, VariantStats>>,
): number {
  let total = 0;
  for (const pair of Object.values(stats)) {
    for (const key of ['A', 'B'] as const) {
      const row = pair[key];
      total += row.participants + row.clicks + row.conversions + row.errors;
    }
  }
  return total;
}

export function participantsOf(pair: Record<VariantKey, VariantStats>): number {
  return pair.A.participants + pair.B.participants;
}

export function conversionsOf(pair: Record<VariantKey, VariantStats>): number {
  return pair.A.conversions + pair.B.conversions;
}
