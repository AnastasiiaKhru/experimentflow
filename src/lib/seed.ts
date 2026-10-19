import type {
  AppState,
  AssignedUser,
  Experiment,
  ExperimentEvent,
  TimePoint,
  TrendPoint,
  VariantKey,
  VariantStats,
} from '../types.ts';
import { countProcessed, ratio } from './stats.ts';

interface SeedSpec {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  goal: string;
  owner: string;
  status: Experiment['status'];
  daysAgo: number;
  trafficA: number;
  a: VariantStats & { name: string; description: string };
  b: VariantStats & { name: string; description: string };
  drift: 'rise' | 'decline';
}

const SPECS: SeedSpec[] = [
  {
    id: 'exp_copilot',
    name: 'AI Copilot Onboarding',
    description:
      'Compares a static first-run checklist with an inline Copilot coach for new Microsoft 365 users.',
    hypothesis:
      'An inline coach helps more people finish a first prompt than a checklist they can dismiss.',
    goal: 'Complete first Copilot prompt',
    owner: 'Growth',
    status: 'running',
    daysAgo: 18,
    trafficA: 50,
    drift: 'rise',
    a: {
      name: 'Checklist onboarding',
      description: 'Current checklist with three setup tasks.',
      participants: 4280,
      clicks: 6904,
      conversions: 742,
      errors: 18,
    },
    b: {
      name: 'Copilot coach',
      description: 'Inline prompt with a suggested first task.',
      participants: 4312,
      clicks: 7340,
      conversions: 1048,
      errors: 15,
    },
  },
  {
    id: 'exp_search',
    name: 'Search Ranking Optimization',
    description:
      'Tests whether a semantic reranker increases clicks on the top three results versus lexical ranking.',
    hypothesis: 'Semantic reranking surfaces a better top result for ambiguous workplace queries.',
    goal: 'Click a top-3 result',
    owner: 'Search',
    status: 'running',
    daysAgo: 26,
    trafficA: 50,
    drift: 'rise',
    a: {
      name: 'Lexical baseline',
      description: 'Current keyword ranker.',
      participants: 12640,
      clicks: 22110,
      conversions: 3892,
      errors: 40,
    },
    b: {
      name: 'Semantic rerank',
      description: 'Lexical candidates reordered by a semantic score.',
      participants: 12510,
      clicks: 23002,
      conversions: 4384,
      errors: 36,
    },
  },
  {
    id: 'exp_teams',
    name: 'Teams Meeting Experience',
    description:
      'Tests a one-click join path against the standard pre-join screen for scheduled meetings.',
    hypothesis: 'Removing the pre-join screen increases successful joins.',
    goal: 'Successful meeting join',
    owner: 'Teams',
    status: 'paused',
    daysAgo: 11,
    trafficA: 70,
    drift: 'decline',
    a: {
      name: 'Standard pre-join',
      description: 'Camera, microphone, and device check before join.',
      participants: 890,
      clicks: 1602,
      conversions: 548,
      errors: 120,
    },
    b: {
      name: 'One-click join',
      description: 'Join immediately with the last used devices.',
      participants: 310,
      clicks: 540,
      conversions: 140,
      errors: 70,
    },
  },
];

function daysAgo(now: number, days: number): string {
  return new Date(now - days * 86_400_000).toISOString();
}

function toExperiment(spec: SeedSpec, now: number): Experiment {
  return {
    id: spec.id,
    name: spec.name,
    description: spec.description,
    hypothesis: spec.hypothesis,
    goal: spec.goal,
    owner: spec.owner,
    status: spec.status,
    createdAt: daysAgo(now, spec.daysAgo),
    updatedAt: daysAgo(now, spec.status === 'paused' ? 1 : 0),
    variants: [
      {
        id: `${spec.id}_a`,
        key: 'A',
        name: spec.a.name,
        description: spec.a.description,
        trafficPercent: spec.trafficA,
        simulatedConversionRate: ratio(spec.a.conversions, spec.a.participants),
      },
      {
        id: `${spec.id}_b`,
        key: 'B',
        name: spec.b.name,
        description: spec.b.description,
        trafficPercent: 100 - spec.trafficA,
        simulatedConversionRate: ratio(spec.b.conversions, spec.b.participants),
      },
    ],
  };
}

function statsOf(spec: SeedSpec): Record<VariantKey, VariantStats> {
  const pick = (row: SeedSpec['a']): VariantStats => ({
    participants: row.participants,
    clicks: row.clicks,
    conversions: row.conversions,
    errors: row.errors,
  });
  return { A: pick(spec.a), B: pick(spec.b) };
}

function eventTotal(row: VariantStats): number {
  return row.participants + row.clicks + row.conversions + row.errors;
}

function buildTrend(spec: SeedSpec, now: number): TrendPoint[] {
  const rateA = ratio(spec.a.conversions, spec.a.participants);
  const rateB = ratio(spec.b.conversions, spec.b.participants);
  const steps = 18;
  const startA = rateA * 0.9;
  const startB = spec.drift === 'decline' ? rateA * 0.98 : rateB * 0.8;
  const points: TrendPoint[] = [];
  for (let i = 0; i < steps; i += 1) {
    const progress = (i + 1) / steps;
    points.push({
      t: now - (steps - 1 - i) * 60_000,
      rateA: startA + (rateA - startA) * progress,
      rateB: startB + (rateB - startB) * progress,
      convA: Math.round(spec.a.conversions * progress),
      convB: Math.round(spec.b.conversions * progress),
      eventsA: Math.round(eventTotal(statsOf(spec).A) * progress),
      eventsB: Math.round(eventTotal(statsOf(spec).B) * progress),
    });
  }
  const last = points[points.length - 1];
  last.rateA = rateA;
  last.rateB = rateB;
  last.convA = spec.a.conversions;
  last.convB = spec.b.conversions;
  last.eventsA = eventTotal(statsOf(spec).A);
  last.eventsB = eventTotal(statsOf(spec).B);
  return points;
}

