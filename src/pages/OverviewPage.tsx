import { Activity, FlaskConical, Pause, Play, Target, Users, Zap } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useNav } from '../components/navigation.tsx';
import { StatCard } from '../components/StatCard.tsx';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { axisTick, colorA, colorB, gridStroke, tooltipStyle } from '../components/charts.tsx';
import { btnPrimary, btnSecondary, card } from '../components/ui.ts';
import { formatLift, formatNumber, formatPercent, formatTime } from '../lib/format.ts';
import { callLabel, compareVariants, conversionsOf, participantsOf } from '../lib/stats.ts';
import { useStore } from '../store/store.tsx';

export function OverviewPage() {
  const { state, setSimulator, selectExperiment } = useStore();
  const { navigate } = useNav();
  const live = state.experiments.filter((experiment) => experiment.status !== 'archived');
  let participants = 0;
  let conversions = 0;
  for (const experiment of live) {
    const stats = state.stats[experiment.id];
    if (!stats) continue;
    participants += participantsOf(stats);
    conversions += conversionsOf(stats);
  }
  const running = state.experiments.filter((experiment) => experiment.status === 'running').length;
  const rate = participants ? conversions / participants : 0;
  const chartData = state.series.map((point) => ({
    time: formatTime(point.t),
    Events: point.events,
    Conversions: point.conversions,
  }));

  return (
    <div className="space-y-4">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active experiments"
          value={formatNumber(running)}
          hint="Status is running and eligible for the simulator"
          icon={<FlaskConical className="h-4 w-4" />}
        />
        <StatCard
          label="Total participants"
          value={formatNumber(participants)}
          hint="Unique assignments, excluding archived tests"
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Events processed"
          value={formatNumber(state.processed)}
          hint="Assignments, clicks, conversions, and simulated errors"
          icon={<Zap className="h-4 w-4" />}
        />
        <StatCard
          label="Conversion rate"
          value={formatPercent(rate)}
          hint="Conversions divided by participants"
          icon={<Target className="h-4 w-4" />}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
        <article className={card}>
          <header className="flex items-center justify-between border-b border-[#f0f1f3] px-5 py-3.5">
            <div>
              <h2 className="text-sm font-semibold">Live activity</h2>
              <p className="text-xs text-[#605e5c]">15-second buckets of simulated events</p>
            </div>
            <Activity className="h-4 w-4 text-[#0f6cbd]" />
          </header>
          <div className="h-72 px-2 py-4">
            {chartData.length === 0 ? (
              <div className="grid h-full place-items-center px-6 text-center text-sm text-[#605e5c]">
                No activity yet. Start the stream to fill this chart.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="time" tick={axisTick} tickLine={false} axisLine={false} minTickGap={28} />
                  <YAxis tick={axisTick} tickLine={false} axisLine={false} width={36} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="Events" stroke={colorA} fill={colorA} fillOpacity={0.16} strokeWidth={2} />
                  <Area type="monotone" dataKey="Conversions" stroke={colorB} fill={colorB} fillOpacity={0.12} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className={`${card} flex flex-col`}>
          <header className="border-b border-[#f0f1f3] px-5 py-3.5">
            <h2 className="text-sm font-semibold">Simulator</h2>
            <p className="text-xs text-[#605e5c]">Generates local events. No network calls.</p>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-5">
            <p className="text-sm leading-6 text-[#323130]">
              {state.simulatorRunning
                ? running > 0
                  ? 'The stream is writing assignments, clicks, and conversions into running experiments.'
                  : 'The stream is on, but no experiment is running, so no new events are emitted.'
                : 'Start the stream after an experiment is running. Refresh keeps the saved results.'}
            </p>
            <button
              type="button"
              className={state.simulatorRunning ? btnSecondary : btnPrimary}
              onClick={() => setSimulator(!state.simulatorRunning)}
            >
              {state.simulatorRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {state.simulatorRunning ? 'Pause stream' : 'Start stream'}
            </button>
            <button type="button" className={btnSecondary} onClick={() => navigate('experiments', { create: true })}>
              New experiment
            </button>
            <p className="mt-auto text-xs leading-5 text-[#605e5c]">
              Latest stored event:{' '}
              {state.events[0] ? formatTime(state.events[0].timestamp) : 'none yet'}
            </p>
          </div>
        </article>
      </section>

      <article className={card}>
        <header className="flex items-center justify-between border-b border-[#f0f1f3] px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold">Experiment performance</h2>
            <p className="text-xs text-[#605e5c]">Primary goal rate by variant. Click a row for analytics.</p>
          </div>
        </header>
        {state.experiments.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-semibold">No experiments yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-[#605e5c]">
              Create an A/B test, start it, then run the simulator. Results stay in this browser.
            </p>
            <button
              type="button"
              className={`${btnPrimary} mt-4`}
              onClick={() => navigate('experiments', { create: true })}
            >
              Create experiment
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-[#605e5c]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Experiment</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Participants</th>
                  <th className="px-3 py-3 font-semibold">Control</th>
                  <th className="px-3 py-3 font-semibold">Treatment</th>
                  <th className="px-3 py-3 font-semibold">Lift</th>
                  <th className="px-5 py-3 font-semibold">Read</th>
                </tr>
              </thead>
              <tbody>
                {state.experiments.map((experiment) => {
                  const stats = state.stats[experiment.id];
                  const comparison = stats
                    ? compareVariants(stats.A, stats.B)
                    : compareVariants(
                        { participants: 0, clicks: 0, conversions: 0, errors: 0 },
                        { participants: 0, clicks: 0, conversions: 0, errors: 0 },
                      );
                  return (
                    <tr
                      key={experiment.id}
                      className="cursor-pointer border-t border-[#f0f1f3] hover:bg-[#f8fafc]"
                      onClick={() => {
                        selectExperiment(experiment.id);
                        navigate('analytics');
                      }}
                    >
                      <td className="px-5 py-3">
                        <div className="font-semibold">{experiment.name}</div>
                        <div className="text-xs text-[#605e5c]">{experiment.goal}</div>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={experiment.status} />
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {formatNumber(stats ? participantsOf(stats) : 0)}
                      </td>
                      <td className="px-3 py-3 tabular-nums">{formatPercent(comparison.rateA)}</td>
                      <td className="px-3 py-3 tabular-nums">{formatPercent(comparison.rateB)}</td>
                      <td
                        className={`px-3 py-3 font-semibold tabular-nums ${
                          comparison.lift !== null && comparison.lift > 0
                            ? 'text-[#0b6a0b]'
                            : comparison.lift !== null && comparison.lift < 0
                              ? 'text-[#a4262c]'
                              : 'text-[#605e5c]'
                        }`}
                      >
                        {formatLift(comparison.lift)}
                      </td>
                      <td className="px-5 py-3 text-[#323130]">{callLabel(comparison.call)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </div>
  );
}
