import { useEffect, useId, useState } from 'react';
import { api, ApiError, type Catches, type Entry } from '../breeders/api';
import { standings, WHATS, type AreaScore, type Score, type Split, type What } from '../breeders/compare';
import type { BreedersApi } from '../breeders/useBreeders';
import { fishImage } from '../data';
import type { Fish } from '../data/types';
import { useI18n } from '../i18n/context';
import { fishName, spotLabel } from '../i18n/format';
import { Avatar } from './BreedersView';
import { Stars } from './Stars';
import styles from './CompareView.module.css';

type Compared = { split: Split; all: Split; areas: AreaScore[] };
type Props = {
  /** Entry number of the other player. */
  no: number;
  b: BreedersApi;
  compare: (bred: readonly string[], catches: Catches | null, what: What, place: string) => Compared;
  /** null = not picked yet: whatever the player publishes. */
  what: What | null;
  /** '' = all areas, an area id, or '<area>:<Spot>'. */
  place: string;
  areaName: (id: string) => string;
  mobile: boolean;
  onWhat: (what: What) => void;
  onPlace: (place: string) => void;
  onBack: () => void;
  onOpen: (id: string) => void;
};
type Part = keyof Split;

/** First tiles of a list; the rest after "Ukázat všech". */
const LIMIT = 12;

export function CompareView({ no, b, onBack, ...rest }: Props) {
  const { t } = useI18n();
  const { ensureList } = b;
  useEffect(() => { ensureList(); }, [ensureList]);
  const entry = b.entries?.find(e => e.no === no) ?? null;
  const back = <button type="button" className={`link ${styles.back}`} onClick={onBack}>{t.cmp.back}</button>;

  if (b.me?.entry?.no === no) return <>{back}<p className={styles.note}>{t.cmp.self}</p></>;
  if (entry) return <>{back}<Duel key={entry.no} entry={entry} token={b.token} myAvatar={b.me?.avatar ?? null} {...rest} /></>;
  return (
    <>
      {back}
      {b.listState === 'error' ? (
        <p className={styles.note}>{t.br.loadError} <button type="button" className="link" onClick={() => void b.reloadList()}>{t.br.retry}</button></p>
      ) : <p className={styles.note}>{b.listState === 'ok' ? t.cmp.missing : t.br.loading}</p>}
    </>
  );
}

/** The player's catches, fetched when they publish them; `null` while there is nothing to show. */
function useCatches(entry: Entry, token: string | null) {
  const published = !!entry.counts;
  const [loaded, setLoaded] = useState<Catches | null>(null);
  const [failed, setFailed] = useState(false);
  /** They stopped publishing since the register was loaded. */
  const [gone, setGone] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!published) return;
    let live = true;
    api.catches(entry.no, token).then(
      c => { if (live) { setLoaded(c); setFailed(false); } },
      (e: unknown) => {
        if (!live) return;
        if (e instanceof ApiError && e.status === 404) setGone(true);
        else setFailed(true);
      });
    return () => { live = false; };
  }, [published, entry.no, token, tick]);
  return {
    published: published && !gone, catches: gone ? null : loaded, failed,
    retry: () => { setFailed(false); setTick(n => n + 1); },
  };
}

function Duel({ entry, token, myAvatar, compare, what: picked, place, areaName, mobile, onWhat, onPlace, onOpen }:
  Omit<Props, 'no' | 'b' | 'onBack'> & { entry: Entry; token: string | null; myAvatar: string | null }) {
  const { t } = useI18n();
  const { published, catches, failed, retry } = useCatches(entry, token);
  const what = picked ?? (published ? 'caught' : 'bred');
  const bred = what === 'bred';
  const locked = !bred && !published;
  const ready = bred || catches !== null;

  const c = compare(entry.fish, catches, what, bred ? '' : place);
  const s = c.split;
  const me = s.mine.length + s.both.length, them = s.theirs.length + s.both.length;
  const diff = me - them;

  return (
    <div className={styles.compare}>
      <header className={styles.duel}>
        <div className={styles.side}>
          <Avatar src={myAvatar} nick={t.cmp.you} big />
          <div><span className={styles.who}>{t.cmp.you}</span><b className={styles.score}>{me}</b></div>
        </div>
        <div className={styles.mid}>
          <span className={styles.versus}>{t.cmp.versus}</span>
          {ready && <span className={styles.lead}>{diff === 0 ? t.cmp.even : diff > 0 ? t.cmp.ahead(diff) : t.cmp.behind(-diff)}</span>}
        </div>
        <div className={`${styles.side} ${styles.right}`}>
          <div><h2 className={styles.who}>{entry.nick}</h2><b className={styles.score}>{ready ? them : '?'}</b></div>
          <Avatar src={entry.avatar} nick={entry.nick} big />
        </div>
      </header>

      <div className={styles.seg} role="group" aria-label={t.cmp.whatLabel}>
        {WHATS.map(w => <button key={w} type="button" aria-pressed={what === w} onClick={() => onWhat(w)}>{t.cmp.what[w]}</button>)}
      </div>

      {locked ? (
        <p className={styles.note}>{t.cmp.private(entry.nick)} <button type="button" className="link" onClick={() => onWhat('bred')}>{t.cmp.comparePrivate}</button></p>
      ) : failed && !ready ? (
        <p className={styles.note} role="alert">{t.cmp.error} <button type="button" className="link" onClick={retry}>{t.br.retry}</button></p>
      ) : !ready ? (
        <p className={styles.note}>{t.cmp.loading}</p>
      ) : (
        <Result c={c} nick={entry.nick} bred={bred} place={bred ? '' : place} areaName={areaName} mobile={mobile} onPlace={onPlace} onOpen={onOpen} />
      )}
    </div>
  );
}

