import { AUTH } from '../app';
import type { Provider } from '../server/auth-session';
import type { Caller } from './ffly-api';

// The page's side of sign-in (spec 014). The access token lives only in this object's memory: never in storage, a
// script-readable cookie or the URL. The refresh token never reaches the page (an HttpOnly cookie on /api/auth).

export interface Session {
  accessToken: string;
  expiresAt: number;
}

export type { Provider };
export type Change = 'signedIn' | 'signedOut' | 'expired';
type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

// Whether this browser has signed in, so a visitor who never did costs no request on load. Never a token.
export interface Hint {
  get(): boolean;
  set(on: boolean): void;
}

const nowS = () => Math.floor(Date.now() / 1000);

// The route sends the token's lifetime, so the expiry is on this browser's clock, however far it is from the server's.
export function parseSession(body: unknown, now: number): Session | undefined {
  const b = body as { access_token?: unknown; expires_in?: unknown } | null;
  return typeof b?.access_token === 'string' && b.access_token && typeof b.expires_in === 'number'
    ? { accessToken: b.access_token, expiresAt: now + b.expires_in }
    : undefined;
}

const sessionFrom = async (res: Response | undefined, now: number) =>
  res?.ok ? parseSession(await res.json().catch(() => undefined), now) : undefined;

export const isFresh = (session: Session, now: number) => session.expiresAt - now > AUTH.refreshSkewS;

export const authHeaders = (session: Session | undefined): Record<string, string> =>
  session ? { Authorization: `Bearer ${session.accessToken}` } : {};

export class AuthState implements Caller {
  private session?: Session;
  private renewing?: Promise<void>;

  constructor(
    private readonly deps: { fetch: Fetch; hint: Hint; onChange: (change: Change) => void; now?: () => number },
  ) {}

  get signedIn() {
    return this.session !== undefined;
  }

  // On load: the cookie is all a signed-in browser has, so it buys this page its own access token.
  async resume(): Promise<void> {
    if (this.deps.hint.get()) await this.renew();
  }

  async headers(): Promise<Record<string, string>> {
    if (this.session && !isFresh(this.session, this.now())) await this.renew();
    return authHeaders(this.session);
  }

  // Requests rejected together each report it; only the first to be refused twice ends the session.
  async rejected(retried: boolean): Promise<void> {
    if (!retried) await this.renew();
    else if (this.signedIn) this.end('expired');
  }

  async signIn(provider: Provider, body: object): Promise<boolean> {
    const res = await this.call(provider, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const session = await sessionFrom(res, this.now());
    if (!session) return false;
    this.session = session;
    this.deps.hint.set(true);
    this.deps.onChange('signedIn');
    return true;
  }

  async signOut(): Promise<void> {
    await this.call('session', { method: 'DELETE' });
    this.end('signedOut');
  }

  // One renewal at a time: every request waiting on a stale token shares it. A refused session ends quietly; an outage
  // leaves this page anonymous but keeps the session for the next one.
  private renew(): Promise<void> {
    this.renewing ??= this.call('token', { method: 'POST' })
      .then(async (res) => {
        if (res?.status === 401) return this.end('expired');
        const next = await sessionFrom(res, this.now());
        const was = this.signedIn;
        this.session = next;
        if (was !== this.signedIn) this.deps.onChange(next ? 'signedIn' : 'signedOut');
      })
      .finally(() => (this.renewing = undefined));
    return this.renewing;
  }

  private now() {
    return (this.deps.now ?? nowS)();
  }

  private end(change: Change) {
    this.session = undefined;
    this.deps.hint.set(false);
    this.deps.onChange(change);
  }

  private call(route: string, init: RequestInit): Promise<Response | undefined> {
    return this.deps.fetch(`${AUTH.routes}/${route}`, init).catch(() => undefined);
  }
}
