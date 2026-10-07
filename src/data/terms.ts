import {
  APP,
  CONTACT_EMAIL,
  EXTERNAL,
  GOVERNING_LAW,
  OPERATOR,
  OPERATOR_ADDRESS,
  OPERATOR_COUNTRY,
  OPERATOR_PHONE,
  SITE_HOST,
  WEB_SEARCH,
  externalLink,
  mailto,
} from '../app';
import { pathFor } from '../site-pages';
import { legalSections } from './sections';
import type { LegalDocument } from './types';

// Section 6 is the App Store Guideline 3.1.2(c) auto-renewable subscription disclosure, Section 7 the one-time
// Lifetime purchase (no trial is offered on any plan), and Section 1 links Apple's Standard EULA. All three are
// submission requirements, not style: keep them whole, numbered 6 and 7 (check-legal asserts it), with no literal
// price, and never describe Pro as "unlimited" (the API caps Pro per day). #apple carries Apple's minimum terms for an
// app licence (App Store Review Guidelines, "Instructions for Minimum Terms of Developer's End-User License Agreement").
const IDS = [
  'agreement', 'service', 'not-a-travel-agent', 'prices', 'free-and-pro', 'subscriptions', 'lifetime', 'withdrawal',
  'acceptable-use', 'ip', 'availability', 'disclaimer', 'liability', 'apple', 'termination', 'privacy', 'changes',
  'governing-law', 'general', 'contact',
] as const;
const { ref, build } = legalSections(IDS);

const APPLE_SUBSCRIPTIONS = 'Settings &rarr; your name &rarr; Subscriptions';
const appleRefund = externalLink(EXTERNAL.appleRefund, 'reportaproblem.apple.com');

