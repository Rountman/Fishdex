import { MotionConfig } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AreaIndex } from './components/AreaIndex';
import { BackupDialog } from './components/BackupDialog';
import { ExportButton } from './components/ExportButton';
import { CARD_HELP_ID } from './components/FishCard';
import { FishDetail } from './components/FishDetail';
import { FishGrid } from './components/FishGrid';
import { Filters } from './components/Filters';
import { Footer } from './components/Footer';
import { ITEM_HELP_ID } from './components/FurnitureCard';
import { FurnitureFilters } from './components/FurnitureFilters';
import { FurnitureIndex } from './components/FurnitureIndex';
import { FurnitureView } from './components/FurnitureView';
import { Masthead, type Tab } from './components/Masthead';
import { BackupHint, StorageNotice } from './components/Notices';
import { Overview } from './components/Overview';
import { Toast, type ToastData } from './components/Toast';
import { AREAS, COLLECTIONS, FISH, FISH_IDS, FURNITURE, FURNITURE_IDS } from './data';
import { MOBILE, useMediaQuery } from './hooks/useMediaQuery';
import { fishName, itemName } from './i18n/format';
import { I18nProvider } from './i18n/I18n';
import { STRINGS } from './i18n/strings';
import { downloadProgress } from './progress/download';
import { ownedCount, totals, type ImportPreview } from './progress/progress';
import type { ProgressField } from './progress/schema';
import { useProgress } from './progress/useProgress';
import { applyFilters, EMPTY_FILTERS, facets as countFacets, locationPatch, parseFilters, serializeFilters, type Filters as FilterState, type View } from './state/filters';
import {
  applyFurnitureFilters, EMPTY_FURNITURE_FILTERS, furnitureFacets, parseFurnitureFilters, serializeFurnitureFilters,
  type FurnitureFilters as FurnitureFilterState,
} from './state/furnitureFilters';
import { shouldShowHint, usePrefs } from './state/prefs';
import { buildIndex } from './state/search';
import { readParams, writeParams } from './url';
import styles from './App.module.css';

