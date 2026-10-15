import { describe, expect, it, vi } from 'vitest';
import { AUTH } from '../src/app';
import { exchange, refresh, refreshTokenOf, sessionCookie, signOut, type Upstream } from '../src/server/auth-session';

const SITE = 'https://ffly.app';
const ACCESS = 'access.jwt.value';

const request = (path: string, { origin = SITE, cookie, body, method = 'POST' }: { origin?: string | null; cookie?: string; body?: object; method?: string } = {}) => {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (origin) headers.set('Origin', origin);
  if (cookie) headers.set('Cookie', cookie);
  return new Request(`${SITE}${AUTH.routes}/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
};

function upstream(status = 200, body: object = { access_token: ACCESS, refresh_token: 'refresh-2', expires_in: 3600, token_type: 'Bearer' }) {
  return vi.fn<Upstream>(async () => new Response(JSON.stringify(body), { status }));
}

const sent = (fetch: ReturnType<typeof upstream>, i = 0) => {
  const [url, init] = fetch.mock.calls[i];
  return { url, body: JSON.parse(String(init.body)) };
};

const session = `${AUTH.cookie}=refresh-1`;

describe('the session cookie', () => {
  it('is HttpOnly, Secure, SameSite=Strict and scoped to the auth routes', () => {
    const cookie = sessionCookie('r');
    for (const part of ['HttpOnly', 'Secure', 'SameSite=Strict', `Path=${AUTH.routes}`, `Max-Age=${AUTH.days * 86_400}`]) {
      expect(cookie).toContain(part);
    }
  });

  it('is read from the Cookie header among others', () => {
    expect(refreshTokenOf(`a=1; ${AUTH.cookie}=abc.def=; b=2`)).toBe('abc.def=');
    expect(refreshTokenOf('a=1')).toBeUndefined();
    expect(refreshTokenOf(null)).toBeUndefined();
  });
});

describe('sign-in', () => {
  it('trades the Apple identity token and keeps only the refresh token in the cookie', async () => {
    const fetch = upstream();
    const res = await exchange(request('apple', { body: { identityToken: 'apple-id-token' } }), 'apple', fetch);
    expect(sent(fetch)).toEqual({ url: `${AUTH.base}/apple/token`, body: { identity_token: 'apple-id-token' } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ access_token: ACCESS, expires_in: 3600 });
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(res.headers.get('Set-Cookie')).toBe(sessionCookie('refresh-2'));
    expect(res.headers.get('Set-Cookie')).not.toContain(ACCESS);
  });

  it('trades the Google credential as an id_token', async () => {
    const fetch = upstream();
    await exchange(request('google', { body: { credential: 'gis-credential' } }), 'google', fetch);
    expect(sent(fetch)).toEqual({ url: `${AUTH.base}/google/token`, body: { id_token: 'gis-credential' } });
  });

  it('revokes the session it replaces', async () => {
    const fetch = upstream();
    await exchange(request('google', { cookie: session, body: { credential: 'gis-credential' } }), 'google', fetch);
    expect(sent(fetch, 1)).toEqual({ url: `${AUTH.base}/revoke`, body: { refresh_token: 'refresh-1' } });
  });

  it('leaves a live session and its cookie alone when the provider token is refused', async () => {
    const fetch = upstream(401, { detail: 'invalid identity token' });
    const res = await exchange(request('apple', { cookie: session, body: { identityToken: 'apple-id-token' } }), 'apple', fetch);
    expect(res.status).toBe(401);
    expect(res.headers.get('Set-Cookie')).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('refuses a missing token or a foreign origin without calling overx-auth', async () => {
    const fetch = upstream();
    expect((await exchange(request('apple', { body: {} }), 'apple', fetch)).status).toBe(400);
    expect((await exchange(request('apple', { origin: 'https://evil.example', body: { identityToken: 't' } }), 'apple', fetch)).status).toBe(403);
    expect((await exchange(request('apple', { origin: null, body: { identityToken: 't' } }), 'apple', fetch)).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('refresh', () => {
  it('rotates the refresh token in the cookie and answers the access token', async () => {
    const fetch = upstream();
    const res = await refresh(request('token', { cookie: session }), fetch);
    expect(sent(fetch)).toEqual({ url: `${AUTH.base}/token`, body: { refresh_token: 'refresh-1' } });
    expect(await res.json()).toEqual({ access_token: ACCESS, expires_in: 3600 });
    expect(res.headers.get('Set-Cookie')).toBe(sessionCookie('refresh-2'));
  });

  it('answers 401 and clears the cookie when there is no session or overx-auth refuses it', async () => {
    for (const [cookie, fetch] of [[undefined, upstream()], [session, upstream(401, { detail: 'refresh token revoked' })]] as const) {
      const res = await refresh(request('token', { cookie }), fetch);
      expect(res.status).toBe(401);
      expect(res.headers.get('Set-Cookie')).toBe(sessionCookie('', 0));
    }
  });

  it('keeps the cookie through an outage or a rate limit', async () => {
    for (const fetch of [upstream(503, {}), upstream(429, {}), vi.fn<Upstream>(async () => Promise.reject(new TypeError('fetch failed')))]) {
      const res = await refresh(request('token', { cookie: session }), fetch);
      expect(res.status).toBe(502);
      expect(res.headers.get('Set-Cookie')).toBeNull();
    }
  });
});

describe('sign-out', () => {
  it('revokes the refresh token and clears the cookie', async () => {
    const fetch = upstream(204, {});
    const res = await signOut(request('session', { cookie: session, method: 'DELETE' }), fetch);
    expect(sent(fetch)).toEqual({ url: `${AUTH.base}/revoke`, body: { refresh_token: 'refresh-1' } });
    expect(res.status).toBe(204);
    expect(res.headers.get('Set-Cookie')).toBe(sessionCookie('', 0));
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('clears the cookie even when overx-auth is down', async () => {
    const fetch = vi.fn<Upstream>(async () => Promise.reject(new TypeError('fetch failed')));
    expect((await signOut(request('session', { cookie: session, method: 'DELETE' }), fetch)).status).toBe(204);
  });
});
