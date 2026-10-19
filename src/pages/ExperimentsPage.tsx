import { useEffect, useState } from 'react';
import { Archive, Pause, Pencil, Play, Plus, RotateCcw } from 'lucide-react';
import { ExperimentForm } from '../components/ExperimentForm.tsx';
import { Modal } from '../components/Modal.tsx';
import { useNav } from '../components/navigation.tsx';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { btnDanger, btnPrimary, btnQuiet, btnSecondary, card, field } from '../components/ui.ts';
import { inputFromExperiment } from '../lib/experiment.ts';
import { formatLift, formatNumber, formatPercent } from '../lib/format.ts';
import { compareVariants, participantsOf, ratio } from '../lib/stats.ts';
import { useStore } from '../store/store.tsx';
import { emptyInput, type Experiment, type ExperimentStatus } from '../types.ts';

const filters: Array<{ id: 'all' | ExperimentStatus; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'running', label: 'Running' },
  { id: 'paused', label: 'Paused' },
  { id: 'draft', label: 'Draft' },
  { id: 'archived', label: 'Archived' },
];

export function ExperimentsPage() {
  const { state, createExperiment, updateExperiment, setStatus, selectExperiment } = useStore();
  const { createSignal, consumeCreate, navigate } = useNav();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof filters)[number]['id']>('all');
  const [editing, setEditing] = useState<Experiment | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (createSignal > 0) {
      setCreating(true);
      consumeCreate();
    }
  }, [createSignal, consumeCreate]);

  const visible = state.experiments.filter((experiment) => {
    const matchesFilter = filter === 'all' || experiment.status === filter;
    const haystack = `${experiment.name} ${experiment.goal} ${experiment.owner}`.toLowerCase();
    return matchesFilter && haystack.includes(query.trim().toLowerCase());
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          className={`${field} sm:max-w-xs`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search experiments"
          aria-label="Search experiments"
        />
        <div className="flex flex-wrap gap-1">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                filter === item.id ? 'bg-[#0b1c33] text-white' : 'bg-white text-[#323130] ring-1 ring-[#e6e8ec]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button type="button" className={`${btnPrimary} sm:ml-auto`} onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          New experiment
        </button>
      </div>

      {state.experiments.length === 0 ? (
        <article className={`${card} px-6 py-14 text-center`}>
          <h2 className="text-base font-semibold">No experiments in this browser</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#605e5c]">
            Create a draft, choose two variants, then start it. Archived and cleared tests can be restored from Settings with the demo seed.
          </p>
          <button type="button" className={`${btnPrimary} mt-4`} onClick={() => setCreating(true)}>
            Create experiment
          </button>
        </article>
      ) : visible.length === 0 ? (
        <article className={`${card} px-6 py-12 text-center text-sm text-[#605e5c]`}>
          Nothing matches this filter.
        </article>
      ) : (
        <div className="space-y-3">
          {visible.map((experiment) => {
            const stats = state.stats[experiment.id];
            const comparison = stats
              ? compareVariants(stats.A, stats.B)
              : null;
            const control = experiment.variants.find((variant) => variant.key === 'A');
            const treatment = experiment.variants.find((variant) => variant.key === 'B');
            return (
              <article key={experiment.id} className={`${card} p-4`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold tracking-tight">{experiment.name}</h2>
                      <StatusBadge status={experiment.status} />
                      <span className="text-xs text-[#605e5c]">{experiment.owner}</span>
                    </div>
                    <p className="mt-1 text-sm text-[#323130]">
                      Goal: <span className="font-medium">{experiment.goal}</span>
                    </p>
                    {experiment.hypothesis && (
                      <p className="mt-1 max-w-3xl text-sm text-[#605e5c]">{experiment.hypothesis}</p>
                    )}
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <VariantLine
                        tone="a"
                        name={control?.name ?? 'Control'}
                        traffic={control?.trafficPercent ?? 0}
                        rate={stats ? ratio(stats.A.conversions, stats.A.participants) : 0}
                        participants={stats?.A.participants ?? 0}
                      />
                      <VariantLine
                        tone="b"
                        name={treatment?.name ?? 'Treatment'}
                        traffic={treatment?.trafficPercent ?? 0}
                        rate={stats ? ratio(stats.B.conversions, stats.B.participants) : 0}
                        participants={stats?.B.participants ?? 0}
                      />
                    </div>
                    <p className="mt-2 text-xs text-[#605e5c]">
                      {formatNumber(stats ? participantsOf(stats) : 0)} participants
                      {comparison
                        ? comparison.call === 'needs-data'
                          ? ' · Needs more data'
                          : ` · Lift ${formatLift(comparison.lift)}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1 lg:justify-end">
                    {experiment.status === 'archived' ? (
                      <button type="button" className={btnSecondary} onClick={() => setStatus(experiment.id, 'paused')}>
                        <RotateCcw className="h-4 w-4" />
                        Restore
                      </button>
                    ) : experiment.status === 'running' ? (
                      <button type="button" className={btnSecondary} onClick={() => setStatus(experiment.id, 'paused')}>
                        <Pause className="h-4 w-4" />
                        Pause
                      </button>
                    ) : (
                      <button type="button" className={btnPrimary} onClick={() => setStatus(experiment.id, 'running')}>
                        <Play className="h-4 w-4" />
                        {experiment.status === 'paused' ? 'Resume' : 'Start'}
                      </button>
                    )}
                    <button
                      type="button"
                      className={btnQuiet}
                      onClick={() => {
                        selectExperiment(experiment.id);
                        navigate('analytics');
                      }}
                    >
                      Analytics
                    </button>
                    <button type="button" className={btnQuiet} onClick={() => setEditing(experiment)}>
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                    {experiment.status !== 'archived' &&
                      (confirmId === experiment.id ? (
                        <>
                          <button
                            type="button"
                            className={btnDanger}
                            onClick={() => {
                              setStatus(experiment.id, 'archived');
                              setConfirmId(null);
                            }}
                          >
                            Confirm archive
                          </button>
                          <button type="button" className={btnQuiet} onClick={() => setConfirmId(null)}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button type="button" className={btnQuiet} onClick={() => setConfirmId(experiment.id)}>
                          <Archive className="h-4 w-4" />
                          Archive
                        </button>
                      ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {creating && (
        <Modal
          title="New experiment"
          subtitle="Saved as a draft in this browser. Start it when the variants look right."
          onClose={() => setCreating(false)}
        >
          <ExperimentForm
            initial={emptyInput()}
            submitLabel="Create draft"
            onCancel={() => setCreating(false)}
            onSubmit={(input) => {
              createExperiment(input);
              setCreating(false);
            }}
          />
        </Modal>
      )}

      {editing && (
        <Modal
          title="Edit experiment"
          subtitle="Status and measured results stay as they are. Simulator propensity only affects new events."
          onClose={() => setEditing(null)}
        >
          <ExperimentForm
            initial={inputFromExperiment(editing)}
            submitLabel="Save changes"
            onCancel={() => setEditing(null)}
            onSubmit={(input) => {
              updateExperiment(editing.id, input);
              setEditing(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function VariantLine({
  tone,
  name,
  traffic,
  rate,
  participants,
}: {
  tone: 'a' | 'b';
  name: string;
  traffic: number;
  rate: number;
  participants: number;
}) {
  return (
    <div className="rounded-lg bg-[#f8fafc] px-3 py-2">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">{name}</span>
        <span className={tone === 'a' ? 'text-[#0f6cbd]' : 'text-[#5b5fc7]'}>{traffic}%</span>
      </div>
      <div className="mt-1 text-xs text-[#605e5c]">
        {formatPercent(rate)} conversion · {formatNumber(participants)} people
      </div>
    </div>
  );
}
