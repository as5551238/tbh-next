/**
 * ModulePageStub — Placeholder for modules not yet implemented.
 *
 * @deprecated This component is being phased out in favor of real implementations.
 * W8 decision: Each stub module is classified as either:
 *   - "implement" (core functionality, to be built in W9-W10)
 *   - "deprecated" (low-priority, marked for removal in Phase A)
 * See .temp/w7-retrospective-and-evolution-plan.md W8-T7 for the full disposition.
 */

import { useState } from 'react';
import { useMatrixCell } from '@/hooks/useMatrix';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';

interface ModulePageProps {
  title: string;
  icon: string;
  description: string;
  plannedFor?: string;
}

const VOTES_KEY = 'tbh-module-votes';
const SUGGESTIONS_KEY = 'tbh-module-suggestions';

function getVotes(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(VOTES_KEY) || '{}'); } catch { return {}; }
}
function getSuggestions(): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem(SUGGESTIONS_KEY) || '{}'); } catch { return {}; }
}

export default function ModulePageStub({ title, icon, description, plannedFor }: ModulePageProps) {
  const { cell } = useMatrixCell();
  const [voted, setVoted] = useState(() => {
    const v = getVotes();
    return !!v[title];
  });
  const [voteCount, setVoteCount] = useState(() => {
    const v = getVotes();
    return v[title] || 0;
  });
  const [suggestion, setSuggestion] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>(() => {
    const s = getSuggestions();
    return s[title] || [];
  });
  const [showSuggestionInput, setShowSuggestionInput] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleVote() {
    const v = getVotes();
    if (voted) {
      // Unvote
      const newCount = Math.max(0, (v[title] || 0) - 1);
      if (newCount === 0) delete v[title]; else v[title] = newCount;
      setVoted(false);
      setVoteCount(newCount);
    } else {
      // Vote
      v[title] = (v[title] || 0) + 1;
      setVoted(true);
      setVoteCount(v[title]);
    }
    localStorage.setItem(VOTES_KEY, JSON.stringify(v));
  }

  function handleSuggest() {
    if (!suggestion.trim()) return;
    const s = getSuggestions();
    const list = s[title] || [];
    list.push(suggestion.trim());
    s[title] = list;
    localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(s));
    setSuggestions(list);
    setSuggestion('');
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2000);
  }

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="text-center max-w-lg">
        <div className="text-5xl mb-3">{icon}</div>
        <h2 className="text-lg font-bold text-text mb-2">{title}</h2>
        <p className="text-sm text-text-3 mb-4">{description}</p>

        {/* Industry context */}
        <div className="rounded-xl border border-border bg-surface p-3 md:p-4 text-left">
          <div className="text-[10px] font-bold uppercase tracking-wider text-text-3 mb-2">{t('moduleStub.industryContext')}</div>
          <div className="flex flex-wrap gap-1.5">
            {cell.kpis.slice(0, 3).map((kpi) => (
              <span key={kpi.name} className="rounded-full bg-surface-2 px-2.5 py-1 text-[10px] text-text-2">
                {kpi.name}: {kpi.value}
              </span>
            ))}
          </div>
        </div>

        {/* Progress indicator */}
        {plannedFor && (
          <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-2.5">
            <div className="flex items-center gap-2 justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-primary-2">{t('moduleStub.plannedFor', { plannedFor })}</span>
            </div>
          </div>
        )}

        {/* Vote & suggest */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={handleVote}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-all',
              voted
                ? 'border-primary bg-primary/10 text-primary-2'
                : 'border-border bg-surface text-text-3 hover:border-primary/50 hover:text-text-2'
            )}
          >
            <span>{voted ? '👍' : '🗳️'}</span>
            <span>{voted ? t('moduleStub.voted') : t('moduleStub.votePriority')}</span>
            {voteCount > 0 && <span className="text-text-3">({voteCount})</span>}
          </button>
          <button
            onClick={() => setShowSuggestionInput((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-text-3 hover:border-primary/50 hover:text-text-2 transition-all"
          >
            <span>💡</span>
            <span>{t('moduleStub.suggestFeature')}</span>
          </button>
        </div>

        {/* Suggestion input */}
        {showSuggestionInput && (
          <div className="mt-3 flex items-center gap-2">
            <input
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSuggest()}
              placeholder={t('moduleStub.suggestPlaceholder')}
              className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs text-text placeholder:text-text-3/50 focus:outline-none focus:border-primary/50"
            />
            <button
              onClick={handleSuggest}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors"
            >
              {t('moduleStub.submit')}
            </button>
          </div>
        )}
        {submitted && (
          <p className="mt-1.5 text-[11px] text-accent">{t('moduleStub.thanks')}</p>
        )}

        {/* Recent suggestions */}
        {suggestions.length > 0 && (
          <div className="mt-3 text-left">
            <div className="text-[10px] text-text-3 mb-1">{t('moduleStub.communitySuggestions')}</div>
            <div className="flex flex-wrap gap-1">
              {suggestions.slice(-3).map((s, i) => (
                <span key={i} className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-text-2">
                  {s.length > 30 ? s.slice(0, 30) + '...' : s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
