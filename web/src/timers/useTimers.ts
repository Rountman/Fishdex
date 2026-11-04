import { useCallback, useEffect, useRef, useState } from 'react';
import { browserStorage } from '../progress/storage';
import { parseTimers, serializeTimers, TIMERS_KEY, type TimerId, type TimerState } from './timers';

function load() {
  try {
    return parseTimers(browserStorage()?.getItem(TIMERS_KEY));
  } catch {
    return parseTimers(null);
  }
}

export function useTimers() {
  const [state, setState] = useState<TimerState>(() => load().state);
  const latest = useRef(state);

  const apply = useCallback((next: TimerState) => {
    latest.current = next;
    setState(next);
  }, []);

  /** Sets (or with null clears) a timer and returns the previous value for undo. */
  const set = useCallback((id: TimerId, at: number | null | undefined) => {
    const prev = latest.current[id];
    const next = { ...latest.current };
    if (at == null) delete next[id];
    else next[id] = at;
    apply(next);
    try {
      if (!load().locked) browserStorage()?.setItem(TIMERS_KEY, serializeTimers(next));
    } catch { /* still works for this visit; the storage notice covers it */ }
    return prev;
  }, [apply]);

  // another open tab collected something
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === TIMERS_KEY) apply(load().state); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [apply]);

  return { state, set };
}
