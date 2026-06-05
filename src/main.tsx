import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';

// Use HashRouter on GitHub Pages (sub-directory hosting), BrowserRouter for local dev
const Router = window.location.hostname === 'localhost' ? BrowserRouter : HashRouter;
import App from './App';
import LoginPage from './pages/LoginPage';
import NotFound from './pages/NotFound';
import SupabaseSetupPage from './pages/SupabaseSetupPage';
import RequireAuth from './lib/auth';
import './index.css';

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed - non-critical, continue without PWA
    });
  });
}

// Request notification permission for push
if ('Notification' in window && Notification.permission === 'default') {
  // Don't auto-request - let the UI trigger it
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/setup" element={<RequireAuth><SupabaseSetupPage /></RequireAuth>} />
        <Route path="/" element={<RequireAuth><App /></RequireAuth>}>
          <Route index element={<Navigate to="/workspace/overview" replace />} />
          <Route path="workspace" element={<Navigate to="/workspace/overview" replace />} />
          <Route path="workspace/:module" element={null} />
          <Route path="collab" element={<Navigate to="/collab/channels" replace />} />
          <Route path="collab/:module" element={null} />
          <Route path="ai" element={<Navigate to="/ai/main" replace />} />
          <Route path="ai/:module" element={null} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  </StrictMode>,
);
