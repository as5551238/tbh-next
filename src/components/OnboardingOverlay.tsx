import { useState, useEffect } from 'react';
import { INDUSTRIES, getDepartments } from '@/matrix/data';
import { useAppStore } from '@/stores/appStore';

const OVERLAY_KEY = 'tbh-onboarded-overlay';
const STEPS = ['welcome', 'industry', 'department', 'done'] as const;
type Step = (typeof STEPS)[number];

const STEP_LABELS: Record<Step, string> = {
  welcome: '欢迎',
  industry: '行业',
  department: '部门',
  done: '开始',
};

export default function OnboardingOverlay() {
  const [step, setStep] = useState<Step>('welcome');
  const [industry, setIndustry] = useState('');
  const [dept, setDept] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function checkVisibility() {
      setVisible(!localStorage.getItem(OVERLAY_KEY));
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

  const idx = STEPS.indexOf(step);

  function handleNext() {
    if (step === 'welcome') setStep('industry');
    else if (step === 'industry' && industry) setStep('department');
    else if (step === 'department' && dept) setStep('done');
  }

  function handleBack() {
    if (step === 'industry') setStep('welcome');
    else if (step === 'department') setStep('industry');
  }

  function handleFinish() {
    localStorage.setItem(OVERLAY_KEY, 'done');
    setVisible(false);
    const store = useAppStore.getState();
    store.setContext(industry, dept);
    store.navigateTo('workspace', 'overview');
    // Notify OnboardingFlow to appear
    window.dispatchEvent(new CustomEvent('tbh-overlay-done'));
  }

  const departments = industry ? getDepartments(industry) : [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        {/* Step indicators */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all duration-300 ${
                i < idx ? 'w-6 bg-accent' : i === idx ? 'w-8 bg-brand-accent' : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="min-h-[200px] flex flex-col items-center justify-center text-center">
          {step === 'welcome' && (
            <>
              <div className="mb-4 text-4xl">🚀</div>
              <h2 className="mb-2 text-xl font-bold text-text">欢迎来到团队业务中台</h2>
              <p className="text-sm text-text-2">AI驱动的团队管理平台</p>
            </>
          )}

          {step === 'industry' && (
            <>
              <h2 className="mb-4 text-lg font-bold text-text">选择你的行业</h2>
              <div className="grid w-full grid-cols-2 gap-2">
                {INDUSTRIES.map((ind) => (
                  <button
                    key={ind}
                    onClick={() => setIndustry(ind)}
                    className={`rounded-lg border px-3 py-2.5 text-xs font-medium transition-all ${
                      industry === ind
                        ? 'border-brand-accent bg-brand-accent/20 text-brand-accent'
                        : 'border-border bg-surface text-text-2 hover:border-border-2'
                    }`}
                  >
                    {ind}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'department' && (
            <>
              <h2 className="mb-4 text-lg font-bold text-text">选择你的部门</h2>
              <div className="grid w-full grid-cols-2 gap-2">
                {departments.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDept(d)}
                    className={`rounded-lg border px-3 py-2.5 text-xs font-medium transition-all ${
                      dept === d
                        ? 'border-brand-accent bg-brand-accent/20 text-brand-accent'
                        : 'border-border bg-surface text-text-2 hover:border-border-2'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'done' && (
            <>
              <div className="mb-4 text-4xl">🎉</div>
              <h2 className="mb-2 text-lg font-bold text-text">一切就绪！</h2>
              <p className="text-sm text-text-2">
                {industry} · {dept}
              </p>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between">
          {step !== 'welcome' ? (
            <button onClick={handleBack} className="text-xs text-text-3 hover:text-text transition-colors">
              ← 上一步
            </button>
          ) : (
            <div />
          )}

          {step === 'done' ? (
            <button onClick={handleFinish} className="rounded-lg bg-brand-accent px-6 py-2 text-sm font-bold text-white transition-all hover:bg-brand-accent-hover">
              开始使用
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={
                (step === 'industry' && !industry) ||
                (step === 'department' && !dept)
              }
              className="rounded-lg bg-brand-accent px-6 py-2 text-sm font-bold text-white transition-all hover:bg-brand-accent-hover disabled:opacity-40 disabled:cursor-not-allowed"
            >
              下一步
            </button>
          )}
        </div>

        {/* Step label */}
        <div className="mt-3 text-center text-[10px] text-text-3">
          {STEP_LABELS[step]} · 第 {idx + 1}/{STEPS.length} 步
        </div>
      </div>
    </div>
  );
}
