import { useState, type ChangeEvent } from 'react';
import { validateInput } from '../lib/experiment.ts';
import type { ExperimentInput } from '../types.ts';
import { btnPrimary, btnSecondary, field, labelText } from './ui.ts';

export function ExperimentForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: ExperimentInput;
  submitLabel: string;
  onSubmit: (input: ExperimentInput) => void;
  onCancel: () => void;
}) {
  const [input, setInput] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const set =
    (key: keyof ExperimentInput) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setInput((current) => ({ ...current, [key]: event.target.value }));
    };

  const setNumber = (key: 'trafficA' | 'rateA' | 'rateB', percent: boolean) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.target.value);
      setInput((current) => ({
        ...current,
        [key]: percent ? value / 100 : value,
      }));
    };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const message = validateInput(input);
        if (message) {
          setError(message);
          return;
        }
        onSubmit(input);
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className={labelText}>Experiment name</span>
          <input className={field} value={input.name} onChange={set('name')} autoFocus placeholder="Checkout payment copy" />
        </label>
        <label>
          <span className={labelText}>Conversion goal</span>
          <input className={field} value={input.goal} onChange={set('goal')} placeholder="Complete purchase" />
        </label>
        <label>
          <span className={labelText}>Owner</span>
          <input className={field} value={input.owner} onChange={set('owner')} placeholder="Product" />
        </label>
        <label className="sm:col-span-2">
          <span className={labelText}>Hypothesis</span>
          <textarea className={`${field} min-h-16 resize-y`} value={input.hypothesis} onChange={set('hypothesis')} placeholder="Treatment improves the goal because…" />
        </label>
        <label className="sm:col-span-2">
          <span className={labelText}>Description</span>
          <textarea className={`${field} min-h-16 resize-y`} value={input.description} onChange={set('description')} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="rounded-lg border border-[#e6e8ec] p-3">
          <legend className="px-1 text-xs font-semibold text-[#0f6cbd]">Variant A · Control</legend>
          <label className="mt-2 block">
            <span className={labelText}>Name</span>
            <input className={field} value={input.variantAName} onChange={set('variantAName')} />
          </label>
          <label className="mt-3 block">
            <span className={labelText}>Description</span>
            <input className={field} value={input.variantADescription} onChange={set('variantADescription')} />
          </label>
          <label className="mt-3 block">
            <span className={labelText}>Simulator conversion propensity</span>
            <input
              className={field}
              type="number"
              min={1}
              max={95}
              step={1}
              value={Math.round(input.rateA * 100)}
              onChange={setNumber('rateA', true)}
            />
          </label>
        </fieldset>
        <fieldset className="rounded-lg border border-[#e6e8ec] p-3">
          <legend className="px-1 text-xs font-semibold text-[#5b5fc7]">Variant B · Treatment</legend>
          <label className="mt-2 block">
            <span className={labelText}>Name</span>
            <input className={field} value={input.variantBName} onChange={set('variantBName')} />
          </label>
          <label className="mt-3 block">
            <span className={labelText}>Description</span>
            <input className={field} value={input.variantBDescription} onChange={set('variantBDescription')} />
          </label>
          <label className="mt-3 block">
            <span className={labelText}>Simulator conversion propensity</span>
            <input
              className={field}
              type="number"
              min={1}
              max={95}
              step={1}
              value={Math.round(input.rateB * 100)}
              onChange={setNumber('rateB', true)}
            />
          </label>
        </fieldset>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-[#605e5c]">
          <span>Traffic · A {input.trafficA}%</span>
          <span>B {100 - input.trafficA}%</span>
        </div>
        <input
          type="range"
          min={1}
          max={99}
          value={input.trafficA}
          onChange={setNumber('trafficA', false)}
          className="w-full accent-[#0f6cbd]"
          aria-label="Traffic allocated to variant A"
        />
        <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-[#efeefe]">
          <div className="bg-[#0f6cbd]" style={{ width: `${input.trafficA}%` }} />
          <div className="bg-[#5b5fc7]" style={{ width: `${100 - input.trafficA}%` }} />
        </div>
        <p className="mt-2 text-xs text-[#605e5c]">
          Propensity is used only by the local simulator. It is not a measured result.
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-[#fdf3f4] px-3 py-2 text-sm text-[#a4262c]" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" className={btnSecondary} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={btnPrimary}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
