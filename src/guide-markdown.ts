import { GUIDES } from './app';
import type { FaqItem } from './data/types';

export interface HowTo {
  name: string;
  steps: { name: string; text: string }[];
}

export interface ParsedGuide {
  h1: string;
  faq: FaqItem[];
  howTo?: HowTo;
  minutes: number;
}

interface Section {
  depth: number;
  heading: string;
  lines: string[];
}

const HEADING = /^(#{1,6})\s+(.+?)\s*$/;
const FENCE = /^\s*(?:```|~~~)/;
const LIST_MARKER = /^\s*(?:[-*+]|\d+\.)\s+/gm;
const STEP = /^(\d+)\.\s+(.+)$/;
const FAQ_HEADING = /^FAQ$/i;

const plain = (markdown: string) =>
  markdown
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

function sectionsOf(markdown: string): Section[] {
  const sections: Section[] = [{ depth: 0, heading: '', lines: [] }];
  let inCode = false;
  for (const line of markdown.split('\n')) {
    if (FENCE.test(line)) inCode = !inCode;
    const match = inCode ? null : line.match(HEADING);
    if (match) sections.push({ depth: match[1].length, heading: match[2], lines: [] });
    else sections.at(-1)!.lines.push(line);
  }
  return sections;
}

// The whole section, as the reader sees it: JSON-LD answers and steps must match the visible text.
const sectionText = (lines: string[]) => plain(lines.join('\n').replace(LIST_MARKER, ''));

function subsections(sections: Section[], parent: Section): Section[] {
  const start = sections.indexOf(parent) + 1;
  const end = sections.findIndex((s, i) => i >= start && s.depth <= parent.depth);
  return sections.slice(start, end === -1 ? undefined : end).filter((s) => s.depth === parent.depth + 1);
}

function faqOf(sections: Section[]): FaqItem[] {
  const faq = sections.find((s) => s.depth === 2 && FAQ_HEADING.test(s.heading));
  if (!faq) return [];
  return subsections(sections, faq).map((q) => ({ question: plain(q.heading), answer: sectionText(q.lines) }));
}

// HowTo only when a section's subheadings are numbered 1..N in order.
function howToOf(sections: Section[]): HowTo | undefined {
  for (const section of sections.filter((s) => s.depth === 2)) {
    const children = subsections(sections, section);
    const numbered = children.map((c) => c.heading.match(STEP));
    if (children.length && numbered.every((m, i) => m && Number(m[1]) === i + 1)) {
      return {
        name: plain(section.heading),
        steps: children.map((c, i) => ({ name: plain(numbered[i]![2]), text: sectionText(c.lines) })),
      };
    }
  }
  return undefined;
}

function wordCount(markdown: string) {
  return plain(markdown.replace(/^#+\s*/gm, '').replace(/\|/g, ' '))
    .split(' ')
    .filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

export function parseGuide(markdown: string): ParsedGuide {
  const sections = sectionsOf(markdown);
  // remarkDropTitle removes every "# " heading from the body, so a second one would vanish from the page.
  const h1s = sections.filter((s) => s.depth === 1);
  if (h1s.length !== 1) throw new Error(`A guide needs exactly one "# " heading for its H1, found ${h1s.length}`);
  return {
    h1: plain(h1s[0].heading),
    faq: faqOf(sections),
    howTo: howToOf(sections),
    minutes: Math.max(1, Math.round(wordCount(markdown) / GUIDES.wordsPerMinute)),
  };
}
