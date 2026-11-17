import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { currentFish } from '../current/current';
import { fishImage } from '../data';
import type { Area, Fish } from '../data/types';
import { useI18n } from '../i18n/context';
import { fishName, fmtDay, fmtDuration, fmtSeason, fmtTime } from '../i18n/format';
import type { Progress } from '../progress/schema';
import { bitesAtHour, inSeasonMonth } from '../state/filters';
import { DAY_MIN, offsetLabel, shiftTime, toHHMM } from '../time/zone';
import { Stars } from './Stars';
import styles from './CurrentView.module.css';

type Props = {
  /** Fish with times in game time (UTC), as in the data. */
  fish: readonly Fish[];
  areas: readonly Area[];
  progress: Progress;
  /** Minutes the picked zone is ahead of UTC. */
  offset: number;
  zoneName: string;
  area: string;
  hideCaught: boolean;
  onArea: (area: string) => void;
  onHideCaught: (hide: boolean) => void;
  onOpen: (id: string) => void;
};

const MINUTE = 60_000;
/** Lists longer than this are cut with "Show all n". */
const LIMIT = { biting: Infinity, soon: 8, ending: Infinity, upcoming: 8 } as const;
type Key = keyof typeof LIMIT;

/** Ticks on the minute, so countdowns and the clock stay right while the tab is open. */
function useNow() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    let id = 0;
    const tick = () => {
      setNow(Date.now());
      id = window.setTimeout(tick, MINUTE - (Date.now() % MINUTE) + 50);
    };
    id = window.setTimeout(tick, MINUTE - (Date.now() % MINUTE) + 50);
    return () => clearTimeout(id);
  }, []);
  return now;
}

const minuteOfDay = (ms: number) => Math.floor((ms % 86_400_000) / MINUTE);

