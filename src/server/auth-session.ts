import { AUTH } from '../app';

// The site's side of sign-in (spec 014), after Mushtra's mushtraSession.ts: the routes trade a provider token or the
// refresh token at overx-auth. The browser keeps only the refresh token, in an HttpOnly cookie scoped to these routes,
// and gets the short-lived access token in the answer, never in a cookie.

export type Upstream = (url: string, init: RequestInit) => Promise<Response>;
export type Provider = 'apple' | 'google';

interface TokenAnswer {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

const DAY_S = 86_400;
const PROVIDERS: Record<Provider, { field: string; path: string; upstreamField: string }> = {
  apple: { field: 'identityToken', path: '/apple/token', upstreamField: 'identity_token' },
  google: { field: 'credential', path: '/google/token', upstreamField: 'id_token' },
};

export const sessionCookie = (refreshToken: string, maxAgeS = AUTH.days * DAY_S) =>
  `${AUTH.cookie}=${refreshToken}; Path=${AUTH.routes}; Max-Age=${maxAgeS}; HttpOnly; Secure; SameSite=Strict`;
export const CLEARED_COOKIE = sessionCookie('', 0);

export function refreshTokenOf(cookieHeader: string | null): string | undefined {
  for (const part of cookieHeader?.split(';') ?? []) {
    const [name, ...value] = part.trim().split('=');
    if (name === AUTH.cookie) return value.join('=') || undefined;
  }
  return undefined;
}

// CSRF: on top of SameSite=Strict, a request counts only when the browser says it comes from this very site.
export const sameOrigin = (request: Request) => request.headers.get('Origin') === new URL(request.url).origin;

function reply(status: number, body?: object, cookie?: string): Response {
  const headers = new Headers({ 'Cache-Control': 'no-store' });
  if (body) headers.set('Content-Type', 'application/json');
  if (cookie) headers.set('Set-Cookie', cookie);
  return new Response(body ? JSON.stringify(body) : null, { status, headers });
}

const isTokenAnswer = (body: unknown): body is TokenAnswer => {
  const b = body as Partial<TokenAnswer> | null;
  return typeof b?.access_token === 'string' && typeof b.refresh_token === 'string' && typeof b.expires_in === 'number';
};

const post = (upstream: Upstream, path: string, body: object) =>
  upstream(`${AUTH.base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(AUTH.timeoutMs),
  });

// A refused token answers 401 with `refused` as its cookie; an outage or rate limit keeps the cookie for the next page
// (502). The page gets the token's lifetime, not its expiry, so its own clock times the renewal.
async function mint(upstream: Upstream, path: string, body: object, refused?: string): Promise<Response> {
  let res: Response;
  try {
    res = await post(upstream, path, body);
  } catch {
    return reply(502);
  }
  if (res.status === 429 || res.status >= 500) return reply(502);
  const answer: unknown = await res.json().catch(() => undefined);
  if (!res.ok) return reply(401, undefined, refused);
  if (!isTokenAnswer(answer)) return reply(502);
  return reply(200, { access_token: answer.access_token, expires_in: answer.expires_in }, sessionCookie(answer.refresh_token));
}

const revoke = (upstream: Upstream, refreshToken: string) =>
  post(upstream, '/revoke', { refresh_token: refreshToken }).catch(() => undefined);

// POST /api/auth/{apple,google}. Signing in over a live session revokes the old one, so no refresh token is orphaned;
// a refused provider token leaves that session and its cookie as they were.
export async function exchange(request: Request, provider: Provider, upstream: Upstream = fetch): Promise<Response> {
  if (!sameOrigin(request)) return reply(403);
  const { field, path, upstreamField } = PROVIDERS[provider];
  const body = (await request.json().catch(() => undefined)) as Record<string, unknown> | undefined;
  const token = body?.[field];
  if (typeof token !== 'string' || !token) return reply(400);
  const answer = await mint(upstream, path, { [upstreamField]: token });
  const previous = refreshTokenOf(request.headers.get('Cookie'));
  if (answer.ok && previous) await revoke(upstream, previous);
  return answer;
}

// POST /api/auth/token: a fresh access token for the page, rotating the refresh token in the cookie.
export async function refresh(request: Request, upstream: Upstream = fetch): Promise<Response> {
  if (!sameOrigin(request)) return reply(403);
  const token = refreshTokenOf(request.headers.get('Cookie'));
  if (!token) return reply(401, undefined, CLEARED_COOKIE);
  return mint(upstream, '/token', { refresh_token: token }, CLEARED_COOKIE);
}

// DELETE /api/auth/session: revoke at overx-auth (best effort) and clear the cookie either way.
export async function signOut(request: Request, upstream: Upstream = fetch): Promise<Response> {
  if (!sameOrigin(request)) return reply(403);
  const token = refreshTokenOf(request.headers.get('Cookie'));
  if (token) await revoke(upstream, token);
  return reply(204, undefined, CLEARED_COOKIE);
}
