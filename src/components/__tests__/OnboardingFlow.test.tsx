import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OnboardingFlow, { resetOnboarding } from '../OnboardingFlow';
import { t } from '@/lib/i18n';
import '../../lib/i18n/zh';

vi.mock('@/lib/dataLayer', () => ({
  createGoal: vi.fn().mockResolvedValue({ id: 'g_test_1', title: 'Test Goal', progress: 0, status: 'on_track', key_results: [], owner_id: null, leader_id: null, end_date: null, start_date: null }),
  createTask: vi.fn().mockResolvedValue({ id: 't_test_1', title: 'Test Task', priority: 'high', assignee_id: null, leader_id: null, due_date: null, status: 'todo', done: false, goal_id: 'g_test_1' }),
}));

vi.mock('@/stores/appStore', () => ({
  useAppStore: vi.fn().mockReturnValue(vi.fn()),
}));

describe('OnboardingFlow', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });
  afterEach(() => cleanup());

  it('returns null when tbh-onboarded is set to "done"', () => {
    localStorage.setItem('tbh-onboarded', 'done');
    const { container } = render(<OnboardingFlow />);
    expect(container.innerHTML).toBe('');
  });

  it('shows onboarding wizard when tbh-onboarded is not set (first-time user)', () => {
    render(<OnboardingFlow />);
    expect(screen.getByText(t('onboarding.welcome'))).toBeInTheDocument();
  });

  it('navigates from step 1 to step 2', async () => {
    const user = userEvent.setup();
    render(<OnboardingFlow />);
    await user.click(screen.getAllByText(t('onboarding.startSetup'))[0]);
    expect(screen.getByText(t('onboarding.createFirstGoal'))).toBeInTheDocument();
  });

  it('skips onboarding and sets localStorage', async () => {
    const user = userEvent.setup();
    render(<OnboardingFlow />);
    await user.click(screen.getAllByText(t('onboarding.skip'))[0]);
    expect(localStorage.getItem('tbh-onboarded')).toBe('done');
  });

  it('creates a goal on step 2 and moves to step 3', async () => {
    const { createGoal } = await import('@/lib/dataLayer');
    const user = userEvent.setup();
    render(<OnboardingFlow />);
    await user.click(screen.getAllByText(t('onboarding.startSetup'))[0]);
    const input = screen.getByPlaceholderText(t('onboarding.goalPlaceholder'));
    await user.type(input, 'My First Goal');
    await user.click(screen.getByText(t('onboarding.createGoal')));
    await waitFor(() => {
      expect(createGoal).toHaveBeenCalledOnce();
    });
    await waitFor(() => {
      expect(screen.getByText(t('onboarding.addFirstTask'))).toBeInTheDocument();
    });
  });

  it('resetOnboarding clears localStorage', () => {
    localStorage.setItem('tbh-onboarded', 'done');
    resetOnboarding();
    expect(localStorage.getItem('tbh-onboarded')).toBeNull();
  });
});
