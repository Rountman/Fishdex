import type { CSSProperties } from 'react';
import { useI18n } from '../i18n/context';
import type { AreaStat } from './AreaIndex';
import styles from './Overview.module.css';

type Props = {
  stats: AreaStat[];
  total: number;
  caught: number;
  glow: number;
  bred: number;
  yardTotal: number;
  onArea: (id: string) => void;
  onBack: () => void;
};

const Cell = ({ n, of, kind }: { n: number; of: number; kind?: 'glow' | 'bred' }) => (
  <td>
    <span className={styles.num}>{n}<span className="of">/{of}</span></span>
    <span className={`bar ${kind ? `bar--${kind}` : ''}`}><span style={{ width: `${of ? n / of * 100 : 0}%` }} /></span>
  </td>
);

export function Overview({ stats, total, caught, glow, bred, yardTotal, onArea, onBack }: Props) {
  const { t } = useI18n();
  const labels = { '--l-caught': `'${t.ovCaught}'`, '--l-glow': `'${t.ovGlow}'`, '--l-bred': `'${t.ovBred}'` } as CSSProperties;
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
            <Cell n={caught} of={total} /><Cell n={glow} of={total} kind="glow" /><Cell n={bred} of={yardTotal} kind="bred" />
          </tr>
        </tbody>
        {(['area', 'tournament', 'backyard'] as const).map(kind => (
          <tbody key={kind}>
            <tr className={styles.group}><th colSpan={4} scope="rowgroup">{t.kinds[kind]}</th></tr>
            {stats.filter(a => a.kind === kind).map(a => (
              <tr key={a.id} data-done={a.caught === a.count}>
                <th scope="row"><button type="button" className={styles.area} onClick={() => onArea(a.id)}>{a.name}</button></th>
                <Cell n={a.caught} of={a.count} />
                <Cell n={a.glow} of={a.count} kind="glow" />
                {kind === 'backyard' ? <Cell n={a.bred} of={a.count} kind="bred" /> : <td />}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </section>
  );
}
