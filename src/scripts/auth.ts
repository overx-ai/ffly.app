import { APPLE_JS, AUTH, GOOGLE_JS, SIGN_IN_PROVIDERS } from '../app';
import { AuthState, type Change, type Hint, type Provider } from './auth-state';
import { loadScript } from './load-script';

// The sign-in row and sheet of the web search (spec 014), on the page only while SIGN_IN is on.

export interface AccountText {
  signedIn: string;
  signedInPro: string;
  signedOut: string;
  popupBlocked: string;
  failed: string;
}

interface AppleAnswer {
  authorization?: { id_token?: string };
}

declare global {
  interface Window {
    AppleID?: { auth: { init(config: object): void; signIn(): Promise<AppleAnswer> } };
    google?: {
      accounts: { id: { initialize(config: object): void; renderButton(parent: HTMLElement, options: object): void; prompt(): void } };
    };
  }
}

// Apple's answers when the visitor closes the popup themselves: nothing went wrong.
const CANCELLED = ['popup_closed_by_user', 'user_cancelled_authorize'];

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const storedHint: Hint = {
  get: () => {
    try {
      return localStorage.getItem(AUTH.hintKey) === '1';
    } catch {
      return false;
    }
  },
  set: (on) => {
    try {
      if (on) localStorage.setItem(AUTH.hintKey, '1');
      else localStorage.removeItem(AUTH.hintKey);
    } catch {
      // Storage blocked: the page then asks for its token only after a sign-in in this tab.
    }
  },
};

export function setupAccount(text: AccountText, onChange: (change: Change) => void) {
  const sheet = byId<HTMLDialogElement>('sign-in-sheet');
  // Only a ready provider's button is on the page (spec 016).
  const apple = document.getElementById('apple-sign-in') as HTMLButtonElement | null;
  const error = byId('sign-in-error');
  const status = byId('account-status');
  const signInButton = byId('sign-in');
  const signOutButton = byId<HTMLButtonElement>('sign-out');

  const auth = new AuthState({
    fetch: (url, init) => fetch(url, init),
    hint: storedHint,
    onChange: (change) => {
      if (change === 'signedIn') sheet.close();
      onChange(change);
    },
  });

  const finish = async (provider: Provider, body: object) => {
    if (!(await auth.signIn(provider, body))) error.textContent = text.failed;
  };

  // A ready provider's script loads only once the visitor asks to sign in, so a signed-out page sends it nothing. A
  // script that failed to load is tried again at the next opening.
  const loading = new Map<string, Promise<void>>();
  const loadOnce = (src: string, ready: () => void) => {
    let pending = loading.get(src);
    if (!pending) {
      pending = loadScript(src).then(ready);
      pending.catch(() => loading.delete(src));
      loading.set(src, pending);
    }
    return pending;
  };
  const initApple = () => {
    window.AppleID!.auth.init({ clientId: AUTH.appleServiceId, scope: 'email', redirectURI: AUTH.appleReturnUrl, usePopup: true });
    apple!.disabled = false;
  };
  const initGoogle = () => {
    const id = window.google!.accounts.id;
    id.initialize({
      client_id: AUTH.googleClientId,
      callback: ({ credential }: { credential: string }) => void finish('google', { credential }),
      itp_support: true,
      use_fedcm_for_prompt: true,
    });
    const button = byId('gis-sign-in');
    id.renderButton(button, { type: 'standard', theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', locale: document.documentElement.lang });
    button.hidden = false;
  };
  const load: Record<Provider, () => Promise<unknown>> = {
    apple: () => loadOnce(APPLE_JS, initApple),
    google: () => loadOnce(GOOGLE_JS, initGoogle).then(() => window.google?.accounts.id.prompt()),
  };

  // signIn() runs inside the click, or the browser blocks Apple's popup.
  apple?.addEventListener('click', () => {
    error.textContent = '';
    window.AppleID?.auth.signIn().then(
      (answer) => {
        const token = answer.authorization?.id_token;
        if (token) return finish('apple', { identityToken: token });
        error.textContent = text.failed;
      },
      (failure: { error?: string } | undefined) => {
        if (failure?.error === 'popup_blocked_by_browser') error.textContent = text.popupBlocked;
        else if (!CANCELLED.includes(failure?.error ?? '')) error.textContent = text.failed;
      },
    );
  });

  // One Tap is offered once per opening, never again until the visitor opens the sheet again.
  for (const opener of document.querySelectorAll<HTMLElement>('[data-sign-in]')) {
    opener.addEventListener('click', () => {
      error.textContent = '';
      sheet.showModal();
      for (const provider of SIGN_IN_PROVIDERS) load[provider]().catch(() => undefined);
    });
  }
  byId('sign-in-close').addEventListener('click', () => sheet.close());
  signOutButton.addEventListener('click', () => {
    signOutButton.disabled = true;
    void auth.signOut().finally(() => (signOutButton.disabled = false));
  });

  const statusLine = (pro: boolean, expired: boolean) => {
    if (auth.signedIn) return pro ? text.signedInPro : text.signedIn;
    return expired ? text.signedOut : '';
  };

  const render = (pro: boolean, expired = false) => {
    status.textContent = statusLine(pro, expired);
    signInButton.hidden = auth.signedIn;
    signOutButton.hidden = !auth.signedIn;
  };

  return { auth, render };
}
