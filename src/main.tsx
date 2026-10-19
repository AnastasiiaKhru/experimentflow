import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { NavigationProvider } from './components/navigation.tsx';
import { StoreProvider } from './store/store.tsx';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element missing');

createRoot(root).render(
  <StrictMode>
    <StoreProvider>
      <NavigationProvider>
        <App />
      </NavigationProvider>
    </StoreProvider>
  </StrictMode>,
);
