import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useNav } from '../components/navigation.tsx';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { axisTick, colorA, colorB, gridStroke, tooltipStyle } from '../components/charts.tsx';
import { btnPrimary, card, field } from '../components/ui.ts';
import { formatClock, formatLift, formatNumber, formatPercent } from '../lib/format.ts';
import { callLabel, compareVariants, participantsOf, type Interval } from '../lib/stats.ts';
import { useStore } from '../store/store.tsx';

function band(interval: Interval | null): string {
  if (!interval) return 'Shown after 30 participants.';
  return `${formatPercent(interval.low)} to ${formatPercent(interval.high)}`;
}

export function AnalyticsPage() {
  const { state, selectExperiment } = useStore();
  const { navigate } = useNav();
  const selected =
    state.experiments.find((experiment) => experiment.id === state.selectedExperimentId) ??
    state.experiments[0];

  if (!selected) {
    return (
      <article className={`${card} px-6 py-14 text-center`}>
        <h2 className="text-base font-semibold">No experiment selected</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#605e5c]">
          Analytics reads the experiments saved in this browser. Create one to compare variants.
        </p>
        <button type="button" className={`${btnPrimary} mt-4`} onClick={() => navigate('experiments', { create: true })}>
          Create experiment
        </button>
      </article>
    );
  }

  const stats = state.stats[selected.id] ?? {
    A: { participants: 0, clicks: 0, conversions: 0, errors: 0 },
    B: { participants: 0, clicks: 0, conversions: 0, errors: 0 },
  };
  const comparison = compareVariants(stats.A, stats.B);
  const control = selected.variants.find((variant) => variant.key === 'A');
  const treatment = selected.variants.find((variant) => variant.key === 'B');
  const outcome = [
    { name: 'Participants', Control: stats.A.participants, Treatment: stats.B.participants },
    { name: 'Clicks', Control: stats.A.clicks, Treatment: stats.B.clicks },
    { name: 'Conversions', Control: stats.A.conversions, Treatment: stats.B.conversions },
  ];
  const rates = [
    { name: control?.name ?? 'Control', rate: Number((comparison.rateA * 100).toFixed(2)) },
    { name: treatment?.name ?? 'Treatment', rate: Number((comparison.rateB * 100).toFixed(2)) },
  ];
  const rateAxisMax = Math.max(
    10,
    Math.ceil(Math.max(comparison.rateA, comparison.rateB) * 100 + 4),
  );
  const trend = (state.trends[selected.id] ?? []).map((point) => ({
    time: formatClock(point.t),
    Control: Number((point.rateA * 100).toFixed(2)),
    Treatment: Number((point.rateB * 100).toFixed(2)),
    'Control events': point.eventsA,
    'Treatment events': point.eventsB,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="sm:w-80">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#605e5c]">
            Experiment
          </span>
          <select
            className={field}
            value={selected.id}
            onChange={(event) => selectExperiment(event.target.value)}
          >
            {state.experiments.map((experiment) => (
              <option key={experiment.id} value={experiment.id}>
                {experiment.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2 pb-1">
          <StatusBadge status={selected.status} />
          <span className="text-sm text-[#605e5c]">{selected.goal}</span>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <RateCard title={control?.name ?? 'Control'} rate={comparison.rateA} detail={`95% interval: ${band(comparison.ciA)}`} tone="a" />
        <RateCard title={treatment?.name ?? 'Treatment'} rate={comparison.rateB} detail={`95% interval: ${band(comparison.ciB)}`} tone="b" />
        <article className={`${card} px-4 py-4`}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#605e5c]">Relative lift</p>
          <p className="mt-2 text-[28px] font-semibold tracking-tight">{formatLift(comparison.lift)}</p>
          <p className="mt-2 text-sm font-medium text-[#201f1e]">{callLabel(comparison.call)}</p>
          <p className="mt-1 text-xs leading-5 text-[#605e5c]">
            {formatNumber(participantsOf(stats))} participants. A leader requires 200 people in each variant and non-overlapping intervals.
          </p>
        </article>
      </section>

      <p className="text-xs leading-5 text-[#605e5c]">
        Uncertainty is a 95% Wilson score interval on simulated conversions. It is hidden below 30 participants and is not a sequential production test.
      </p>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className={card}>
          <header className="border-b border-[#f0f1f3] px-5 py-3.5">
            <h2 className="text-sm font-semibold">Conversion rate</h2>
            <p className="text-xs text-[#605e5c]">Variant A versus variant B</p>
          </header>
          <div className="h-72 px-2 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rates} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={gridStroke} vertical={false} />
                <XAxis dataKey="name" tick={axisTick} tickLine={false} axisLine={false} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} domain={[0, rateAxisMax]} unit="%" />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value ?? 0}%`, 'Conversion']} />
                <Bar dataKey="rate" radius={[4, 4, 0, 0]} barSize={48}>
                  <Cell fill={colorA} />
                  <Cell fill={colorB} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className={card}>
          <header className="border-b border-[#f0f1f3] px-5 py-3.5">
            <h2 className="text-sm font-semibold">Outcomes</h2>
            <p className="text-xs text-[#605e5c]">Participants, clicks, and conversions</p>
          </header>
          <div className="h-72 px-2 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={outcome} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={gridStroke} vertical={false} />
                <XAxis dataKey="name" tick={axisTick} tickLine={false} axisLine={false} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={48} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="Control" fill={colorA} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Treatment" fill={colorB} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className={card}>
          <header className="border-b border-[#f0f1f3] px-5 py-3.5">
            <h2 className="text-sm font-semibold">Performance trend</h2>
            <p className="text-xs text-[#605e5c]">Conversion rate over the stored snapshots</p>
          </header>
          <div className="h-72 px-2 py-4">
            {trend.length < 2 ? (
              <EmptyChart text="Run the simulator against a running experiment to grow this trend." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="time" tick={axisTick} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} unit="%" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Line type="monotone" dataKey="Control" stroke={colorA} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Treatment" stroke={colorB} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className={card}>
          <header className="border-b border-[#f0f1f3] px-5 py-3.5">
            <h2 className="text-sm font-semibold">Event volume</h2>
            <p className="text-xs text-[#605e5c]">Cumulative simulated events by variant</p>
          </header>
          <div className="h-72 px-2 py-4">
            {trend.length < 2 ? (
              <EmptyChart text="Volume appears after a few simulator batches." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="time" tick={axisTick} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis tick={axisTick} tickLine={false} axisLine={false} width={48} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Line type="monotone" dataKey="Control events" stroke={colorA} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Treatment events" stroke={colorB} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}

function RateCard({
  title,
  rate,
  detail,
  tone,
}: {
  title: string;
  rate: number;
  detail: string;
  tone: 'a' | 'b';
}) {
  return (
    <article className={`${card} px-4 py-4`}>
      <p className={`text-[11px] font-semibold uppercase tracking-wide ${tone === 'a' ? 'text-[#0f6cbd]' : 'text-[#5b5fc7]'}`}>
        {title}
      </p>
      <p className="mt-2 text-[28px] font-semibold tracking-tight">{formatPercent(rate)}</p>
      <p className="mt-2 text-xs text-[#605e5c]">{detail}</p>
    </article>
  );
}

function EmptyChart({ text }: { text: string }) {
  return <div className="grid h-full place-items-center px-6 text-center text-sm text-[#605e5c]">{text}</div>;
}
