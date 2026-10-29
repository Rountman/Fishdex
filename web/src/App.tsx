import { MotionConfig } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AreaIndex, type AreaStat } from './components/AreaIndex';
import { BackupDialog } from './components/BackupDialog';
import { CARD_HELP_ID } from './components/FishCard';
import { FishDetail } from './components/FishDetail';
import { FishGrid } from './components/FishGrid';
import { Filters } from './components/Filters';
import { Masthead } from './components/Masthead';
import { BackupHint, StorageNotice } from './components/Notices';
import { Overview } from './components/Overview';
import { Toast, type ToastData } from './components/Toast';
import { AREAS, FISH, FISH_IDS } from './data';
import { MOBILE, useMediaQuery } from './hooks/useMediaQuery';
import { fishName } from './i18n/format';
import { I18nProvider } from './i18n/I18n';
import { STRINGS } from './i18n/strings';
import { totals, type ImportPreview } from './progress/progress';
import type { ProgressField } from './progress/schema';
import { useProgress } from './progress/useProgress';
import { applyFilters, EMPTY_FILTERS, parseFilters, serializeFilters, type Filters as FilterState, type View } from './state/filters';
import { shouldShowHint, usePrefs } from './state/prefs';
import { buildIndex } from './state/search';
import { readParams, writeParams } from './url';
import styles from './App.module.css';

const INDEX = buildIndex(FISH);
const AREA_IDS = new Set(AREAS.map(a => a.id));
const AREA_NAMES = new Map(AREAS.map(a => [a.id, a.name]));
const FISH_BY_ID = new Map(FISH.map(f => [f.id, f]));
const FISH_BY_AREA = new Map(AREAS.map(a => [a.id, FISH.filter(f => f.areas.includes(a.id)).map(f => f.id)]));
const YARD_TOTAL = FISH_BY_AREA.get('backyard')?.length ?? 0;
const areaName = (id: string) => AREA_NAMES.get(id) ?? id;

