# ffly.app keyword clusters (Step 0 research, 2026-10-05)

Volumes are **estimated** tiers from SERP shape (number of dedicated pages, forum density, ad presence), not tool data. No Ahrefs/Semrush/GSC numbers were available.

Home page (do not target in articles): **cheap multi-city flights**, **multi-city trip planner**, "multi city trip planner app", "multi-city flight search". Articles link up to the home page with these anchors; they never try to rank for them.

---

## Cluster A: Route order and dates (ffly's core capability)

**Pillar: `cheapest order to visit cities`** (how-to, estimated low-med)

Localized pillars (spec 018, written natively, self-canonical): de `günstigste Reihenfolge Städte Flug` at /de/guides/guenstigste-reihenfolge-staedte, fr `dans quel ordre visiter plusieurs villes (moins cher)` at /fr/guides/ordre-visiter-plusieurs-villes-moins-cher (both 2026-10-24), es `en qué orden visitar varias ciudades (más barato)` at /es/guides/orden-visitar-varias-ciudades-mas-barato (2026-11-02). pt `viajar por várias cidades da Europa de avião` at /pt/guides/viajar-varias-cidades-europa-aviao (2026-11-03; keyword wording is D's, substance is A's; says flights only up front). pl `jak zaplanować podróż po kilku miastach Europy` at /pl/guides/jak-zaplanowac-podroz-po-kilku-miastach-europy (2026-11-03; same D-wording, A-substance split; tests the Polish rules of thumb against low-cost pricing, example from Warsaw). Inbound links from the three English guides.
- nl `in welke volgorde steden bezoeken (goedkoopst)` at /nl/guides/volgorde-steden-bezoeken-goedkoopst (2026-11-03, judge 83; same-cluster guides in other languages link it through the layout)
- sv `flyga mellan flera städer i Europa` at /sv/guides/flyga-mellan-flera-stader-europa (2026-11-03, judge 88; same-cluster guides in other languages link it through the layout)
- da `flyve mellem flere byer i Europa` at /da/guides/flyve-mellem-flere-byer-europa (2026-11-03, judge 90; same-cluster guides in other languages link it through the layout)

Why this is the core: ffly's distinctive work is choosing the order and dates of a set of cities so the whole trip costs least. Low-cost carriers price each leg one-way, so the order and the day you fly each leg change the total. The SERP for this query is an intent mismatch: Google returns "cheapest cities to fly into Europe" lists (NerdWallet, Going, Booking.com) that answer a different question.

Supporting:
- best order to visit European cities (list / how-to, est. med): itinerary blogs rank on geography, not price
- does the order of cities change the flight price (how-to, est. low): forum threads plus thin answers
- how to find the cheapest route between multiple cities (how-to, est. low-med)
- flexible dates multi-city flights (how-to, est. low-med)
- how many nights in each city Europe (how-to, est. med): ffly takes nights per city as an input
- traveling salesman problem flights / cheapest route through cities (definition, est. low): only academic or CS pages rank
- avoid early morning flights budget airlines (troubleshooting, est. low): ties to "favours sensible flight times"

## Cluster B: Booking mechanics for multi-stop trips on low-cost carriers

**Pillar: `multi-city vs one-way tickets`** (comparison, estimated med)

Localized (spec 018, written natively, self-canonical): de `Gabelflug Europa Billigflieger` at /de/guides/gabelflug-europa-billigflieger (2026-10-26, covers "Gabelflug oder zwei Einzelflüge" as an H2). es `vuelos multidestino baratos Europa` at /es/guides/vuelos-multidestino-baratos-europa (2026-11-02, covers "multidestino o vuelos solo ida" as an H2 and FAQ; inbound from /guides/multi-city-vs-one-way-tickets, /guides/open-jaw-flights-europe and /es/guides/orden-visitar-varias-ciudades-mas-barato). Inbound links from /guides/open-jaw-flights-europe, /guides/multi-city-vs-one-way-tickets and /de/guides/guenstigste-reihenfolge-staedte. it `voli multitratta low cost` at /it/guides/voli-multitratta-low-cost (2026-11-03; Italian OTA pages say low-cost carriers don't sell multitratta, so the guide builds it from one-ways with order and dates as the core; inbound via the layout's same-cluster links).

Variants: "multi-city vs separate one-way tickets", "is it cheaper to book multi-city or one way". The SERP leans long-haul and legacy carriers. Forum consensus is that low-cost carriers price point to point, so mixing budget carriers favours separate one-ways. No ranking page shows a worked intra-Europe low-cost example.

Supporting:
- open jaw flights Europe (definition / how-to, est. med)
- what is an open jaw flight (definition, est. med)
- Ryanair multi city (product / how-to, est. low-med)
- Wizz Air multi city / WIZZ Link (product / how-to, est. low-med)
- self-transfer flights Europe risks (troubleshooting, est. med)
- how to book multi-city flights on low cost airlines (how-to, est. low)
- low cost airline multi city Europe (how-to, est. low)

## Cluster C: Tools and alternatives

**Pillar: `best multi-city flight search tools`** (list / comparison, estimated med)

Careful: this sits closest to the home page. Keep it a fair comparison article ("which tool for which trip") and link to the home page for the product pitch.

Supporting:
- Kiwi Nomad alternative (alternative, est. low)
- Kiwi Nomad review (comparison, est. low)
- Google Flights multi-city limitations (how-to / troubleshooting, est. med)
- Skyscanner multi-city (how-to, est. med): Skyscanner's own page dominates
- Kayak Trip Builder (product, est. low): KAYAK launch post dated 2020; unclear if the feature is still live
- Ryanair vs Wizz Air (comparison, est. med): adjacent; many 2026 comparison pages already

## Cluster D: Budget Europe multi-city trip planning (top of funnel)

**Pillar: `cheapest way to visit multiple cities in Europe`** (how-to, estimated med)

Honesty constraint: ranking pages compare buses, trains and flights. ffly covers flights only, so a ffly article must say so up front and not pose as a transport-mode guide.

Supporting:
- how to plan a multi-city trip in Europe (how-to, est. med)
- how to plan a Europe trip multiple cities cheap (how-to, est. low-med)
- cheapest European cities to fly into (list, est. high): long-haul gateway intent, dominated by NerdWallet / Going; off-fit, deprioritise
- 2 week Europe itinerary multiple cities (list, est. high): high-authority itinerary blogs; off-fit, deprioritise

---

## Internal linking sketch

- Layers: 3-5 inbound links at publish from the same cluster and locale; the home page links the 3 newest guides, same locale (`HOME_GUIDES` in `src/views/Home.astro`); `/seo review` runs `links.py`.
- `~/.claude/skills/seo/scripts/links.py` proposes phrases that pages at position 4-15 rank for, using first-party `gsc.py` only. Add a link only after the owner's OK, log it in `published.md`, and never rewrite a sentence to fit an anchor. The weekly job prints the count and edits nothing.
- A-pillar <-> B-pillar (order vs ticket type are the two halves of "how do I pay less for this trip")
- Every article -> home page (anchor: "multi-city trip planner") and -> ffly.app/search for a reader's own try
- B supporting (Ryanair / Wizz) -> B-pillar; A supporting -> A-pillar
- C-pillar is the one place competitors get named side by side
- Every new guide must set `cluster:` frontmatter (this file's letter, e.g. `cluster: A. Route order and dates`): the guide layout links same-cluster guides across languages from it
