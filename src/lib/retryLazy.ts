/**
 * retryLazy — wraps a dynamic import for use with React.lazy()
 * Automatically retries on "chunk load failed" / "Failed to fetch" (SW cache race, CDN blip)
 * DR-21: Dynamic Import Fault Tolerance
 */
import { type ComponentType } from 'react';

const MAX_RETRIES = 2;

export function retryLazy<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>
): () => Promise<{ default: T }> {
  return () =>
    new Promise<{ default: T }>((resolve, reject) => {
      let attempt = 0;
      const tryImport = () => {
        attempt++;
        factory()
          .then(resolve)
          .catch((err: Error) => {
            const msg = err?.message ?? '';
            const retryable =
              msg.includes('chunk') ||
              msg.includes('Failed to fetch') ||
              msg.includes('Loading CSS chunk') ||
              msg.includes('error loading dynamically');
            if (retryable && attempt <= MAX_RETRIES) {
              console.warn(`[retryLazy] Attempt ${attempt} failed, retrying... (${msg})`);
              // Small delay to allow CDN/browser cache to settle
              setTimeout(tryImport, 300 * attempt);
            } else {
              reject(err);
            }
          });
      };
      tryImport();
    });
}
