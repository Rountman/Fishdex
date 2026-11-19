import { MotionConfig } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AreaIndex } from './components/AreaIndex';
import { BackupDialog } from './components/BackupDialog';
import { BreedersView } from './components/BreedersView';
import { CurrentView } from './components/CurrentView';
import { ExportButton } from './components/ExportButton';
import { CARD_HELP_ID } from './components/FishCard';
import { FishDetail } from './components/FishDetail';
import { FishGrid } from './components/FishGrid';
import { Filters } from './components/Filters';
import { ZoneMap } from './components/ZoneMap';
import { Footer } from './components/Footer';
import { ITEM_HELP_ID } from './components/FurnitureCard';
import { FurnitureFilters } from './components/FurnitureFilters';
import { FurnitureIndex } from './components/FurnitureIndex';
import { FurnitureView } from './components/FurnitureView';
import { Masthead } from './components/Masthead';
import { BackupHint, StorageNotice } from './components/Notices';
import { Overview } from './components/Overview';
import { TimersView } from './components/TimersView';
import { Toast, type ToastData } from './components/Toast';
import { AREAS, COLLECTIONS, FISH, FISH_IDS, FURNITURE, FURNITURE_IDS, isBackyard } from './data';
import { useBreeders } from './breeders/useBreeders';
import { isZonedArea } from './data/types';
import { MOBILE, useMediaQuery } from './hooks/useMediaQuery';
import { fishName, itemName } from './i18n/format';
import { I18nProvider } from './i18n/I18n';
import { STRINGS } from './i18n/strings';
import { downloadProgress } from './progress/download';
import { ownedCount, totals, type ImportPreview } from './progress/progress';
import type { ProgressField } from './progress/schema';
import { useProgress } from './progress/useProgress';
import { applyFilters, EMPTY_FILTERS, facets as countFacets, locationPatch, parseFilters, parseSort, serializeFilters, serializeSort, sortFish, type Filters as FilterState, type Sort, type View } from './state/filters';
import {
  applyFurnitureFilters, EMPTY_FURNITURE_FILTERS, furnitureFacets, parseFurnitureFilters, parseFurnitureSort, serializeFurnitureFilters,
  serializeFurnitureSort, sortFurniture, type FurnitureSort,
  type FurnitureFilters as FurnitureFilterState,
} from './state/furnitureFilters';
import { shouldShowHint, usePrefs } from './state/prefs';
import { TABS, type Tab } from './state/tabs';
import { buildIndex } from './state/search';
import type { TimerId } from './timers/timers';
import { useTimers } from './timers/useTimers';
import { DEFAULT_ZONE, fixedOffset, localizeFish, offsetLabel, prefOffset, resolveZone } from './time/zone';
import { readParams, writeParams } from './url';
import styles from './App.module.css';

const INDEX = buildIndex(FISH);
const AREA_IDS = new Set(AREAS.map(a => a.id));
const AREA_NAMES = new Map(AREAS.map(a => [a.id, a.name]));
const FISH_BY_ID = new Map(FISH.map(f => [f.id, f]));
const CURRENT_AREAS = AREAS.filter(a => a.count > 0);
const areaName = (id: string) => AREA_NAMES.get(id) ?? id;
const FINDEX = buildIndex(FURNITURE);
const COLLECTION_IDS = new Set(COLLECTIONS.map(c => c.id));
const PRICES = FURNITURE.flatMap(x => (x.price === null ? [] : [x.price]));
const PRICE_BOUNDS = { min: Math.min(...PRICES), max: Math.max(...PRICES) };
const ITEM_BY_ID = new Map(FURNITURE.map(f => [f.id, f]));
const SET_COUNT = COLLECTIONS.filter(c => c.kind === 'set').length;
const BACKYARD_FISH = FISH.filter(isBackyard);
const BACKYARD_LIST = BACKYARD_FISH.map(f => f.id);
const BACKYARD_IDS: ReadonlySet<string> = new Set(BACKYARD_LIST);
const parseTab = (v: string | null): Tab => ((TABS as readonly string[]).includes(v ?? '') ? v as Tab : 'fish');

