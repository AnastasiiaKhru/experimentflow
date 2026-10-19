import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import { experimentFromInput } from '../lib/experiment.ts';
import { applyTick } from '../lib/simulator.ts';
import { createSeedState } from '../lib/seed.ts';
import { loadState, saveState } from '../lib/storage.ts';
import { emptyVariantStats } from '../lib/stats.ts';
import type { AppState, ExperimentInput, ExperimentStatus } from '../types.ts';

type Action =
  | { type: 'tick' }
  | { type: 'create'; input: ExperimentInput }
  | { type: 'update'; id: string; input: ExperimentInput }
  | { type: 'status'; id: string; status: ExperimentStatus }
  | { type: 'simulator'; running: boolean }
  | { type: 'interval'; intervalMs: number }
  | { type: 'select'; id: string }
  | { type: 'reset' }
  | { type: 'clear' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'tick':
      return applyTick(state);
    case 'create': {
      const experiment = experimentFromInput(action.input);
      return {
        ...state,
        experiments: [experiment, ...state.experiments],
        stats: { ...state.stats, [experiment.id]: emptyVariantStats() },
        trends: { ...state.trends, [experiment.id]: [] },
        pools: { ...state.pools, [experiment.id]: [] },
        selectedExperimentId: experiment.id,
      };
    }
    case 'update': {
      const current = state.experiments.find((experiment) => experiment.id === action.id);
      if (!current) return state;
      const experiment = experimentFromInput(action.input, current);
      return {
        ...state,
        experiments: state.experiments.map((item) => (item.id === action.id ? experiment : item)),
      };
    }
    case 'status':
      return {
        ...state,
        experiments: state.experiments.map((experiment) =>
          experiment.id === action.id
            ? { ...experiment, status: action.status, updatedAt: new Date().toISOString() }
            : experiment,
        ),
      };
    case 'simulator':
      return { ...state, simulatorRunning: action.running };
    case 'interval':
      return { ...state, intervalMs: action.intervalMs };
    case 'select':
      return { ...state, selectedExperimentId: action.id };
    case 'reset':
      return { ...createSeedState(), intervalMs: state.intervalMs };
    case 'clear':
      return {
        ...state,
        experiments: [],
        events: [],
        stats: {},
        series: [],
        trends: {},
        pools: {},
        simulatorRunning: false,
        processed: 0,
        tickCount: 0,
        selectedExperimentId: '',
      };
    default:
      return state;
  }
}

interface StoreValue {
  state: AppState;
  createExperiment: (input: ExperimentInput) => void;
  updateExperiment: (id: string, input: ExperimentInput) => void;
  setStatus: (id: string, status: ExperimentStatus) => void;
  setSimulator: (running: boolean) => void;
  setIntervalMs: (intervalMs: number) => void;
  selectExperiment: (id: string) => void;
  resetDemo: () => void;
  clearAll: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (!state.simulatorRunning) return;
    const id = window.setInterval(() => dispatch({ type: 'tick' }), state.intervalMs);
    return () => window.clearInterval(id);
  }, [state.simulatorRunning, state.intervalMs]);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    const persist = () => saveState(stateRef.current);
    window.addEventListener('beforeunload', persist);
    return () => window.removeEventListener('beforeunload', persist);
  }, []);

  const value: StoreValue = {
    state,
    createExperiment: (input) => dispatch({ type: 'create', input }),
    updateExperiment: (id, input) => dispatch({ type: 'update', id, input }),
    setStatus: (id, status) => dispatch({ type: 'status', id, status }),
    setSimulator: (running) => dispatch({ type: 'simulator', running }),
    setIntervalMs: (intervalMs) => dispatch({ type: 'interval', intervalMs }),
    selectExperiment: (id) => dispatch({ type: 'select', id }),
    resetDemo: () => dispatch({ type: 'reset' }),
    clearAll: () => dispatch({ type: 'clear' }),
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used within StoreProvider');
  return value;
}
