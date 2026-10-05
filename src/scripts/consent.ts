import { GA_MEASUREMENT_ID, GTAG_SCRIPT } from '../app';
import { analyticsCookies, choiceCookie, expiryCookies, mustReload, readChoice, shouldShowBanner, type Choice } from './consent-state';

declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

// Consent Mode v2, basic: nothing from Google loads before Accept, and then only analytics storage is granted.
function loadAnalytics(id: string) {
  window.dataLayer = window.dataLayer || [];
  // gtag.js only reads Arguments objects from the dataLayer; a pushed array is ignored.
  const gtag: (...args: unknown[]) => void = function () {
    window.dataLayer.push(arguments);
  };
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
  });
  gtag('consent', 'update', { analytics_storage: 'granted' });
  gtag('js', new Date());
  gtag('config', id, { allow_google_signals: false, allow_ad_personalization_signals: false });
  const script = document.createElement('script');
  script.async = true;
  script.src = GTAG_SCRIPT(id);
  document.head.append(script);
}

function start(id: string) {
  const banner = document.getElementById('consent');
  if (!banner) return;
  let choice = readChoice(document.cookie);
  let opener: HTMLElement | undefined;

  const choose = (next: Choice) => {
    const previous = choice;
    document.cookie = choiceCookie(next);
    choice = next;
    banner.hidden = true;
    opener?.focus();
    if (mustReload(previous, next)) location.reload();
    else if (next === 'granted' && previous !== 'granted') loadAnalytics(id);
  };

  banner.querySelector('[data-consent="granted"]')?.addEventListener('click', () => choose('granted'));
  banner.querySelector('[data-consent="denied"]')?.addEventListener('click', () => choose('denied'));
  for (const button of document.querySelectorAll<HTMLElement>('[data-consent-open]')) {
    button.addEventListener('click', () => {
      opener = button;
      banner.hidden = false;
      banner.querySelector<HTMLElement>('button')?.focus();
    });
  }

  // Withdrawal reloads the page: gtag rewrites its cookies as the old page unloads, so they are expired on the new one.
  if (choice === 'granted') loadAnalytics(id);
  else for (const cookie of expiryCookies(analyticsCookies(document.cookie), location.hostname)) document.cookie = cookie;
  banner.hidden = !shouldShowBanner(id, choice);
}

if (GA_MEASUREMENT_ID) start(GA_MEASUREMENT_ID);
