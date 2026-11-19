import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import type { Entry, ModAction } from '../breeders/api';
import { sortEntries } from '../breeders/local';
import type { BreedersApi } from '../breeders/useBreeders';
import { fishImage } from '../data';
import type { Fish } from '../data/types';
import { useI18n } from '../i18n/context';
import { fishName } from '../i18n/format';
import styles from './BreedersView.module.css';

type Props = {
  b: BreedersApi;
  /** Backyard fish (names, and the "z 83" total). */
  backyard: Fish[];
  /** The journal grid (same cards as an area) for these fish, shown under an opened player. */
  renderFish: (ids: string[]) => ReactNode;
  onToast: (text: string) => void;
  mobile: boolean;
};

const HOUR = 3600e3;

function useAgo() {
  const { lang, t } = useI18n();
  return (at: number, now = Date.now()) => {
    const h = Math.floor((now - at) / HOUR);
    if (h < 1) return t.br.agoNow;
    if (h < 24) return t.br.agoHours(h);
    const d = Math.floor(h / 24);
    return d < 31 ? t.br.agoDays(d) : new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'numeric', year: 'numeric' }).format(at);
  };
}

function Avatar({ src, nick, big }: { src: string | null; nick: string; big?: boolean }) {
  const [broken, setBroken] = useState(false);
  const cls = `${styles.avatar} ${big ? styles.avatarBig : ''}`;
  if (!src || broken) return <span className={`${cls} ${styles.avatarNone}`} aria-hidden="true">{nick ? [...nick][0].toUpperCase() : '◌'}</span>;
  return <img className={cls} src={src} alt="" width={48} height={48} loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />;
}

export function BreedersView({ b, backyard, renderFish, onToast, mobile }: Props) {
  const { t } = useI18n();
  const { ensureList } = b;
  useEffect(() => { ensureList(); }, [ensureList]);

  if (!b.enabled) {
    return (
      <>
        <h2 className="visually-hidden">{t.br.title}</h2>
        <p className={styles.empty}>{t.br.off}</p>
      </>
    );
  }
  return (
    <div className={styles.layout}>
      <Register b={b} backyard={backyard} renderFish={renderFish} onToast={onToast} mobile={mobile} />
      <aside className={styles.me} aria-labelledby="br-me-title">
        <MySlip b={b} onToast={onToast} />
      </aside>
    </div>
  );
}

// ---- the register: just the players, most fish first ------------------------------
function Register({ b, backyard, renderFish, onToast, mobile }: Props) {
  const { t } = useI18n();
  const byId = useMemo(() => new Map(backyard.map(f => [f.id, f])), [backyard]);
  const shown = useMemo(() => sortEntries(b.entries ?? []), [b.entries]);

  return (
    <section className={styles.register} aria-labelledby="br-title">
      <h2 id="br-title" className="visually-hidden">{t.br.title}</h2>
      {b.listState === 'loading' || b.listState === 'idle' ? (
        <p className={styles.loading}>{t.br.loading}</p>
      ) : b.listState === 'error' ? (
        <p className={styles.empty}>{t.br.loadError} <button type="button" className="link" onClick={() => void b.reloadList()}>{t.br.retry}</button></p>
      ) : !shown.length ? (
        <p className={styles.empty}>{t.br.empty}</p>
      ) : (
        <ol className={styles.entries}>
          {shown.map(e => (
            <EntryRow key={e.no} e={e} b={b} byId={byId} total={backyard.length} limit={mobile ? 6 : 14}
              renderFish={renderFish} onToast={onToast} />
          ))}
        </ol>
      )}
    </section>
  );
}

type RowProps = {
  e: Entry; b: BreedersApi; byId: Map<string, Fish>; total: number; limit: number;
  renderFish: (ids: string[]) => ReactNode; onToast: (text: string) => void;
};

