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
  for (const line of markdown.split('\n')) {
    const match = line.match(HEADING);
    if (match) sections.push({ depth: match[1].length, heading: match[2], lines: [] });
    else sections.at(-1)!.lines.push(line);
  }
  return sections;
}

const firstParagraph = (lines: string[]) => plain(lines.join('\n').trim().split(/\n\s*\n/)[0] ?? '');

function subsections(sections: Section[], parent: Section): Section[] {
  const start = sections.indexOf(parent) + 1;
  const end = sections.findIndex((s, i) => i >= start && s.depth <= parent.depth);
  return sections.slice(start, end === -1 ? undefined : end).filter((s) => s.depth === parent.depth + 1);
}

function faqOf(sections: Section[]): FaqItem[] {
  const faq = sections.find((s) => s.depth === 2 && FAQ_HEADING.test(s.heading));
  if (!faq) return [];
  return subsections(sections, faq).map((q) => ({ question: plain(q.heading), answer: firstParagraph(q.lines) }));
}

// HowTo only when a section's subheadings are numbered 1..N in order.
function howToOf(sections: Section[]): HowTo | undefined {
  for (const section of sections.filter((s) => s.depth === 2)) {
    const children = subsections(sections, section);
    const numbered = children.map((c) => c.heading.match(STEP));
    if (children.length && numbered.every((m, i) => m && Number(m[1]) === i + 1)) {
      return {
        name: plain(section.heading),
        steps: children.map((c, i) => ({ name: plain(numbered[i]![2]), text: firstParagraph(c.lines) })),
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
  const h1 = sections.find((s) => s.depth === 1)?.heading;
  if (!h1) throw new Error('A guide needs a "# " heading for its H1');
  return {
    h1: plain(h1),
    faq: faqOf(sections),
    howTo: howToOf(sections),
    minutes: Math.max(1, Math.round(wordCount(markdown) / GUIDES.wordsPerMinute)),
  };
}