export default function App() {
  const [prefs, setPrefs] = usePrefs();
  const { lang } = prefs;
  const t = STRINGS[lang];
  const p = useProgress();
  const mobile = useMediaQuery(MOBILE);
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  const dark = prefs.theme === 'dark' || (prefs.theme === 'auto' && systemDark);

  // catch times in the data are game time (UTC); everything on screen uses the picked zone
  const [openedAt] = useState(Date.now);
  const offset = useMemo(() => prefOffset(prefs.zone, openedAt), [prefs.zone, openedAt]);
  const fixed = fixedOffset(prefs.zone);
  const zoneName = prefs.zone === DEFAULT_ZONE ? t.tzCzechShort
    : fixed !== null ? offsetLabel(fixed) : resolveZone(prefs.zone).split('/').pop()!.replace(/_/g, ' ');
  const fish = useMemo(() => localizeFish(FISH, offset), [offset]);
  const fishById = useMemo(() => new Map(fish.map(f => [f.id, f])), [fish]);

  // ---- URL state ---------------------------------------------------------
  const [filters, setFilters] = useState<FilterState>(() => parseFilters(readParams(), AREA_IDS));
  const [sort, setSort] = useState<Sort>(() => parseSort(readParams()));
  const [tab, setTab] = useState<Tab>(() => parseTab(readParams().get('tab')));
  const [ffilters, setFFilters] = useState<FurnitureFilterState>(() => parseFurnitureFilters(readParams(), COLLECTION_IDS));
  const [fsort, setFSort] = useState<FurnitureSort>(() => parseFurnitureSort(readParams()));
  const [curArea, setCurArea] = useState(() => { const a = readParams().get('carea'); return a && AREA_IDS.has(a) ? a : ''; });
  const [curHide, setCurHide] = useState(() => readParams().get('chide') === '1');
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
      ...serializeFilters(filters), sort: serializeSort(sort), view: view === 'progress' ? 'progress' : null, fish: openId,
      tab: tab === 'fish' ? null : tab, ...serializeFurnitureFilters(ffilters), fsort: serializeFurnitureSort(fsort),
      carea: curArea || null, chide: curHide ? '1' : null,
    });
  }, [filters, sort, view, openId, tab, ffilters, fsort, curArea, curHide]);

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

  // ---- Chovatelé: public register, the only part with a backend
  const { setBred } = p;
  const breeders = useBreeders({
    progress: p.progress, backyard: BACKYARD_IDS, setBred: useCallback((ids: readonly string[]) => setBred(ids, BACKYARD_LIST), [setBred]),
  });
  // Ryby › Backyard › Chovatel: one player's backyard fish (register loaded on demand)
  const { ensureList, entries: breederEntries } = breeders;
  useEffect(() => { if (filters.area === 'backyard') ensureList(); }, [filters.area, ensureList]);
  const breederFish = useMemo(() => {
    if (filters.area !== 'backyard' || filters.breeder === null || !breederEntries) return null;
    return new Set(breederEntries.find(e => e.no === filters.breeder)?.fish ?? []);
  }, [filters.area, filters.breeder, breederEntries]);
  const breederOptions = useMemo(() => (breederEntries
    ? [...breederEntries].sort((a, b) => a.nick.localeCompare(b.nick, lang))
      .map(e => ({ no: e.no, nick: e.nick, count: e.fish.filter(id => BACKYARD_IDS.has(id)).length }))
    : null), [breederEntries, lang]);
  const backyardSorted = useMemo(
    () => [...BACKYARD_FISH].sort((a, b) => fishName(a, lang).localeCompare(fishName(b, lang), lang)), [lang]);

  const timers = useTimers();
  const { set: setTimer } = timers;
  const changeTimer = useCallback((id: TimerId, at: number | null, text: (name: string) => string) => {
    const prev = setTimer(id, at);
    showToast(text(STRINGS[lang].timers[id].name), () => setTimer(id, prev));
  }, [setTimer, showToast, lang]);

  const sum = totals(p.progress, FISH_IDS);
  const visible = useMemo(() => sortFish(applyFilters(fish, filters, p.progress, INDEX, breederFish), sort, lang), [fish, filters, p.progress, sort, lang, breederFish]);
  // counts next to filter options follow the other active filters
  const facets = useMemo(() => countFacets(fish, filters, p.progress, INDEX, breederFish), [fish, filters, p.progress, breederFish]);
  // the overview is the whole journal, no filters
  const overall = useMemo(() => countFacets(FISH, EMPTY_FILTERS, p.progress, INDEX), [p.progress]);

  const fVisible = useMemo(
    () => sortFurniture(applyFurnitureFilters(FURNITURE, ffilters, p.progress, FINDEX), fsort), [ffilters, p.progress, fsort]);
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
  const openFish = openId ? fishById.get(openId) ?? null : null;
  const openBackyard = !!openFish && BACKYARD_IDS.has(openFish.id) && breeders.enabled;
  useEffect(() => { if (openBackyard) ensureList(); }, [openBackyard, ensureList]);
  /** From the register or a fish detail: the journal grid with one player's backyard. */
  const showBreeder = (no: number) => {
    setFilters({ ...EMPTY_FILTERS, area: 'backyard', breeder: no });
    setOpenId(null);
    setView('grid');
    setTab('fish');
    setSheetOpen(false);
    window.scrollTo({ top: 0 });
  };

  return (
    <I18nProvider lang={lang}>
      <MotionConfig reducedMotion="user">
        <a className={styles.skip} href="#ryby">{{ fish: t.skip, current: t.skipCurrent, furniture: t.skipFurniture, timers: t.skipTimers, breeders: t.skipBreeders }[tab]}</a>
        <div className={styles.page} data-view={tab === 'fish' ? view : tab === 'furniture' ? 'grid' : 'wide'}>
          <Masthead
            total={FISH.length} caught={sum.caught} glow={sum.caughtGlowing} dark={dark}
            onLang={l => setPrefs({ lang: l })}
            onTheme={() => setPrefs({ theme: dark ? 'light' : 'dark' })}
            onBackup={() => setBackupOpen(true)}
            tab={tab} onTab={switchTab}
            furniture={{ owned: ownedCount(p.progress, FURNITURE_IDS), total: FURNITURE.length, setsDone, sets: SET_COUNT }}
            zone={prefs.zone} onZone={z => setPrefs({ zone: z })} zoneAt={openedAt}
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
            {tab === 'breeders' ? (
              <BreedersView
                b={breeders} backyard={backyardSorted} onShowBreeder={showBreeder} onToast={text => showToast(text)} mobile={mobile}
              />
            ) : tab === 'current' ? (
              <CurrentView
                fish={FISH} areas={CURRENT_AREAS} progress={p.progress} offset={offset} zoneName={zoneName}
                area={curArea} hideCaught={curHide} onArea={setCurArea} onHideCaught={setCurHide} onOpen={setOpenId}
              />
            ) : tab === 'timers' ? (
              <TimersView
                timers={timers.state}
                onCollect={id => changeTimer(id, Date.now(), t.toastTimerStarted)}
                onEdit={(id, at) => changeTimer(id, at, t.toastTimerEdited)}
                onClear={id => changeTimer(id, null, t.toastTimerCleared)}
              />
            ) : tab === 'furniture' ? (
              <>
                <h2 className="visually-hidden">{t.filters}</h2>
                <FurnitureFilters
                  filters={ffilters} facets={fFacets} collections={COLLECTIONS} shown={fVisible.length} total={FURNITURE.length}
                  mobile={mobile} sheetOpen={sheetOpen} onSheet={setSheetOpen} onChange={changeFFilters}
                  sort={fsort} onSort={setFSort} priceBounds={PRICE_BOUNDS}
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
                  sort={sort} onSort={setSort} breeders={breederOptions}
                  mobile={mobile} sheetOpen={sheetOpen} onSheet={setSheetOpen} onChange={changeFilters}
                />
                {hint && (
                  <BackupHint
                    onExport={() => setBackupOpen(true)}
                    onLater={() => setPrefs({ hintAckAt: sum.caught })}
                    onDismiss={() => setPrefs({ hintDismissed: true })}
                  />
                )}
                {isZonedArea(filters.area) && <ZoneMap key={filters.area} area={filters.area} facets={facets} spot={filters.spot} onSelect={selectArea} />}
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
          areaName={areaName} zoneName={zoneName} onToggle={onToggle} onClose={() => setOpenId(null)}
          breeders={openBackyard ? {
            list: breederEntries ? breederEntries.filter(e => e.fish.includes(openFish!.id)).sort((a, b) => b.fish.length - a.fish.length || a.no - b.no) : null,
            onPick: showBreeder,
          } : undefined}
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
