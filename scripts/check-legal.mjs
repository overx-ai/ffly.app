// Asserts legal facts in the built pages (run after `astro build`). Regressions: docs/bugs/001, 002.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));

const LINKED = ['Search History', 'User ID', 'Email Address', 'Customer Support'];
const NOT_LINKED = ['Purchase History', 'Product Interaction', 'Device ID'];

const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

function sections(page) {
  const html = readFileSync(`${DIST}${page}/index.html`, 'utf8');
  const found = [...html.matchAll(/<section class="block" id="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g)];
  return found.map(([, id, body]) => ({ id, text: text(body) }));
}

const failures = [];
const check = (ok, message) => ok || failures.push(message);

const terms = sections('terms');
const acceptableUse = terms.find((s) => s.id === 'acceptable-use')?.text ?? '';
check(/through the ffly app or ffly\.app/.test(acceptableUse), 'Terms Acceptable Use must allow ffly.app');
check(/web search/i.test(terms[4]?.text ?? ''), 'Terms section 5 must describe the web search');

const privacy = sections('privacy');
const labels = privacy.find((s) => s.id === 'app-store-labels')?.text ?? '';
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
const searches = privacy.find((s) => s.id === 'searches')?.text ?? '';
check(!/not linked to your identity/.test(searches), 'Privacy: trip searches must not be called unlinked');

if (failures.length) {
  console.error(`check-legal: ${failures.length} failed\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('check-legal: ok');
