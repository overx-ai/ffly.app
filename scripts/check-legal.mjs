// Asserts legal and site facts in the built output (run after `astro build`). Regressions: docs/bugs/001, 002, 003.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));

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
check(/at no extra cost/.test(privacy('booking-links')), 'Privacy: partner links must disclose the commission');

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
const resolves = (path) => existsSync(`${DIST}${path}`) || existsSync(`${DIST}${path}/index.html`);
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

// No page names a vendor (Apple aside) or describes how ffly works inside; the legal pages name recipients by
// category. Fare sources that are also carriers (Ryanair, Volotea...) are left out: a carrier is shown wherever a
// flight is, so banning it would block legitimate UI.
const BUNDLE_COPY = { 'coverage notice': "Some fares couldn't be checked right now.", 'poll retry line': 'Reconnecting…' };
const bannedTerm = (term) => new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
const MECHANICS = [
  ...['AZair', 'Aviasales', 'Travelpayouts', 'RevenueCat', 'Telegram', 'Vercel'].map((name) => [name, `the vendor ${name}`]),
  ...['cache', 'Keychain', 'server', 'memory', 'database', 'restart', 'endpoint', 'background', 'bundle id', 'install id', 'request id', 'ai.overx.ffly']
    .map((term) => [term, `the technical term "${term}"`]),
  ...['up to 8', 'up to 3 places', 'must or a maybe'].map((phrase) => [phrase, `the mechanics phrase "${phrase}"`]),
].map(([term, what]) => [bannedTerm(term), what]);
// The search bundle builds the API URL and every page links https:// URLs, so these are banned in copy only.
const COPY_BANS = [
  ...MECHANICS,
  ...connectHosts.map((host) => [bannedTerm(host), `the API host ${host}`]),
  [bannedTerm('overx.ai/'), 'an API URL under overx.ai/'],
  [/\bHTTPS(?!:\/\/)/i, 'the technical term "HTTPS"'],
];
for (const [what, copy] of Object.entries(BUNDLE_COPY)) {
  check(bundle.includes(copy), `Search bundle: ${what} "${copy}" missing`);
}
// Inlined CSS is not copy, and words like "background" are CSS properties.
const withoutCss = (html) => html.replace(/<style\b[\s\S]*?<\/style>/g, '').replace(/\sstyle="[^"]*"/g, '');
const llms = readFileSync(`${DIST}llms.txt`, 'utf8');
// Copy rules for every published page, the legal ones included.
for (const [where, text] of [['llms.txt', llms], ...htmlPages]) {
  check(!/\u2014|&mdash;|&#8212;|&#x2014;/i.test(text), `${where}: no em dashes in published copy`);
  check(!/unlimited/i.test(text), `${where}: Pro is never "unlimited"`);
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

if (failures.length) {
  console.error(`check-legal: ${failures.length} failed\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('check-legal: ok');
