import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { initSentry } from '@/lib/sentry';

// DR-34: Observability baseline — Sentry must init before any component renders
initSentry();

// Use HashRouter on GitHub Pages (sub-directory hosting), BrowserRouter for local dev
const isGHPages = window.location.hostname !== 'localhost';
const Router = isGHPages ? HashRouter : BrowserRouter;
// basename is only needed for BrowserRouter (sub-directory hosting on GitHub Pages).
// HashRouter handles paths inside the hash — no basename needed.
const routerBasename = isGHPages ? undefined : (import.meta.env.BASE_URL.replace(/\/$/, '') || undefined);
import { hydrateStoreFromUrl } from '@/stores/appStore';
import App from './App';
import LoginPage from './pages/LoginPage';
import NotFound from './pages/NotFound';
import SupabaseSetupPage from './pages/SupabaseSetupPage';
import MyToday from './pages/MyToday';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import AuditLogView from './pages/AuditLogView';
import RequireAuth, { RequireRole } from './lib/auth';
import { initTheme } from '@/hooks/useTheme';
import './index.css';
import '@/lib/i18n';

// Initialize theme from localStorage before first render
initTheme();

// Register Service Worker for PWA
// Use BASE_URL for correct path on GitHub Pages sub-directory hosting
const swPath = (import.meta.env.BASE_URL + 'sw.js').replace(/\/+/g, '/');
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(swPath).catch(() => {
      // SW registration failed - non-critical, continue without PWA
    });
  });
}

// HashRouter redirect: when users visit the page without a hash fragment,
// the HashRouter has no path to match. Redirect to #/ to ensure routing works.
if (isGHPages && !window.location.hash) {
  window.location.replace(window.location.pathname + '#/');
}

// L0: Sync URL → zustand state BEFORE first React render
// Prevents flash of wrong page on direct URL navigation (e.g. #/ai/dste)
hydrateStoreFromUrl();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router basename={routerBasename}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/setup" element={<RequireAuth><SupabaseSetupPage /></RequireAuth>} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/" element={<RequireAuth><App /></RequireAuth>}>
          <Route index element={<MyToday />} />
          <Route path="workspace" element={<Navigate to="/workspace/overview" replace />} />
          <Route path="workspace/:module" element={null} />
          <Route path="collab" element={<Navigate to="/collab/channels" replace />} />
          <Route path="collab/:module" element={null} />
          <Route path="ai" element={<Navigate to="/ai/main" replace />} />
          <Route path="ai/:module" element={null} />
          <Route path="audit" element={<RequireRole roles={['admin']}><AuditLogView /></RequireRole>} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  </StrictMode>,
);
