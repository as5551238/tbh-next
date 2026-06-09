// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { retryLazy } from '@/lib/retryLazy';
import type { ComponentType } from 'react';

function makeFakeModule(val: string) {
  return { default: (() => null) as unknown as ComponentType<unknown>, __val: val };
}

describe('retryLazy', () => {
  let prevHandler: ((e: PromiseRejectionEvent) => void) | null;

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves on first successful import', async () => {
    const factory = vi.fn().mockResolvedValue(makeFakeModule('ok'));
    const lazyFn = retryLazy(factory);
    const result = await lazyFn();
    expect(result.__val).toBe('ok');
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('retries on retryable chunk error and succeeds on second attempt', async () => {
    const chunkErr = new Error('Loading CSS chunk 5 failed');
    const factory = vi.fn()
      .mockRejectedValueOnce(chunkErr)
      .mockResolvedValueOnce(makeFakeModule('retried'));
    const lazyFn = retryLazy(factory);
    vi.useFakeTimers();
    const promise = lazyFn();
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;
    expect(result.__val).toBe('retried');
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('retries on "Failed to fetch" error', async () => {
    const fetchErr = new Error('Failed to fetch');
    const factory = vi.fn()
      .mockRejectedValueOnce(fetchErr)
      .mockResolvedValueOnce(makeFakeModule('fetch-retried'));
    const lazyFn = retryLazy(factory);
    vi.useFakeTimers();
    const promise = lazyFn();
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;
    expect(result.__val).toBe('fetch-retried');
  });

  it('rejects immediately on non-retryable error', async () => {
    const syntaxErr = new SyntaxError('Unexpected token');
    const factory = vi.fn().mockRejectedValue(syntaxErr);
    const lazyFn = retryLazy(factory);
    await expect(lazyFn()).rejects.toThrow(SyntaxError);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('rejects after max retries exhausted on retryable errors', async () => {
    const chunkErr = new Error('chunk load failed');
    const factory = vi.fn().mockRejectedValue(chunkErr);
    const lazyFn = retryLazy(factory);
    vi.useFakeTimers();
    const promise = lazyFn();
    promise.catch(() => {});
    await vi.advanceTimersByTimeAsync(3000);
    await expect(promise).rejects.toThrow('chunk load failed');
    expect(factory).toHaveBeenCalledTimes(3);
  });

  it('retries on "error loading dynamically" message', async () => {
    const dynErr = new Error('error loading dynamically imported module');
    const factory = vi.fn()
      .mockRejectedValueOnce(dynErr)
      .mockResolvedValueOnce(makeFakeModule('dyn-ok'));
    const lazyFn = retryLazy(factory);
    vi.useFakeTimers();
    const promise = lazyFn();
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;
    expect(result.__val).toBe('dyn-ok');
  });
});
