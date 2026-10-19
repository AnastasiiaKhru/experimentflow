import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { PAGES, type PageId } from '../types.ts';

interface NavigateOptions {
  create?: boolean;
}

interface NavValue {
  page: PageId;
  createSignal: number;
  navigate: (page: PageId, options?: NavigateOptions) => void;
  consumeCreate: () => void;
}

const NavContext = createContext<NavValue | null>(null);

function parseHash(): { page: PageId; create: boolean } {
  const raw = window.location.hash.replace(/^#/, '');
  const [pagePart, query] = raw.split('?');
  const page = (PAGES as string[]).includes(pagePart) ? (pagePart as PageId) : 'overview';
  const create = new URLSearchParams(query ?? '').get('new') === '1';
  return { page, create };
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const initial = parseHash();
  const [page, setPage] = useState<PageId>(initial.page);
  const [createSignal, setCreateSignal] = useState(initial.create ? 1 : 0);

  useEffect(() => {
    if (window.location.hash.includes('new=1')) {
      window.history.replaceState(null, '', '#experiments');
    }
    const onHash = () => {
      const next = parseHash();
      setPage(next.page);
      if (next.create) {
        setCreateSignal((value) => value + 1);
        window.history.replaceState(null, '', '#experiments');
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const titles: Record<PageId, string> = {
      overview: 'Overview',
      experiments: 'Experiments',
      live: 'Live Events',
      analytics: 'Analytics',
      assistant: 'AI Assistant',
      settings: 'Settings',
    };
    document.title = `${titles[page]} · ExperimentFlow`;
  }, [page]);

  const navigate = (next: PageId, options?: NavigateOptions) => {
    window.location.hash = options?.create ? 'experiments?new=1' : next;
  };

  const consumeCreate = useCallback(() => setCreateSignal(0), []);

  return (
    <NavContext.Provider value={{ page, createSignal, navigate, consumeCreate }}>
      {children}
    </NavContext.Provider>
  );
}

export function useNav(): NavValue {
  const value = useContext(NavContext);
  if (!value) throw new Error('useNav must be used within NavigationProvider');
  return value;
}
