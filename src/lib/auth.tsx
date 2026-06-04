import { Navigate, useLocation } from 'react-router-dom';

const DEMO_AUTH_KEY = 'tbh-next-auth';

export function isAuthenticated(): boolean {
  return localStorage.getItem(DEMO_AUTH_KEY) === '1';
}

export function setAuth(v: boolean): void {
  if (v) localStorage.setItem(DEMO_AUTH_KEY, '1');
  else localStorage.removeItem(DEMO_AUTH_KEY);
}

export function clearAuth(): void {
  localStorage.removeItem(DEMO_AUTH_KEY);
}

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}
