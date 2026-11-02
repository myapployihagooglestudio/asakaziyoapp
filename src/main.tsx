import { createRoot } from 'react-dom/client';
import './i18n.ts';
import App from './App.tsx';
import { ErrorBoundary } from './components/ui/ErrorBoundary.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Auto-register service worker for PWA offline capabilities
if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onOfflineReady() {
      // Offline assets ready
    },
    onNeedRefresh() {
      // Auto reload on update
    },
  });
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