function EntryRow({ e, b, byId, total, limit, renderFish, onToast }: RowProps) {
  const { lang, t } = useI18n();
  const ago = useAgo();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const fish = e.fish.filter(id => byId.has(id));
  const mine = b.me?.entry?.no === e.no;
  const admin = !!b.me?.admin;
  const hidden = e.hidden ?? null;

  const report = async () => {
    if (!b.token) { onToast(t.br.reportLogin); return; }
    if (!window.confirm(t.br.reportConfirm(e.nick))) return;
    if (await b.report(e.no)) onToast(t.br.reported(e.nick));
  };
  const moderate = async (action: ModAction) => {
    if (action === 'delete' && !window.confirm(t.br.modConfirmDelete(e.nick))) return;
    if (action === 'ban' && !window.confirm(t.br.modConfirmBan(e.nick))) return;
    if (await b.moderate(e.no, action)) onToast(t.br.modDone(e.nick));
  };

  return (
    <li className={styles.entry} data-mine={mine || undefined} data-hidden={hidden ? true : undefined}>
      <span className={styles.no}>{t.br.entryNo(e.no)}</span>
      <Avatar src={e.avatar} nick={e.nick} />
      <div className={styles.who}>
        <h3 className={styles.nick}>
          {e.nick}
          {mine && <span className={styles.mineTag}>{t.br.mine}</span>}
          {hidden && <span className={styles.hiddenTag}> ({t.br.hiddenTag})</span>}
        </h3>
        <p className={styles.meta}>
          {t.br.updated(ago(e.updatedAt))}
          {admin && (e.reports ?? 0) > 0 && <span className={styles.flag}> · {t.br.reportsTag(e.reports!)}</span>}
          <span className={styles.acts}>
            {admin ? (
              <>
                <button type="button" className="link" onClick={() => void moderate(hidden ? 'restore' : 'hide')}>{hidden ? t.br.mod.restore : t.br.mod.hide}</button>
                <button type="button" className={`link ${styles.danger}`} onClick={() => void moderate('delete')}>{t.br.mod.delete}</button>
                {!mine && <button type="button" className={`link ${styles.danger}`} onClick={() => void moderate('ban')}>{t.br.mod.ban}</button>}
              </>
            ) : !mine && (
              <button type="button" className={`link ${styles.faint}`} onClick={() => void report()}>{t.br.report}</button>
            )}
          </span>
        </p>
      </div>
      <p className={styles.tally}>
        <b>{fish.length}</b> <span>{t.br.of(total)}</span>
        <span className="bar bar--bred" aria-hidden="true"><span style={{ width: `${(fish.length / total) * 100}%` }} /></span>
      </p>
      {fish.length ? (
        // the whole strip opens this player's fish as full cards right under the row
        <button type="button" className={styles.strip} aria-label={t.br.showFish(e.nick, fish.length)}
          aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
          {!open && fish.slice(0, limit).map(id => (
            <span key={id} className={styles.thumb} title={fishName(byId.get(id)!, lang)}>
              <img src={fishImage(id)} alt="" width={36} height={36} loading="lazy" />
            </span>
          ))}
          {!open && fish.length > limit && <span className={styles.more}>+{fish.length - limit}</span>}
          {open && <span className={styles.hideLabel}>{t.br.hideFish}</span>}
          <span className={styles.go} data-open={open || undefined} aria-hidden="true">▾</span>
        </button>
      ) : (
        <p className={styles.nothing}>{t.br.nothingYet}</p>
      )}
      {open && <div id={panelId} className={styles.panel}>{renderFish(fish)}</div>}
    </li>
  );
}

