import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/context';
import { formatCountdown, parseLocalInput, timerStatus, TIMERS, toLocalInput, type TimerId, type TimerState } from '../timers/timers';
import styles from './TimersView.module.css';

type Props = {
  timers: TimerState;
  onCollect: (id: TimerId) => void;
  onEdit: (id: TimerId, at: number) => void;
  onClear: (id: TimerId) => void;
};

type RowProps = Omit<Props, 'timers'> & { id: TimerId; periodMs: number; lastAt: number | undefined; now: number };

function TimerRow({ id, periodMs, lastAt, now, onCollect, onEdit, onClear }: RowProps) {
  const { lang, t } = useI18n();
  const text = t.timers[id];
  const status = timerStatus(lastAt, periodMs, now);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [invalid, setInvalid] = useState(false);
  const stamp = (ms: number) => new Intl.DateTimeFormat(lang, { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }).format(ms);

  const toggleEdit = () => {
    if (!open) setDraft(toLocalInput(lastAt ?? Date.now()));
    setInvalid(false);
    setOpen(!open);
  };
  const save = () => {
    const at = parseLocalInput(draft, Date.now());
    if (at === null) { setInvalid(true); return; }
    onEdit(id, at);
    setOpen(false);
  };

  return (
    <li className={styles.row} data-status={status.kind}>
      <div className={styles.what}>
        <h3>{text.name}</h3>
        <p className={styles.detail}>{text.detail}</p>
        <p className={styles.every}>{text.every}</p>
        {text.note && <p className={`note ${styles.note}`}>{text.note}</p>}
      </div>

      <div className={styles.state}>
        {status.kind === 'running' && (
          <>
            <span className={styles.clock} role="timer" aria-label={t.timerRemaining}>{formatCountdown(status.remainingMs)}</span>
            <span className="bar"><span style={{ width: `${status.elapsed * 100}%` }} /></span>
            <span className={styles.when}>{t.timerReadyAt(stamp(status.readyAt))}</span>
          </>
        )}
        {status.kind === 'ready' && (
          <>
            <span className={`stamp ${styles.stamp}`}>{t.timerReady}</span>
            <span className={styles.when}>{t.timerReadySince(stamp(status.readyAt))}</span>
          </>
        )}
        {status.kind === 'idle' && <span className={styles.idle}>{t.timerIdle}</span>}
      </div>

      <div className={styles.actions}>
        <button type="button" className="btn" disabled={status.kind === 'running'} onClick={() => onCollect(id)}>{t.timerCollect}</button>
        <button type="button" className="link" aria-expanded={open} onClick={toggleEdit}>{t.timerEdit}</button>
      </div>

      {open && (
        <div className={styles.edit}>
          <label>
            <span>{t.timerEditLabel}</span>
            <input
              type="datetime-local" value={draft} max={toLocalInput(now)} aria-invalid={invalid}
              onChange={e => { setDraft(e.target.value); setInvalid(false); }}
            />
          </label>
          <button type="button" className="btn btn--quiet" onClick={save}>{t.timerSave}</button>
          {lastAt !== undefined && (
            <button type="button" className="link" onClick={() => { onClear(id); setOpen(false); }}>{t.timerClear}</button>
          )}
          {invalid && <p className={styles.error} role="alert">{t.timerInvalid}</p>}
        </div>
      )}
    </li>
  );
}

export function TimersView({ timers, ...actions }: Props) {
  const { t } = useI18n();
  // ticks here so only this view re-renders every second
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <>
      <h2 className={styles.title}>{t.timersTitle}</h2>
      <p className={styles.hint}>{t.timersHint}</p>
      <ul className={styles.list}>
        {TIMERS.map(({ id, periodMs }) => (
          <TimerRow key={id} id={id} periodMs={periodMs} lastAt={timers[id]} now={now} {...actions} />
        ))}
      </ul>
      <p className={styles.source}>{t.timersSource}</p>
    </>
  );
}
