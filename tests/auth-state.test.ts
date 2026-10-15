import { describe, expect, it, vi } from 'vitest';
import { AUTH } from '../src/app';
import { AuthState, authHeaders, isFresh, type Change, type Hint } from '../src/scripts/auth-state';

const NOW = 1_800_000_000;
const answer = (token: string, expiresIn = 3600) => new Response(JSON.stringify({ access_token: token, expires_in: expiresIn }), { status: 200 });

function setup(responses: (() => Response)[], signedInBefore = false) {
  let stored = signedInBefore;
  const hint: Hint = { get: () => stored, set: vi.fn((on: boolean) => void (stored = on)) };
  const changes: Change[] = [];
  const fetch = vi.fn(async (_url: string, _init?: RequestInit) => (responses.shift() ?? (() => new Response(null, { status: 500 })))());
  const auth = new AuthState({ fetch, hint, onChange: (change) => changes.push(change), now: () => NOW });
  return { auth, fetch, hint, changes, stored: () => stored };
}

describe('the header for a request', () => {
  it('is none while signed out and a Bearer token while signed in', () => {
    expect(authHeaders(undefined)).toEqual({});
    expect(authHeaders({ accessToken: 'a', expiresAt: NOW })).toEqual({ Authorization: 'Bearer a' });
  });

  it('counts a token as stale within the refresh skew of its expiry', () => {
    expect(isFresh({ accessToken: 'a', expiresAt: NOW + AUTH.refreshSkewS + 1 }, NOW)).toBe(true);
    expect(isFresh({ accessToken: 'a', expiresAt: NOW + AUTH.refreshSkewS }, NOW)).toBe(false);
  });
});

describe('AuthState', () => {
  it('asks for nothing on load in a browser that never signed in', async () => {
    const { auth, fetch } = setup([]);
    await auth.resume();
    expect(fetch).not.toHaveBeenCalled();
    expect(await auth.headers()).toEqual({});
  });

  it('resumes a session from the cookie and keeps the token in memory only', async () => {
    const { auth, fetch, hint, changes } = setup([() => answer('t1')], true);
    await auth.resume();
    expect(fetch).toHaveBeenCalledWith(`${AUTH.routes}/token`, { method: 'POST' });
    expect(await auth.headers()).toEqual({ Authorization: 'Bearer t1' });
    expect(changes).toEqual(['signedIn']);
    expect(vi.mocked(hint.set).mock.calls.flat()).not.toContain('t1');
  });

  it('renews a stale token once for every request waiting on it', async () => {
    const { auth, fetch } = setup([() => answer('old', 10), () => answer('new')], true);
    await auth.resume();
    const [a, b] = await Promise.all([auth.headers(), auth.headers()]);
    expect(a).toEqual({ Authorization: 'Bearer new' });
    expect(b).toEqual(a);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('refreshes once on the first 401 and signs out once on the second', async () => {
    const { auth, changes, stored } = setup([() => answer('t1'), () => answer('t2')], true);
    await auth.resume();
    await auth.rejected(false);
    expect(await auth.headers()).toEqual({ Authorization: 'Bearer t2' });
    await auth.rejected(true);
    await auth.rejected(true);
    expect(auth.signedIn).toBe(false);
    expect(stored()).toBe(false);
    expect(changes).toEqual(['signedIn', 'expired']);
  });

  it('drops to signed out with one notice when the session was revoked', async () => {
    const { auth, changes, stored } = setup([() => new Response(null, { status: 401 })], true);
    await auth.resume();
    expect(auth.signedIn).toBe(false);
    expect(stored()).toBe(false);
    expect(changes).toEqual(['expired']);
  });

  it('stays anonymous through an outage but keeps the session for the next page', async () => {
    const { auth, changes, stored } = setup([() => new Response(null, { status: 502 })], true);
    await auth.resume();
    expect(auth.signedIn).toBe(false);
    expect(stored()).toBe(true);
    expect(changes).toEqual([]);
  });

  it('signs in through the site route and out again', async () => {
    const { auth, fetch, changes, stored } = setup([() => answer('t1'), () => new Response(null, { status: 204 })]);
    expect(await auth.signIn('google', { credential: 'c' })).toBe(true);
    expect(fetch.mock.calls[0][0]).toBe(`${AUTH.routes}/google`);
    expect(stored()).toBe(true);
    await auth.signOut();
    expect(fetch.mock.calls[1]).toEqual([`${AUTH.routes}/session`, { method: 'DELETE' }]);
    expect(auth.signedIn).toBe(false);
    expect(changes).toEqual(['signedIn', 'signedOut']);
  });

  it('reports a refused sign-in and stays signed out', async () => {
    const { auth, changes } = setup([() => new Response(null, { status: 401 })]);
    expect(await auth.signIn('apple', { identityToken: 'x' })).toBe(false);
    expect(changes).toEqual([]);
  });
});
