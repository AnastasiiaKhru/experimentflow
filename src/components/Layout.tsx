import { useEffect, useState, type ReactNode } from 'react';
import {
  Activity,
  BarChart3,
  FlaskConical,
  LayoutDashboard,
  Menu,
  Settings,
  Sparkles,
  X,
} from 'lucide-react';
import { useStore } from '../store/store.tsx';
import type { PageId } from '../types.ts';
import { useNav } from './navigation.tsx';
import { cn } from './ui.ts';

const items: Array<{ id: PageId; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'experiments', label: 'Experiments', icon: FlaskConical },
  { id: 'live', label: 'Live Events', icon: Activity },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'assistant', label: 'AI Assistant', icon: Sparkles },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const copy: Record<PageId, { title: string; subtitle: string }> = {
  overview: {
    title: 'Overview',
    subtitle: 'Health of every experiment stored in this browser.',
  },
  experiments: {
    title: 'Experiments',
    subtitle: 'Create variants, allocate traffic, and control status.',
  },
  live: {
    title: 'Live Events',
    subtitle: 'A local simulator for assignments, clicks, conversions, and errors.',
  },
  analytics: {
    title: 'Analytics',
    subtitle: 'Compare control and treatment on the primary conversion goal.',
  },
  assistant: {
    title: 'AI Assistant',
    subtitle: 'Rule-based notes on sample size, winners, and experiments to pause.',
  },
  settings: {
    title: 'Settings',
    subtitle: 'Simulator speed, local data, and the path to a real backend.',
  },
};

function Sidebar({
  onNavigate,
  page,
  onClose,
}: {
  onNavigate: (page: PageId) => void;
  page: PageId;
  onClose?: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-[#0b1c33] text-white">
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#0f6cbd]">
          <FlaskConical className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold tracking-tight">ExperimentFlow</div>
          <div className="text-[11px] text-[#9db0c9]">Experimentation</div>
        </div>
        {onClose && (
          <button
            type="button"
            className="ml-auto rounded-md p-1 text-[#c8d3e3] hover:bg-[#132844]"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <nav className="sidebar-scroll flex-1 space-y-1 overflow-y-auto px-3" aria-label="Primary">
        {items.map((item) => {
          const Icon = item.icon;
          const active = page === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm',
                active
                  ? 'bg-[#123056] font-semibold text-white shadow-[inset_3px_0_0_#4da3ff]'
                  : 'text-[#c8d3e3] hover:bg-[#122844] hover:text-white',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="border-t border-[#173152] px-4 py-4 text-[11px] leading-5 text-[#8ea3bd]">
        Local preview
        <div>No backend connected</div>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { page, navigate } = useNav();
  const { state } = useStore();
  const [open, setOpen] = useState(false);
  const meta = copy[page];
  const running = state.experiments.filter((experiment) => experiment.status === 'running').length;

  useEffect(() => {
    setOpen(false);
  }, [page]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f6f8] text-[#201f1e]">
      <aside className="hidden w-[248px] shrink-0 md:block">
        <Sidebar page={page} onNavigate={navigate} />
      </aside>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[#0b1c33]/50"
            aria-label="Dismiss menu"
            onClick={() => setOpen(false)}
          />
          <div className="relative h-full w-[260px]">
            <Sidebar page={page} onNavigate={navigate} onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-[#e6e8ec] bg-white/95 px-4 py-3 backdrop-blur md:px-6">
          <button
            type="button"
            className="rounded-md p-2 text-[#323130] hover:bg-[#f3f2f1] md:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold tracking-tight">{meta.title}</h1>
            <p className="truncate text-xs text-[#605e5c]">{meta.subtitle}</p>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="rounded-full bg-[#f3f2f1] px-2.5 py-1 text-[11px] font-semibold text-[#605e5c]">
              Simulated data
            </span>
            <button
              type="button"
              onClick={() => navigate('live')}
              className="inline-flex items-center gap-2 rounded-full border border-[#e6e8ec] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#323130] hover:bg-[#faf9f8]"
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  state.simulatorRunning ? 'live-dot bg-[#107c10]' : 'bg-[#a19f9d]',
                )}
              />
              {state.simulatorRunning ? 'Stream on' : 'Stream off'}
              <span className="text-[#605e5c]">· {running} running</span>
            </button>
          </div>
        </header>
        <main id="main" className="flex-1 overflow-y-auto px-4 py-5 md:px-6">
          <div key={page} className="rise mx-auto max-w-[1240px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
