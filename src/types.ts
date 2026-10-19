export type PageId =
  | 'overview'
  | 'experiments'
  | 'live'
  | 'analytics'
  | 'assistant'
  | 'settings';

export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'archived';
export type VariantKey = 'A' | 'B';
export type EventKind = 'assignment' | 'click' | 'conversion' | 'error';

export interface Variant {
  id: string;
  key: VariantKey;
  name: string;
  description: string;
  trafficPercent: number;
  simulatedConversionRate: number;
}

export interface Experiment {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  goal: string;
  owner: string;
  status: ExperimentStatus;
  variants: Variant[];
  createdAt: string;
  updatedAt: string;
}

export interface ExperimentInput {
  name: string;
  description: string;
  hypothesis: string;
  goal: string;
  owner: string;
  variantAName: string;
  variantADescription: string;
  variantBName: string;
  variantBDescription: string;
  trafficA: number;
  rateA: number;
  rateB: number;
}

export interface VariantStats {
  participants: number;
  clicks: number;
  conversions: number;
  errors: number;
}

export interface ExperimentEvent {
  id: string;
  experimentId: string;
  variantKey: VariantKey;
  kind: EventKind;
  userId: string;
  timestamp: number;
  latencyMs: number;
  detail: string;
}

export interface TimePoint {
  t: number;
  events: number;
  conversions: number;
  errors: number;
  latencySum: number;
  latencyCount: number;
}

export interface TrendPoint {
  t: number;
  rateA: number;
  rateB: number;
  convA: number;
  convB: number;
  eventsA: number;
  eventsB: number;
}

export interface AssignedUser {
  id: string;
  variant: VariantKey;
  converted: boolean;
  willConvert: boolean;
}

export interface AppState {
  version: 1;
  experiments: Experiment[];
  events: ExperimentEvent[];
  stats: Record<string, Record<VariantKey, VariantStats>>;
  series: TimePoint[];
  trends: Record<string, TrendPoint[]>;
  pools: Record<string, AssignedUser[]>;
  simulatorRunning: boolean;
  intervalMs: number;
  processed: number;
  tickCount: number;
  selectedExperimentId: string;
}

export const PAGES: PageId[] = [
  'overview',
  'experiments',
  'live',
  'analytics',
  'assistant',
  'settings',
];

export const emptyInput = (): ExperimentInput => ({
  name: '',
  description: '',
  hypothesis: '',
  goal: '',
  owner: '',
  variantAName: 'Control',
  variantADescription: '',
  variantBName: 'Treatment',
  variantBDescription: '',
  trafficA: 50,
  rateA: 0.2,
  rateB: 0.25,
});
