import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import LoopDiagram from '../LoopDiagram';

describe('LoopDiagram', () => {
  afterEach(() => cleanup());

  it('renders with default (zero) props', () => {
    const { container } = render(<LoopDiagram />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders with valid props', () => {
    const { container } = render(
      <LoopDiagram goals={5} tasks={12} actionItems={8} reviews={3} completionRate={65} />
    );
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('shows correct numbers for goals, tasks, actionItems, reviews', () => {
    render(<LoopDiagram goals={5} tasks={12} actionItems={8} reviews={3} completionRate={65} />);
    expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('12').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('8').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
  });

  it('shows completion rate percentage in the SVG', () => {
    const { container } = render(<LoopDiagram completionRate={65} />);
    const svg = container.querySelector('svg')!;
    expect(svg.textContent).toContain('65');
  });

  it('clamps completion rate to 0-100', () => {
    const { container, rerender } = render(<LoopDiagram completionRate={150} />);
    expect(container.querySelector('svg')!.textContent).toContain('100');
    rerender(<LoopDiagram completionRate={-10} />);
    expect(container.querySelector('svg')!.textContent).toContain('0');
  });

  it('renders node labels', () => {
    render(<LoopDiagram goals={1} tasks={1} actionItems={1} reviews={1} />);
    expect(screen.getByText('目标')).toBeInTheDocument();
    expect(screen.getByText('任务')).toBeInTheDocument();
    expect(screen.getByText('行动')).toBeInTheDocument();
    expect(screen.getByText('复盘')).toBeInTheDocument();
  });
});