function Result({ c, nick, bred, place, areaName, mobile, onPlace, onOpen }: {
  c: Compared; nick: string; bred: boolean; place: string; areaName: (id: string) => string; mobile: boolean;
  onPlace: (place: string) => void; onOpen: (id: string) => void;
}) {
  const { t } = useI18n();
  const [page, setPage] = useState<Part>('theirs');
  const s = c.split;
  const head = t.cmp.head[bred ? 'bred' : 'caught'];
  const title: Record<Part, string> = { mine: head.mine, theirs: head.theirs(nick), both: head.both, none: head.none };
  const legend: Record<Part, string> = { ...t.cmp.legend, theirs: t.cmp.legend.theirs(nick) };
  const pick: Record<Part, string> = { ...t.cmp.pick, theirs: t.cmp.pick.theirs(nick) };
  const all = { key: '', me: c.all.mine.length + c.all.both.length, them: c.all.theirs.length + c.all.both.length, total: 0 };
  all.total = all.me + c.all.theirs.length + c.all.none.length;
  // a new place starts with short lists again
  const tiles = (part: Part) => <Tiles key={`${part} ${place}`} fish={s[part]} part={part} areaName={areaName} onOpen={onOpen} />;

  const index = !bred && (
    <AreaScores all={all} areas={c.areas} nick={nick} place={place} mobile={mobile} onPlace={onPlace} />
  );
  return (
    <>
      <div className={styles.tugbar} aria-hidden="true">
        {(['mine', 'both', 'theirs', 'none'] as const).map(p => s[p].length > 0 && <i key={p} data-part={p} style={{ flexGrow: s[p].length }} />)}
      </div>
      {!mobile && (
        <ul className={styles.legend}>
          {(['mine', 'both', 'theirs', 'none'] as const).map(p => <li key={p}><i data-part={p} aria-hidden="true" /><b>{s[p].length}</b> {legend[p]}</li>)}
        </ul>
      )}
      {all.me === 0 && <p className={styles.note}>{t.cmp.myEmpty}</p>}
      <div className={styles.spread} data-wide={bred || undefined}>
        {index}
        {mobile ? (
          <div>
            <div className={styles.pick} role="group" aria-label={t.cmp.pickLabel}>
              {(['theirs', 'mine', 'both', 'none'] as const).map(p => (
                <button key={p} type="button" aria-pressed={page === p} onClick={() => setPage(p)}>
                  <i data-part={p} aria-hidden="true" /><span>{pick[p]}</span><b>{s[p].length}</b>
                </button>
              ))}
            </div>
            <section className={styles.leaf} data-part={page}>
              <h3>{title[page]} <span>{s[page].length}</span></h3>
              {tiles(page)}
            </section>
          </div>
        ) : (
          <div>
            <div className={styles.book}>
              {(['mine', 'theirs'] as const).map(p => (
                <section key={p} className={styles.leaf} data-part={p}>
                  <h3>{title[p]} <span>{s[p].length}</span></h3>
                  {tiles(p)}
                </section>
              ))}
            </div>
            {(['both', 'none'] as const).map(p => (
              <details key={p} className={styles.fold}>
                <summary>{title[p]} <span>{s[p].length}</span></summary>
                {tiles(p)}
              </details>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ---- every area and its spots ------------------------------------------------------
function AreaScores({ all, areas, nick, place, mobile, onPlace }: {
  all: Score; areas: AreaScore[]; nick: string; place: string; mobile: boolean; onPlace: (place: string) => void;
}) {
  const { lang, t } = useI18n();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const st = standings(areas);
  const sum = t.cmp.standings(st.won, nick, st.lost, st.tied);
  const row = (s: Score, label: string, sub = false) => (
    <button type="button" className={sub ? styles.sub : undefined} aria-pressed={place === s.key} aria-label={t.cmp.areaAria(label, s.me, nick, s.them)}
      onClick={() => { onPlace(s.key); setOpen(false); }}>
      <span className={styles.areaName}>{label}</span>
      <span className={styles.areaScore}>
        {s.me > s.them ? <b>{s.me}</b> : s.me} : {s.them > s.me ? <b>{s.them}</b> : s.them}
      </span>
      <span className={styles.pull} aria-hidden="true">
        <i data-part="mine" style={{ width: `${s.total ? s.me / s.total * 50 : 0}%` }} />
        <i data-part="theirs" style={{ width: `${s.total ? s.them / s.total * 50 : 0}%` }} />
      </span>
    </button>
  );
  const list = (
    <ul className={styles.areaList}>
      <li>{row(all, t.allAreas)}</li>
      {(['area', 'tournament', 'backyard'] as const).map(kind => {
        const group = areas.filter(a => a.area.kind === kind);
        return group.length > 0 && (
          <li key={kind}>
            <h4>{t.kinds[kind]}</h4>
            <ul>
              {group.map(a => (
                <li key={a.key}>
                  {row(a, a.area.name)}
                  {a.spots.length > 0 && (
                    <ul className={styles.spots}>{a.spots.map(sp => <li key={sp.key}>{row(sp, spotLabel(sp.spot, lang).text, true)}</li>)}</ul>
                  )}
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
  if (!mobile) {
    return (
      <nav className={styles.index} aria-labelledby={titleId}>
        <h3 id={titleId}>{t.cmp.areas}</h3>
        <p className={styles.fine}>{sum}</p>
        {list}
      </nav>
    );
  }
  const picked = areas.flatMap(a => [{ s: a as Score, l: a.area.name }, ...a.spots.map(sp => ({ s: sp as Score, l: `${a.area.name} › ${spotLabel(sp.spot, lang).text}` }))])
    .find(x => x.s.key === place);
  return (
    <nav className={styles.index} aria-label={t.cmp.areas}>
      <button type="button" className={styles.areaToggle} aria-expanded={open} aria-controls={titleId} onClick={() => setOpen(!open)}>
        <span><b>{picked ? `${picked.l} · ${picked.s.me} : ${picked.s.them}` : t.cmp.areas}</b><small>{sum}</small></span>
        <span className={styles.arrow} data-open={open || undefined} aria-hidden="true">▾</span>
      </button>
      <div id={titleId} hidden={!open}>{open && list}</div>
    </nav>
  );
}

// ---- fish -------------------------------------------------------------------------
function Tiles({ fish, part, areaName, onOpen }: { fish: Fish[]; part: Part; areaName: (id: string) => string; onOpen: (id: string) => void }) {
  const { lang, t } = useI18n();
  const [all, setAll] = useState(false);
  if (!fish.length) return <p className={styles.note}>{part === 'mine' ? t.cmp.emptyMine : part === 'theirs' ? t.cmp.emptyTheirs : t.cmp.emptyOther}</p>;
  const missing = part === 'theirs' || part === 'none';
  return (
    <>
      <ul className={styles.tiles}>
        {(all ? fish : fish.slice(0, LIMIT)).map(f => (
          <li key={f.id}>
            <button type="button" className={styles.tile} data-missing={missing || undefined} onClick={() => onOpen(f.id)}>
              <img src={fishImage(f.id)} alt="" width={56} height={56} loading="lazy" decoding="async" />
              <span className={styles.name}>{fishName(f, lang)}</span>
              <Stars r={f.rarity} />
              <span className={styles.where}>{areaName(f.areas[0])}{f.areas.length > 1 && ` +${f.areas.length - 1}`}</span>
            </button>
          </li>
        ))}
      </ul>
      {fish.length > LIMIT && (
        <button type="button" className={`link ${styles.more}`} aria-expanded={all} onClick={() => setAll(!all)}>
          {all ? t.cmp.showLess : t.cmp.showAll(fish.length)}
        </button>
      )}
    </>
  );
}
