import type { Experiment, ExperimentInput, Variant } from '../types.ts';
import { clamp } from './stats.ts';

function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function variant(
  key: 'A' | 'B',
  name: string,
  description: string,
  trafficPercent: number,
  simulatedConversionRate: number,
  existingId?: string,
): Variant {
  return {
    id: existingId ?? id('var'),
    key,
    name,
    description,
    trafficPercent,
    simulatedConversionRate,
  };
}

export function experimentFromInput(
  input: ExperimentInput,
  existing?: Experiment,
): Experiment {
  const now = new Date().toISOString();
  const experimentId = existing?.id ?? id('exp');
  const trafficA = clamp(Math.round(input.trafficA), 1, 99);
  return {
    id: experimentId,
    name: input.name.trim(),
    description: input.description.trim(),
    hypothesis: input.hypothesis.trim(),
    goal: input.goal.trim(),
    owner: input.owner.trim() || 'Product',
    status: existing?.status ?? 'draft',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    variants: [
      variant(
        'A',
        input.variantAName.trim(),
        input.variantADescription.trim(),
        trafficA,
        clamp(input.rateA, 0.01, 0.95),
        existing?.variants.find((item) => item.key === 'A')?.id,
      ),
      variant(
        'B',
        input.variantBName.trim(),
        input.variantBDescription.trim(),
        100 - trafficA,
        clamp(input.rateB, 0.01, 0.95),
        existing?.variants.find((item) => item.key === 'B')?.id,
      ),
    ],
  };
}

export function inputFromExperiment(experiment: Experiment): ExperimentInput {
  const a = experiment.variants.find((item) => item.key === 'A') ?? experiment.variants[0];
  const b = experiment.variants.find((item) => item.key === 'B') ?? experiment.variants[1];
  return {
    name: experiment.name,
    description: experiment.description,
    hypothesis: experiment.hypothesis,
    goal: experiment.goal,
    owner: experiment.owner,
    variantAName: a?.name ?? 'Control',
    variantADescription: a?.description ?? '',
    variantBName: b?.name ?? 'Treatment',
    variantBDescription: b?.description ?? '',
    trafficA: a?.trafficPercent ?? 50,
    rateA: a?.simulatedConversionRate ?? 0.2,
    rateB: b?.simulatedConversionRate ?? 0.25,
  };
}

export function variantName(experiment: Experiment, key: 'A' | 'B'): string {
  return experiment.variants.find((item) => item.key === key)?.name ?? `Variant ${key}`;
}

export function validateInput(input: ExperimentInput): string | null {
  if (input.name.trim().length < 3) return 'Name the experiment with at least 3 characters.';
  if (input.goal.trim().length < 3) return 'Add a conversion goal.';
  if (input.variantAName.trim().length < 2 || input.variantBName.trim().length < 2) {
    return 'Name both variants.';
  }
  if (input.trafficA < 1 || input.trafficA > 99) return 'Give each variant at least 1% of traffic.';
  if (input.rateA <= 0 || input.rateB <= 0 || input.rateA > 0.95 || input.rateB > 0.95) {
    return 'Keep simulator conversion propensities between 1% and 95%.';
  }
  return null;
}
