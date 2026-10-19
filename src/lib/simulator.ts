import type {
  AppState,
  EventKind,
  Experiment,
  ExperimentEvent,
  TimePoint,
  TrendPoint,
  VariantKey,
} from '../types.ts';
import { ratio } from './stats.ts';

const BUCKET_MS = 15_000;
const MAX_EVENTS = 140;
const MAX_SERIES = 40;
const MAX_POOL = 80;
const MAX_TREND = 36;

function pickVariant(experiment: Experiment): VariantKey {
  const control = experiment.variants.find((item) => item.key === 'A') ?? experiment.variants[0];
  const traffic = control?.trafficPercent ?? 50;
  return Math.random() * 100 < traffic ? 'A' : 'B';
}

function snapshot(state: AppState, experimentId: string, now: number): TrendPoint {
  const pair = state.stats[experimentId];
  const eventsA =
    pair.A.participants + pair.A.clicks + pair.A.conversions + pair.A.errors;
  const eventsB =
    pair.B.participants + pair.B.clicks + pair.B.conversions + pair.B.errors;
  return {
    t: now,
    rateA: ratio(pair.A.conversions, pair.A.participants),
    rateB: ratio(pair.B.conversions, pair.B.participants),
    convA: pair.A.conversions,
    convB: pair.B.conversions,
    eventsA,
    eventsB,
  };
}

function pushSeries(
  series: TimePoint[],
  now: number,
  kind: EventKind,
  latencyMs: number,
): TimePoint[] {
  const last = series[series.length - 1];
  const point: TimePoint =
    last && now - last.t < BUCKET_MS
      ? { ...last }
      : {
          t: now,
          events: 0,
          conversions: 0,
          errors: 0,
          latencySum: 0,
          latencyCount: 0,
        };
  point.events += 1;
  if (kind === 'conversion') point.conversions += 1;
  if (kind === 'error') point.errors += 1;
  point.latencySum += latencyMs;
  point.latencyCount += 1;
  const next =
    last && now - last.t < BUCKET_MS ? [...series.slice(0, -1), point] : [...series, point];
  return next.slice(-MAX_SERIES);
}

export function applyTick(state: AppState, now = Date.now()): AppState {
  const running = state.experiments.filter((experiment) => experiment.status === 'running');
  if (running.length === 0) return state;

  const experiment = running[Math.floor(Math.random() * running.length)];
  if (!experiment || !state.stats[experiment.id]) return state;
  const pool = (state.pools[experiment.id] ?? []).map((user) => ({ ...user }));
  const stats = {
    ...state.stats,
    [experiment.id]: {
      A: { ...state.stats[experiment.id].A },
      B: { ...state.stats[experiment.id].B },
    },
  };

  const isError = Math.random() < 0.045;
  let kind: EventKind;
  let variantKey: VariantKey;
  let userId: string;
  let detail: string;

  if (isError) {
    kind = 'error';
    const existing = pool.length ? pool[Math.floor(Math.random() * pool.length)] : undefined;
    variantKey = existing?.variant ?? pickVariant(experiment);
    userId = existing?.id ?? `u_${experiment.id.slice(-4)}_${state.tickCount}`;
    detail = 'Simulated processing timeout while handling the event.';
    stats[experiment.id][variantKey].errors += 1;
  } else if (pool.length < 10 || Math.random() < 0.46) {
    kind = 'assignment';
    variantKey = pickVariant(experiment);
    const variant = experiment.variants.find((item) => item.key === variantKey);
    userId = `u_${experiment.id.slice(-4)}_${state.tickCount.toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    pool.push({
      id: userId,
      variant: variantKey,
      converted: false,
      willConvert: Math.random() < (variant?.simulatedConversionRate ?? 0.2),
    });
    if (pool.length > MAX_POOL) pool.shift();
    stats[experiment.id][variantKey].participants += 1;
    detail = `Assigned to ${variant?.name ?? variantKey}.`;
  } else if (Math.random() < 0.62) {
    kind = 'click';
    const user = pool[Math.floor(Math.random() * pool.length)];
    userId = user.id;
    variantKey = user.variant;
    stats[experiment.id][variantKey].clicks += 1;
    detail = 'Click recorded on the experiment surface.';
  } else {
    const pending = pool.filter((user) => user.willConvert && !user.converted);
    if (pending.length === 0) {
      kind = 'click';
      const user = pool[Math.floor(Math.random() * pool.length)];
      userId = user.id;
      variantKey = user.variant;
      stats[experiment.id][variantKey].clicks += 1;
      detail = 'Click recorded on the experiment surface.';
    } else {
      kind = 'conversion';
      const user = pending[Math.floor(Math.random() * pending.length)];
      user.converted = true;
      userId = user.id;
      variantKey = user.variant;
      stats[experiment.id][variantKey].conversions += 1;
      detail = `Counted one conversion for “${experiment.goal}”.`;
    }
  }

  const latencyMs =
    kind === 'error' ? Math.round(460 + Math.random() * 720) : Math.round(22 + Math.random() * 108);

  const event: ExperimentEvent = {
    id: `evt_${now.toString(36)}_${state.tickCount}`,
    experimentId: experiment.id,
    variantKey,
    kind,
    userId,
    timestamp: now,
    latencyMs,
    detail,
  };

  const tickCount = state.tickCount + 1;
  let trends = state.trends;
  if (tickCount % 4 === 0) {
    trends = { ...state.trends };
    for (const item of running) {
      const source = item.id === experiment.id ? { ...state, stats } : state;
      const history = trends[item.id] ?? [];
      trends[item.id] = [...history, snapshot(source, item.id, now)].slice(-MAX_TREND);
    }
  }

  return {
    ...state,
    events: [event, ...state.events].slice(0, MAX_EVENTS),
    stats,
    pools: { ...state.pools, [experiment.id]: pool },
    series: pushSeries(state.series, now, kind, latencyMs),
    trends,
    processed: state.processed + 1,
    tickCount,
  };
}
