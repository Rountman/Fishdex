import type { CSSProperties } from 'react';
import zoneGrid from '../data/palmZones.json';
import { ZONES, type Zone, type ZonedArea } from '../data/types';
import type { Spot } from '../i18n/dictionaries';
import { useI18n } from '../i18n/context';
import type { Facets, Tally } from '../state/filters';
import styles from './ZoneMap.module.css';

const EMPTY: Tally = { total: 0, caught: 0, glow: 0, bred: 0, unlocked: 0 };
const spotOf = (z: Zone): Spot => `Zone ${z}`;
const zoneValue = (area: ZonedArea, z: Zone) => `${area}:${spotOf(z)}`;

// ---- geometry: the official 13x13 grid over a square map, viewBox 0 0 12.5 12.5 like fishao.net
type Shape = { zone: Zone; fill: string; edge: string; label: { x: number; y: number } };

function shapes(grid: readonly string[]): Shape[] {
  const n = grid.length;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= n || y >= n ? null : grid[y][x]);
  return ZONES.map(zone => {
    const cells: [number, number][] = [];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (grid[y][x] === zone) cells.push([x, y]);
    const fill = cells.map(([x, y]) => `M${x} ${y}h1v1h-1z`).join('');
    // outline: cell sides facing another zone or land; the frame of the map is not a border
    const edge = cells.map(([x, y]) => {
      const out = (dx: number, dy: number) => { const v = at(x + dx, y + dy); return v !== null && v !== zone; };
      return (out(0, -1) ? `M${x} ${y}h1` : '') + (out(1, 0) ? `M${x + 1} ${y}v1` : '')
        + (out(0, 1) ? `M${x} ${y + 1}h1` : '') + (out(-1, 0) ? `M${x} ${y}v1` : '');
    }).join('');
    // label on the cell deepest inside the zone (map frame counts as inside), nearest the zone's middle
    const depth = new Map(cells.map(([x, y]) => [`${x},${y}`, Infinity]));
    const queue: [number, number, number][] = cells
      .filter(([x, y]) => [[0, -1], [1, 0], [0, 1], [-1, 0]].some(([dx, dy]) => { const v = at(x + dx, y + dy); return v !== null && v !== zone; }))
      .map(([x, y]) => [x, y, 0]);
    for (const [x, y, d] of queue) {
      const k = `${x},${y}`;
      if (depth.get(k)! <= d) continue;
      depth.set(k, d);
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) if (depth.has(`${x + dx},${y + dy}`)) queue.push([x + dx, y + dy, d + 1]);
    }
    const mx = cells.reduce((s, c) => s + c[0], 0) / cells.length, my = cells.reduce((s, c) => s + c[1], 0) / cells.length;
    const visible = cells.filter(([x, y]) => x < n - 1 && y < n - 1); // last row / column is half outside the viewBox
    const [lx, ly] = visible.reduce((best, c) => {
      const d = depth.get(`${c[0]},${c[1]}`)!, bd = depth.get(`${best[0]},${best[1]}`)!;
      const dist = (p: [number, number]) => (p[0] - mx) ** 2 + (p[1] - my) ** 2;
      return d > bd || (d === bd && dist(c) < dist(best)) ? c : best;
    });
    return { zone, fill, edge, label: { x: lx + 0.5, y: ly + 0.5 } };
  });
}

const SHAPES = shapes(zoneGrid as string[]);
const MAP_SRC = `${import.meta.env.BASE_URL}maps/palm-island.webp`;

type Props = {
  /** Palm Island or the Moray tournament: both are fished on this map with the same zones. */
  area: ZonedArea;
  facets: Facets;
  /** '' or '<area>:<Spot>' */
  spot: string;
  /** Same values as the area filter: '<area>' = the whole area, '<area>:Zone A' = one zone. */
  onSelect: (value: string) => void;
};

/** Official Palm Island map with our zone layer; the list beside it is the keyboard / screen reader control. */
export function ZoneMap({ area, facets, spot, onSelect }: Props) {
  const { t } = useI18n();
  const selected = ZONES.find(z => spot === zoneValue(area, z)) ?? null;
  const tally = (z: Zone) => facets.spots.get(zoneValue(area, z)) ?? EMPTY;
  const pick = (z: Zone) => onSelect(z === selected ? area : zoneValue(area, z));
  const done = (x: Tally) => x.total > 0 && x.caught === x.total;

  return (
    <details className={styles.map} open>
      <summary className={styles.summary}>{t.mapTitle(area)}</summary>
      <div className={styles.body}>
        <div className={styles.chart}>
          <img src={MAP_SRC} alt={t.mapAlt(area)} width={1000} height={1000} />
          <svg viewBox="0 0 12.5 12.5" aria-hidden="true" data-selection={selected !== null}>
            {SHAPES.map(s => {
              const x = tally(s.zone);
              return (
                <g key={s.zone} className={styles.zone} data-zone={s.zone} data-selected={s.zone === selected} onClick={() => pick(s.zone)}>
                  <path className={styles.fill} d={s.fill} shapeRendering="crispEdges" />
                  <path className={styles.edge} d={s.edge} />
                  <g className={styles.label} transform={`translate(${s.label.x} ${s.label.y})`}>
                    <circle r="0.36" />
                    <text className={styles.letter} y="0.02">{s.zone}</text>
                    <text className={styles.count} y="0.66">{x.caught}/{x.total}{done(x) ? ' ✓' : ''}</text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>
        <div className={styles.side}>
          <p className={styles.hint}>{t.mapHint(area)}</p>
          <ul className={styles.legend}>
            {ZONES.map(z => {
              const x = tally(z);
              return (
                <li key={z}>
                  <button
                    type="button" aria-pressed={z === selected} onClick={() => pick(z)} data-done={done(x)}
                    aria-label={t.zoneAria(z, x.caught, x.total)} style={{ '--zone': `var(--zone-${z.toLowerCase()})` } as CSSProperties}
                  >
                    <span className={styles.swatch} aria-hidden="true">{z}</span>
                    <span className={styles.name}>{t.zoneName(z)}</span>
                    <span className={styles.n}>{x.caught}<span className="of">/{x.total}</span></span>
                  </button>
                </li>
              );
            })}
          </ul>
          {selected && <button type="button" className="link" onClick={() => onSelect(area)}>{t.mapAll(area)}</button>}
          <p className={styles.credit}>{t.mapCredit(area)}</p>
        </div>
      </div>
    </details>
  );
}