export function CurrentView({ fish, areas, progress, offset, zoneName, area, hideCaught, onArea, onHideCaught, onOpen }: Props) {
  const { lang, t } = useI18n();
  const c = t.cur;
  const now = useNow();
  const minute = Math.floor(now / MINUTE);
  // recomputed once a minute, not on every render
  const lists = useMemo(() => currentFish(fish, minute * MINUTE), [fish, minute]);
  const [expanded, setExpanded] = useState<ReadonlySet<Key>>(new Set());

  const game = minuteOfDay(now);
  const keep = (f: Fish) => (!area || f.areas.includes(area)) && !(hideCaught && progress.fish[f.id]?.caught);
  const local = (f: Fish) => shiftTime(f.time, offset);

  const section = <T extends { fish: Fish }>(key: Key, title: string, note: string, all: T[], when: (x: T) => [ReactNode, ReactNode], urgent: (x: T) => boolean) => {
    const rows = all.filter(x => keep(x.fish));
    const shown = expanded.has(key) ? rows : rows.slice(0, LIMIT[key]);
    const daily = key === 'biting' || key === 'soon';
    return (
      <section className={styles.block} aria-labelledby={`cur-${key}`}>
        <h3 id={`cur-${key}`}>{title} <span className={styles.count}>{rows.length}</span></h3>
        <p className={`note ${styles.note}`}>{note}</p>
        {rows.length === 0 ? (
          <p className={styles.empty}>{hideCaught && all.some(x => !area || x.fish.areas.includes(area)) ? c.emptyCaught : c.empty}</p>
        ) : (
          <ul className={styles.rows}>
            {shown.map(x => {
              const f = x.fish;
              const [big, small] = when(x);
              const caught = progress.fish[f.id]?.caught;
              return (
                <li key={f.id}>
                  <button type="button" className={styles.row} data-urgent={urgent(x) || undefined} data-caught={caught || undefined}
                    onClick={() => onOpen(f.id)}>
                    <img className={styles.img} src={fishImage(f.id)} alt="" width={f.img.w} height={f.img.h} loading="lazy" decoding="async" />
                    <span className={styles.who}>
                      <span className={styles.name}>
                        {fishName(f, lang)}
                        {caught && <span className={styles.caught}>{t.stamp}</span>}
                      </span>
                      <span className={styles.meta}>
                        <Stars r={f.rarity} decorative /> {f.areas.map(a => areas.find(x => x.id === a)?.name ?? a).join(', ')}
                      </span>
                    </span>
                    <span className={styles.when}>
                      <span className={styles.big}>{big}</span>
                      <span className={styles.small}>{small}</span>
                    </span>
                    {daily ? <DayStrip time={local(f)} at={game + offset} label={c.dayStrip(fmtTime(local(f), lang).text)} />
                      : <YearStrip fish={f} month={new Date(now).getUTCMonth()} label={c.yearStrip(fmtSeason(f.season, lang).text)} />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {shown.length < rows.length && (
          <button type="button" className={`link ${styles.more}`} onClick={() => setExpanded(e => new Set(e).add(key))}>
            {c.showAll(rows.length)}
          </button>
        )}
      </section>
    );
  };

  return (
    <div className={styles.view}>
      <h2 className="visually-hidden">{c.title}</h2>
      <div className={styles.top}>
        <div className={styles.clock} role="group" aria-label={c.gameTime}>
          <p className={styles.reading}>
            <span className={styles.k}>{c.gameTime}</span>
            <span className={styles.v}>{toHHMM(game).replace(/^0/, '')}</span>
            <span className={styles.z}>UTC</span>
          </p>
          {offset !== 0 && (
            <p className={`${styles.reading} ${styles.local}`}>
              <span className={styles.k}>{c.yours}</span>
              <span className={styles.v}>{toHHMM(game + offset).replace(/^0/, '')}</span>
              <span className={styles.z}>{zoneName === offsetLabel(offset) ? zoneName : `${zoneName} · ${offsetLabel(offset)}`}</span>
            </p>
          )}
          <div className={styles.dial} aria-hidden="true">
            <span className={styles.track}><span className={styles.hand} style={{ left: `${(((game + offset) % DAY_MIN) + DAY_MIN) % DAY_MIN / 14.4}%` }} /></span>
            <span className={styles.ticks}><span>0</span><span>6</span><span>12</span><span>18</span><span>24</span></span>
          </div>
          <p className={`note ${styles.clockNote}`}>{c.clockNote}</p>
        </div>

        <div className={styles.filters}>
          <button type="button" className="toggle" aria-pressed={hideCaught} onClick={() => onHideCaught(!hideCaught)}>
            <span className="box" aria-hidden="true" />{c.hideCaught}
          </button>
          <label className={styles.areaPick}>
            <span>{c.area}</span>
            <select value={area} onChange={e => onArea(e.target.value)}>
              <option value="">{c.allAreas}</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className={styles.cols}>
        <div>
          <h2 className={styles.colHead}>{c.day}<small>{c.dayTag}</small></h2>
          {section('biting', c.biting, c.bitingNote, lists.biting,
            x => [c.left(fmtDuration(x.leftMin)), fmtTime(local(x.fish), lang).text], x => x.leftMin <= 60)}
          {section('soon', c.soon, c.soonNote, lists.soon,
            x => [c.wait(fmtDuration(x.waitMin)), c.from(toHHMM(game + offset + x.waitMin).replace(/^0/, ''))], () => false)}
        </div>
        <div>
          <h2 className={styles.colHead}>{c.season}<small>{c.seasonTag}</small></h2>
          {section('ending', c.ending, c.endingNote, lists.ending,
            x => [c.daysLeft(x.days), c.lastDay(fmtDay(x.day, lang))], x => x.days <= 7)}
          {section('upcoming', c.upcoming, c.upcomingNote, lists.upcoming,
            x => [c.inDays(x.days), c.from(fmtDay(x.day, lang))], () => false)}
        </div>
      </div>
    </div>
  );
}

/** 24 hour cells in the picked zone, the hand at the current hour. */
function DayStrip({ time, at, label }: { time: Fish['time']; at: number; label: string }) {
  const pos = (((at % DAY_MIN) + DAY_MIN) % DAY_MIN) / 14.4;
  return (
    <span className={`${styles.strip} ${styles.day}`} aria-hidden="true" title={label}>
      {Array.from({ length: 24 }, (_, h) => <i key={h} data-on={bitesAtHour(time, h) || undefined} />)}
      <b style={{ left: `${pos}%` }} />
    </span>
  );
}

const MONTH_LETTERS = { cs: 'LÚBDKČČSZŘLP', en: 'JFMAMJJASOND' };

function YearStrip({ fish, month, label }: { fish: Fish; month: number; label: string }) {
  const { lang } = useI18n();
  return (
    <span className={`${styles.strip} ${styles.year}`} aria-hidden="true" title={label}>
      {[...MONTH_LETTERS[lang]].map((ch, i) => (
        <i key={i} data-on={inSeasonMonth(fish.season, i + 1) || undefined} data-now={i === month || undefined}>{ch}</i>
      ))}
    </span>
  );
}
