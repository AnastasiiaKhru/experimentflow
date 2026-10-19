import type { AppState } from '../types.ts';
import { createSeedState } from './seed.ts';
import { emptyVariantStats } from './stats.ts';

const KEY = 'experimentflow.v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAppState(value: unknown): value is AppState {
  if (!isRecord(value)) return false;
  return (
    value.version === 1 &&
    Array.isArray(value.experiments) &&
    Array.isArray(value.events) &&
    Array.isArray(value.series) &&
    isRecord(value.stats) &&
    isRecord(value.trends) &&
    isRecord(value.pools) &&
    typeof value.simulatorRunning === 'boolean' &&
    typeof value.intervalMs === 'number' &&
    typeof value.processed === 'number' &&
    typeof value.tickCount === 'number' &&
    typeof value.selectedExperimentId === 'string'
  );
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return createSeedState();
    const parsed: unknown = JSON.parse(raw);
    if (!isAppState(parsed)) return createSeedState();
    for (const experiment of parsed.experiments) {
      if (!parsed.stats[experiment.id]) parsed.stats[experiment.id] = emptyVariantStats();
      if (!parsed.trends[experiment.id]) parsed.trends[experiment.id] = [];
      if (!parsed.pools[experiment.id]) parsed.pools[experiment.id] = [];
    }
    if (!parsed.experiments.some((experiment) => experiment.id === parsed.selectedExperimentId)) {
      parsed.selectedExperimentId = parsed.experiments[0]?.id ?? '';
    }
    if (parsed.intervalMs < 200 || parsed.intervalMs > 5000) parsed.intervalMs = 800;
    return parsed;
  } catch {
    return createSeedState();
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // The dashboard keeps working in memory if the browser refuses the write.
  }
}

export function downloadState(state: AppState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'experimentflow-export.json';
  link.click();
  URL.revokeObjectURL(url);
}
