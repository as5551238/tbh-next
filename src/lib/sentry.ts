/**
 * Sentry Configuration — DR-34: Observability Baseline
 *
 * KEY PRINCIPLE: Sentry must work in production by default.
 * DSN is injected via VITE_SENTRY_DSN env var (required for prod).
 * If DSN is missing in production, we warn loudly – not silently degrade.
 *
 * Order of operations (per gatekeeper ruling):
 *   1. Sentry DSN configured → errors reported → safe to drop console in prod
 *   2. Sentry DSN missing → console must NOT be dropped (blind flight)
 */

import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN ?? '';

let _sentryInitialized = false;

export function initSentry(): boolean {
  if (!SENTRY_DSN) {
    if (import.meta.env.PROD) {
      console.warn(
        '[Sentry] VITE_SENTRY_DSN is not set. Production errors will NOT be reported. ' +
        'Set VITE_SENTRY_DSN in your .env or CI secrets immediately.'
      );
    }
    return false;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    environment: import.meta.env.MODE,
    enabled: import.meta.env.PROD,
    beforeSend(event, hint) {
      // Filter out known noisy errors
      if (event.exception?.values?.[0]?.type === 'ResizeObserverLoopError') {
        return null;
      }
      return event;
    },
  });

  _sentryInitialized = true;
  return true;
}

/** Capture exception — only sends if Sentry is initialized */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (_sentryInitialized) {
    Sentry.captureException(error, { extra: context });
  }
  // Always log locally for debugging
  console.error('[Sentry]', error, context);
}

/** Check if Sentry is active */
export function isSentryActive(): boolean {
  return _sentryInitialized;
}
