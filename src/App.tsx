import { Layout } from './components/Layout.tsx';
import { useNav } from './components/navigation.tsx';
import { AnalyticsPage } from './pages/AnalyticsPage.tsx';
import { AssistantPage } from './pages/AssistantPage.tsx';
import { ExperimentsPage } from './pages/ExperimentsPage.tsx';
import { LiveEventsPage } from './pages/LiveEventsPage.tsx';
import { OverviewPage } from './pages/OverviewPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';

export function App() {
  const { page } = useNav();
  return (
    <Layout>
      {page === 'overview' && <OverviewPage />}
      {page === 'experiments' && <ExperimentsPage />}
      {page === 'live' && <LiveEventsPage />}
      {page === 'analytics' && <AnalyticsPage />}
      {page === 'assistant' && <AssistantPage />}
      {page === 'settings' && <SettingsPage />}
    </Layout>
  );
}
