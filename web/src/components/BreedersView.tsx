import { useEffect, useId, useMemo, useState } from 'react';
import type { Entry, ModAction } from '../breeders/api';
import { filterEntries, type BreederFilters } from '../breeders/local';
import type { BreedersApi } from '../breeders/useBreeders';
import { fishImage } from '../data';
import type { Fish } from '../data/types';
import { useI18n } from '../i18n/context';
import { fishName } from '../i18n/format';
import styles from './BreedersView.module.css';

type Props = {
  b: BreedersApi;
  /** Backyard fish, in the order of the "Chová rybu" picker. */
  backyard: Fish[];
  filters: BreederFilters;
  onFilters: (patch: Partial<BreederFilters>) => void;
  onOpenFish: (id: string) => void;
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

export function BreedersView({ b, backyard, filters, onFilters, onOpenFish, onToast, mobile }: Props) {
  const { t } = useI18n();
  const { ensureList } = b;
  useEffect(() => { ensureList(); }, [ensureList]);

  if (!b.enabled) {
    return (
      <>
        <h2 className={styles.title}>{t.br.title}</h2>
        <p className={styles.empty}>{t.br.off}</p>
      </>
    );
  }
  return (
    <div className={styles.layout}>
      <Register b={b} backyard={backyard} filters={filters} onFilters={onFilters} onOpenFish={onOpenFish} onToast={onToast} mobile={mobile} />
      <aside className={styles.me} aria-labelledby="br-me-title">
        <MySlip b={b} onToast={onToast} />
      </aside>
    </div>
  );
}

// ---- the register ----------------------------------------------------------------
function Register({ b, backyard, filters, onFilters, onOpenFish, onToast, mobile }: Props) {
  const { lang, t } = useI18n();
  const byId = useMemo(() => new Map(backyard.map(f => [f.id, f])), [backyard]);
  const all = useMemo(() => b.entries ?? [], [b.entries]);
  const shown = useMemo(() => filterEntries(all, filters), [all, filters]);
  const admin = !!b.me?.admin;
  const reported = all.filter(e => (e.reports ?? 0) > 0).length;
  const focus = filters.fish ? byId.get(filters.fish) : undefined;
  const ids = { q: useId(), fish: useId(), sort: useId() };

  return (
    <section className={styles.register} aria-labelledby="br-title">
      <header className={styles.head}>
        <h2 id="br-title" className={styles.title}>{t.br.title}</h2>
        {b.listState === 'ok' && <p className={styles.count}>{t.br.count(all.length, backyard.length)}</p>}
      </header>
      <p className={styles.intro}>{t.br.intro}</p>

      {admin && b.listState === 'ok' && (
        <p className={styles.adminSlip}>
          <strong>{t.br.adminQueue}</strong> {reported ? t.br.adminN(reported) : t.br.adminNone}
          <span className={styles.muted}> · {t.br.adminNote}</span>
        </p>
      )}

      <div className={styles.filters}>
        <label className={styles.field} htmlFor={ids.q}>
          <span className={styles.k}>{t.br.search}</span>
          <input id={ids.q} type="search" value={filters.q} placeholder={t.br.searchPh} autoComplete="off"
            onChange={e => onFilters({ q: e.target.value })} />
        </label>
        <label className={styles.field} htmlFor={ids.fish}>
          <span className={styles.k}>{t.br.fish}</span>
          <select id={ids.fish} value={filters.fish} onChange={e => onFilters({ fish: e.target.value })}>
            <option value="">{t.br.fishAny}</option>
            {backyard.map(f => <option key={f.id} value={f.id}>{fishName(f, lang)}</option>)}
          </select>
        </label>
        <div className={styles.field}>
          <span className={styles.k} id={ids.sort}>{t.br.sort}</span>
          <span className={styles.seg} role="group" aria-labelledby={ids.sort}>
            {(['count', 'recent'] as const).map(s => (
              <button key={s} type="button" aria-pressed={filters.sort === s} onClick={() => onFilters({ sort: s })}>
                {s === 'count' ? t.br.sortCount : t.br.sortRecent}
              </button>
            ))}
          </span>
        </div>
      </div>

      {focus && b.listState === 'ok' && (
        <div className={styles.focus}>
          <img src={fishImage(focus.id)} alt="" width={56} height={56} />
          <p><span className={styles.focusName}>{fishName(focus, lang)}</span> · {t.br.focus(b.counts?.get(focus.id) ?? 0)}</p>
          <button type="button" className="link" onClick={() => onFilters({ fish: '' })}>{t.br.clearFish}</button>
        </div>
      )}

      {b.listState === 'loading' || b.listState === 'idle' ? (
        <p className={styles.loading}>{t.br.loading}</p>
      ) : b.listState === 'error' ? (
        <p className={styles.empty}>{t.br.loadError} <button type="button" className="link" onClick={() => void b.reloadList()}>{t.br.retry}</button></p>
      ) : !all.length ? (
        <p className={styles.empty}>{t.br.empty}</p>
      ) : !shown.length ? (
        <p className={styles.empty}>{t.br.emptyFilter}{' '}
          <button type="button" className="link" onClick={() => onFilters({ q: '', fish: '' })}>{t.br.clearFilters}</button>
        </p>
      ) : (
        <ol className={styles.entries}>
          {shown.map(e => (
            <EntryRow
              key={e.no} e={e} b={b} byId={byId} total={backyard.length} limit={mobile ? 6 : 14}
              hit={filters.fish} onOpenFish={onOpenFish} onToast={onToast}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

type RowProps = {
  e: Entry; b: BreedersApi; byId: Map<string, Fish>; total: number; limit: number; hit: string;
  onOpenFish: (id: string) => void; onToast: (text: string) => void;
};

function EntryRow({ e, b, byId, total, limit, hit, onOpenFish, onToast }: RowProps) {
  const { lang, t } = useI18n();
  const ago = useAgo();
  const [open, setOpen] = useState(false);
  const fish = e.fish.filter(id => byId.has(id));
  const visible = open ? fish : fish.slice(0, limit);
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
      <ul className={styles.strip} aria-label={t.br.stripLabel(e.nick)}>
        {!fish.length && <li className={styles.nothing}>{t.br.nothingYet}</li>}
        {visible.map(id => {
          const f = byId.get(id)!;
          const name = fishName(f, lang);
          return (
            <li key={id} data-hit={id === hit || undefined}>
              <button type="button" className={styles.thumb} title={name} aria-label={name} onClick={() => onOpenFish(id)}>
                <img src={fishImage(id)} alt="" width={36} height={36} loading="lazy" />
              </button>
            </li>
          );
        })}
        {fish.length > limit && (
          <li>
            <button type="button" className={styles.more} aria-expanded={open} onClick={() => setOpen(!open)}
              aria-label={open ? undefined : t.br.moreLabel(fish.length - limit)}>
              {open ? t.br.less : `+${fish.length - limit}`}
            </button>
          </li>
        )}
      </ul>
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

