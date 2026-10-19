import { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { useNav } from '../components/navigation.tsx';
import { KindBadge, StatusBadge } from '../components/StatusBadge.tsx';
import { btnPrimary, btnSecondary, card } from '../components/ui.ts';
import { formatMs, formatNumber, formatPercent, formatTime } from '../lib/format.ts';
import { useStore } from '../store/store.tsx';
import type { ExperimentEvent } from '../types.ts';

type KindFilter = 'all' | ExperimentEvent['kind'];

function latencyStats(events: ExperimentEvent[]): { avg: number | null; p95: number | null } {
  const sample = events
    .slice(0, 40)
    .map((event) => event.latencyMs)
    .sort((a, b) => a - b);
  if (sample.length === 0) return { avg: null, p95: null };
  const avg = sample.reduce((sum, value) => sum + value, 0) / sample.length;
  const index = Math.min(sample.length - 1, Math.ceil(sample.length * 0.95) - 1);
  return { avg, p95: sample[index] ?? null };
}

export function LiveEventsPage() {
  const { state, setSimulator, setStatus } = useStore();
  const { navigate } = useNav();
  const [now, setNow] = useState(() => Date.now());
  const [kind, setKind] = useState<KindFilter>('all');

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const recent = state.events.filter((event) => now - event.timestamp <= 10_000);
  const perSecond = recent.length / 10;
  const latency = latencyStats(state.events);
  const storedErrors = state.events.filter((event) => event.kind === 'error').length;
  const allErrors = Object.values(state.stats).reduce(
    (sum, pair) => sum + pair.A.errors + pair.B.errors,
    0,
  );
  const running = state.experiments.filter((experiment) => experiment.status === 'running');
  const visible = state.events.filter((event) => kind === 'all' || event.kind === kind);
  const nameById = new Map(state.experiments.map((experiment) => [experiment.id, experiment.name]));

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#d3e4f5] bg-[#f3f8fd] px-4 py-3 text-sm text-[#0b3a66]">
        Simulated stream. Assignments, clicks, conversions, latency, and errors are generated in the browser.
        Conversions are counted once per user.
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Throughput" value={`${perSecond.toFixed(1)}/s`} hint={`${recent.length} events in the last 10 seconds`} />
        <Metric label="Processing errors" value={formatNumber(allErrors)} hint={`${storedErrors} in the visible log`} />
        <Metric label="Simulated latency" value={formatMs(latency.avg)} hint={`p95 ${formatMs(latency.p95)} on the last 40 events`} />
        <Metric label="Events processed" value={formatNumber(state.processed)} hint="All-time counter, including seed history" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.7fr)]">
        <article className={card}>
          <header className="flex flex-col gap-3 border-b border-[#f0f1f3] px-5 py-3.5 sm:flex-row sm:items-center">
            <div className="flex-1">
              <h2 className="text-sm font-semibold">Event history</h2>
              <p className="text-xs text-[#605e5c]">Newest first. The log keeps the latest 140 events.</p>
            </div>
            <button
              type="button"
              className={state.simulatorRunning ? btnSecondary : btnPrimary}
              onClick={() => setSimulator(!state.simulatorRunning)}
            >
              {state.simulatorRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {state.simulatorRunning ? 'Pause stream' : 'Start stream'}
            </button>
          </header>
          <div className="flex flex-wrap gap-1 px-5 py-3">
            {(['all', 'assignment', 'click', 'conversion', 'error'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setKind(item)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                  kind === item ? 'bg-[#0b1c33] text-white' : 'bg-[#f3f2f1] text-[#323130]'
                }`}
              >
                {item === 'all' ? 'All' : item}
              </button>
            ))}
          </div>
          {visible.length === 0 ? (
            <div className="px-5 py-14 text-center text-sm text-[#605e5c]">
              {state.simulatorRunning
                ? 'Waiting for the next simulated event.'
                : 'No events in this view. Start the stream while an experiment is running.'}
            </div>
          ) : (
            <ul className="max-h-[520px] divide-y divide-[#f0f1f3] overflow-y-auto" aria-label="Simulated event history">
              {visible.map((event) => (
                <li key={event.id} className={`grid gap-1 px-5 py-3 text-sm ${event.kind === 'error' ? 'bg-[#fdf8f8]' : ''}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <KindBadge kind={event.kind} />
                    <span className="font-medium">{nameById.get(event.experimentId) ?? 'Removed experiment'}</span>
                    <span className="text-xs text-[#605e5c]">Variant {event.variantKey}</span>
                    <span className="ml-auto text-xs tabular-nums text-[#605e5c]">{formatTime(event.timestamp)}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 text-xs text-[#605e5c]">
                    <span>{event.detail}</span>
                    <span className="tabular-nums">{event.userId}</span>
                    <span className="tabular-nums">{event.latencyMs} ms</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className={card}>
          <header className="border-b border-[#f0f1f3] px-5 py-3.5">
            <h2 className="text-sm font-semibold">Reliability controls</h2>
            <p className="text-xs text-[#605e5c]">Pause a single experiment without stopping the stream.</p>
          </header>
          <div className="space-y-3 p-4">
            {state.experiments.filter((experiment) => experiment.status !== 'archived').length === 0 ? (
              <div className="px-1 py-6 text-center text-sm text-[#605e5c]">
                <p>No experiments available.</p>
                <button type="button" className={`${btnPrimary} mt-3`} onClick={() => navigate('experiments', { create: true })}>
                  Create experiment
                </button>
              </div>
            ) : (
              state.experiments
                .filter((experiment) => experiment.status !== 'archived')
                .map((experiment) => {
                  const stats = state.stats[experiment.id];
                  const errors = stats ? stats.A.errors + stats.B.errors : 0;
                  const base = stats
                    ? stats.A.participants +
                      stats.B.participants +
                      stats.A.clicks +
                      stats.B.clicks +
                      stats.A.conversions +
                      stats.B.conversions +
                      errors
                    : 0;
                  return (
                    <div key={experiment.id} className="rounded-lg border border-[#e6e8ec] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold">{experiment.name}</div>
                          <div className="mt-1">
                            <StatusBadge status={experiment.status} />
                          </div>
                        </div>
                        {experiment.status === 'running' ? (
                          <button type="button" className={btnSecondary} onClick={() => setStatus(experiment.id, 'paused')}>
                            Pause
                          </button>
                        ) : (
                          <button type="button" className={btnPrimary} onClick={() => setStatus(experiment.id, 'running')}>
                            {experiment.status === 'paused' ? 'Resume' : 'Start'}
                          </button>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-[#605e5c]">
                        Error share {formatPercent(base ? errors / base : 0)} · {formatNumber(errors)} errors
                      </p>
                    </div>
                  );
                })
            )}
            {state.simulatorRunning && running.length === 0 && (
              <p className="text-xs leading-5 text-[#8a6d00]">
                The stream is armed, but every experiment is paused or still a draft.
              </p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className={`${card} px-4 py-4`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#605e5c]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-[#605e5c]">{hint}</p>
    </article>
  );
}