function buildPool(spec: SeedSpec): AssignedUser[] {
  const rateA = ratio(spec.a.conversions, spec.a.participants);
  const rateB = ratio(spec.b.conversions, spec.b.participants);
  const users: AssignedUser[] = [];
  for (let i = 0; i < 32; i += 1) {
    const variant: VariantKey = i % 2 === 0 ? 'A' : 'B';
    const rate = variant === 'A' ? rateA : rateB;
    const willConvert = ((i * 17) % 100) / 100 < rate;
    users.push({
      id: `u_${spec.id}_${i}`,
      variant,
      willConvert,
      converted: willConvert && i % 3 !== 0,
    });
  }
  return users;
}

function buildSeries(now: number): TimePoint[] {
  const points: TimePoint[] = [];
  for (let i = 0; i < 32; i += 1) {
    const events = Math.round(9 + 4 * Math.sin(i / 2.6) + (i % 4));
    const conversions = Math.max(1, Math.round(events * 0.22));
    const errors = i % 10 === 0 ? 1 : 0;
    points.push({
      t: now - (31 - i) * 15_000,
      events,
      conversions,
      errors,
      latencySum: events * 64,
      latencyCount: events,
    });
  }
  return points;
}

function buildEvents(experiments: Experiment[], now: number): ExperimentEvent[] {
  const copilot = experiments[0];
  const search = experiments[1];
  const teams = experiments[2];
  const rows: Array<Omit<ExperimentEvent, 'id' | 'timestamp'>> = [
    { experimentId: copilot.id, variantKey: 'B', kind: 'conversion', userId: 'u_exp_copilot_7', latencyMs: 48, detail: `Counted one conversion for “${copilot.goal}”.` },
    { experimentId: search.id, variantKey: 'A', kind: 'click', userId: 'u_exp_search_4', latencyMs: 36, detail: 'Click recorded on the experiment surface.' },
    { experimentId: copilot.id, variantKey: 'A', kind: 'assignment', userId: 'u_exp_copilot_2', latencyMs: 41, detail: 'Assigned to Checklist onboarding.' },
    { experimentId: teams.id, variantKey: 'B', kind: 'error', userId: 'u_exp_teams_9', latencyMs: 812, detail: 'Simulated processing timeout while handling the event.' },
    { experimentId: search.id, variantKey: 'B', kind: 'conversion', userId: 'u_exp_search_11', latencyMs: 57, detail: `Counted one conversion for “${search.goal}”.` },
    { experimentId: copilot.id, variantKey: 'B', kind: 'click', userId: 'u_exp_copilot_8', latencyMs: 33, detail: 'Click recorded on the experiment surface.' },
    { experimentId: teams.id, variantKey: 'A', kind: 'conversion', userId: 'u_exp_teams_1', latencyMs: 69, detail: `Counted one conversion for “${teams.goal}”.` },
    { experimentId: search.id, variantKey: 'B', kind: 'assignment', userId: 'u_exp_search_6', latencyMs: 44, detail: 'Assigned to Semantic rerank.' },
    { experimentId: copilot.id, variantKey: 'A', kind: 'click', userId: 'u_exp_copilot_5', latencyMs: 52, detail: 'Click recorded on the experiment surface.' },
    { experimentId: teams.id, variantKey: 'B', kind: 'click', userId: 'u_exp_teams_3', latencyMs: 88, detail: 'Click recorded on the experiment surface.' },
    { experimentId: search.id, variantKey: 'A', kind: 'assignment', userId: 'u_exp_search_2', latencyMs: 39, detail: 'Assigned to Lexical baseline.' },
    { experimentId: copilot.id, variantKey: 'B', kind: 'assignment', userId: 'u_exp_copilot_9', latencyMs: 46, detail: 'Assigned to Copilot coach.' },
  ];
  return rows.map((row, index) => ({
    ...row,
    id: `evt_seed_${index}`,
    timestamp: now - index * 4_200,
  }));
}

export function createSeedState(now = Date.now()): AppState {
  const experiments = SPECS.map((spec) => toExperiment(spec, now));
  const stats: AppState['stats'] = {};
  const trends: AppState['trends'] = {};
  const pools: AppState['pools'] = {};
  for (const spec of SPECS) {
    stats[spec.id] = statsOf(spec);
    trends[spec.id] = buildTrend(spec, now);
    pools[spec.id] = buildPool(spec);
  }
  return {
    version: 1,
    experiments,
    events: buildEvents(experiments, now),
    stats,
    series: buildSeries(now),
    trends,
    pools,
    simulatorRunning: false,
    intervalMs: 800,
    processed: countProcessed(stats),
    tickCount: 0,
    selectedExperimentId: experiments[0]?.id ?? '',
  };
}