export const TERMS: LegalDocument = {
  pageTitle: 'Terms of Use',
  description:
    'Terms of Use for the ffly iPhone app: indicative fares, bookings made on airline or booking sites, partner links, the ffly Pro weekly and yearly auto-renewable subscriptions, the one-time Lifetime purchase, and your right to withdraw.',
  summaryTitle: 'The short version',
  summaryText: `ffly helps you plan cheap multi-city trips. It is a search tool, not a travel agent: fares come
    from third-party airline and fare-search websites, prices are indicative, and <strong>Book</strong> opens the
    airline's site or a booking site, where you book. Some booking links are partner links: ffly may earn a
    commission, at no extra cost to you. Your first ${APP.freeSearches} searches in the app are free and show every
    route in full. ${APP.proName} is available as a weekly or yearly auto-renewing subscription, which you manage and
    cancel in your Apple ID account settings, or as a one-time ${APP.lifetimeName} purchase that does not renew.`,
  sections: build({
    agreement: {
      title: 'Agreement',
      content: `
        <p>These Terms of Use ("Terms") govern your use of the ffly iPhone app, the web search on ${SITE_HOST} and the
        ffly service (together, "ffly"). ffly is offered by <strong>${OPERATOR}</strong> ("we", "us"), an individual
        trader based in ${OPERATOR_COUNTRY}; our contact details are in ${ref('contact')}. By downloading or using
        ffly you agree to these Terms. If you do not agree, do not use ffly.</p>
        <p>ffly is licensed to you under Apple's
        ${externalLink(EXTERNAL.appleEula, 'Licensed Application End User License Agreement (Standard EULA)')},
        which these Terms supplement, and ${ref('apple')} sets out the terms Apple requires between you, us and Apple.
        Where these Terms and the Standard EULA conflict about the licence to the app, the Standard EULA prevails.</p>`,
    },
    service: {
      title: 'What ffly Does',
      content: `
        <p>You choose a start, one or more end places and the cities you want to visit, plus dates and nights. ffly
        checks fares on third-party airline and fare-search websites and suggests the order of cities and the dates
        that make the trip cheap and comfortable. Results include estimates such as daylight spent in transit and
        sleep lost.</p>`,
    },
    'not-a-travel-agent': {
      title: 'ffly Is Not a Travel Agent',
      content: `
        <p>ffly is an information tool. We are not a travel agent, tour operator or airline, we do not sell tickets,
        and we are not a party to any booking you make. When you tap <strong>Book</strong>, the airline's site or a
        booking site opens, and any booking is made with that company under its own terms and
        conditions. That company alone is responsible for the flight, its price, fees, schedule changes,
        cancellations, refunds, baggage and other conditions of carriage. Entry, visa and health requirements are
        your responsibility.</p>
        <p><strong>Partner links.</strong> Some booking links are partner links. If you book through one, ffly may
        earn a commission, at no extra cost to you.</p>`,
    },
    prices: {
      title: 'Prices and Information Are Indicative',
      content: `
        <ul>
          <li>Fares come from third-party sites at a point in time. ${APP.proName} shows when a fare was last checked,
          but some fares found earlier may be up to a week old and show no checked time.</li>
          <li>Prices and seat availability change often and may differ when you book.</li>
          <li>Prices may not include baggage, seat selection, payment or other fees, and converted prices are
          approximate.</li>
          <li>Flight times, daylight and sleep figures are estimates.</li>
          <li>ffly does not cover every airline, airport or route, and a search may miss cheaper options.</li>
        </ul>
        <p>Before you book, always confirm the price, times and conditions on the site you book on.</p>`,
    },
    'free-and-pro': {
      title: `Free and ${APP.proName}`,
      content: `
        <ul>
          <li><strong>Free:</strong> ${APP.freeSearches} searches in the app, each showing every route in full, with
          dates, flight times and booking links. Deleting and reinstalling ffly does not reset them. After that,
          <strong>Find route</strong> offers ${APP.proName} before it searches, and the trips you already searched stay
          in your Trips list.</li>
          <li><strong>${APP.proName}:</strong> every route in full, and no ${APP.freeSearches}-search limit, as a weekly
          or yearly subscription (${ref('subscriptions')}) or a one-time ${APP.lifetimeName} purchase
          (${ref('lifetime')}). ${APP.proName} is subject to fair use: a daily search limit protects ffly and the sites
          we check fares on.</li>
          <li><strong>Web search:</strong> searches at
          <a href="${pathFor('search')}">${SITE_HOST}${pathFor('search')}</a> are free, limited to
          ${WEB_SEARCH.freeSearchesPerDay} per day, and show the cities, nights and total price of the
          top route, and only the price and number of cities of the other routes.</li>
        </ul>
        <p>We may change the features of Free and ${APP.proName} over time. A change that reduces what a paid plan
        includes takes effect only from your next renewal, after the notice in ${ref('changes')}.</p>`,
    },
    subscriptions: {
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
          iPhone: ${APPLE_SUBSCRIPTIONS}), or from <strong>Manage</strong> in ffly's
          Settings. Cancelling stops future renewals; ${APP.proName} stays active until the end of the period you
          have paid for.</li>
          <li>If the price of your subscription changes, Apple tells you before it takes effect, and the new price
          applies from your next renewal. Where Apple or the law requires your agreement to a higher price, the
          subscription does not renew unless you agree.</li>
          <li>No free trial is offered.</li>
          <li>Refunds are handled by Apple under its policies (${ref('withdrawal')}). You can restore an existing
          subscription on a new device with <strong>Restore purchases</strong>.</li>
        </ul>`,
    },
    lifetime: {
      title: `${APP.proName} ${APP.lifetimeName} Purchase`,
      content: `
        <p><strong>${APP.proName} ${APP.lifetimeName}</strong> is an in-app purchase that unlocks ${APP.proName}
        with no time limit.</p>
        <ul>
          <li>It is a <strong>one-time payment</strong>, charged to your Apple ID account at confirmation of
          purchase. It does not renew and there is no recurring charge.</li>
          <li>The price is set by country on the App Store and is shown in the app before you confirm.</li>
          <li>It restores on other devices signed in to the same Apple ID through <strong>Restore
          purchases</strong>.</li>
          <li><strong>Buying ${APP.lifetimeName} does not cancel an existing ${APP.proName} subscription.</strong>
          Cancel the subscription yourself in your Apple ID account settings (on iPhone: ${APPLE_SUBSCRIPTIONS}),
          or it will keep renewing and you will be charged for both.</li>
          <li>Refunds are handled by Apple under its policies (${ref('withdrawal')}).</li>
        </ul>`,
    },
    withdrawal: {
      title: 'Refunds and Your Right to Withdraw',
      content: `
        <p>App Store purchases are sold and refunded by Apple, under Apple's terms. To ask for a refund, go to
        ${appleRefund}. We cannot issue or refuse a refund for an App Store purchase ourselves.</p>
        <p><strong>Consumers in the EEA and the UK.</strong> If you live in the European Economic Area or the United
        Kingdom, you have the right to withdraw from a purchase of ${APP.proName} within 14 days, without giving a
        reason. ${APP.proName} starts at once when you buy it. If you asked for immediate access and acknowledged that
        you would lose your right to withdraw, you lose it once ${APP.proName} has been supplied; where the law still
        lets you withdraw from a subscription that has started, you may have to pay for the part you used. To
        withdraw, ask Apple at ${appleRefund} within the 14 days, or tell us at ${mailto(CONTACT_EMAIL)} and we will
        help; telling us in time is enough. Any refund is made through Apple.</p>
        <p>This section does not affect any other right you have under the consumer law of your country, including a
        remedy when ffly is not as described.</p>`,
    },
    'acceptable-use': {
      title: 'Acceptable Use',
      content: `
        <p>You agree not to:</p>
        <ul>
          <li>use ffly other than through the ffly app or ${SITE_HOST}, or scrape, crawl or resell ffly's
          results;</li>
          <li>work around search limits or any security measure;</li>
          <li>reverse engineer the app, except where the law allows it;</li>
          <li>use ffly for any unlawful purpose or in a way that could harm ffly, its users or the websites it
          checks fares on.</li>
        </ul>`,
    },
    ip: {
      title: 'Intellectual Property',
      content: `
        <p>ffly, including its software, design and route-finding, belongs to us and is protected by intellectual
        property laws. Airline names and trademarks belong to their owners; their appearance in ffly does not imply
        any partnership or endorsement.</p>`,
    },
    availability: {
      title: 'Availability',
      content: `
        <p>We work to keep ffly running, but we can't promise it will always be available. Fare sources may be
        slow or unavailable, searches may take time or fail, and a search may need to be run again. You can still
        reopen a saved trip from the Trips list.</p>`,
    },
    disclaimer: {
      title: 'Disclaimer',
      content: `
        <p>To the extent permitted by law, ffly is provided "as is" and "as available", without warranties of any
        kind, including warranties that fares, schedules or other information are accurate, complete or current.</p>`,
    },
    liability: {
      title: 'Limitation of Liability',
      content: `
        <p>To the maximum extent permitted by law, we are not liable for any indirect, incidental, special or
        consequential damages, or for losses arising from bookings made with third parties, price or schedule
        changes, cancellations or missed connections.</p>
        <p>Nothing in these Terms limits or excludes liability for death or personal injury caused by negligence, for
        fraud or fraudulent misrepresentation, or for anything else that cannot be limited or excluded under the law
        that applies to you. If you are a consumer, you keep every right your mandatory national law gives you, and
        the paragraph above applies only so far as that law permits.</p>`,
    },
    apple: {
      title: 'Apple and the App Store',
      content: `
        <p>You and we acknowledge and agree that:</p>
        <ul>
          <li><strong>Acknowledgement.</strong> These Terms are between you and us only, not Apple, and we, not Apple,
          are solely responsible for the app and its content.</li>
          <li><strong>Scope of licence.</strong> Your licence to use the app is a non-transferable licence to use it
          on any Apple-branded product that you own or control, as permitted by the Usage Rules in the App Store
          Terms of Service.</li>
          <li><strong>Maintenance and support.</strong> We alone are responsible for providing any maintenance and
          support for the app, as these Terms or the law require. Apple has no obligation whatsoever to furnish any
          maintenance and support services for the app.</li>
          <li><strong>Warranty.</strong> We are responsible for any product warranty, whether express or implied by
          law, to the extent not effectively disclaimed. If the app fails to conform to any applicable warranty, you
          may notify Apple, and Apple will refund the purchase price, if any, for the app to you. To the maximum extent
          permitted by law, Apple has no other warranty obligation with respect to the app, and any other claims,
          losses, liabilities, damages, costs or expenses attributable to a failure to conform to any warranty are our
          responsibility.</li>
          <li><strong>Product claims.</strong> We, not Apple, are responsible for addressing any claims by you or a
          third party relating to the app or your possession or use of it, including product liability claims, any
          claim that the app fails to conform to any applicable legal or regulatory requirement, and claims arising
          under consumer protection, privacy or similar legislation.</li>
          <li><strong>Intellectual property rights.</strong> If a third party claims that the app or your possession
          and use of it infringes that third party's intellectual property rights, we, not Apple, are solely
          responsible for the investigation, defence, settlement and discharge of that claim.</li>
          <li><strong>Legal compliance.</strong> You represent and warrant that you are not located in a country that
          is subject to a US Government embargo, or that has been designated by the US Government as a "terrorist
          supporting" country, and that you are not listed on any US Government list of prohibited or restricted
          parties.</li>
          <li><strong>Developer contact.</strong> Questions, complaints or claims about the app go to ${OPERATOR},
          ${OPERATOR_ADDRESS}; phone ${OPERATOR_PHONE}; email ${mailto(CONTACT_EMAIL)}.</li>
          <li><strong>Third-party terms.</strong> When you use the app, you must comply with applicable third-party
          terms, such as your mobile network's terms and the terms of any airline or booking site you open from
          it.</li>
          <li><strong>Third-party beneficiary.</strong> Apple and Apple's subsidiaries are third-party beneficiaries
          of these Terms, and once you accept them, Apple will have the right (and will be deemed to have accepted the
          right) to enforce them against you as a third-party beneficiary.</li>
        </ul>`,
    },
    termination: {
      title: 'Termination',
      content: `
        <p>You may stop using ffly at any time by deleting the app; to stop paying, cancel your subscription as
        described in ${ref('subscriptions')}. We may suspend access to the service for anyone who breaches these
        Terms.</p>`,
    },
    privacy: {
      title: 'Privacy',
      content: `
        <p>Our <a href="${pathFor('privacy')}">Privacy Policy</a> explains what data ffly processes, why, and who
        receives it, including Apple, RevenueCat, AppsFlyer and Google.</p>`,
    },
    changes: {
      title: 'Changes to These Terms',
      content: `
        <p>We may update these Terms, and we will post the new version on this page with a new effective date. If a
        change is material and to your disadvantage, we will announce it here and in the app at least 30 days before
        it takes effect, and you can cancel your subscription before then. Other changes take effect when we publish
        them. The app asks you to accept the new version; if you keep using ffly after a change takes effect, the
        updated Terms apply.</p>`,
    },
    'governing-law': {
      title: 'Governing Law and Disputes',
      content: `
        <p>These Terms are governed by the law of <strong>${GOVERNING_LAW}</strong>, and the courts of
        ${GOVERNING_LAW} have jurisdiction over any dispute about them.</p>
        <p>If you are a consumer, this choice does not deprive you of the protection of the mandatory law of the
        country where you live, and you may also bring proceedings in the courts there. Consumers in the EEA and the
        UK keep every mandatory right their national law gives them, whatever this section says.</p>
        <p>Before going to court, please write to us at ${mailto(CONTACT_EMAIL)}: most problems are faster to fix
        that way. If you are a consumer in the EU, you may also be able to use an out-of-court dispute resolution
        body in your country.</p>`,
    },
    general: {
      title: 'General',
      content: `
        <p>If any part of these Terms is found unenforceable, the rest stays in force. If we do not enforce a term,
        that is not a waiver of it. You may not transfer your rights under these Terms; we may transfer ours to
        someone who takes over ffly, and that will not reduce your rights. These Terms, the Standard EULA and our
        Privacy Policy are the whole agreement between you and us about ffly.</p>`,
    },
    contact: {
      title: 'Contact',
      content: `
        <ul>
          <li><strong>Operator:</strong> ${OPERATOR}</li>
          <li><strong>Postal address:</strong> ${OPERATOR_ADDRESS}</li>
          <li><strong>Phone:</strong> ${OPERATOR_PHONE}</li>
          <li><strong>Email:</strong> ${mailto(CONTACT_EMAIL)}</li>
          <li><strong>Support:</strong> <a href="${pathFor('support')}">ffly Support</a></li>
        </ul>`,
    },
  }),
};