// ---- my entry ------------------------------------------------------------------
function MySlip({ b, onToast }: { b: BreedersApi; onToast: (text: string) => void }) {
  const { t } = useI18n();
  const ago = useAgo();
  const entry = b.me?.entry ?? null;
  // a typed draft wins; otherwise the field shows the saved nickname
  const [draft, setDraft] = useState<string | null>(null);
  const nick = draft ?? entry?.nick ?? '';
  const setNick = setDraft;
  const nickId = useId();
  const errId = useId();

  const error = b.actionError ? t.br.errors[b.actionError] ?? t.br.errorOther : null;
  const nickError = b.actionError?.startsWith('nick') ? error : null;
  const otherError = nickError ? null : error;
  const title = <h2 id="br-me-title" className={styles.meTitle}>{t.br.meTitle}</h2>;

  if (!b.token) {
    return (
      <div className={styles.slip}>
        {title}
        <p className={styles.lead}>{t.br.meLead}</p>
        {b.authError && <p className={styles.warn} role="alert">{b.authError === 'denied' ? t.br.authDenied : t.br.authFailed}</p>}
        <button type="button" className="btn" onClick={b.login}>{t.br.login}</button>
        <p className={styles.fine}>{t.br.loginFine}</p>
      </div>
    );
  }

  const who = (
    <div className={styles.who2}>
      <Avatar src={b.me?.avatar ?? null} nick={entry?.nick ?? ''} big />
      <div>
        <span className={styles.k}>{t.br.loggedIn}</span>
        <button type="button" className="link" onClick={b.logout}>{t.br.logout}</button>
      </div>
    </div>
  );

  if (!b.me) {
    return (
      <div className={styles.slip}>
        {title}
        {b.meState === 'error'
          ? <p className={styles.warn}>{t.br.meError} <button type="button" className="link" onClick={b.retryMe}>{t.br.retry}</button></p>
          : <p className={styles.fine}>{t.br.loading}</p>}
      </div>
    );
  }

  if (b.me.banned) return <div className={styles.slip}>{title}{who}<p className={styles.warn}>{t.br.banned}</p></div>;

  const nickField = (
    <label className={styles.nickField} htmlFor={nickId}>
      <span className={styles.k}>{t.br.nick}</span>
      <input
        id={nickId} type="text" value={nick} maxLength={20} placeholder={t.br.nickPh} autoComplete="off" spellCheck={false}
        aria-invalid={nickError ? true : undefined} aria-describedby={errId}
        onChange={e => setNick(e.target.value)}
      />
      <span id={errId} className={nickError ? styles.err : styles.rules}>{nickError ?? t.br.nickRules}</span>
    </label>
  );

  if (!entry) {
    const n = b.local.length;
    return (
      <div className={styles.slip}>
        {title}{who}
        <form onSubmit={async ev => { ev.preventDefault(); if (await b.publish(nick)) { setDraft(null); onToast(t.br.published); } }}>
          {nickField}
          <p className={styles.preview}>{t.br.preview(n)}</p>
          {otherError && <p className={styles.err} role="alert">{otherError}</p>}
          <button type="submit" className="btn" disabled={b.busy}>{t.br.publish}</button>
        </form>
        <p className={styles.fine}>{t.br.publishFine}</p>
      </div>
    );
  }

  const status = b.plan.kind === 'conflict' ? null
    : b.sync === 'error' ? <p className={`${styles.status} ${styles.bad}`}><i aria-hidden="true" />{t.br.statusError}</p>
      : b.sync === 'waiting' || b.sync === 'sending' ? <p className={`${styles.status} ${styles.wait}`}><i aria-hidden="true" />{t.br.statusWaiting}</p>
        : <p className={`${styles.status} ${styles.ok}`}><i aria-hidden="true" />{t.br.statusOk(entry.fish.length)} · {ago(entry.updatedAt)}</p>;

  return (
    <div className={styles.slip}>
      {title}{who}
      {entry.hidden === 'admin' && <p className={styles.warn}>{t.br.hiddenAdmin}</p>}
      {entry.hidden === 'reports' && <p className={styles.warn}>{t.br.hiddenReports}</p>}
      {b.plan.kind === 'conflict' && (
        <div className={styles.conflict} role="group" aria-label={t.br.conflictTitle}>
          <p><strong>{t.br.conflictTitle}</strong><br />{t.br.conflict(b.plan.server.length, b.plan.local.length)}</p>
          <button type="button" className="btn" disabled={b.busy} onClick={() => void b.resolveConflict('register')}>{t.br.useRegister}</button>
          <button type="button" className="btn btn--quiet" disabled={b.busy} onClick={() => void b.resolveConflict('local')}>{t.br.useLocal}</button>
        </div>
      )}
      <div aria-live="polite">{status}</div>
      <form onSubmit={async ev => { ev.preventDefault(); if (await b.saveNick(nick)) { setDraft(null); onToast(t.br.nickSaved); } }}>
        {nickField}
        {otherError && <p className={styles.err} role="alert">{otherError}</p>}
        <button type="submit" className="btn btn--quiet" disabled={b.busy || nick.trim() === entry.nick}>{t.br.saveNick}</button>
      </form>
      <p className={styles.fine}>{t.br.howToChange}</p>
      <button type="button" className={`link ${styles.danger} ${styles.remove}`} disabled={b.busy}
        onClick={async () => { if (window.confirm(t.br.removeConfirm) && await b.removeEntry()) onToast(t.br.removed); }}>
        {t.br.remove}
      </button>
    </div>
  );
}

