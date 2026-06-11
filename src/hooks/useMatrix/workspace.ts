/**
 * Workspace hooks — re-exported from individual files.
 *
 * Previously a single 431-line file; split into 14 independent hook files
 * for better maintainability and testability.
 */

export { useGoals } from './workspace/useGoals';
export { useTasks } from './workspace/useTasks';
export { useProjects } from './workspace/useProjects';
export { useKnowledgeDocs } from './workspace/useKnowledgeDocs';
export { useInsights } from './workspace/useInsights';
export { useWorkflowInstances } from './workspace/useWorkflowInstances';
export { useScheduleEvents } from './workspace/useScheduleEvents';
export { useDocs } from './workspace/useDocs';
export { useExperiences } from './workspace/useExperiences';
export { usePredictions } from './workspace/usePredictions';
export { useNotes } from './workspace/useNotes';
export { useSprints } from './workspace/useSprints';
export { useTemplates } from './workspace/useTemplates';
export { useBookmarks } from './workspace/useBookmarks';
