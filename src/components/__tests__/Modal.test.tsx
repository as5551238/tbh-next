// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Modal } from '@/components/Modal';

describe('Modal', () => {
  const originalOffsetParent = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent');

  beforeEach(() => {
    cleanup();
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
      get() { return document.body; },
      configurable: true,
    });
  });

  afterEach(() => {
    if (originalOffsetParent) {
      Object.defineProperty(HTMLElement.prototype, 'offsetParent', originalOffsetParent);
    } else {
      delete (HTMLElement.prototype as any).offsetParent;
    }
  });

  it('renders nothing when open=false', () => {
    render(<Modal open={false} onClose={() => {}} title="Test">Content</Modal>);
    expect(screen.queryByText('Test')).toBeNull();
  });

  it('renders title and children when open=true', () => {
    render(<Modal open={true} onClose={() => {}} title="Test Modal">Hello Modal</Modal>);
    expect(screen.getByText('Test Modal')).toBeTruthy();
    expect(screen.getByText('Hello Modal')).toBeTruthy();
  });

  it('closes on Escape key', () => {
    const onClose = vi.fn();
    render(<Modal open={true} onClose={onClose} title="Esc Test">Content</Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on overlay click', () => {
    const onClose = vi.fn();
    const { container } = render(<Modal open={true} onClose={onClose} title="Overlay Test">Content</Modal>);
    const overlay = container.querySelector('.absolute.inset-0');
    expect(overlay).toBeTruthy();
    fireEvent.click(overlay!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('traps focus - Tab from last focusable wraps to first', () => {
    const { container } = render(
      <Modal open={true} onClose={() => {}} title="Focus Trap">
        <input data-testid="inp" />
        <button data-testid="btn">Last</button>
      </Modal>
    );
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])'));
    expect(focusable.length).toBeGreaterThanOrEqual(3);
    const last = focusable[focusable.length - 1];
    const first = focusable[0];
    last.focus();
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
  });

  it('traps focus - Shift+Tab from first focusable wraps to last', () => {
    const { container } = render(
      <Modal open={true} onClose={() => {}} title="Shift Tab">
        <input data-testid="inp" />
        <button data-testid="btn">Last</button>
      </Modal>
    );
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])'));
    expect(focusable.length).toBeGreaterThanOrEqual(3);
    const last = focusable[focusable.length - 1];
    const first = focusable[0];
    first.focus();
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('renders footer when provided', () => {
    render(
      <Modal open={true} onClose={() => {}} title="Footer Test" footer={<button>Save</button>}>
        Content
      </Modal>
    );
    expect(screen.getByText('Save')).toBeTruthy();
  });
});
