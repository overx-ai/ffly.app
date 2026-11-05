# Experience assets — things only I could know

Format: `- [YYYY-MM] <topic> — <the concrete thing> (asset: path/url if any)`

## Decisions I made and why
- [2026-10] why ffly exists — I had a short one-month visa and a huge list of key places I had never been. I wanted to see as many as possible in that month without overspending. That is the problem ffly solves: the order and dates that make the whole trip cheapest. (owner, 2026-10-05)
- [2026-10] hotel nights — It sucks to pay twice for the same night: a flight that lands after midnight means you book (and pay for) a hotel night in one city while still paying for the previous one in another. So ffly counts a midnight landing as the hotel night it costs you, on every priority. (owner, 2026-10-05)
- [2026-10] sleep — It really sucks to wake up in the middle of the night, or not sleep at all, because of a 6 a.m. flight. So ffly's default priority is Best schedule: it favours sensible flight times over pre-dawn starts and midnight landings. (owner, 2026-10-05)

## Metrics I've measured
- [2026-11] order study (run 2026-11-06 on ffly.app's free web search, 8 searches, raw: seo/searches/2026-11-06-*) — Four European cities from eight start cities, window 1-28 Feb 2027, 2-3 nights each, priority Cheapest, 3,261 fares compared. Taking each order's cheapest shown route, the gap between the cheapest and dearest order was 14% to 65% (median 30%), €21 to €127 (median €62). Largest: Berlin via Rome, Madrid, Lisbon, Athens, €195 to €322. Smallest: Rome via Paris, Berlin, Budapest, Warsaw, €149 to €170, and Milan via London, Dublin, Amsterdam, Prague, €184 to €211. Closest thing to order alone: from Rome, Warsaw-Paris-Berlin against Berlin-Paris-Warsaw, one day apart, €149 against €170. Limits: only the 8 routes each search shows, and routes differ in dates as well as order.
- [2026-10] example search — Warsaw round trip to Madrid (2 nights), Amsterdam (2) and Rome (4): best of 6 routes, €129.62 flights total, live fares on 2 October 2026. Not a price anyone will get. (asset: ffly-site src/app.ts EXAMPLE_TRIP)
- [2026-10] example search 2 (run 2026-10-05 on ffly.app's free web search, id ItxTeVJsU7c; raw: seo/searches/2026-10-05-ItxTeVJsU7c-result.json) — Warsaw round trip; cities Lisbon, Barcelona, Paris, Rome, Athens; window 2 Nov – 1 Dec 2026; 3–6 nights each; priority Best schedule.
  - Top route: Warsaw → Paris (5 nights) → Lisbon (4) → Barcelona (3) → Rome (6) → Athens (3) → Warsaw. Flights €270.94.
  - 8 routes found for the same five cities, flights from €261.76 to €414.42 (the dearest is 58% above the cheapest) depending on order and dates.
  - The cheapest-fare route (€261.76) ranked below the top one: the top pick cost €9.18 more for a better schedule. The top route still loses 4.1 h of sleep in total.
  - 567 fares compared across 30 days.
  - Caveat: Wizz Air and Volotea fares were not available in that search, so another day may find cheaper legs. Not a price anyone will get.

## Opinions I'll defend
- The cheapest first flight is a trap: a bargain first leg can lock you into an expensive rest of the trip. Price the whole route.
- A cheap fare that costs you a night of sleep or a wasted hotel night is not cheap.