const INDEX = buildIndex(FISH);
const AREA_IDS = new Set(AREAS.map(a => a.id));
const AREA_NAMES = new Map(AREAS.map(a => [a.id, a.name]));
const FISH_BY_ID = new Map(FISH.map(f => [f.id, f]));
const areaName = (id: string) => AREA_NAMES.get(id) ?? id;
const FINDEX = buildIndex(FURNITURE);
const COLLECTION_IDS = new Set(COLLECTIONS.map(c => c.id));
const ITEM_BY_ID = new Map(FURNITURE.map(f => [f.id, f]));
const SET_COUNT = COLLECTIONS.filter(c => c.kind === 'set').length;

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
  const [tab, setTab] = useState<Tab>(() => (readParams().get('tab') === 'furniture' ? 'furniture' : 'fish'));
  const [ffilters, setFFilters] = useState<FurnitureFilterState>(() => parseFurnitureFilters(readParams(), COLLECTION_IDS));
  const [view, setView] = useState<View>(() => (readParams().get('view') === 'progress' ? 'progress' : 'grid'));
  const [openId, setOpenId] = useState<string | null>(() => {
    const id = readParams().get('fish');
    return id && FISH_BY_ID.has(id) ? id : null;
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => {
    writeParams({
      ...serializeFilters(filters), view: view === 'progress' ? 'progress' : null, fish: openId,
      tab: tab === 'furniture' ? 'furniture' : null, ...serializeFurnitureFilters(ffilters),
    });
  }, [filters, view, openId, tab, ffilters]);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => {
    const root = document.documentElement;
    if (prefs.theme === 'auto') delete root.dataset.theme;
    else root.dataset.theme = prefs.theme;
  }, [prefs.theme]);

  const changeFilters = useCallback((patch: Partial<FilterState>) => setFilters(f => ({ ...f, ...patch })), []);
  const changeFFilters = useCallback((patch: Partial<FurnitureFilterState>) => setFFilters(f => ({ ...f, ...patch })), []);

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
  const { toggleItem, restoreItem } = p;
  const onToggleItem = useCallback((id: string) => {
    const prev = toggleItem(id);
    showToast(STRINGS[lang].toastOwned(itemName(ITEM_BY_ID.get(id)!, lang), !prev.owned), () => restoreItem(id, prev));
  }, [toggleItem, restoreItem, showToast, lang]);

  const sum = totals(p.progress, FISH_IDS);
  const visible = useMemo(() => applyFilters(FISH, filters, p.progress, INDEX), [filters, p.progress]);
  // counts next to filter options follow the other active filters
  const facets = useMemo(() => countFacets(FISH, filters, p.progress, INDEX), [filters, p.progress]);
  // the overview is the whole journal, no filters
  const overall = useMemo(() => countFacets(FISH, EMPTY_FILTERS, p.progress, INDEX), [p.progress]);

  const fVisible = useMemo(() => applyFurnitureFilters(FURNITURE, ffilters, p.progress, FINDEX), [ffilters, p.progress]);
  const fFacets = useMemo(() => furnitureFacets(FURNITURE, ffilters, p.progress, FINDEX), [ffilters, p.progress]);
  // section headers and the masthead show whole collections, not the filtered view
  const fOverall = useMemo(() => furnitureFacets(FURNITURE, EMPTY_FURNITURE_FILTERS, p.progress, FINDEX), [p.progress]);
  const setsDone = COLLECTIONS.filter(c => {
    const s = c.kind === 'set' && fOverall.collections.get(c.id);
    return s && s.owned === s.total;
  }).length;

  const onImport = (how: 'merge' | 'replace', preview: ImportPreview) => {
    if (how === 'merge') p.importMerge(preview.progress);
    else p.importReplace(preview.progress);
    setPrefs({ hintAckAt: sum.caught });
    showToast(how === 'merge' ? t.merged(preview.count) : t.replaced(preview.count));
  };

  const onQuickExport = () => {
    const file = downloadProgress(p.progress);
    setPrefs({ hintAckAt: sum.caught });
    showToast(t.exported(file));
  };

  /** '' = all, an area id, or '<area>:<Spot>' (sets the area too). */
  const selectArea = (value: string) => {
    setFilters(f => ({ ...f, ...locationPatch(value) }));
    setView('grid');
    if (view !== 'grid') window.scrollTo({ top: 0 });
  };

  const switchTab = (next: Tab) => {
    if (next === tab) return;
    setTab(next);
    setView('grid');
    setSheetOpen(false);
    window.scrollTo({ top: 0 });
  };
  const selectCollection = (id: string) => {
    changeFFilters({ collection: id });
    window.scrollTo({ top: 0 });
  };

  const notice = !p.persistent ? 'off' : p.status.blocked ? 'blocked' : p.status.recovered ? 'recovered' : null;
  const hint = p.persistent && !p.status.blocked && shouldShowHint(sum.caught, prefs);
  const openFish = openId ? FISH_BY_ID.get(openId) ?? null : null;

  return (
    <I18nProvider lang={lang}>
      <MotionConfig reducedMotion="user">
        <a className={styles.skip} href="#ryby">{tab === 'fish' ? t.skip : t.skipFurniture}</a>
        <div className={styles.page} data-view={tab === 'fish' ? view : 'grid'}>
          <Masthead
            total={FISH.length} caught={sum.caught} glow={sum.caughtGlowing} dark={dark}
            overviewOpen={view === 'progress'}
            onOverview={() => setView(v => (v === 'progress' ? 'grid' : 'progress'))}
            onLang={l => setPrefs({ lang: l })}
            onTheme={() => setPrefs({ theme: dark ? 'light' : 'dark' })}
            onBackup={() => setBackupOpen(true)}
            tab={tab} onTab={switchTab}
            furniture={{ owned: ownedCount(p.progress, FURNITURE_IDS), total: FURNITURE.length, setsDone, sets: SET_COUNT }}
          />
          {notice && <StorageNotice kind={notice} onBackup={() => setBackupOpen(true)} />}

          {tab === 'furniture' && (
            <FurnitureIndex collections={COLLECTIONS} facets={fFacets} selected={ffilters.collection} onSelect={selectCollection} />
          )}
          {tab === 'fish' && (view === 'grid' || mobile) && (
            <AreaIndex areas={AREAS} facets={facets} area={filters.area} spot={filters.spot} onSelect={selectArea} />
          )}

          <main className={styles.log} id="ryby" tabIndex={-1}>
            <p id={CARD_HELP_ID} className="visually-hidden">{t.cardHelp}</p>
            <p id={ITEM_HELP_ID} className="visually-hidden">{t.itemHelp}</p>
            {tab === 'furniture' ? (
              <>
                <h2 className="visually-hidden">{t.filters}</h2>
                <FurnitureFilters
                  filters={ffilters} facets={fFacets} collections={COLLECTIONS} shown={fVisible.length} total={FURNITURE.length}
                  mobile={mobile} sheetOpen={sheetOpen} onSheet={setSheetOpen} onChange={changeFFilters}
                />
                <FurnitureView
                  collections={COLLECTIONS} items={fVisible} all={FURNITURE} totals={fOverall.collections} progress={p.progress}
                  query={ffilters.q} onToggle={onToggleItem} onReset={() => setFFilters(EMPTY_FURNITURE_FILTERS)}
                />
                <p className={styles.source}>{t.fSource}</p>
              </>
            ) : view === 'progress' ? (
              <Overview
                areas={AREAS} facets={overall} onArea={selectArea} onBack={() => setView('grid')}
              />
            ) : (
              <>
                <h2 className="visually-hidden">{t.filters}</h2>
                <Filters
                  filters={filters} facets={facets} areas={AREAS} shown={visible.length} total={FISH.length}
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
          <Footer />
        </div>
        <ExportButton onExport={onQuickExport} />

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
