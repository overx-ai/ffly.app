---
id: 001
title: "The Terms forbid using the ffly API outside the app, which is what ffly.app/search does"
status: open
severity: high
created: 2026-10-04
updated: 2026-10-04
source: audit
repo: ffly-site
files: src/data/terms.ts
---

# BUG 001 - The Terms forbid using the ffly API outside the app, which is what ffly.app/search does

> **TL;DR** — Acceptable Use (terms.ts:126) forbids accessing "the ffly API other than through the ffly app", yet the site's own /search calls that API, and the Terms never mention the web search or its 1-per-day Free limit. Fix: allow "the ffly app or ffly.app" and add one line about the web search to section 5.

## Symptom
- `src/data/terms.ts:126`: "…access the ffly API other than through the ffly app…".
- `src/pages/search.astro` + `src/scripts/ffly-api.ts` call `https://api.overx.ai/ffly` from the browser (spec 001).
- The Terms say nothing about the web search; the API gives it 1 Free search per IP per day (`free_searches_per_ip_day=1`).

## Root cause
The Terms were written for the app before spec 001 added the web search.

## Fix
Change the clause to "other than through the ffly app or ffly.app". In section 5 add: the web search at ffly.app/search is free, limited to one search per day per network, and shows the top route only.

## Regression test
A build-time check (or a unit test over `TERMS`) that the Acceptable Use text names ffly.app and section 5 mentions the web search. Fails today.
