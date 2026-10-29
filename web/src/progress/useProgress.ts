import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { fishState, merge, replace, restore, toggle } from './progress';
import type { FishProgress, Progress, ProgressField } from './schema';
import { createProgressStore, type LoadResult, type ProgressStore } from './storage';

export type ProgressApi = {
  progress: Progress;
  /** false = localStorage unavailable, progress lives only in this tab. */
  persistent: boolean;
  status: Omit<LoadResult, 'progress'>;
  state: (id: string) => FishProgress;
  toggle: (id: string, field: ProgressField) => FishProgress;
  restore: (id: string, prev: FishProgress) => void;
  importMerge: (incoming: Progress) => void;
  importReplace: (incoming: Progress) => void;
};

export function useProgress(store?: ProgressStore): ProgressApi {
  const [backend] = useState(() => store ?? createProgressStore());
  const [initial] = useState(() => backend.load());
  const [progress, setProgress] = useState(initial.progress);
  const latest = useRef(progress);
  useLayoutEffect(() => { latest.current = progress; }, [progress]);

  useEffect(() => {
    // only write real changes: never overwrite storage with what was just read
    if (progress !== initial.progress) backend.save(progress);
  }, [progress, initial, backend]);

  /** Returns the state before the toggle, for undo. */
  const toggleFish = useCallback((id: string, field: ProgressField) => {
    const prev = fishState(latest.current, id);
    setProgress(p => toggle(p, id, field));
    return prev;
  }, []);

  return useMemo(() => ({
    progress,
    persistent: backend.available,
    status: { recovered: initial.recovered, blocked: initial.blocked, migratedFrom: initial.migratedFrom },
    state: (id: string) => fishState(progress, id),
    toggle: toggleFish,
    restore: (id: string, prev: FishProgress) => setProgress(p => restore(p, id, prev)),
    importMerge: (incoming: Progress) => setProgress(p => merge(p, incoming)),
    importReplace: (incoming: Progress) => setProgress(() => replace(incoming)),
  }), [progress, toggleFish, initial, backend]);
}