export default function App() {
  const [prefs, setPrefs] = usePrefs();
  const { lang } = prefs;
  const t = STRINGS[lang];
  const p = useProgress();
  const mobile = useMediaQuery(MOBILE);
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  const dark = prefs.theme === 'dark' || (prefs.theme === 'auto' && systemDark);

  // ---- URL state ---------------------------------------------------------
  const [filters, setFilters] = useState<FilterState>(() => parseFilters(readParams(), AREA_IDS));
  const [view, setView] = useState<View>(() => (readParams().get('view') === 'progress' ? 'progress' : 'grid'));
  const [openId, setOpenId] = useState<string | null>(() => {
    const id = readParams().get('fish');
    return id && FISH_BY_ID.has(id) ? id : null;
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => {
    writeParams({ ...serializeFilters(filters), view: view === 'progress' ? 'progress' : null, fish: openId });
  }, [filters, view, openId]);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => {
    const root = document.documentElement;
    if (prefs.theme === 'auto') delete root.dataset.theme;
    else root.dataset.theme = prefs.theme;
  }, [prefs.theme]);

  const changeFilters = useCallback((patch: Partial<FilterState>) => setFilters(f => ({ ...f, ...patch })), []);

  // ---- progress ----------------------------------------------------------
  const toastId = useRef(0);
  const showToast = useCallback((text: string, undo?: () => void) => setToast({ id: ++toastId.current, text, undo }), []);
  const clearToast = useCallback(() => setToast(null), []);
  const { toggle, restore } = p;
  const onToggle = useCallback((id: string, field: ProgressField) => {
    const prev = toggle(id, field);
    const fish = FISH_BY_ID.get(id)!;
    showToast(STRINGS[lang].toast(fishName(fish, lang), field, !prev[field]), () => restore(id, prev));
  }, [toggle, restore, showToast, lang]);

  const sum = totals(p.progress, FISH_IDS);
  const stats: AreaStat[] = useMemo(() => AREAS.map(a => {
    const ids = FISH_BY_AREA.get(a.id) ?? [];
    const n = (k: 'caught' | 'caughtGlowing' | 'bred') => ids.filter(id => p.progress.fish[id]?.[k]).length;
    return { ...a, caught: n('caught'), glow: n('caughtGlowing'), bred: n('bred') };
  }), [p.progress]);

  const visible = useMemo(() => applyFilters(FISH, filters, p.progress, INDEX), [filters, p.progress]);

  const onImport = (how: 'merge' | 'replace', preview: ImportPreview) => {
    if (how === 'merge') p.importMerge(preview.progress);
    else p.importReplace(preview.progress);
    setPrefs({ hintAckAt: sum.caught });
    showToast(how === 'merge' ? t.merged(preview.count) : t.replaced(preview.count));
  };

  const selectArea = (area: string) => {
    setFilters(f => ({ ...f, area, bred: '' }));
    setView('grid');
    if (view !== 'grid') window.scrollTo({ top: 0 });
  };

  const notice = !p.persistent ? 'off' : p.status.blocked ? 'blocked' : p.status.recovered ? 'recovered' : null;
  const hint = p.persistent && !p.status.blocked && shouldShowHint(sum.caught, prefs);
  const openFish = openId ? FISH_BY_ID.get(openId) ?? null : null;

  return (
    <I18nProvider lang={lang}>
      <MotionConfig reducedMotion="user">
        <div className={styles.page} data-view={view}>
          <Masthead
            total={FISH.length} caught={sum.caught} glow={sum.caughtGlowing} dark={dark}
            overviewOpen={view === 'progress'}
            onOverview={() => setView(v => (v === 'progress' ? 'grid' : 'progress'))}
            onLang={l => setPrefs({ lang: l })}
            onTheme={() => setPrefs({ theme: dark ? 'light' : 'dark' })}
            onBackup={() => setBackupOpen(true)}
          />
          {notice && <StorageNotice kind={notice} onBackup={() => setBackupOpen(true)} />}

          {(view === 'grid' || mobile) && (
            <AreaIndex stats={stats} total={FISH.length} caught={sum.caught} active={filters.area} onSelect={selectArea} />
          )}

          <main className={styles.log}>
            {view === 'progress' ? (
              <Overview
                stats={stats} total={FISH.length} caught={sum.caught} glow={sum.caughtGlowing}
                bred={sum.bred} yardTotal={YARD_TOTAL} onArea={selectArea} onBack={() => setView('grid')}
              />
            ) : (
              <>
                <h2 className="visually-hidden">{t.filters}</h2>
                <Filters
                  filters={filters} areas={AREAS} shown={visible.length} total={FISH.length}
                  mobile={mobile} sheetOpen={sheetOpen} onSheet={setSheetOpen} onChange={changeFilters}
                />
                {hint && (
                  <BackupHint
                    onExport={() => setBackupOpen(true)}
                    onLater={() => setPrefs({ hintAckAt: sum.caught })}
                    onDismiss={() => setPrefs({ hintDismissed: true })}
                  />
                )}
                <FishGrid
                  fish={visible} progress={p.progress} query={filters.q} areaName={areaName}
                  onToggle={onToggle} onOpen={setOpenId} onReset={() => setFilters(EMPTY_FILTERS)}
                />
              </>
            )}
          </main>
        </div>

        <p id={CARD_HELP_ID} className="visually-hidden">{t.cardHelp}</p>
        <FishDetail
          fish={openFish} state={openId ? p.state(openId) : { caught: false, caughtGlowing: false }}
          areaName={areaName} onToggle={onToggle} onClose={() => setOpenId(null)}
        />
        <BackupDialog
          open={backupOpen} progress={p.progress} onClose={() => setBackupOpen(false)}
          onExported={() => setPrefs({ hintAckAt: sum.caught })} onImport={onImport}
        />
        <Toast toast={toast} onDone={clearToast} />
      </MotionConfig>
    </I18nProvider>
  );
}
