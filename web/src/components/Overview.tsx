import type { CSSProperties } from 'react';
import type { Area } from '../data/types';
import { useI18n } from '../i18n/context';
import { spotLabel } from '../i18n/format';
import type { Facets, Tally } from '../state/filters';
import styles from './Overview.module.css';

type Props = {
  areas: Area[];
  /** Whole journal, no filters. */
  facets: Facets;
  /** '' = all, an area id, or '<area>:<Spot>'. */
  onArea: (value: string) => void;
  onBack: () => void;
};

const EMPTY: Tally = { total: 0, caught: 0, glow: 0, bred: 0 };

const Cell = ({ n, of, kind }: { n: number; of: number; kind?: 'glow' | 'bred' }) => (
  <td>
    <span className={styles.num}>{n}<span className="of">/{of}</span></span>
    <span className={`bar ${kind ? `bar--${kind}` : ''}`}><span style={{ width: `${of ? n / of * 100 : 0}%` }} /></span>
  </td>
);

export function Overview({ areas, facets, onArea, onBack }: Props) {
  const { lang, t } = useI18n();
  const labels = { '--l-caught': `'${t.ovCaught}'`, '--l-glow': `'${t.ovGlow}'`, '--l-bred': `'${t.ovBred}'` } as CSSProperties;
  const yard = facets.areas.get('backyard') ?? EMPTY;
  const row = (key: string, label: string, tally: Tally, value: string, opts: { sub?: boolean; bred?: boolean } = {}) => (
    <tr key={key} data-done={tally.total > 0 && tally.caught === tally.total} className={opts.sub ? styles.subRow : undefined}>
      <th scope="row"><button type="button" className={styles.area} onClick={() => onArea(value)}>{label}</button></th>
      <Cell n={tally.caught} of={tally.total} />
      <Cell n={tally.glow} of={tally.total} kind="glow" />
      {opts.bred ? <Cell n={tally.bred} of={tally.total} kind="bred" /> : <td />}
    </tr>
  );
  return (
    <section className={styles.overview} aria-labelledby="ov-title">
      <div className={styles.head}>
        <h2 id="ov-title">{t.ovTitle}</h2>
        <button type="button" className="link" onClick={onBack}>{t.ovBack}</button>
      </div>
      <p className={styles.hint}>{t.ovHint}</p>
      <table className={styles.table} style={labels}>
        <thead>
          <tr>
            <th scope="col"><span className="visually-hidden">{t.area}</span></th>
            <th scope="col">{t.ovCaught}</th><th scope="col">{t.ovGlow}</th><th scope="col">{t.ovBred}</th>
          </tr>
        </thead>
        <tbody className={styles.total}>
          <tr>
            <th scope="row">{t.ovTotal}</th>
            <Cell n={facets.all.caught} of={facets.all.total} />
            <Cell n={facets.all.glow} of={facets.all.total} kind="glow" />
            <Cell n={yard.bred} of={yard.total} kind="bred" />
          </tr>
        </tbody>
        {(['area', 'tournament', 'backyard'] as const).map(kind => (
          <tbody key={kind}>
            <tr className={styles.group}><th colSpan={4} scope="rowgroup">{t.kinds[kind]}</th></tr>
            {areas.filter(a => a.kind === kind).flatMap(a => [
              row(a.id, a.name, facets.areas.get(a.id) ?? EMPTY, a.id, { bred: kind === 'backyard' }),
              ...a.spots.map(sp => {
                const key = `${a.id}:${sp}`;
                return row(key, spotLabel(sp, lang).text, facets.spots.get(key) ?? EMPTY, key, { sub: true });
              }),
            ])}
          </tbody>
        ))}
      </table>
    </section>
  );
}
