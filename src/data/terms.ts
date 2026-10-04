import {
  APP,
  CONTACT_EMAIL,
  EXTERNAL,
  OPERATOR,
  SITE_HOST,
  WEB_SEARCH,
  externalLink,
  mailto,
} from '../app';
import { pathFor } from '../site-pages';
import type { LegalDocument } from './types';

// Section 6 is the App Store Guideline 3.1.2(c) auto-renewable subscription disclosure, Section 7
// the one-time Lifetime purchase (no trial is offered on any plan), and Section 1 links Apple's Standard EULA. Both are submission requirements, not style: keep them
// whole, with no literal price, and never describe Pro as "unlimited" (the API caps Pro per day).

export const TERMS: LegalDocument = {
  pageTitle: 'Terms of Use',
  description:
    'Terms of Use for the ffly iPhone app: indicative fares, bookings made on airline or booking sites, partner links, the ffly Pro weekly and yearly auto-renewable subscriptions, and the one-time Lifetime purchase.',
  summaryTitle: 'The short version',
  summaryText: `ffly helps you plan cheap multi-city trips. It is a search tool, not a travel agent: fares come
    from third-party airline and fare-search websites, prices are indicative, and <strong>Book</strong> opens the
    airline's site or a booking site such as Aviasales, where you book. Some booking links are partner links: ffly
    may earn a commission, at no extra cost to you. ${APP.proName} is available as a weekly or yearly auto-renewing
    subscription, which you manage and cancel in your Apple ID account settings, or as a one-time ${APP.lifetimeName}
    purchase that does not renew.`,
  sections: [
    {
      id: 'agreement',
      title: 'Agreement',
      content: `
        <p>These Terms of Use ("Terms") govern your use of the ffly iPhone app and the ffly service (together,
        "ffly"), operated by <strong>${OPERATOR}</strong> ("we", "us"), an individual trader. By downloading or
        using ffly you agree to these Terms. If you do not agree, do not use ffly.</p>
        <p>ffly is licensed to you under Apple's
        ${externalLink(EXTERNAL.appleEula, 'Licensed Application End User License Agreement (Standard EULA)')},
        which these Terms supplement. Where these Terms and the Standard EULA conflict about the license to the app,
        the Standard EULA prevails.</p>`,
    },
    {
      id: 'service',
      title: 'What ffly Does',
      content: `
        <p>You choose a start, one or more end places and the cities you want to visit, plus dates and nights. ffly
        checks fares on third-party airline and fare-search websites and suggests the order of cities and the dates
        that make the trip cheap and comfortable. Results include estimates such as daylight spent in transit and
        sleep lost.</p>`,
    },
    {
      id: 'not-a-travel-agent',
      title: 'ffly Is Not a Travel Agent',
      content: `
        <p>ffly is an information tool. We are not a travel agent, tour operator or airline, we do not sell tickets,
        and we are not a party to any booking you make. When you tap <strong>Book</strong>, the airline's site or a
        booking site such as Aviasales opens, and any booking is made with that company under its own terms and
        conditions. That company alone is responsible for the flight, its price, fees, schedule changes,
        cancellations, refunds, baggage and other conditions of carriage. Entry, visa and health requirements are
        your responsibility.</p>
        <p><strong>Partner links.</strong> Some booking links, such as those to Aviasales, are partner links. If you
        book through one, ffly may earn a commission, at no extra cost to you.</p>`,
    },
    {
      id: 'prices',
      title: 'Prices and Information Are Indicative',
      content: `
        <ul>
          <li>Fares are collected from third-party websites at a point in time, and ${APP.proName} shows when each
          fare was last checked. Prices and seat availability change often and may differ when you book.</li>
          <li>Prices may not include baggage, seat selection, payment or other fees, and converted prices are
          approximate.</li>
          <li>Flight times, daylight and sleep figures are estimates.</li>
          <li>ffly does not cover every airline, airport or route, and a search may miss cheaper options.</li>
        </ul>
        <p>Always confirm the price, times and conditions on the site you book on before you book.</p>`,
    },
    {
      id: 'free-and-pro',
      title: `Free and ${APP.proName}`,
      content: `
        <ul>
          <li><strong>Free:</strong> ${APP.freeSearches} searches, with partially hidden results. For the top route
          you see the cities, the days in each city and the total price; dates, flight times and booking links are
          hidden, and the other routes show only their price and number of cities.</li>
          <li><strong>${APP.proName}:</strong> every route in full, including dates, flight times and booking links,
          and no ${APP.freeSearches}-search limit, as a weekly or yearly subscription (Section 6) or a one-time
          ${APP.lifetimeName} purchase (Section 7). Pro is subject to fair use: a daily search limit protects the
          service and the websites we check fares on.</li>
          <li><strong>Web search:</strong> searches at
          <a href="${pathFor('search')}">${SITE_HOST}${pathFor('search')}</a> are free, limited to
          ${WEB_SEARCH.freeSearchesPerDay} per day per network, and show the cities, nights and total price of the
          top route, and only the price and number of cities of the other routes.</li>
        </ul>
        <p>We may change the features of Free and ${APP.proName} over time.</p>`,
    },
    {
      id: 'subscriptions',
      title: 'Subscription Terms (Auto-Renewable)',
      content: `
        <ul>
          <li><strong>${APP.proName}</strong> is offered as weekly and yearly auto-renewable subscriptions. The price
          and length of each subscription are shown in the app, in your local currency, before you buy.</li>
          <li>Payment is charged to your Apple ID account at confirmation of purchase.</li>
          <li>The subscription renews automatically unless it is cancelled at least 24 hours before the end of the
          current period. Your account is charged for renewal within 24 hours before the end of the current
          period.</li>
          <li>You can manage and cancel your subscription in your Apple ID account settings after purchase (on
          iPhone: Settings &rarr; your name &rarr; Subscriptions), or from <strong>Manage</strong> in ffly's
          Settings. Cancelling stops future renewals; ${APP.proName} stays active until the end of the period you
          have paid for.</li>
          <li>No free trial is offered.</li>
          <li>Refunds are handled by Apple under its policies. You can restore an existing subscription on a new
          device with <strong>Restore purchases</strong>.</li>
        </ul>`,
    },
    {
      id: 'lifetime',
      title: `${APP.proName} ${APP.lifetimeName} Purchase`,
      content: `
        <p><strong>${APP.proName} ${APP.lifetimeName}</strong> is a <strong>non-consumable</strong> in-app purchase
        that unlocks ${APP.proName} with no time limit.</p>
        <ul>
          <li>It is a <strong>one-time payment</strong>, charged to your Apple ID account at confirmation of
          purchase. It does not renew and there is no recurring charge.</li>
          <li>The price is set per territory on the App Store and is shown to you in the app before you confirm.</li>
          <li>It restores on other devices signed in to the same Apple ID through <strong>Restore
          purchases</strong>.</li>
          <li><strong>Buying ${APP.lifetimeName} does not cancel an existing ${APP.proName} subscription.</strong>
          Cancel the subscription yourself in your Apple ID account settings (on iPhone: Settings &rarr; your name
          &rarr; Subscriptions), or it will keep renewing and you will be charged for both.</li>
          <li>Refunds are handled by Apple under its policies.</li>
        </ul>`,
    },
    {
      id: 'acceptable-use',
      title: 'Acceptable Use',
      content: `
        <p>You agree not to:</p>
        <ul>
          <li>access the ffly API other than through the ffly app or ${SITE_HOST}, or scrape, crawl or resell ffly's results;</li>
          <li>work around search limits, the Free tier's hidden results, or any security measure;</li>
          <li>reverse engineer the app, except where the law allows it;</li>
          <li>use ffly for any unlawful purpose or in a way that could harm ffly, its users or the websites it
          checks fares on.</li>
        </ul>`,
    },
    {
      id: 'ip',
      title: 'Intellectual Property',
      content: `
        <p>ffly, including its software, design and route-finding, belongs to us and is protected by intellectual
        property laws. Airline names and trademarks belong to their owners; their appearance in ffly does not imply
        any partnership or endorsement.</p>`,
    },
    {
      id: 'availability',
      title: 'Availability',
      content: `
        <p>We work to keep ffly running, but we do not guarantee it will be available at all times. Fare sources
        may be slow or unavailable, searches may take time or fail, and search results kept on our server may be
        lost before they expire. You can run a search again or reopen a saved trip from the Trips list.</p>`,
    },
    {
      id: 'disclaimer',
      title: 'Disclaimer',
      content: `
        <p>To the extent permitted by law, ffly is provided "as is" and "as available", without warranties of any
        kind, including warranties that fares, schedules or other information are accurate, complete or current.</p>`,
    },
    {
      id: 'liability',
      title: 'Limitation of Liability',
      content: `
        <p>To the maximum extent permitted by law, we are not liable for any indirect, incidental, special or
        consequential damages, or for losses arising from bookings made with third parties, price or schedule
        changes, cancellations or missed connections. Nothing in these Terms limits rights you have under mandatory
        consumer protection law.</p>`,
    },
    {
      id: 'termination',
      title: 'Termination',
      content: `
        <p>You may stop using ffly at any time by deleting the app; to stop paying, cancel your subscription as
        described in Section 6. We may suspend access to the service for anyone who breaches these Terms.</p>`,
    },
    {
      id: 'privacy',
      title: 'Privacy',
      content: `
        <p>Our <a href="${pathFor('privacy')}">Privacy Policy</a> explains what data ffly processes and why.</p>`,
    },
    {
      id: 'changes',
      title: 'Changes to These Terms',
      content: `
        <p>We may update these Terms. We will post the new version on this page with a new effective date. If you
        keep using ffly after a change takes effect, the updated Terms apply.</p>`,
    },
    {
      id: 'governing-law',
      title: 'Governing Law',
      content: `
        <p>These Terms are governed by the laws of the <strong>Republic of Belarus</strong>, without regard to
        conflict of law rules. This does not take away the protection of mandatory consumer laws of the country
        where you live.</p>`,
    },
    {
      id: 'contact',
      title: 'Contact',
      content: `
        <ul>
          <li><strong>Operator:</strong> ${OPERATOR}</li>
          <li><strong>Email:</strong> ${mailto(CONTACT_EMAIL)}</li>
          <li><strong>Support:</strong> <a href="${pathFor('support')}">ffly Support</a></li>
        </ul>`,
    },
  ],
};
