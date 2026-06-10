/**
 * Deployment version tracker.
 *
 * Injects git commit hash and build timestamp into the app
 * so deployed version can be verified at runtime.
 */

const BUILD_VERSION = import.meta.env.VITE_BUILD_VERSION ?? 'dev';
const BUILD_TIME = import.meta.env.VITE_BUILD_TIME ?? new Date().toISOString();
const GIT_HASH = import.meta.env.VITE_GIT_HASH ?? 'unknown';

export function getDeployInfo() {
  return {
    version: BUILD_VERSION,
    buildTime: BUILD_TIME,
    gitHash: GIT_HASH,
  };
}

/** Exposed on window for quick debugging in browser console */
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__TBH_INFO = getDeployInfo();
}
