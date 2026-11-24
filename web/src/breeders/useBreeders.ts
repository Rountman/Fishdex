// Hráči state: Discord session, my entry, the public register and the auto-sync of "mám za domem"
// and (when the player turned it on) of caught and glowing fish.
// Anonymous visitors never touch the API until they open the tab or a backyard fish detail.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Progress } from '../progress/schema';
import { api, API_URL, ApiError, type Catches, type Entry, type Me, type ModAction, type MyEntry } from './api';
import {
  bredIds, breederCounts, catchesIn, loadMemory, loadSession, planCatches, planSync, readAuthFragment, sameCatches, sameList,
  saveMemory, saveSession, type SyncMemory,
} from './local';

export const SYNC_DELAY = 2000;
const RETRY_DELAY = 30_000;

type Load = 'idle' | 'loading' | 'ok' | 'error';
export type SyncState = 'idle' | 'waiting' | 'sending' | 'error';

/**
 * The login redirect lands with #session=… or #auth_error=…: read it once when the app loads
 * and clean the address bar, so the token never stays in the URL or history.
 */
const AUTH_AT_LOAD = (() => {
  if (!API_URL || typeof window === 'undefined') return null;
  const got = readAuthFragment(window.location.hash);
  if (!got) return null;
  const url = new URL(window.location.href);
  url.hash = '';
  window.history.replaceState(window.history.state, '', url);
  if ('session' in got) saveSession(got.session);
  return got;
})();

type Options = {
  progress: Progress;
  backyard: ReadonlySet<string>;
  /** Every fish the data knows. */
  known: ReadonlySet<string>;
  /** Takes the register's list into the journal (conflict: "use the register"). */
  setBred: (ids: readonly string[]) => void;
  /** Adds the register's catches to the journal, never unchecks (same conflict, catches). */
  addCatches: (caught: readonly string[], glowing: readonly string[]) => void;
};

