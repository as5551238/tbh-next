import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInit = vi.fn();
const mockCaptureException = vi.fn();

vi.mock('@sentry/react', () => ({
  init: mockInit,
  captureException: mockCaptureException,
  browserTracingIntegration: vi.fn(() => ({})),
  replayIntegration: vi.fn(() => ({})),
}));

describe('sentry (no DSN)', () => {
  beforeEach(() => {
    vi.resetModules();
    mockInit.mockReset();
    mockCaptureException.mockReset();
    vi.stubEnv('VITE_SENTRY_DSN', '');
    vi.stubEnv('PROD', '');
    vi.stubEnv('MODE', 'test');
  });

  it('returns false and does not call Sentry.init when DSN is empty', async () => {
    const { initSentry } = await import('@/lib/sentry');
    expect(initSentry()).toBe(false);
    expect(mockInit).not.toHaveBeenCalled();
  });

  it('warns in production when DSN is missing', async () => {
    vi.stubEnv('PROD', 'true');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { initSentry } = await import('@/lib/sentry');
    initSentry();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('VITE_SENTRY_DSN'));
    warnSpy.mockRestore();
  });

  it('isSentryActive returns false when not initialized', async () => {
    const { isSentryActive } = await import('@/lib/sentry');
    expect(isSentryActive()).toBe(false);
  });

  it('captureException does not call Sentry when not active', async () => {
    const { captureException } = await import('@/lib/sentry');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    captureException(new Error('test'));
    expect(mockCaptureException).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith('[Sentry]', expect.any(Error), undefined);
    errorSpy.mockRestore();
  });

  it('captureException logs context to console.error', async () => {
    const { captureException } = await import('@/lib/sentry');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('test');
    const ctx = { userId: '123' };
    captureException(err, ctx);
    expect(errorSpy).toHaveBeenCalledWith('[Sentry]', err, ctx);
    errorSpy.mockRestore();
  });
});

describe('sentry (with DSN)', () => {
  beforeEach(() => {
    vi.resetModules();
    mockInit.mockReset();
    mockCaptureException.mockReset();
    vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
    vi.stubEnv('PROD', '');
    vi.stubEnv('MODE', 'test');
  });

  it('calls Sentry.init with DSN and returns true', async () => {
    const { initSentry } = await import('@/lib/sentry');
    initSentry();
    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockInit).toHaveBeenCalledWith(expect.objectContaining({
      dsn: 'https://test@sentry.io/123',
    }));
  });

  it('configures 2 integrations', async () => {
    const { initSentry } = await import('@/lib/sentry');
    initSentry();
    const callArg = mockInit.mock.calls[0][0];
    expect(callArg.integrations).toHaveLength(2);
  });

  it('filters ResizeObserverLoopError in beforeSend', async () => {
    const { initSentry } = await import('@/lib/sentry');
    initSentry();
    const callArg = mockInit.mock.calls[0][0];
    const filtered = callArg.beforeSend(
      { exception: { values: [{ type: 'ResizeObserverLoopError' }] } } as any,
      {} as any,
    );
    expect(filtered).toBeNull();
  });

  it('passes through non-filtered errors in beforeSend', async () => {
    const { initSentry } = await import('@/lib/sentry');
    initSentry();
    const callArg = mockInit.mock.calls[0][0];
    const event = { exception: { values: [{ type: 'TypeError' }] } };
    expect(callArg.beforeSend(event as any, {} as any)).toBe(event);
  });

  it('sets isSentryActive to true after init', async () => {
    const { initSentry, isSentryActive } = await import('@/lib/sentry');
    initSentry();
    expect(isSentryActive()).toBe(true);
  });

  it('captureException calls Sentry.captureException when active', async () => {
    const { initSentry, captureException } = await import('@/lib/sentry');
    initSentry();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('active');
    captureException(err, { foo: 'bar' });
    expect(mockCaptureException).toHaveBeenCalledWith(err, { extra: { foo: 'bar' } });
    errorSpy.mockRestore();
  });
});
