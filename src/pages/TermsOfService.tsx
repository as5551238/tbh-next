import { useState } from 'react';
import { t } from '@/lib/i18n';

const LAST_UPDATED = '2026-06-05';

export default function TermsOfService() {
  const [expanded, setExpanded] = useState<number | null>(null);

  const sections = [
    {
      title: t('terms.s1Title'),
      content: t('terms.s1p1'),
    },
    {
      title: t('terms.s2Title'),
      content: t('terms.s2p1'),
    },
    {
      title: t('terms.s3Title'),
      content: t('terms.s3p1'),
    },
    {
      title: t('terms.s4Title'),
      content: t('terms.s4p1'),
    },
    {
      title: t('terms.s5Title'),
      content: t('terms.s5p1'),
    },
    {
      title: t('terms.s6Title'),
      content: t('terms.s6p1'),
    },
    {
      title: t('terms.s7Title'),
      content: t('terms.s7p1'),
    },
    {
      title: t('terms.s8Title'),
      content: t('terms.s8p1'),
    },
    {
      title: t('terms.s9Title'),
      content: t('terms.s9p1'),
    },
    {
      title: t('terms.s10Title'),
      content: t('terms.s10p1'),
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text mb-2">{t('terms.title')}</h1>
        <p className="text-sm text-text-muted">{t('terms.lastUpdated')}{LAST_UPDATED}</p>
        <p className="text-sm text-text-muted mt-2">
          {t('terms.subtitle')}
        </p>
      </div>

      <div className="space-y-3">
        {sections.map((section, i) => (
          <div
            key={i}
            className="border border-border-2 rounded-lg overflow-hidden"
          >
            <button
              className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-surface transition-colors"
              onClick={() => setExpanded(expanded === i ? null : i)}
            >
              <span className="text-text font-medium">{section.title}</span>
              <span className="text-text-muted text-lg">
                {expanded === i ? '−' : '+'}
              </span>
            </button>
            {expanded === i && (
              <div className="px-4 py-3 bg-surface-deep border-t border-border-2">
                <pre className="text-sm text-text-muted whitespace-pre-wrap font-sans leading-relaxed">
                  {section.content}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 p-3 md:p-4 bg-surface rounded-lg border border-border-2">
        <h3 className="text-sm font-bold text-text mb-2">{t('terms.contactTitle')}</h3>
        <p className="text-sm text-text-muted">
          {t('terms.contactSupport')}
        </p>
        <p className="text-sm text-text-muted mt-1">
          {t('terms.contactLegal')}
        </p>
      </div>
    </div>
  );
}
