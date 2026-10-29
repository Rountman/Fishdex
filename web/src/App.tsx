// Phase 3 skeleton: proves data, images (BASE_URL), progress persistence and
// query-param state work end to end. The real UI arrives in phase 4.
import { AREAS, FISH, FISH_IDS, fishImage } from './data';
import { totals } from './progress/progress';
import { useProgress } from './progress/useProgress';
import { readParams } from './url';
import styles from './App.module.css';

export default function App() {
  const p = useProgress();
  const t = totals(p.progress, FISH_IDS);
  const area = readParams().get('area');
  const list = area ? FISH.filter(f => f.areas.includes(area)) : FISH;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>Fishdex</h1>
        <p>
          {t.caught}/{FISH.length} ulovených, {t.caughtGlowing} zářivých, {AREAS.length} oblastí
        </p>
        {!p.persistent && <p role="status">Tenhle prohlížeč nedovolí ukládat, progres po zavření stránky zmizí.</p>}
      </header>
      <ul className={styles.list}>
        {list.map(f => {
          const s = p.state(f.id);
          return (
            <li key={f.id}>
              <button type="button" className={styles.item} aria-pressed={s.caught} onClick={() => p.toggle(f.id, 'caught')}>
                <img src={fishImage(f.id)} alt="" width={f.img.w} height={f.img.h} loading="lazy" decoding="async" />
                <span>{f.names.cs}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
