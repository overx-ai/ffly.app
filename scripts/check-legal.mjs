// Asserts legal and site facts in the built output (run after `astro build`). Regressions: docs/bugs/001, 002, 003.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

// The languages and localized slugs, read from the TypeScript that drives the build (src/i18n/locales.ts, src/site-pages.ts).
const LANGS = [...source('src/i18n/locales.ts').matchAll(/\{ code: '(\w+)', prefix: '(\w*)', hreflang: '([\w-]+)', tag: '([\w-]+)'/g)]
  .map(([, code, prefix, hreflang, tag]) => ({ code, prefix, hreflang, tag }));
const LOCALIZED_SLUGS = JSON.parse(
  source('src/site-pages.ts').match(/LOCALIZED_SLUGS = (\[[^\]]*\])/)?.[1].replace(/'/g, '"') ?? '[]',
);
const X_DEFAULT = 'x-default';
// Carriers are named in the guides, the legal pages and live search results, never in the site's own pitch.
const CARRIERS = ['Ryanair', 'Wizz Air', 'airBaltic', 'Volotea'];

const LINKED = ['Search History', 'Purchase History', 'User ID', 'Email Address', 'Customer Support'];
const NOT_LINKED = ['Product Interaction', 'Device ID'];

const failures = [];

function check(ok, message) {
  if (!ok) failures.push(message);
}

function plainText(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

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

const terms = readPage('terms');
check(/through the ffly app or ffly\.app/.test(terms('acceptable-use')), 'Terms Acceptable Use must allow ffly.app');
check(/web search/i.test(terms('free-and-pro')), 'Terms section 5 must describe the web search');
// Cached partner fares carry no checked time (ffly-api spec 532), so no page may promise one for every fare.
check(!/when each\s+fare was last checked/.test(terms('prices')), 'Terms: must not promise a checked time for every fare');
check(/up to a week old and show no checked time/.test(terms('prices')), 'Terms: must say cached fares may be up to a week old and show no checked time');
check(/at no extra cost/.test(terms('not-a-travel-agent')), 'Terms: partner links must disclose the commission');

const privacy = readPage('privacy');
// GDPR Art. 13: plain-language rewrites must keep every required disclosure.
for (const id of ['who-we-are', 'legal-bases', 'sharing', 'security', 'retention', 'rights', 'children', 'changes', 'contact']) privacy(id);
check(/Standard Contractual Clauses/.test(privacy('security')), 'Privacy: international transfers must name their safeguard');
check(/data protection authority/.test(privacy('rights')), 'Privacy: rights must include complaining to a data protection authority');
const labels = privacy('app-store-labels');
const linked = labels.match(/Data linked to you:(.*?)Data not linked to you:/)?.[1] ?? '';
const notLinked = labels.match(/Data not linked to you:(.*)$/)?.[1] ?? '';
check(linked !== '' && notLinked !== '', 'Privacy: App Store labels must list linked and not-linked data');
for (const type of LINKED) {
  check(linked.includes(type), `Privacy: ${type} must be listed as linked`);
  check(!notLinked.includes(type), `Privacy: ${type} must not be listed as not linked`);
}
for (const type of NOT_LINKED) {
  check(notLinked.includes(type), `Privacy: ${type} must be listed as not linked`);
  check(!linked.includes(type), `Privacy: ${type} must not be listed as linked`);
}
check(!/not linked to your identity/.test(privacy('searches')), 'Privacy: trip searches must not be called unlinked');
check(/nothing that identifies you/.test(privacy('searches')), 'Privacy: fare sources must be said to get nothing that identifies you');
check(/same for every ffly user/.test(privacy('booking-links')), 'Privacy: the partner identifier must be said to be ffly-wide');
// Spec 003: the web search remembers places in functional cookies, never dates; notifications only on request.
const website = privacy('website');
check(/cookies/.test(website) && /never remembers your travel dates/.test(website), 'Privacy: #website must cover the search cookies and say dates are never kept');
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
check(/immutable/.test(headersFor('/_astro/(.*)')['Cache-Control'] ?? ''), 'vercel.json: /_astro/ must be cached immutable');

// The CSP has no 'unsafe-inline' for scripts: every executable script must load from a file.
const htmlPages = readdirSync(DIST, { recursive: true })
  .filter((f) => f.endsWith('.html'))
  .map((file) => [file, readFileSync(`${DIST}${file}`, 'utf8')]);
// Inlined CSS is not copy, and words like "background" are CSS properties.
const withoutCss = (html) => html.replace(/<style\b[\s\S]*?<\/style>/g, '').replace(/\sstyle="[^"]*"/g, '');
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

// A constant's initialiser in src/app.ts, or undefined when its declaration is missing.
const appConstant = (name) => source('src/app.ts').match(new RegExp(`export const ${name}\\b[^=]*=\\s*([^;]+);`))?.[1].trim();
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
const legalBases = privacy('legal-bases');
check(
  (/analytics provider/.test(website) && /Cookie settings/.test(website) && /withdraw your consent/.test(website) &&
    /measure visits to this website only with your consent/.test(legalBases)) === gaOn,
  'Privacy: #website must cover analytics consent and Cookie settings, and #legal-bases consent, exactly while GA_MEASUREMENT_ID is set',
);
check(/runs no analytics/.test(website) !== gaOn, 'Privacy: #website must say "runs no analytics" exactly while GA_MEASUREMENT_ID is unset');

// Every localized page: self-canonical, html lang, and one reciprocal hreflang cluster shared with the sitemap.
const langRows = source('src/i18n/locales.ts').match(/\{ code: '/g)?.length ?? 0;
check(LANGS.length > 1 && LANGS.length === langRows && LANGS[0].prefix === '', 'src/i18n/locales.ts: every LANGS row must parse, English first at the root');
check(LOCALIZED_SLUGS.length > 0, 'src/site-pages.ts: LOCALIZED_SLUGS not found');
const pagePath = (slug, lang) => `/${[lang.prefix, slug].filter(Boolean).join('/')}`;
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
const localizedFiles = new Set();
for (const slug of LOCALIZED_SLUGS) {
  const urlOf = (lang) => `${origin}${pagePath(slug, lang)}`;
  const cluster = [...LANGS.map((lang) => `${lang.hreflang} ${urlOf(lang)}`), `${X_DEFAULT} ${urlOf(LANGS[0])}`].sort();
  for (const lang of LANGS) {
    const where = pagePath(slug, lang);
    const dir = where.slice(1);
    const file = dir ? `${dir}/index.html` : 'index.html';
    localizedFiles.add(file);
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
    check(/<meta property="og:locale" content="[a-z]{2}_[A-Z]{2}">/.test(html), `${where}: og:locale missing`);
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
check(bundle.includes('googletagmanager.com/gtag/js') === gaOn, 'Bundle: the consent module must carry gtag.js exactly while GA_MEASUREMENT_ID is set');

// No page names a vendor (Apple aside) or describes how ffly works inside; the legal pages name recipients by
// category. Fare sources that are also carriers (Ryanair, Volotea...) are left out: a carrier is shown wherever a
// flight is, so banning it would block legitimate UI.
const WIDGET_COPY = { 'coverage notice': ['messages', 'coverage'], 'poll retry line': ['messages', 'reconnecting'] };
// Lookbehind rather than \b: \b is ASCII-only, so it would find "server" inside the French "réserver".
const bannedTerm = (term) => new RegExp(`(?<![\\p{L}\\p{N}])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'iu');
const MECHANICS = [
  ...['AZair', 'Aviasales', 'Travelpayouts', 'RevenueCat', 'Telegram', 'Vercel'].map((name) => [name, `the vendor ${name}`]),
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
const englishWidget = widgetText(readHtml('search'));
check(englishWidget !== undefined, '/search: the widget data-i18n payload is missing or not JSON');
for (const [what, keys] of Object.entries(WIDGET_COPY)) {
  check(typeof keys.reduce((o, k) => o?.[k], englishWidget) === 'string', `/search: widget ${what} missing from data-i18n`);
}
for (const [file, html] of htmlPages.filter(([, html]) => html.includes('id="search-form"'))) {
  const text = widgetText(html);
  check(text !== undefined, `${file}: the widget data-i18n payload is missing or not JSON`);
  check(JSON.stringify(shape(text)) === JSON.stringify(shape(englishWidget)), `${file}: the widget strings must have the keys of English`);
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
].map((term) => [bannedTerm(term), term]);
// Copy rules for every published page, the legal ones included.
for (const [where, text] of [['llms.txt', llms], ...htmlPages]) {
  check(!/\u2014|&mdash;|&#8212;|&#x2014;/i.test(text), `${where}: no em dashes in published copy`);
  for (const [pattern, term] of UNLIMITED) check(!pattern.test(text), `${where}: Pro is never "unlimited" (${term})`);
}
const copyPages = [['llms.txt', copyText(llms)], ...htmlPages.map(([file, html]) => [file, copyText(withoutCss(html))])];
const banScans = [['Search bundle', bundle, MECHANICS], ...copyPages.map(([where, text]) => [where, text, COPY_BANS])];
for (const [where, text, banned] of banScans) {
  for (const [pattern, what] of banned) {
    check(!pattern.test(text), `${where}: must not name ${what}`);
  }
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
