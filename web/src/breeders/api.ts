// Client for the Chovatelé API (worker/). The only network calls the app makes.

/** Empty = the register is not configured for this build; the tab says so instead of failing. */
export const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/+$/, '');

export type Hidden = 'admin' | 'reports' | null;
export type Entry = {
  no: number;
  nick: string;
  avatar: string | null;
  fish: string[];
  updatedAt: number;
  /** Only for admins (and for your own entry). */
  hidden?: Hidden;
  reports?: number;
};
export type MyEntry = Entry & { hidden: Hidden };
export type Me = { id: string; admin: boolean; banned: boolean; avatar: string | null; entry: MyEntry | null };
export type ModAction = 'hide' | 'restore' | 'ban' | 'delete';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryAfter?: number;
  constructor(status: number, code: string, retryAfter?: number) {
    super(code);
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

async function call<T>(method: string, path: string, token?: string | null, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method,
      // a logged-in view must never come from the browser cache of the public list
      cache: token ? 'no-store' : 'default',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'network');
  }
  let data: unknown = null;
  try { data = await res.json(); } catch { /* empty or not JSON */ }
  if (!res.ok) {
    const d = (data ?? {}) as { error?: string; retryAfter?: number };
    throw new ApiError(res.status, d.error ?? 'server_error', d.retryAfter);
  }
  return data as T;
}

export const api = {
  list: (token?: string | null) => call<{ entries: Entry[] }>('GET', '/breeders', token).then(r => r.entries),
  me: (token: string) => call<Me>('GET', '/me', token),
  put: (token: string, body: { nick?: string; fish?: string[] }) => call<{ entry: MyEntry }>('PUT', '/me', token, body).then(r => r.entry),
  remove: (token: string) => call<unknown>('DELETE', '/me', token),
  logout: (token: string) => call<unknown>('POST', '/auth/logout', token),
  report: (token: string, no: number) => call<unknown>('POST', `/breeders/${no}/report`, token),
  moderate: (token: string, no: number, action: ModAction) =>
    action === 'delete' ? call<unknown>('DELETE', `/admin/breeders/${no}`, token) : call<unknown>('POST', `/admin/breeders/${no}/${action}`, token),
  loginUrl: (returnTo: string) => `${API_URL}/auth/login?return=${encodeURIComponent(returnTo)}`,
};
