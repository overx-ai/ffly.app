// Asserts legal facts in the built pages (run after `astro build`). Regressions: docs/bugs/001, 002.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));

const LINKED = ['Search History', 'Purchase History', 'User ID', 'Email Address', 'Customer Support'];
const NOT_LINKED = ['Product Interaction', 'Device ID'];

function plainText(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function readSections(page) {
  const html = readFileSync(`${DIST}${page}/index.html`, 'utf8');
  const found = [...html.matchAll(/<section class="block" id="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g)];
  return found.map(([, id, body]) => ({ id, text: plainText(body) }));
}

function sectionText(sections, id) {
  return sections.find((section) => section.id === id)?.text ?? '';
}

const failures = [];

function check(ok, message) {
  if (!ok) failures.push(message);
}

const terms = readSections('terms');
const acceptableUse = sectionText(terms, 'acceptable-use');
check(/through the ffly app or ffly\.app/.test(acceptableUse), 'Terms Acceptable Use must allow ffly.app');
check(/web search/i.test(terms[4]?.text ?? ''), 'Terms section 5 must describe the web search');

const privacy = readSections('privacy');
const labels = sectionText(privacy, 'app-store-labels');
const linked = labels.match(/Data linked to you:(.*?)Data not linked to you:/)?.[1] ?? '';
const notLinked = labels.match(/Data not linked to you:(.*)$/)?.[1] ?? '';
for (const type of LINKED) {
  check(linked.includes(type), `Privacy: ${type} must be listed as linked`);
  check(!notLinked.includes(type), `Privacy: ${type} must not be listed as not linked`);
}
for (const type of NOT_LINKED) {
  check(notLinked.includes(type), `Privacy: ${type} must be listed as not linked`);
  check(!linked.includes(type), `Privacy: ${type} must not be listed as linked`);
}
const searches = sectionText(privacy, 'searches');
check(!/not linked to your identity/.test(searches), 'Privacy: trip searches must not be called unlinked');

if (failures.length) {
  console.error(`check-legal: ${failures.length} failed\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('check-legal: ok');