export function useBreeders({ progress, backyard, known, setBred, addCatches }: Options) {
  const enabled = API_URL !== '';
  const [token, setToken] = useState<string | null>(() => {
    if (!enabled) return null;
    // without localStorage the fresh login still works for this visit
    return loadSession() ?? (AUTH_AT_LOAD && 'session' in AUTH_AT_LOAD ? AUTH_AT_LOAD.session : null);
  });
  const [authError, setAuthError] = useState(() => (AUTH_AT_LOAD && 'error' in AUTH_AT_LOAD ? AUTH_AT_LOAD.error : null));
  const [me, setMe] = useState<Me | null>(null);
  const [meFailed, setMeFailed] = useState(false);
  const [meTick, setMeTick] = useState(0);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [listState, setListState] = useState<Load>('idle');
  /** Token the register was loaded with: admins see hidden entries, so a login reloads it. */
  const [listFor, setListFor] = useState<string | null>(null);
  const [memory, setMemoryState] = useState<SyncMemory | null>(loadMemory);
  const [sending, setSending] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);

  // the latest value for answers that arrive after a later change
  const memoryRef = useRef(memory);
  const setMemory = useCallback((m: SyncMemory | null) => { memoryRef.current = m; setMemoryState(m); saveMemory(m); }, []);
  const rememberedFor = useCallback((owner: string): SyncMemory => (memoryRef.current?.owner === owner ? { ...memoryRef.current } : { owner }), []);

  const signOutLocally = useCallback(() => {
    saveSession(null);
    setToken(null);
    setMe(null);
  }, []);

  // ---- who am I
  useEffect(() => {
    if (!token) return;
    let live = true;
    api.me(token).then(m => { if (live) { setMe(m); setMeFailed(false); } }, (e: unknown) => {
      if (!live) return;
      if (e instanceof ApiError && e.status === 401) signOutLocally();
      else setMeFailed(true);
    });
    return () => { live = false; };
  }, [token, meTick, signOutLocally]);
  const meState: Load = !token ? 'idle' : me ? 'ok' : meFailed ? 'error' : 'loading';

  // ---- the register (loaded on demand)
  const loadList = useCallback(async () => {
    if (!enabled) return;
    setListState('loading');
    setListFor(token);
    try {
      setEntries(await api.list(token));
      setListState('ok');
    } catch {
      setListState('error');
    }
  }, [enabled, token]);
  const ensureList = useCallback(() => {
    if (listState === 'idle' || (listState !== 'loading' && listFor !== token)) void loadList();
  }, [listState, listFor, token, loadList]);

  /** Puts my updated entry into the loaded register without refetching. */
  const upsertMine = useCallback((entry: MyEntry | null, no?: number) => {
    setEntries(list => {
      if (!list) return list;
      const rest = list.filter(e => e.no !== (entry?.no ?? no));
      return entry ? [...rest, entry] : rest;
    });
  }, []);

  // ---- auto-sync of "mám za domem"
  const local = useMemo(() => bredIds(progress, backyard), [progress, backyard]);
  const plan = useMemo(() => planSync(me, memory, local), [me, memory, local]);

  const localCatches = useMemo(() => catchesIn(progress, known), [progress, known]);
  const catchesPlan = useMemo(() => planCatches(me, memory, localCatches), [me, memory, localCatches]);

  /**
   * Takes the server's answer. Only the lists in `sent` are remembered as coming from this browser:
   * remembering the other one would turn its unresolved conflict into a silent overwrite.
   */
  const accept = useCallback((entry: MyEntry, owner: string, sent: { fish?: boolean; catches?: boolean }) => {
    setMe(m => (m ? { ...m, entry } : m));
    const next = rememberedFor(owner);
    if (sent.fish) next.sent = entry.fish;
    if (sent.catches) {
      if (entry.catches) next.catches = entry.catches;
      else delete next.catches;
    }
    setMemory(next);
    upsertMine(entry);
  }, [rememberedFor, setMemory, upsertMine]);

  // a matching register means this browser is in sync from now on (mirrors it to localStorage)
  useEffect(() => {
    if (!me?.entry) return;
    const base: SyncMemory = memory?.owner === me.id ? memory : { owner: me.id };
    const next = { ...base };
    const { fish, catches } = me.entry;
    if (plan.kind === 'synced' && !(base.sent && sameList(base.sent, fish))) next.sent = fish;
    if (catchesPlan.kind === 'synced' && catches && !(base.catches && sameCatches(base.catches, catches))) next.catches = catches;
    // oxlint-disable-next-line react/set-state-in-effect -- keeps the stored copy in step with the server
    if (next.sent !== base.sent || next.catches !== base.catches) setMemory(next);
  }, [plan.kind, catchesPlan.kind, me, memory, setMemory]);

  const sendKey = useMemo(() => {
    const body: { fish?: string[]; catches?: Catches } = {};
    if (plan.kind === 'send') body.fish = plan.fish;
    if (catchesPlan.kind === 'send') body.catches = catchesPlan.catches;
    return body.fish || body.catches ? JSON.stringify(body) : null;
  }, [plan, catchesPlan]);
  useEffect(() => {
    if (sendKey === null || !token || !me) return;
    const body = JSON.parse(sendKey) as { fish?: string[]; catches?: Catches };
    let live = true;
    const timer = window.setTimeout(async () => {
      setSending(true);
      try {
        const entry = await api.put(token, body);
        if (live) { accept(entry, me.id, { fish: !!body.fish, catches: !!body.catches }); setSendFailed(false); }
      } catch (e) {
        if (!live) return;
        if (e instanceof ApiError && e.status === 401) { signOutLocally(); return; }
        setSendFailed(true);
        const wait = e instanceof ApiError && e.status === 429 ? (e.retryAfter ?? 3) * 1000 : RETRY_DELAY;
        window.setTimeout(() => setRetryTick(n => n + 1), wait);
      } finally {
        if (live) setSending(false);
      }
    }, SYNC_DELAY);
    return () => { live = false; window.clearTimeout(timer); };
    // retryTick re-arms the timer after a failure
  }, [sendKey, token, me, retryTick, accept, signOutLocally]);
  const sync: SyncState = sendKey === null ? 'idle' : sendFailed ? 'error' : sending ? 'sending' : 'waiting';

  // ---- actions
  const run = useCallback(async (fn: (token: string) => Promise<void>) => {
    const t = tokenRef.current;
    if (!t) return false;
    setBusy(true);
    setActionError(null);
    try {
      await fn(t);
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) signOutLocally();
      setActionError(e instanceof ApiError ? e.code : 'network');
      return false;
    } finally {
      setBusy(false);
    }
  }, [signOutLocally]);

  const login = useCallback(() => {
    const back = new URL(window.location.href);
    back.hash = '';
    back.search = '?tab=breeders';
    window.location.assign(api.loginUrl(back.toString()));
  }, []);

  const logout = useCallback(() => {
    const t = tokenRef.current;
    if (t) api.logout(t).catch(() => { /* the token expires on its own */ });
    signOutLocally();
    setActionError(null);
  }, [signOutLocally]);

  const publish = useCallback((nick: string, withCatches: boolean) => run(async t => {
    if (!me) return;
    accept(await api.put(t, { nick, fish: local, ...(withCatches ? { catches: localCatches } : {}) }), me.id, { fish: true, catches: withCatches });
  }), [run, me, local, localCatches, accept]);

  /** Turns publishing of caught and glowing fish on, or off (the server deletes them). */
  const shareCatches = useCallback((on: boolean) => run(async t => {
    if (!me) return;
    accept(await api.put(t, { catches: on ? localCatches : null }), me.id, { catches: true });
  }), [run, me, localCatches, accept]);

  const saveNick = useCallback((nick: string) => run(async t => {
    if (!me) return;
    accept(await api.put(t, { nick }), me.id, {});
  }), [run, me, accept]);

  const removeEntry = useCallback(() => run(async t => {
    await api.remove(t);
    const no = me?.entry?.no;
    setMe(m => (m ? { ...m, entry: null } : m));
    setMemory(null);
    upsertMine(null, no);
  }), [run, me, setMemory, upsertMine]);

  const resolveConflict = useCallback((keep: 'local' | 'register') => {
    if (plan.kind !== 'conflict' || !me) return Promise.resolve(false);
    if (keep === 'register') {
      setBred(plan.server);
      setMemory({ ...rememberedFor(me.id), sent: plan.server });
      return Promise.resolve(true);
    }
    return run(async t => { accept(await api.put(t, { fish: plan.local }), me.id, { fish: true }); });
  }, [plan, me, setBred, rememberedFor, setMemory, run, accept]);

  /** 'add' = fill the journal from the register (then both are sent as one list), 'local' = send this journal. */
  const resolveCatches = useCallback((keep: 'add' | 'local') => {
    if (catchesPlan.kind !== 'conflict' || !me) return Promise.resolve(false);
    if (keep === 'add') {
      const { caught, glowing } = catchesPlan.server;
      addCatches(caught, glowing);
      setMemory({ ...rememberedFor(me.id), catches: catchesPlan.server });
      return Promise.resolve(true);
    }
    return run(async t => { accept(await api.put(t, { catches: catchesPlan.local }), me.id, { catches: true }); });
  }, [catchesPlan, me, addCatches, rememberedFor, setMemory, run, accept]);

  const report = useCallback((no: number) => run(async t => { await api.report(t, no); }), [run]);
  const moderate = useCallback((no: number, action: ModAction) => run(async t => {
    await api.moderate(t, no, action);
    await loadList();
  }), [run, loadList]);

  const counts = useMemo(() => (entries ? breederCounts(entries) : null), [entries]);

  return {
    enabled, token, me, meState, entries, listState, counts, local, localCatches, plan, catchesPlan, sync, busy, actionError, authError,
    ensureList, reloadList: loadList,
    retryMe: () => { setMeFailed(false); setMeTick(n => n + 1); },
    login, logout, publish, shareCatches, saveNick, removeEntry, resolveConflict, resolveCatches, report, moderate,
    clearErrors: () => { setActionError(null); setAuthError(null); },
  };
}

export type BreedersApi = ReturnType<typeof useBreeders>;
