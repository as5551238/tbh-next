import { Link } from 'react-router-dom';
import { t } from '@/lib/i18n';

export default function NotFound() {
  return (
    <div className="flex h-screen items-center justify-center bg-bg">
      <div className="max-w-md text-center">
        <div className="text-6xl font-extrabold text-primary mb-2">404</div>
        <h1 className="text-xl font-bold text-text mb-2">{t('notFound.title')}</h1>
        <p className="text-sm text-text-3 mb-6">{t('notFound.description')}</p>
        <Link
          to="/"
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-80"
        >
          {t('notFound.goBack')}
        </Link>
      </div>
    </div>
  );
}
