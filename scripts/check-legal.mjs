// Asserts legal and site facts in the built output (run after `astro build`). Regressions: docs/bugs/001, 002.
import { readFileSync } from 'node:fs';
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

const readHtml = (page) => readFileSync(`${DIST}${page ? `${page}/` : ''}index.html`, 'utf8');

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

const privacy = readPage('privacy');
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

const DATED_PAGES = ['support', 'privacy', 'terms'];
const displayDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' });
const sitemap = readFileSync(`${DIST}sitemap.xml`, 'utf8');
for (const [, loc, lastmod] of sitemap.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)) {
  const page = new URL(loc).pathname.slice(1);
  const stated = readHtml(page).match(/Last updated: ([^<]+)</)?.[1];
  const expected = displayDate.format(new Date(lastmod));
  if (DATED_PAGES.includes(page)) check(stated !== undefined, `/${page}: "Last updated" line missing`);
  check(stated === undefined || stated === expected, `/${page}: "Last updated: ${stated}" must match lastmod ${lastmod}`);
}

if (failures.length) {
  console.error(`check-legal: ${failures.length} failed\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('check-legal: ok');
