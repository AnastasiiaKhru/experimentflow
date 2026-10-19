import { useState } from 'react';
import { btnDanger, btnPrimary, btnSecondary, card } from '../components/ui.ts';
import { downloadState } from '../lib/storage.ts';
import { useStore } from '../store/store.tsx';

const speeds = [
  { label: 'Fast', ms: 400, hint: 'About two events a second' },
  { label: 'Normal', ms: 800, hint: 'About one event a second' },
  { label: 'Slow', ms: 1600, hint: 'Easier to follow in the log' },
];

const plans = [
  {
    name: 'ASP.NET Core',
    detail: 'Replace the browser store with experiment, assignment, and metric APIs.',
  },
  {
    name: 'PostgreSQL',
    detail: 'Persist experiments, variant assignments, and aggregate counters.',
  },
  {
    name: 'Kafka',
    detail: 'Move the simulator behind an assignment and conversion topic.',
  },
  {
    name: 'Azure',
    detail: 'Host the API, database, and stream processing when you leave the browser.',
  },
];

export function SettingsPage() {
  const { state, setIntervalMs, setSimulator, resetDemo, clearAll } = useStore();
  const [confirm, setConfirm] = useState<'reset' | 'clear' | null>(null);

  return (
    <div className="space-y-4">
      <article className={card}>
        <header className="border-b border-[#f0f1f3] px-5 py-3.5">
          <h2 className="text-sm font-semibold">Simulator speed</h2>
          <p className="text-xs text-[#605e5c]">How often the local generator attempts a new event.</p>
        </header>
        <div className="grid gap-3 p-5 sm:grid-cols-3">
          {speeds.map((speed) => {
            const active = state.intervalMs === speed.ms;
            return (
              <button
                key={speed.ms}
                type="button"
                onClick={() => setIntervalMs(speed.ms)}
                className={`rounded-lg border px-3 py-3 text-left ${
                  active ? 'border-[#0f6cbd] bg-[#f3f8fd]' : 'border-[#e6e8ec] bg-white hover:bg-[#faf9f8]'
                }`}
              >
                <div className="text-sm font-semibold">{speed.label}</div>
                <div className="mt-1 text-xs text-[#605e5c]">{speed.hint}</div>
              </button>
            );
          })}
        </div>
      </article>

      <article className={card}>
        <header className="border-b border-[#f0f1f3] px-5 py-3.5">
          <h2 className="text-sm font-semibold">Data in this browser</h2>
          <p className="text-xs text-[#605e5c]">
            Experiments, metrics, and the event log are stored under the key experimentflow.v1.
          </p>
        </header>
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:flex-wrap">
          <button type="button" className={btnSecondary} onClick={() => downloadState(state)}>
            Export JSON
          </button>
          {confirm === 'reset' ? (
            <>
              <button
                type="button"
                className={btnPrimary}
                onClick={() => {
                  resetDemo();
                  setConfirm(null);
                }}
              >
                Confirm reset
              </button>
              <button type="button" className={btnSecondary} onClick={() => setConfirm(null)}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" className={btnSecondary} onClick={() => setConfirm('reset')}>
              Reset demo data
            </button>
          )}
          {confirm === 'clear' ? (
            <>
              <button
                type="button"
                className={btnDanger}
                onClick={() => {
                  setSimulator(false);
                  clearAll();
                  setConfirm(null);
                }}
              >
                Confirm clear
              </button>
              <button type="button" className={btnSecondary} onClick={() => setConfirm(null)}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" className={btnDanger} onClick={() => setConfirm('clear')}>
              Clear all experiments
            </button>
          )}
        </div>
      </article>

      <article className={card}>
        <header className="border-b border-[#f0f1f3] px-5 py-3.5">
          <h2 className="text-sm font-semibold">Planned integrations</h2>
          <p className="text-xs text-[#605e5c]">Not connected. This build does not call these systems.</p>
        </header>
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {plans.map((plan) => (
            <div key={plan.name} className="rounded-lg border border-[#e6e8ec] px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{plan.name}</h3>
                <span className="rounded-full bg-[#f3f2f1] px-2 py-0.5 text-[11px] font-semibold text-[#605e5c]">
                  Not connected
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#605e5c]">{plan.detail}</p>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
