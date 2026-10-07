// Asserts legal and site facts in the built output (run after `astro build`). Regressions: docs/bugs/001, 002, 003.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
// A constant's initialiser in src/app.ts, or undefined when its declaration is missing.
const appConstant = (name) => source('src/app.ts').match(new RegExp(`export const ${name}\\b[^=]*=\\s*([^;]+);`))?.[1].trim();

// The languages and localized slugs, read from the TypeScript that drives the build (src/i18n/locales.ts, src/site-pages.ts).
const LANGS = [...source('src/i18n/locales.ts').matchAll(/\{ code: '(\w+)', prefix: '(\w*)', hreflang: '([\w-]+)', tag: '([\w-]+)', og: '(\w+)'/g)]
  .map(([, code, prefix, hreflang, tag, og]) => ({ code, prefix, hreflang, tag, og }));
const LOCALIZED_SLUGS = JSON.parse(
  source('src/site-pages.ts').match(/LOCALIZED_SLUGS = (\[[^\]]*\])/)?.[1].replace(/'/g, '"') ?? '[]',
);
const X_DEFAULT = 'x-default';
// Carriers are named in the guides, the legal pages and live search results, never in the site's own pitch.
const CARRIERS = ['Ryanair', 'Wizz Air', 'airBaltic', 'Volotea'];

// The App Store privacy labels, read from the app's inventory when the sibling repo is checked out, else this copy of
// ios-ffly docs/compliance/data-inventory.yaml (2026-10-07). /privacy #app-store-labels must list exactly these.
const INVENTORY = new URL('../../../0E-extensions/ios-ffly/docs/compliance/data-inventory.yaml', import.meta.url);
const PINNED_LABELS = [
  { type: 'Search History', linked: true, tracking: false },
  { type: 'User ID', linked: true, tracking: false },
  { type: 'Purchase History', linked: true, tracking: false },
  { type: 'Product Interaction', linked: false, tracking: false },
  { type: 'Device ID', linked: true, tracking: true },
  { type: 'Crash Data', linked: false, tracking: false },
  { type: 'Performance Data', linked: false, tracking: false },
  { type: 'Email Address', linked: true, tracking: false },
  { type: 'Customer Support', linked: true, tracking: false },
];
function inventoryLabels(yaml) {
  const field = (block, key) => block.match(new RegExp(`^\\s+${key}:\\s*"?([^"#\\n]*?)"?\\s*(?:#.*)?$`, 'm'))?.[1];
  return yaml
    .split(/^data_categories:/m)[1]
    ?.split(/^[^\s#]/m)[0]
    .split(/^\s+- id:/m)
    .slice(1)
    .filter((block) => field(block, 'collected') === 'true')
    .map((block) => ({
      type: field(block, 'apple_category'),
      linked: field(block, 'linked_to_identity') === 'true',
      tracking: field(block, 'used_for_tracking') === 'true',
    })) ?? [];
}
const LABELS = existsSync(INVENTORY) ? inventoryLabels(readFileSync(INVENTORY, 'utf8')) : PINNED_LABELS;

const failures = [];

function check(ok, message) {
  if (!ok) failures.push(message);
}

function plainText(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Inlined CSS is not copy, and words like "background" are CSS properties.
const withoutCss = (html) => html.replace(/<style\b[\s\S]*?<\/style>/g, '').replace(/\sstyle="[^"]*"/g, '');

// Astro escapes ' as &#39; in {expressions} but not in set:html, so copy checks must see both as one apostrophe.
function copyText(text) {
  return text.replace(/&#0*39;|&#x0*27;|&apos;|&rsquo;|\\u0027|\u2019/gi, "'").replace(/\s+/g, ' ');
}

function readHtml(page) {
  return readFileSync(`${DIST}${page ? `${page}/` : ''}index.html`, 'utf8');
}

// A missing section is itself a failure, so the "must not" checks cannot pass on an empty string.
function readPage(page) {
  const html = readHtml(page);
  const found = html.matchAll(/<section class="block" id="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g);
  const sections = new Map([...found].map(([, id, body]) => [id, plainText(body)]));
  return (id) => {
    const text = sections.get(id) ?? '';
    check(text !== '', `${page}: section #${id} missing from the build`);
    return text;
  };
}

// SMIL <animateMotion> re-laid out the home page every frame, off screen too; the fly is a compositor transform animation.
for (const { prefix: lang } of LANGS) {
  const home = readHtml(lang);
  check(!home.includes('<animateMotion'), `${lang || 'en'} home: the map fly must not use SMIL <animateMotion>`);
  check(/@keyframes fly-route\{/.test(home), `${lang || 'en'} home: the map fly needs its transform keyframes`);
}

// Both legal pages: required sections in GDPR Art. 13, CCPA and App Store 3.1.2/5.1.1 order of business (spec 011).
const placeholderValue = (name) => appConstant(name)?.match(/^'([^']*)'$/)?.[1];
// An empty representative means none appointed yet: /privacy then leaves #representatives out (owner, 2026-10-07).
const REPRESENTED = Boolean(placeholderValue('EU_REPRESENTATIVE') || placeholderValue('UK_REPRESENTATIVE'));
const PRIVACY_IDS = [
  'who-we-are', ...(REPRESENTED ? ['representatives'] : []), 'app-store-labels', 'not-collected', 'searches', 'app-user-id', 'ip-address',
  'purchases', 'analytics', 'crash-performance', 'attribution', 'live-activity', 'feedback', 'on-device',
  'booking-links', 'web-search', 'website', 'legal-bases', 'sharing', 'transfers', 'security', 'retention', 'rights',
  'ccpa', 'children', 'changes', 'contact',
];
const TERMS_IDS = [
  'agreement', 'service', 'not-a-travel-agent', 'prices', 'free-and-pro', 'subscriptions', 'lifetime', 'withdrawal',
  'acceptable-use', 'ip', 'availability', 'disclaimer', 'liability', 'apple', 'termination', 'privacy', 'changes',
  'governing-law', 'general', 'contact',
];
// "Section 6" and "Section 7" are cited by the app's paywall review notes and by these pages: their numbers are fixed.
const FIXED_TERMS_SECTIONS = [
  ['06', 'subscriptions', 'Subscription Terms (Auto-Renewable)'],
  ['07', 'lifetime', 'ffly Pro Lifetime Purchase'],
];

const terms = readPage('terms');
for (const id of TERMS_IDS) terms(id);
const termsHtml = readHtml('terms');
for (const [num, id, title] of FIXED_TERMS_SECTIONS) {
  check(
    new RegExp(`<section class="block" id="${id}"[^>]*>\\s*<h2[^>]*><span class="num"[^>]*>${num}</span>${title.replace(/[()]/g, '\\$&')}</h2>`).test(termsHtml),
    `Terms: Section ${Number(num)} must stay #${id} "${title}"`,
  );
}
check(/through the ffly app or ffly\.app/.test(terms('acceptable-use')), 'Terms Acceptable Use must allow ffly.app');
check(/web search/i.test(terms('free-and-pro')), 'Terms section 5 must describe the web search');
check(/every route in full/.test(terms('free-and-pro').split('ffly Pro:')[0]), 'Terms: app Free searches show every route in full (spec 016, T-023)');
// Cached partner fares carry no checked time (ffly-api spec 532), so no page may promise one for every fare.
check(!/when each\s+fare was last checked/.test(terms('prices')), 'Terms: must not promise a checked time for every fare');
check(/up to a week old and show no checked time/.test(terms('prices')), 'Terms: must say cached fares may be up to a week old and show no checked time');
check(/at no extra cost/.test(terms('not-a-travel-agent')), 'Terms: partner links must disclose the commission');
check(/next renewal/.test(terms('subscriptions')), 'Terms: a price change must take effect at the next renewal');
const withdrawal = terms('withdrawal');
check(/14 days/.test(withdrawal) && /immediate|at once/.test(withdrawal) && termsHtml.includes('href="https://reportaproblem.apple.com"'), 'Terms: #withdrawal must give the EU/UK 14-day right, the immediate-access waiver and Apple\'s refund link');
const apple = copyText(terms('apple'));
for (const clause of ['acknowledge', 'licence', 'maintenance and support', 'warranty', 'product claims', 'intellectual property', 'legal compliance', 'third-party', 'third-party beneficiar']) {
  check(apple.toLowerCase().includes(clause), `Terms: #apple must carry the Apple EULA clause on ${clause}`);
}
check(/mandatory/.test(terms('liability')), 'Terms: liability needs the mandatory-law carve-out');
check(/30 days/.test(terms('changes')), 'Terms: material changes need 30 days\' notice');
check(/consumer/.test(terms('governing-law')) && /courts/.test(terms('governing-law')), 'Terms: governing law needs the courts and the consumer carve-out');
const general = terms('general');
for (const [term, what] of [[/unenforceable/, 'severability'], [/transfer/, 'assignment'], [/whole agreement/, 'entire agreement'], [/not a waiver/, 'no waiver']]) {
  check(term.test(general), `Terms: #general must carry ${what}`);
}

const privacy = readPage('privacy');
const privacyHtml = readHtml('privacy');
for (const id of PRIVACY_IDS) privacy(id);
// The App Store labels, each named in a <span class="label">, grouped as Apple groups them.
const labelsHtml = privacyHtml.match(/<section class="block" id="app-store-labels"[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? '';
const labelGroup = (heading) =>
  [...(labelsHtml.match(new RegExp(`${heading}:</strong>([\\s\\S]*?)</li>`))?.[1] ?? '').matchAll(/<span class="label">([^<]+)<\/span>/g)]
    .map(([, type]) => type).sort();
const want = (pick) => LABELS.filter(pick).map(({ type }) => type).sort();
for (const [heading, pick] of [
  ['Data used to track you', (l) => l.tracking],
  ['Data linked to you', (l) => l.linked],
  ['Data not linked to you', (l) => !l.linked],
]) {
  const got = labelGroup(heading);
  check(JSON.stringify(got) === JSON.stringify(want(pick)), `Privacy: "${heading}" must list exactly ${want(pick).join(', ')} (app inventory), got ${got.join(', ') || 'nothing'}`);
}
const privacyText = copyText(plainText(privacyHtml));
for (const [pattern, what] of [
  [/\bno tracking\b/i, '"no tracking"'],
  [/(?:don't|doesn't|do not|does not|never) track(?:s)? you/i, 'a "does not track you" claim'],
  [/(?:doesn't|does not|never) use the advertising identifier/i, 'a "does not use the advertising identifier" claim'],
  [/track you:?\s*none/i, '"Data used to track you: none"'],
  [/never used for tracking/i, '"never used for tracking"'],
]) check(!pattern.test(privacyText), `Privacy: must not say ${what}: the app uses the IDFA after ATT Allow`);
const attribution = privacy('attribution');
for (const [term, what] of [
  ['AppsFlyer', 'AppsFlyer'], ['App Tracking Transparency', 'the ATT prompt'], ['SKAdNetwork', 'SKAdNetwork'],
  ['Apple Search Ads', 'the Apple Search Ads token'], ['Ad measurement', 'the EEA/UK/CH Ad measurement switch'],
  ['Switzerland', 'the EEA, UK and Switzerland rule'], ['Tracking', 'withdrawal in iOS Settings'],
]) check(attribution.includes(term), `Privacy: #attribution must cover ${what}`);
check(privacyHtml.includes('href="https://www.appsflyer.com/optout"'), 'Privacy: #attribution must link AppsFlyer\'s opt-out page');
check(/push token/.test(privacy('live-activity')) && /deleted with the search/.test(privacy('live-activity')), 'Privacy: #live-activity must say the push token goes with the search');
check(/Standard Contractual Clauses/.test(privacy('transfers')) && /UK/.test(privacy('transfers')) && /Belarus/.test(privacy('transfers')), 'Privacy: transfers must name the controller\'s country and the SCCs with the UK Addendum');
if (REPRESENTED) check(/Article 27/.test(privacy('representatives')), 'Privacy: #representatives must name the Art. 27 representatives');
const rights = privacy('rights');
for (const right of ['access', 'correct', 'delete', 'portable', 'object', 'restrict', 'withdraw', 'one month', 'identity', 'data protection authority', 'automated']) {
  check(rights.includes(right), `Privacy: #rights must cover "${right}"`);
}
const legalBases = privacy('legal-bases');
for (const basis of ['consent', 'contract', 'legitimate interest']) check(legalBases.includes(basis), `Privacy: #legal-bases must name ${basis}`);
check(/App Tracking Transparency|advertising identifier/.test(legalBases) && /Ad measurement/.test(legalBases), 'Privacy: #legal-bases must put the IDFA and EEA/UK/CH attribution on consent');
const ccpa = copyText(privacy('ccpa'));
for (const [term, what] of [[/sharing/, 'IDFA attribution as "sharing"'], [/Ask App Not to Track/, 'ATT as the opt-out'], [/Global Privacy Control/, 'GPC'], [/do not sell/i, 'no sale'], [/sensitive personal information/, 'no sensitive data'], [/categor/i, 'the categories']]) {
  check(term.test(ccpa), `Privacy: #ccpa must cover ${what}`);
}
check(/13/.test(privacy('children')) && /16/.test(privacy('children')), 'Privacy: children must say under 13, and under 16 in the EEA and UK');
check(/30 days/.test(privacy('changes')), 'Privacy: material changes need 30 days\' notice');
check(!/\b\d+ days?\b/.test(copyText(privacy('feedback')).replace(/up to \d+ days and is sent once/, '')), 'Privacy: feedback has no retention job, so #feedback states no day count but the offline queue');
check(!/your installation identifier\.?<\/li>/.test(privacyHtml.match(/id="feedback"[\s\S]*?<\/section>/)?.[0] ?? ''), 'Privacy: feedback carries its own random id, never the installation identifier');
check(/nothing that identifies you/.test(privacy('searches')), 'Privacy: fare sources must be said to get nothing that identifies you');
check(!/not linked to your identity/.test(privacy('searches')), 'Privacy: trip searches must not be called unlinked');
check(/same for every ffly user/.test(privacy('booking-links')), 'Privacy: the partner identifier must be said to be ffly-wide');
// Spec 003: the web search remembers places in functional cookies, never dates; notifications only on request.
const website = privacy('website');
check(/cookies/.test(website) && /never remembers your travel dates/.test(website), 'Privacy: #website must cover the search cookies and say dates are never kept');
// The consent cookie exists only while the banner does (GA_MEASUREMENT_ID set).
const consentCookie = appConstant('CONSENT')?.match(/cookie: '([^']+)'/)?.[1];
const siteCookies = [...source('src/app.ts').matchAll(/cookie: '([^']+)'/g)].map(([, name]) => name)
  .filter((name) => name !== consentCookie || appConstant('GA_MEASUREMENT_ID') !== 'undefined');
for (const cookie of siteCookies) {
  check(website.includes(cookie), `Privacy: #website must name the cookie ${cookie}`);
}
const webSearch = privacy('web-search');
check(/Notify me/.test(webSearch) && /notification/.test(webSearch), 'Privacy: #web-search must cover notifications');
check(/booking partner/.test(webSearch) && /at no extra cost/.test(webSearch), 'Privacy: #web-search must cover partner booking links');
check(/at no extra cost/.test(privacy('booking-links')), 'Privacy: partner links must disclose the commission');
// Spec 005: a web search's result is kept, unlinked, so its shared link opens with it until the trip starts.
const sharedSearch = /without anything that identifies you[^.]*link[^.]*until the trip's first day/;
check(sharedSearch.test(copyText(webSearch)), "Privacy: #web-search must say shared web searches are stored without anything that identifies you, until the trip's first day");
const retention = copyText(privacy('retention'));
check(
  /in the app are deleted within \d+ hours/.test(retention) && /until the trip's first day/.test(retention),
  "Privacy: #retention must keep app searches to 24 hours and web search results until the trip's first day",
);

// Both legal pages show when they take effect, the same date as "Last updated" (src/site-pages.ts lastmod).
for (const page of ['privacy', 'terms']) {
  const [, effective, updated] = readHtml(page).match(/Effective: ([^<·]+?) · Last updated: ([^<]+?)</) ?? [];
  check(effective !== undefined && effective === updated, `${page}: must show "Effective: {date} · Last updated: {date}", both the lastmod`);
}

// Operator details the owner must supply (spec 011). Until each is filled, the pages are not fit to publish.
const OPERATOR_PLACEHOLDERS = ['OPERATOR_ADDRESS', 'EU_REPRESENTATIVE', 'UK_REPRESENTATIVE', 'GOVERNING_LAW'];
const OPTIONAL = new Set(['EU_REPRESENTATIVE', 'UK_REPRESENTATIVE']);
const unfilled = OPERATOR_PLACEHOLDERS.filter((name) => {
  const v = placeholderValue(name);
  return v === undefined || v === 'REPLACE_ME' || (v === '' && !OPTIONAL.has(name));
});
check(unfilled.length === 0, `src/app.ts: fill ${unfilled.join(', ')} (still REPLACE_ME): the legal pages cannot be published without them`);
for (const [name, page, id] of [
  ['OPERATOR_ADDRESS', 'privacy', 'who-we-are'], ['OPERATOR_PHONE', 'privacy', 'who-we-are'], ['EU_REPRESENTATIVE', 'privacy', 'representatives'],
  ['UK_REPRESENTATIVE', 'privacy', 'representatives'], ['OPERATOR_ADDRESS', 'terms', 'contact'], ['OPERATOR_PHONE', 'terms', 'apple'],
  ['GOVERNING_LAW', 'terms', 'governing-law'],
]) {
  const value = placeholderValue(name);
  if (value === '' && OPTIONAL.has(name)) continue;
  check(value !== undefined && (page === 'privacy' ? privacy : terms)(id).includes(value), `${page}: #${id} must show ${name} from src/app.ts`);
}

// Owner, 2026-10-07: the operator is a person; OverX is named only by the footer credit and the contact address.
const CONTACT = appConstant('CONTACT_EMAIL')?.replace(/'/g, '') ?? '';
for (const page of ['privacy', 'terms', 'support']) {
  const main = readHtml(page).match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? '';
  check(main !== '' && !/overx/i.test(main.replaceAll(CONTACT, '')), `${page}: must not mention OverX (the contact address aside)`);
}
// App Free is full since spec 016: nothing may call its routes hidden or blurred.
for (const page of ['privacy', 'terms', 'support', '']) {
  check(!/partially hidden|blurred|blurs|hidden results/i.test(plainText(withoutCss(readHtml(page)))), `${page || 'home'}: app Free shows every route in full, never "hidden" or "blurred"`);
}

const feedbackNum = readHtml('privacy').match(/id="feedback"[^>]*>\s*<h2[^>]*><span class="num"[^>]*>0*(\d+)</)?.[1];
check(
  feedbackNum !== undefined && readHtml('support').includes(`href="/privacy#feedback">Section ${feedbackNum} `),
  'Support: the delete-my-data answer must link the privacy feedback section by its number',
);

const jsonLd = (html) =>
  [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(([, json]) => JSON.parse(json));
const ofType = (schemas, type) => schemas.filter((schema) => schema['@type'] === type);

const answers = ofType(jsonLd(readHtml('support')), 'FAQPage')
  .flatMap((faq) => faq.mainEntity.map((q) => q.acceptedAnswer.text));
check(answers.length > 0, 'Support: FAQPage JSON-LD missing');
for (const text of answers) {
  check(!/\s\s|\n|^\s|\s$/.test(text), `Support: FAQ JSON-LD answer keeps source whitespace: ${text.slice(0, 60)}`);
}

// Guides: FAQPage and HowTo are parsed from the markdown (src/guide-markdown.ts), so a heading edit can drop them.
const GUIDE_FAQ_QUESTIONS = 5;
const HOWTO_GUIDES = ['cheapest-order-to-visit-cities'];
const guideNames = readdirSync(`${DIST}guides`, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
const sitemap = readFileSync(`${DIST}sitemap.xml`, 'utf8');
const isFile = (path) => existsSync(path) && statSync(path).isFile();
const resolves = (path) => isFile(`${DIST}${path}`) || isFile(`${DIST}${path}/index.html`);
check(guideNames.length > 0, 'Guides: no guide pages in the build');
for (const name of HOWTO_GUIDES) check(guideNames.includes(name), `Guides: ${name} missing from the build`);
for (const name of guideNames) {
  const page = `guides/${name}`;
  const html = readHtml(page);
  const schemas = jsonLd(html);
  const faq = ofType(schemas, 'FAQPage');
  check(faq.length === 1 && faq[0].mainEntity.length === GUIDE_FAQ_QUESTIONS, `${page}: FAQPage must have ${GUIDE_FAQ_QUESTIONS} questions`);
  check((ofType(schemas, 'HowTo').length === 1) === HOWTO_GUIDES.includes(name), `${page}: HowTo only on ${HOWTO_GUIDES.join(', ')}`);
  const lastmod = sitemap.match(new RegExp(`/${page}</loc>\\s*<lastmod>([^<]+)<`))?.[1];
  check(lastmod !== undefined && ofType(schemas, 'Article')[0]?.dateModified === lastmod, `${page}: Article dateModified must equal its SITE_PAGES lastmod`);
  check(readHtml('guides').includes(`href="/${page}"`), `/guides must list ${page}`);
}

const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
function headersFor(source) {
  const rule = vercel.headers?.find((h) => h.source === source);
  return Object.fromEntries(rule?.headers.map((h) => [h.key, h.value]) ?? []);
}
const siteHeaders = headersFor('/(.*)');
const csp = siteHeaders['Content-Security-Policy'] ?? '';
check(/default-src 'self'/.test(csp) && /frame-ancestors 'none'/.test(csp), 'vercel.json: CSP missing or incomplete');
check(siteHeaders['X-Content-Type-Options'] === 'nosniff', 'vercel.json: X-Content-Type-Options nosniff missing');
check(siteHeaders['Referrer-Policy'] === 'strict-origin-when-cross-origin', 'vercel.json: Referrer-Policy missing');
// Every vercel.json source here is a regex of groups and literals (no :params), so it can be matched as one.
check(vercel.headers.every((h) => !h.source.includes(':')), 'vercel.json: a :param source breaks servedHeader');
function servedHeader(path, key) {
  const rules = vercel.headers.filter((h) => new RegExp(`^${h.source}$`).test(path));
  return rules.flatMap((h) => h.headers).findLast((h) => h.key === key)?.value;
}
const IMMUTABLE = 'public, max-age=31536000, immutable';
const WEEK = 'public, max-age=604800';
check(servedHeader('/_astro/page.js', 'Cache-Control') === IMMUTABLE, 'vercel.json: /_astro/ must be cached immutable');
const fonts = readdirSync(`${DIST}fonts`);
check(fonts.length > 0, 'Build: no fonts in dist/fonts');
for (const font of fonts) check(servedHeader(`/fonts/${font}`, 'Cache-Control') === IMMUTABLE, `vercel.json: /fonts/${font} must be cached immutable`);
for (const image of readdirSync(DIST).filter((f) => /\.(png|jpg|webp|ico)$/.test(f))) {
  check(servedHeader(`/${image}`, 'Cache-Control') === WEEK, `vercel.json: /${image} must be cached for a week`);
}
check(servedHeader('/places.json', 'Cache-Control') === IMMUTABLE, 'vercel.json: /places.json must be cached immutable');
// The page asks for /places.json?v={web-meta places_version}: a file under another version would be cached for good.
const staticPlacesVersion = JSON.parse(readFileSync(`${DIST}places.json`, 'utf8')).version;
check(
  Boolean(staticPlacesVersion) && staticPlacesVersion === JSON.parse(source('src/data/web-meta.json')).places_version,
  'places.json: its version must be web-meta.json places_version (run npm run places)',
);
check(servedHeader('/', 'Cache-Control') === undefined, 'vercel.json: pages must keep the default revalidating cache');

// Speculation rules (header-delivered, so the CSP needs no inline script): prefetch only, never prerender.
const SPECULATION_URL = '/speculation-rules.json';
check(siteHeaders['Speculation-Rules'] === `"${SPECULATION_URL}"`, 'vercel.json: Speculation-Rules header missing');
check(servedHeader(SPECULATION_URL, 'Content-Type') === 'application/speculationrules+json', `vercel.json: ${SPECULATION_URL} needs its MIME type`);
let speculation = {};
try {
  speculation = JSON.parse(readFileSync(`${DIST}${SPECULATION_URL.slice(1)}`, 'utf8'));
} catch (error) {
  check(false, `${SPECULATION_URL}: ${error.message}`);
}
check(!('prerender' in speculation), `${SPECULATION_URL}: prefetch only, never prerender`);
const prefetch = speculation.prefetch ?? [];
check(prefetch.length > 0 && prefetch.every((rule) => rule.eagerness === 'moderate'), `${SPECULATION_URL}: prefetch rules must be moderate`);
// `/*\?*` would match every URL, a query-less one too (its search part `*` matches ""), and so exclude every link.
const SPECULATION_EXCLUDES = ['/_astro/*', '/*.webmanifest', '/*.json', '/*.xml', '/*.txt', '/*\\?(.+)'];
for (const rule of prefetch) {
  const excluded = new Set((rule.where?.and ?? []).map((condition) => condition.not?.href_matches));
  for (const pattern of SPECULATION_EXCLUDES) check(excluded.has(pattern), `${SPECULATION_URL}: must exclude ${pattern}`);
}

// The CSP has no 'unsafe-inline' for scripts: every executable script must load from a file.
const htmlPages = readdirSync(DIST, { recursive: true })
  .filter((f) => f.endsWith('.html'))
  .map((file) => [file, readFileSync(`${DIST}${file}`, 'utf8')]);
for (const [file, html] of htmlPages) {
  for (const [tag] of html.matchAll(/<script\b[^>]*>/g)) {
    check(/\ssrc=|type="application\/ld\+json"/.test(tag), `${file}: inline ${tag} is blocked by the CSP`);
  }
  check(!/<[a-z][^>]*\son[a-z]+=/i.test(html), `${file}: inline event handlers are blocked by the CSP`);
  for (const [, href] of html.matchAll(/href="(\/[^"#?]*)/g)) {
    check(href === '/' || (!href.endsWith('/') && resolves(href.slice(1))), `${file}: link ${href} does not resolve`);
  }
  check(!/"(?:offers|aggregateRating)"/.test(JSON.stringify(jsonLd(html))), `${file}: JSON-LD must carry no offers or aggregateRating`);
}

// The pages with the search widget open the API connection with the HTML; no other page does.
const apiHost = source('src/app.ts').match(/apiHost: '([^']+)'/)?.[1];
check(apiHost !== undefined, 'src/app.ts: no SERVICE.apiHost');
const preconnect = `<link rel="preconnect" href="https://${apiHost}" crossorigin>`;
const searchPages = new Set(LANGS.flatMap(({ prefix }) => ['', 'search/'].map((page) => `${prefix && `${prefix}/`}${page}index.html`)));
for (const [file, html] of htmlPages) {
  const want = searchPages.has(file);
  check(html.includes(preconnect) === want, `${file}: ${want ? 'must' : 'must not'} preconnect to the API`);
}

for (const [file, html] of htmlPages) {
  for (const [, font] of html.matchAll(/url\("?\/fonts\/([^")]+)/g)) check(fonts.includes(font), `${file}: @font-face names /fonts/${font}, which is not in the build`);
}

function cspAgrees(hosts, on, constant) {
  for (const [directive, list] of Object.entries(hosts)) {
    const sources = csp.match(new RegExp(`${directive} ([^;]*)`))?.[1].split(' ') ?? [];
    for (const host of list) {
      check(
        sources.includes(`https://${host}`) === on,
        `vercel.json: CSP ${directive} must ${on ? 'allow' : 'not allow'} ${host} while ${constant} is ${on ? 'set' : 'unset'}`,
      );
    }
  }
}

// Ads (spec 003): no consent or ad script while ADSENSE_CLIENT is unset, and AdSense never before the consent message.
const adsenseClient = appConstant('ADSENSE_CLIENT');
check(adsenseClient !== undefined, 'src/app.ts: the ADSENSE_CLIENT declaration was not found, so the ads checks cannot run');
const adsOff = adsenseClient === 'undefined';
const AD_SCRIPT = 'pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
const CONSENT_SCRIPT = 'fundingchoicesmessages.google.com/i/';
for (const [file, html] of htmlPages) {
  if (adsOff) {
    check(!/googlesyndication|fundingchoicesmessages|adsbygoogle/.test(html), `${file}: an ad or consent script loads while ADSENSE_CLIENT is unset`);
  } else {
    const ad = html.indexOf(AD_SCRIPT);
    const consent = html.indexOf(CONSENT_SCRIPT);
    check(ad < 0 || (consent >= 0 && consent < ad), `${file}: the consent message must load before AdSense`);
  }
}
// The CSP opens to the ad and consent hosts in the same change that sets ADSENSE_CLIENT, never before.
const AD_CSP = {
  'script-src': ['pagead2.googlesyndication.com', 'fundingchoicesmessages.google.com', 'tpc.googlesyndication.com', 'partner.googleadservices.com', 'www.googletagservices.com', 'ep2.adtrafficquality.google'],
  'connect-src': ['pagead2.googlesyndication.com', 'fundingchoicesmessages.google.com', 'ep1.adtrafficquality.google'],
  'frame-src': ['googleads.g.doubleclick.net', 'tpc.googlesyndication.com', 'fundingchoicesmessages.google.com', 'www.google.com', 'ep2.adtrafficquality.google'],
  'img-src': ['pagead2.googlesyndication.com', 'tpc.googlesyndication.com', 'googleads.g.doubleclick.net', 'www.google.com', 'fundingchoicesmessages.google.com'],
};
cspAgrees(AD_CSP, !adsOff, 'ADSENSE_CLIENT');
check(/shows no ads/.test(website) === adsOff, 'Privacy: #website must say "shows no ads" exactly while ADSENSE_CLIENT is unset');

// Analytics (spec 004): gtag.js only ever loads from the bundled consent module after Accept, never from page HTML.
const gaId = appConstant('GA_MEASUREMENT_ID');
check(gaId !== undefined, 'src/app.ts: the GA_MEASUREMENT_ID declaration was not found, so the analytics checks cannot run');
const gaOn = gaId !== undefined && gaId !== 'undefined';
const GA_CSP = {
  'script-src': ['www.googletagmanager.com'],
  'connect-src': ['*.google-analytics.com', '*.analytics.google.com', '*.googletagmanager.com'],
  'img-src': ['*.google-analytics.com', '*.googletagmanager.com'],
};
cspAgrees(GA_CSP, gaOn, 'GA_MEASUREMENT_ID');
for (const [file, html] of htmlPages) {
  check(!/googletagmanager|gtag\(/.test(html), `${file}: Google Analytics must load only from the consent module, never from the page`);
  const [banner = '', inner = ''] = html.match(/<div id="consent"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/) ?? [];
  if (!gaOn) {
    check(!banner && !html.includes('data-consent-open'), `${file}: no consent banner or Cookie settings while GA_MEASUREMENT_ID is unset`);
    continue;
  }
  check(/^<div[^>]*\brole="region"[^>]*\shidden\b/.test(banner), `${file}: the consent banner must be a region, hidden until the script shows it`);
  check(
    inner.includes('data-consent="granted"') && inner.includes('data-consent="denied"'),
    `${file}: the consent banner needs both an accept and a reject button`,
  );
  check(inner.includes('href="/privacy#website"'), `${file}: the consent banner must link /privacy#website`);
  if (html.includes('<footer')) check(html.includes('data-consent-open'), `${file}: the footer must carry Cookie settings`);
}
check(
  (/Google Analytics/.test(website) && /Cookie settings/.test(website) && /withdraw your consent/.test(website) &&
    /measure visits to this website only with your consent/.test(legalBases)) === gaOn,
  'Privacy: #website must cover analytics consent and Cookie settings, and #legal-bases consent, exactly while GA_MEASUREMENT_ID is set',
);
check(/runs no analytics/.test(website) !== gaOn, 'Privacy: #website must say "runs no analytics" exactly while GA_MEASUREMENT_ID is unset');

// Every localized page: self-canonical, html lang, and one reciprocal hreflang cluster shared with the sitemap.
const langRows = source('src/i18n/locales.ts').match(/\{ code: '/g)?.length ?? 0;
check(LANGS.length > 1 && LANGS.length === langRows && LANGS[0].prefix === '', 'src/i18n/locales.ts: every LANGS row must parse, English first at the root');
for (const field of ['code', 'prefix', 'hreflang', 'tag', 'og']) {
  const values = LANGS.map((lang) => lang[field].toLowerCase());
  check(new Set(values).size === values.length, `src/i18n/locales.ts: two LANGS rows share a ${field}`);
}
check(LOCALIZED_SLUGS.length > 0, 'src/site-pages.ts: LOCALIZED_SLUGS not found');
const pagePath = (slug, lang) => `/${[lang.prefix, slug].filter(Boolean).join('/')}`;
const fileOf = (path) => (path === '/' ? 'index.html' : `${path.slice(1)}/index.html`);
const canonicalOf = (html) => html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
const headAlternates = (html) =>
  [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map(([, hreflang, href]) => `${hreflang} ${href}`);
const origin = canonicalOf(readHtml(''))?.replace(/\/$/, '') ?? '';
check(origin.startsWith('https://'), 'Home: canonical missing');
const sitemapAlternates = new Map(
  [...sitemap.matchAll(/<url>\s*<loc>([^<]+)<\/loc>([\s\S]*?)<\/url>/g)].map(([, loc, body]) => [
    loc,
    [...body.matchAll(/<xhtml:link rel="alternate" hreflang="([^"]+)" href="([^"]+)"\/>/g)].map(([, hreflang, href]) => `${hreflang} ${href}`),
  ]),
);
const localizedFiles = new Map();
for (const slug of LOCALIZED_SLUGS) {
  const urlOf = (lang) => `${origin}${pagePath(slug, lang)}`;
  const cluster = [...LANGS.map((lang) => `${lang.hreflang} ${urlOf(lang)}`), `${X_DEFAULT} ${urlOf(LANGS[0])}`].sort();
  for (const lang of LANGS) {
    const where = pagePath(slug, lang);
    const file = fileOf(where);
    localizedFiles.set(file, slug);
    if (!isFile(`${DIST}${file}`)) {
      check(false, `${where}: localized page missing from the build`);
      continue;
    }
    const html = readFileSync(`${DIST}${file}`, 'utf8');
    check(html.includes(`<html lang="${lang.tag}">`), `${where}: <html lang> must be ${lang.tag}`);
    check(canonicalOf(html) === urlOf(lang), `${where}: must be self-canonical`);
    const head = headAlternates(html).sort();
    check(JSON.stringify(head) === JSON.stringify(cluster), `${where}: hreflang must be the full reciprocal set (${LANGS.length} + ${X_DEFAULT})`);
    check(JSON.stringify((sitemapAlternates.get(urlOf(lang)) ?? []).sort()) === JSON.stringify(head), `${where}: sitemap alternates must equal the head`);
    check(html.includes(`<meta property="og:locale" content="${lang.og}">`), `${where}: og:locale must be ${lang.og}`);
    const ogAlternates = [...html.matchAll(/<meta property="og:locale:alternate" content="([^"]+)">/g)].map(([, og]) => og).sort();
    const otherOgs = LANGS.filter((l) => l !== lang).map((l) => l.og).sort();
    check(JSON.stringify(ogAlternates) === JSON.stringify(otherOgs), `${where}: og:locale:alternate must name every other language once`);
    if (slug === '') check(/<section[^>]*\bid="search"/.test(html), `${where}: the #search section is missing`);
    if (slug === 'guides') {
      for (const name of guideNames) check(html.includes(`href="/guides/${name}"`), `${where}: must list guides/${name}`);
      if (lang.prefix) check(html.includes(`href="/guides/${guideNames[0]}" hreflang="en"`), `${where}: English guides must be linked with hreflang="en"`);
    }
  }
}
for (const [file, html] of htmlPages) {
  const lang = LANGS.find((l) => l.prefix && file.startsWith(`${l.prefix}/`)) ?? LANGS[0];
  const searchLink = `${pagePath('', lang)}#search`;
  if (html.includes('<header')) check(html.includes(`href="${searchLink}"`), `${file}: the header must link ${searchLink}`);
  check(!/\bundefined\b|\[object Object\]/.test(withoutCss(html)), `${file}: a literal "undefined" or "[object Object]" leaked into the page`);
  if (!localizedFiles.has(file)) {
    check(!/<link rel="alternate" hreflang=|og:locale/.test(html), `${file}: an English-only page must carry no hreflang alternates or og:locale`);
  }
}
// The footer switcher links the same page in each language where it has one, else each language's home: each link is
// that page's canonical URL, in the order of LANGS.
for (const [file, html] of htmlPages) {
  const nav = html.match(/<nav class="links langs"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  if (nav === undefined) {
    check(!html.includes('<footer'), `${file}: the footer language switcher is missing`);
    continue;
  }
  const slug = localizedFiles.get(file) ?? '';
  const links = [...nav.matchAll(/<a href="([^"]+)"[^>]*\shreflang="([^"]+)"/g)].map(([, href, hreflang]) => `${hreflang} ${href}`);
  const want = LANGS.map((lang) => `${lang.hreflang} ${pagePath(slug, lang)}`);
  check(JSON.stringify(links) === JSON.stringify(want), `${file}: the language switcher must link ${want.join(', ')}`);
  for (const lang of LANGS) {
    const href = pagePath(slug, lang);
    const target = fileOf(href);
    check(isFile(`${DIST}${target}`) && canonicalOf(readFileSync(`${DIST}${target}`, 'utf8')) === `${origin}${href}`, `${file}: switcher link ${href} must be its page's canonical`);
  }
}
for (const [loc, links] of sitemapAlternates) {
  check(links.length === 0 || links.length === LANGS.length + 1, `sitemap.xml: ${loc} must list ${LANGS.length} alternates + ${X_DEFAULT}`);
}

const connectHosts = (csp.match(/connect-src ([^;]*)/)?.[1] ?? '')
  .split(' ')
  .filter((src) => src.startsWith('https://'))
  .map((src) => new URL(src).host);
const bundle = readdirSync(`${DIST}_astro`)
  .filter((f) => f.endsWith('.js'))
  .map((f) => readFileSync(`${DIST}_astro/${f}`, 'utf8'))
  .join('');
check(
  connectHosts.some((host) => bundle.includes(`"${host}"`)),
  'vercel.json: CSP connect-src must allow the API host the search bundle calls (SERVICE.apiHost)',
);
// Cached immutably, so the file is only ever fetched under its version: a new list is a new URL.
check(
  /(placesUrl\}|\/places\.json)\?v=[^;]{0,120}&l=/.test(bundle),
  'Bundle: places.json must be fetched as /places.json?v={places_version}&l={site languages}',
);
check(bundle.includes('googletagmanager.com/gtag/js') === gaOn, 'Bundle: the consent module must carry gtag.js exactly while GA_MEASUREMENT_ID is set');

// No page names a vendor (Apple aside) or describes how ffly works inside. /privacy and /terms alone name the
// processors that handle app or visitor data (NAMED_PROCESSORS, owner 2026-10-07); every other recipient stays a
// category there too. Fare sources that are also carriers (Ryanair, Volotea...) are left out: a carrier is shown
// wherever a flight is, so banning it would block legitimate UI.
const WIDGET_COPY = { 'coverage notice': ['messages', 'coverage'], 'poll retry line': ['messages', 'reconnecting'] };
// Lookbehind rather than \b: \b is ASCII-only, so it would find "server" inside the French "réserver".
const bannedTerm = (term) => new RegExp(`(?<![\\p{L}\\p{N}])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'iu');
const MECHANICS = [
  ...['AZair', 'Aviasales', 'Travelpayouts', 'Telegram', 'Vercel'].map((name) => [name, `the vendor ${name}`]),
  ...['cache', 'Keychain', 'server', 'memory', 'database', 'restart', 'endpoint', 'background', 'bundle id', 'install id', 'request id', 'ai.overx.ffly']
    .map((term) => [term, `the technical term "${term}"`]),
  ...['up to 8', 'up to 3 places', 'must or a maybe'].map((phrase) => [phrase, `the mechanics phrase "${phrase}"`]),
].map(([term, what]) => [bannedTerm(term), what]);
// The search bundle builds the API URL and every page links https:// URLs, so these are banned in copy only.
// Only the hosts the bundle calls are the API: the ad hosts in connect-src appear in script tags once ads are on.
const apiHosts = connectHosts.filter((host) => bundle.includes(host));
const COPY_BANS = [
  ...MECHANICS,
  ...apiHosts.map((host) => [bannedTerm(host), `the API host ${host}`]),
  [bannedTerm('overx.ai/'), 'an API URL under overx.ai/'],
  [/\bHTTPS(?!:\/\/)/i, 'the technical term "HTTPS"'],
];
// The search widget's strings ship in SearchForm's data-i18n attribute: every language with the keys of English.
const decode = (attr) => attr.replace(/&#34;|&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const widgetText = (html) => {
  const attr = html.match(/\sdata-i18n="([^"]*)"/)?.[1];
  try {
    return attr === undefined ? undefined : JSON.parse(decode(attr));
  } catch {
    return undefined;
  }
};
// A plural object is one leaf: Polish adds few/many forms that English does not need.
const PLURAL_FORMS = ['zero', 'one', 'two', 'few', 'many', 'other'];
const isPlural = (value) => typeof value.other === 'string' && Object.keys(value).every((k) => PLURAL_FORMS.includes(k));
const shape = (value) =>
  !value || typeof value !== 'object' ? typeof value
    : isPlural(value) ? 'plural'
    : Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)]));
const emptyLeaves = (value, path = []) =>
  typeof value === 'string' ? (value.trim() ? [] : [path.join('.')])
    : value && typeof value === 'object' ? Object.entries(value).flatMap(([k, v]) => emptyLeaves(v, [...path, k]))
    : [];
const englishWidget = widgetText(readHtml('search'));
check(englishWidget !== undefined, '/search: the widget data-i18n payload is missing or not JSON');
for (const [what, keys] of Object.entries(WIDGET_COPY)) {
  check(typeof keys.reduce((o, k) => o?.[k], englishWidget) === 'string', `/search: widget ${what} missing from data-i18n`);
}
for (const [file, html] of htmlPages.filter(([, html]) => html.includes('id="search-form"'))) {
  const text = widgetText(html);
  check(text !== undefined, `${file}: the widget data-i18n payload is missing or not JSON`);
  check(JSON.stringify(shape(text)) === JSON.stringify(shape(englishWidget)), `${file}: the widget strings must have the keys of English`);
  const empty = emptyLeaves(text);
  check(empty.length === 0, `${file}: empty widget strings: ${empty.join(', ')}`);
}
const llms = readFileSync(`${DIST}llms.txt`, 'utf8');
// Pro has a daily fair-use cap, so no language may call it unlimited. Exact phrases, so "sem o limite de 3" passes.
const UNLIMITED = [
  'unlimited',
  'unbegrenzt', 'unbeschränkt', 'grenzenlos',
  'illimité', 'sans limite',
  'ilimitad', 'sin límite',
  'illimitat', 'senza limit',
  'onbeperkt', 'ongelimiteerd', 'onbegrensd',
  'nieograniczon', 'bez limitu', 'bez ogranicze',
  'sem limite',
  'безлимит', 'неограничен', 'без ограничени', 'без лимит',
  'obegränsa', 'utan gräns',
  'ubegrænse', 'uden grænse',
  'ubegrense', 'uten grense',
  'rajaton', 'rajattom', 'rajoittamaton', 'ilman raj',
].map((term) => [bannedTerm(term), term]);
// Copy rules for every published page, the legal ones included.
for (const [where, text] of [['llms.txt', llms], ...htmlPages]) {
  check(!/\u2014|&mdash;|&#8212;|&#x2014;/i.test(text), `${where}: no em dashes in published copy`);
  for (const [pattern, term] of UNLIMITED) check(!pattern.test(text), `${where}: Pro is never "unlimited" (${term})`);
}
// <link> tags are never shown, and the API preconnect names the host by design.
const copyOf = (html) => copyText(withoutCss(html).replace(/<link\b[^>]*>/g, ''));
const copyPages = [['llms.txt', copyText(llms)], ...htmlPages.map(([file, html]) => [file, copyOf(html)])];
const banScans = [['Search bundle', bundle, MECHANICS], ...copyPages.map(([where, text]) => [where, text, COPY_BANS])];
for (const [where, text, banned] of banScans) {
  for (const [pattern, what] of banned) {
    check(!pattern.test(text), `${where}: must not name ${what}`);
  }
}
// The consent module drives gtag.js, so the bundle is held only to the app's processors.
const NAMED_PROCESSORS = ['RevenueCat', 'AppsFlyer', 'Google'];
const LEGAL_FILES = ['privacy/index.html', 'terms/index.html'];
const processorBans = NAMED_PROCESSORS.map((name) => [name, bannedTerm(name)]);
for (const [where, text] of [['Search bundle', bundle], ...copyPages]) {
  if (LEGAL_FILES.includes(where)) continue;
  for (const [name, pattern] of processorBans) {
    if (where === 'Search bundle' && name === 'Google') continue;
    check(!pattern.test(text), `${where}: must not name the vendor ${name} (legal pages only)`);
  }
}
// Each named processor comes with its role and a link to its own privacy policy.
const PROCESSOR_POLICIES = {
  Apple: 'https://www.apple.com/legal/privacy/',
  RevenueCat: 'https://www.revenuecat.com/privacy/',
  AppsFlyer: 'https://www.appsflyer.com/legal/privacy-policy/',
  ...(gaOn ? { Google: 'https://policies.google.com/privacy' } : {}),
};
const sharing = privacy('sharing');
for (const [name, policy] of Object.entries(PROCESSOR_POLICIES)) {
  check(sharing.includes(name) && /<section class="block" id="sharing"[\s\S]*?<\/section>/.exec(privacyHtml)?.[0].includes(`href="${policy}"`), `Privacy: #sharing must name ${name} with its policy ${policy}`);
}
// Book opens the airline's site or a booking site, so no page may promise the airline's own site.
for (const [where, text] of copyPages) {
  check(!/airline's (?:own )?(?:web)?site(?! or a booking site)/i.test(text), `${where}: must not promise the airline's own site`);
}
check(!/live fares/i.test(copyText(readHtml('search'))), '/search: must not promise live fares');
const carrierBans = CARRIERS.map((name) => [bannedTerm(name), `the carrier ${name}`]);
for (const [where, text] of [['llms.txt', llms], ...htmlPages.filter(([file]) => localizedFiles.has(file))]) {
  for (const [pattern, what] of carrierBans) check(!pattern.test(copyText(text)), `${where}: must not name ${what}`);
}

if (failures.length) {
  console.error(`check-legal: ${failures.length} failed\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('check-legal: ok');
