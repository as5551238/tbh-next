import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import LoginPage from './pages/LoginPage';
import NotFound from './pages/NotFound';
import SupabaseSetupPage from './pages/SupabaseSetupPage';
import RequireAuth from './lib/auth';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
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
    </BrowserRouter>
  </StrictMode>,
);
