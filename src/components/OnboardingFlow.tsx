import { useState, useEffect } from 'react';
import { createGoal, createTask, type GoalRow, type TaskRow } from '@/lib/dataLayer';
import { useAppStore } from '@/stores/appStore';
import { t } from '@/lib/i18n';

const STORAGE_KEY = 'tbh-onboarded';
const STEPS = [1, 2, 3, 4] as const;

const INTERFACE_INFO = [
  { icon: '📊', name: t('onboarding.workspaceName'), desc: t('onboarding.workspaceDesc') },
  { icon: '💬', name: t('onboarding.collabName'), desc: t('onboarding.collabDesc') },
  { icon: '🧠', name: t('onboarding.aiName'), desc: t('onboarding.aiDesc') },
];

const SAMPLE_GOAL_TITLE = 'Q3 团队效能提升';
const SAMPLE_TASKS = ['建立周会复盘制度', '优化项目交付流程', '团队能力盘点'];

export function resetOnboarding() {
  localStorage.removeItem(STORAGE_KEY);
}

export default function OnboardingFlow() {
  const [step, setStep] = useState(1);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDue, setGoalDue] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [createdGoalId, setCreatedGoalId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [creatingSample, setCreatingSample] = useState(false);
  const [error, setError] = useState('');
  const navigateTo = useAppStore((s) => s.navigateTo);

  const [visible, setVisible] = useState(false);
  useEffect(() => {
    function checkVisibility() {
      const stored = localStorage.getItem(STORAGE_KEY);
      setVisible(!stored);
    }
    checkVisibility();
    const onStorage = () => checkVisibility();
    const onCustom = (e: Event) => { if ((e as CustomEvent).detail?.type === 'reset-onboarding') checkVisibility(); };
    window.addEventListener('storage', onStorage);
    window.addEventListener('tbh-onboarding-reset', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('tbh-onboarding-reset', onCustom);
    };
  }, []);

  if (!visible) return null;

  function handleSkip() {
    localStorage.setItem(STORAGE_KEY, 'done');
    setVisible(false);
  }

  async function handleCreateGoal() {
    if (!goalTitle.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const goal: GoalRow = await createGoal({
        title: goalTitle.trim(),
        progress: 0,
        status: 'on_track',
        key_results: [],
        owner_id: null,
        leader_id: null,
        end_date: goalDue || null,
        start_date: null,
      });
      setCreatedGoalId(goal.id);
      setStep(3);
    } catch {
      setError(t('onboarding.createFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateTask() {
    if (!taskTitle.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await createTask({
        title: taskTitle.trim(),
        priority: 'high',
        assignee_id: null,
        leader_id: null,
        due_date: null,
        status: 'todo',
        done: false,
        goal_id: createdGoalId,
      } as Omit<TaskRow, 'id'>);
    } catch {
      setError(t('onboarding.createFailed'));
    } finally {
      setSubmitting(false);
    }
    setStep(4);
  }

  async function handleCreateSampleData() {
    setCreatingSample(true);
    setError('');
    try {
      const goal: GoalRow = await createGoal({
        title: SAMPLE_GOAL_TITLE,
        progress: 0,
        status: 'on_track',
        key_results: [],
        owner_id: null,
        leader_id: null,
        end_date: null,
        start_date: null,
      });
      for (const title of SAMPLE_TASKS) {
        await createTask({
          title,
          priority: 'high',
          assignee_id: null,
          leader_id: null,
          due_date: null,
          status: 'todo',
          done: false,
          goal_id: goal.id,
        } as Omit<TaskRow, 'id'>);
      }
    } catch {
      setError(t('onboarding.createFailed'));
      setCreatingSample(false);
      return;
    }
    localStorage.setItem(STORAGE_KEY, 'done');
    setVisible(false);
    navigateTo('workspace', 'goals');
    window.location.hash = '#/workspace/goals';
  }

  function handleFinishEmpty() {
    localStorage.setItem(STORAGE_KEY, 'done');
    setVisible(false);
    navigateTo('workspace', 'overview');
    window.location.hash = '#/workspace/overview';
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg/85 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl border border-border-2 bg-surface p-6 shadow-2xl shadow-brand-accent/10">
        {/* Step indicators */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {STEPS.map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all duration-300 ${
                s < step ? 'w-6 bg-accent' : s === step ? 'w-8 bg-brand-accent' : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </div>

        <div className="min-h-[220px] flex flex-col">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 text-4xl">🚀</div>
              <h2 className="mb-2 text-xl font-bold text-text">{t('onboarding.welcome')}</h2>
              <p className="mb-5 text-sm text-text-muted">{t('onboarding.welcomeDesc')}</p>
              <div className="w-full space-y-3">
                {INTERFACE_INFO.map((info) => (
                  <div key={info.name} className="flex items-start gap-3 rounded-xl border border-border-2 bg-surface-deep p-3 text-left">
                    <span className="text-lg shrink-0">{info.icon}</span>
                    <div>
                      <div className="text-sm font-semibold text-text">{info.name}</div>
                      <div className="text-xs text-text-muted">{info.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Create first goal */}
          {step === 2 && (
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 text-4xl">🎯</div>
              <h2 className="mb-2 text-xl font-bold text-text">{t('onboarding.createFirstGoal')}</h2>
              <p className="mb-5 text-sm text-text-muted">{t('onboarding.goalHint')}</p>
              <div className="w-full space-y-3">
                <input
                  type="text"
                  placeholder={t('onboarding.goalPlaceholder')}
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateGoal(); }}
                  className="w-full rounded-lg border border-border-2 bg-surface-deep px-4 py-2.5 text-sm text-text placeholder-[#4a4d5a] outline-none focus:border-brand-accent transition-colors"
                />
                <input
                  type="date"
                  value={goalDue}
                  onChange={(e) => setGoalDue(e.target.value)}
                  className="w-full rounded-lg border border-border-2 bg-surface-deep px-4 py-2.5 text-sm text-text outline-none focus:border-brand-accent transition-colors"
                />
                {error && <div className="text-xs text-danger-bright">{error}</div>}
              </div>
            </div>
          )}

          {/* Step 3: Create first task */}
          {step === 3 && (
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 text-4xl">✅</div>
              <h2 className="mb-2 text-xl font-bold text-text">{t('onboarding.addFirstTask')}</h2>
              <p className="mb-5 text-sm text-text-muted">{t('onboarding.taskHint')}</p>
              <div className="w-full space-y-3">
                <input
                  type="text"
                  placeholder={t('onboarding.taskPlaceholder')}
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTask(); }}
                  className="w-full rounded-lg border border-border-2 bg-surface-deep px-4 py-2.5 text-sm text-text placeholder-[#4a4d5a] outline-none focus:border-brand-accent transition-colors"
                />
                <div className="rounded-lg border border-accent/20 bg-accent/5 px-4 py-2 text-xs text-accent">
                  {t('onboarding.linkedGoal', { title: goalTitle })}
                </div>
                {error && <div className="text-xs text-danger-bright">{error}</div>}
              </div>
            </div>
          )}

          {/* Step 4: Create sample data */}
          {step === 4 && (
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 text-4xl">🎉</div>
              <h2 className="mb-2 text-xl font-bold text-text">{t('onboarding.almostDone')}</h2>
              <p className="mb-5 text-sm text-text-muted">{t('onboarding.sampleDataDesc')}</p>
              <div className="w-full space-y-2 rounded-xl border border-border-2 bg-surface-deep p-4 text-left">
                <div className="text-sm font-semibold text-text">🎯 {SAMPLE_GOAL_TITLE}</div>
                {SAMPLE_TASKS.map((title) => (
                  <div key={title} className="text-xs text-text-muted pl-6">✓ {title}</div>
                ))}
              </div>
              {error && <div className="mt-2 text-xs text-danger-bright">{error}</div>}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between">
          <button onClick={handleSkip} className="text-xs text-text-muted hover:text-text transition-colors">
            {t('onboarding.skip')}
          </button>

          {step === 1 && (
            <button onClick={() => setStep(2)} className="rounded-lg bg-brand-accent px-6 py-2 text-sm font-bold text-white transition-all hover:bg-brand-accent-hover">
              {t('onboarding.startSetup')}
            </button>
          )}

          {step === 2 && (
            <button
              onClick={handleCreateGoal}
              disabled={!goalTitle.trim() || submitting}
              className="rounded-lg bg-brand-accent px-6 py-2 text-sm font-bold text-white transition-all hover:bg-brand-accent-hover disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? t('onboarding.creating') : t('onboarding.createGoal')}
            </button>
          )}

          {step === 3 && (
            <button
              onClick={handleCreateTask}
              disabled={!taskTitle.trim() || submitting}
              className="rounded-lg bg-brand-accent px-6 py-2 text-sm font-bold text-white transition-all hover:bg-brand-accent-hover disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? t('onboarding.creating') : t('onboarding.finishSetup')}
            </button>
          )}

          {step === 4 && (
            <div className="flex gap-2">
              <button
                onClick={handleFinishEmpty}
                className="rounded-lg border border-border-2 px-4 py-2 text-xs text-text-muted hover:text-text transition-all hover:border-[#4a4d5a]"
              >
                {t('onboarding.skipSampleData')}
              </button>
              <button
                onClick={handleCreateSampleData}
                disabled={creatingSample}
                className="rounded-lg bg-accent px-6 py-2 text-sm font-bold text-bg transition-all hover:bg-accent/80 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {creatingSample ? t('onboarding.creating') : t('onboarding.createSampleData')}
              </button>
            </div>
          )}
        </div>

        {/* Step label */}
        <div className="mt-3 text-center text-[10px] text-text-muted">
          {t('onboarding.stepLabel', { step })}
        </div>
      </div>
    </div>
  );
}
