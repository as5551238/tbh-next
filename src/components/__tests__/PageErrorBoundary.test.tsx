// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import PageErrorBoundary from '@/components/PageErrorBoundary';

function ThrowError({ error }: { error: Error }): React.ReactElement {
  throw error;
}

describe('PageErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    cleanup();
  });

  it('renders children when no error', () => {
    render(
      <PageErrorBoundary>
        <div>正常内容</div>
      </PageErrorBoundary>
    );
    expect(screen.getByText('正常内容')).toBeInTheDocument();
  });

  it('renders error UI when child throws', () => {
    const error = new Error('测试崩溃');
    render(
      <PageErrorBoundary>
        <ThrowError error={error} />
      </PageErrorBoundary>
    );
    expect(screen.getAllByText(/页面渲染出错/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows retry button on error', () => {
    const error = new Error('retry test');
    render(
      <PageErrorBoundary>
        <ThrowError error={error} />
      </PageErrorBoundary>
    );
    const retryBtns = screen.getAllByRole('button', { name: /重试/i });
    expect(retryBtns.length).toBeGreaterThanOrEqual(1);
  });

  it('catches errors and renders fallback', () => {
    const error = new Error('boundary test');
    render(
      <PageErrorBoundary>
        <ThrowError error={error} />
      </PageErrorBoundary>
    );
    // Error boundary should catch the error and render fallback, not propagate
    const fallbackEls = screen.getAllByText(/页面渲染出错/i);
    expect(fallbackEls.length).toBeGreaterThanOrEqual(1);
  });
});
