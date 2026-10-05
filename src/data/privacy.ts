import {
  ADSENSE_CLIENT,
  APP,
  CONSENT,
  CONTACT_EMAIL,
  EXTERNAL,
  FEEDBACK,
  GA_MEASUREMENT_ID,
  OPERATOR,
  PREFS,
  SERVICE,
  SITE_HOST,
  externalLink,
  mailto,
} from '../app';
import { pathFor } from '../site-pages';
import type { LegalDocument } from './types';

// Every collected item here is one row of ios-ffly/Template/PrivacyInfo.xcprivacy and
// docs/compliance/data-inventory.yaml. Linked: Search History, Purchase History and User ID, because every
// search carries the installation identifier, the subscription provider keeps purchases under it and feedback
// can pair it with an email address; Email Address (optional) and Customer Support, both from the feedback form
// (ios-ffly spec 012). Not linked: Product Interaction, Device ID. No tracking. Change one, change all three,
// and the App Store Connect privacy answers. Recipients are named by category only, Apple excepted
// (scripts/check-legal.mjs bans vendor names and mechanics on every page).
// The website's ad copy follows ADSENSE_CLIENT: "no ads" until it is set, ads after consent once it is. Its
// analytics copy follows GA_MEASUREMENT_ID the same way.
const ADS = Boolean(ADSENSE_CLIENT);
const ANALYTICS = Boolean(GA_MEASUREMENT_ID);
const CONSENT_MONTHS = Math.round(CONSENT.days / 30);

const LEGAL_BASES = [
  'we use your searches, installation identifier and purchase status to provide the service you ask for (performance of a contract)',
  'we use analytics, search limits and your IP address for our legitimate interests in improving ffly, keeping it fair and protecting it from abuse',
  'we use feedback and any email address you add for our legitimate interest in answering you and fixing what you report',
  'we remember your search choices on this website for our legitimate interest in sparing you from typing them again',
  ...(ANALYTICS ? ['we measure visits to this website only with your consent, which you can withdraw at any time'] : []),
  ...(ADS ? ['we show personalised ads on this website only with your consent'] : []),
];

export const PRIVACY: LegalDocument = {
  pageTitle: 'Privacy Policy',
  description: `How the ffly iPhone app handles your data: no account, no location, no ads, no tracking. Searches in the app are deleted within ${SERVICE.searchRetentionHours} hours.`,
  summaryTitle: 'The short version',
  summaryText: `ffly has no account and no sign-in. We don't collect your name, phone number or location, and we
    get your email address only if you add it to feedback. ${ADS ? 'The app shows no ads, this website shows ads only after you choose, and we' : 'We show no ads and'}
    don't track you across other apps or websites.${ANALYTICS ? ' This website measures visits only if you agree.' : ''} To find routes, we receive the trip you search for. We delete a search from the app
    within ${SERVICE.searchRetentionHours} hours, and keep a web search's result, with nothing that identifies you,
    until the trip starts, so its link keeps working. We collect anonymous usage analytics to improve the app. Apple handles
    payments. We never sell your data.`,
  sections: [
    {
      id: 'who-we-are',
      title: 'Who We Are',
      content: `
        <p>ffly is an iPhone app that finds cheap multi-city trips. It is run by <strong>${OPERATOR}</strong>
        ("we", "us"), who is responsible for your personal data as described here. You can reach us at
        ${mailto(CONTACT_EMAIL)}. This policy covers the ffly app, the web search on ${SITE_HOST} and this
        website.</p>`,
    },
    {
      id: 'not-collected',
      title: 'What We Do Not Collect',
      content: `
        <ul>
          <li><strong>No account.</strong> There's no sign-up, so we hold no name, phone number, password or
          profile.</li>
          <li><strong>No location.</strong> You pick places by name.</li>
          <li><strong>No ads and no tracking.</strong> ffly doesn't use the advertising identifier, doesn't track
          you and contains no advertising code.</li>
          <li><strong>No payment details.</strong> Apple handles every payment. We never see your card or your
          Apple ID password.</li>
          <li><strong>No sale of data.</strong> We don't sell your data or share it for advertising.</li>
        </ul>`,
    },
    {
      id: 'searches',
      title: 'Your Trip Searches',
      content: `
        <p>When you search, ffly sends us the places, dates, nights and priority you chose. We use them only to
        find your routes. Each search carries the random identifier for your installation (Section 4), so we treat
        your searches as linked to you.</p>
        <p>To check fares, we ask third-party airline and fare-search websites about the airports and dates in
        your search. We send them nothing that identifies you.</p>`,
    },
    {
      id: 'app-user-id',
      title: 'Your Installation Identifier',
      content: `
        <p>ffly gives your installation a random identifier. It is not your Apple ID and says nothing about who
        you are. We use it to:</p>
        <ul>
          <li>check whether you have ${APP.proName};</li>
          <li>count your free searches and apply the daily fair-use limit of ${APP.proName};</li>
          <li>tell which feedback messages come from the same installation.</li>
        </ul>
        <p>Because it can travel with an email address you add to feedback, we treat it as linked to you.</p>`,
    },
    {
      id: 'ip-address',
      title: 'Your IP Address',
      content: `
        <p>Like any internet service, we receive the IP address your connection comes from. We use it only to
        apply daily free-search limits and to protect ffly from abuse, such as floods of messages. We don't use it
        to locate you or to build a profile of you.</p>`,
    },
    {
      id: 'purchases',
      title: 'Subscriptions and Purchases',
      content: `
        <p>${APP.proName} is sold through the App Store as weekly and yearly subscriptions and as a one-time
        ${APP.lifetimeName} purchase. Apple handles the payment, under
        ${externalLink(EXTERNAL.applePrivacy, "Apple's Privacy Policy")}.</p>
        <p>Our subscription provider confirms your purchases for us. It receives your installation identifier and
        the details of your ${APP.proName} purchases (product, dates and status), never your name, email address
        or card. It keeps them under your identifier, so we treat your purchase history as linked to you.</p>`,
    },
    {
      id: 'analytics',
      title: 'Anonymous Usage Analytics',
      content: `
        <p>ffly sends us usage events such as searches, purchases and onboarding steps. Each event comes with the
        app and iOS version, the device model, your language, region and time zone settings, whether you're on
        Free or ${APP.proName}, device identifiers that are not the advertising identifier, and a random session
        identifier.</p>
        <p>Analytics never include the places you search, your travel dates, the text of your feedback or any
        contact detail. They are not linked to you and are never used for tracking or advertising.</p>`,
    },
    {
      id: 'feedback',
      title: 'Feedback You Send',
      content: `
        <p>You can send us a message from <strong>Send feedback</strong> in Settings, from a search, or after
        rating a search. Nothing is sent until you tap <strong>Send</strong>. A message contains:</p>
        <ul>
          <li>what you write, the category you pick, and your star rating if you rated a search;</li>
          <li>the app and iOS version, the device model, the app's language and your plan;</li>
          <li>if you send it from a search: the places, dates and priority of that search and how it went;</li>
          <li>your email address, only if you type one in;</li>
          <li>your installation identifier.</li>
        </ul>
        <p>We use it only to read and answer your message and to fix what you report. We store it with the IP
        address it came from, and a copy goes to a messaging service our team uses to read feedback. If you're
        offline, the message waits on your iPhone for up to ${FEEDBACK.queuedDays} days and is sent once ffly can
        connect.</p>
        <p>Feedback is linked to you. If you'd rather not be contacted, leave the email field empty. To delete
        feedback and the email address you gave, write to ${mailto(CONTACT_EMAIL)}. Write from that address, or
        tell us roughly when you sent it, so we can find it.</p>`,
    },
    {
      id: 'on-device',
      title: 'Data Kept on Your iPhone',
      content: `
        <ul>
          <li><strong>Trips:</strong> your saved searches and their results. Swipe a trip in the Trips list to
          delete it.</li>
          <li><strong>Free-search count:</strong> how many free searches you've used. It stays on your iPhone even
          after you delete the app, so reinstalling doesn't reset it.</li>
          <li><strong>App settings:</strong> things like whether you've finished onboarding.</li>
          <li><strong>Notifications:</strong> ffly can tell you when a search is ready. It asks first, the
          notifications come from your iPhone itself, and you can turn them off in iOS Settings.</li>
        </ul>
        <p>None of this is sent to us. Deleting the app removes it, except the free-search count.</p>`,
    },
    {
      id: 'booking-links',
      title: 'Booking Links and Other Websites',
      content: `
        <p>When you tap <strong>Book</strong>, the airline's site or a booking site opens in a browser inside
        ffly. We don't see the passenger or payment details you enter there. That website's own terms and
        privacy policy apply to what you do on it.</p>
        <p>For some fares, <strong>Book</strong> opens a booking partner's site, which may set its own cookies.
        That link carries ffly's partner identifier, so the partner can pay ffly a commission if you book, at no
        extra cost to you. The identifier is the same for every ffly user: it identifies ffly, not you.</p>`,
    },
    {
      id: 'app-store-labels',
      title: 'App Store Privacy Details',
      content: `
        <ul>
          <li><strong>Data used to track you:</strong> none.</li>
          <li><strong>Data linked to you:</strong> Search History (your trip searches), Purchase History (your
          ${APP.proName} purchases), User ID (a random identifier for your installation, not your Apple ID), Email
          Address (only if you add one to feedback) and Customer Support (the feedback you send).</li>
          <li><strong>Data not linked to you:</strong> Product Interaction (usage events) and Device ID (a device
          identifier that is not the advertising identifier).</li>
        </ul>`,
    },
    {
      id: 'legal-bases',
      title: 'Why We Process This Data',
      content: `
        <p>Where the GDPR or similar laws apply:</p>
        <ul>
          ${LEGAL_BASES.map((basis, i) => `<li>${basis}${i < LEGAL_BASES.length - 1 ? ';' : '.'}</li>`).join('\n          ')}
        </ul>
        <p>You can object to processing based on legitimate interests at any time.</p>`,
    },
    {
      id: 'sharing',
      title: 'Who Receives Data',
      content: `
        <ul>
          <li><strong>Apple</strong> handles App Store payments.</li>
          <li><strong>Our subscription provider</strong> confirms your ${APP.proName} purchases (Section 6).</li>
          <li><strong>A messaging service our team uses to read feedback</strong> receives a copy of each message
          (Section 8).</li>
          <li><strong>Our hosting providers</strong> run ffly and this website for us.</li>
          <li><strong>A booking partner</strong> receives what you do on its site once you open a partner link
          (Section 10).</li>${ANALYTICS ? `
          <li><strong>An analytics provider</strong> measures visits to this website, only if you agree
          (Section 17).</li>` : ''}${ADS ? `
          <li><strong>An advertising partner and its consent tool</strong> show ads on this website and ask for
          your choice first (Section 17).</li>` : ''}
        </ul>
        <p>Our providers handle data only on our behalf. We may also disclose data when the law requires it. We
        don't sell data or share it with data brokers.${ADS ? '' : ' We share nothing with advertisers.'}</p>`,
    },
    {
      id: 'security',
      title: 'Security and International Transfers',
      content: `
        <p>Everything ffly sends is encrypted in transit. Some of our providers may handle data outside your
        country, including outside the EEA and the UK. Where they do, we protect it with the European
        Commission's Standard Contractual Clauses (and the UK equivalent) or another lawful safeguard. You can
        ask us for a copy.</p>`,
    },
    {
      id: 'retention',
      title: 'How Long We Keep Data',
      content: `
        <ul>
          <li>Searches in the app are deleted within ${SERVICE.searchRetentionHours} hours. A web search's result is
          kept, without anything that identifies you, until the trip's first day, then deleted.</li>
          <li>The free-search count for the web search resets daily, and so does the ${APP.proName} fair-use
          count. We keep your in-app free-search count only as long as the Free limit needs it.</li>
          <li>Feedback is kept to answer it and prevent abuse. You can ask us to delete it at any time.</li>
          <li>Analytics are kept only as long as we need them to understand how ffly is used, then combined into
          totals or deleted.</li>
          <li>Apple and our subscription provider keep purchase records as needed for refunds, accounting and
          fraud prevention.</li>
          <li>Our hosting provider keeps visit logs for this website briefly.</li>${ANALYTICS ? `
          <li>Website analytics, if you agreed to them, are kept only as long as we need them to understand how
          this website is used, then deleted.</li>` : ''}
        </ul>`,
    },
    {
      id: 'web-search',
      title: `Web Search on ${SITE_HOST}`,
      content: `
        <p>You can search on the home page and on the <a href="${pathFor('search')}">web search</a> page. A web
        search sends us your places, dates and nights. It sends no app identifier, and your search isn't stored
        with your IP address. We use your IP address only to count your free web searches for the day.</p>
        <p>Your browser remembers your latest search until you close the tab, so reloading the page keeps it. The
        page's address carries the places, dates and nights of your search, so you can share it.</p>
        <p>When a web search finishes, we keep its result without anything that identifies you, so anyone who opens
        the link to the same search sees that result until the trip's first day. Searches from the app are still
        deleted within ${SERVICE.searchRetentionHours} hours.</p>
        <p>If you choose <strong>Notify me</strong>, your browser asks whether ${SITE_HOST} may send you
        notifications, and tells you when your routes are ready while the tab is open. Nothing is asked until you
        choose it, the notification comes from your browser itself, and you can turn it off in your browser's
        settings.</p>
        <p>Results show <strong>Book</strong> links, which open the airline's site or a booking site in a new tab.
        A booking partner's site may set its own cookies, and its link carries ffly's partner identifier, the same
        for every ffly user, so the partner can pay ffly a commission if you book, at no extra cost to you
        (Section 10).</p>`,
    },
    {
      id: 'website',
      title: 'This Website',
      content: `
        <p>This website remembers where you start and come back to for ${PREFS.from.days} days, and the cities you
        picked for ${PREFS.cities.days} days, so the search is filled in next time. It also remembers which tip
        about the app it showed you last. It does this with small cookies that only this website reads. It never
        remembers your travel dates. You can delete these cookies in your browser at any time.</p>
        ${ADS
          ? `<p>This website shows ads from an advertising partner. Before any ad loads, a consent tool asks whether
        you agree to personalised ads, and remembers your choice. If you don't agree, you may still see ads that are
        not personalised, which the partner may still measure and limit where the law allows. You can change your
        choice at any time from the link the consent tool adds to the page. The advertising partner and the consent
        tool receive your IP address and details of your browser and device, and may set their own cookies.</p>`
          : '<p>This website shows no ads.</p>'}
        ${ANALYTICS
          ? `<p>If you agree, this website uses an analytics provider to measure visits, so we can see what helps and
        improve the site. It measures the pages you visit, how you use the site, your device and browser type, and
        your approximate location, worked out from your IP address. The analytics provider receives your IP address
        and details of your browser and device, and sets its own cookies to tell visits apart. We don't use this for
        advertising, and it builds no profile of you across other websites.</p>
        <p>Nothing is measured until you choose <strong>Accept</strong> in the banner, and if you choose
        <strong>Reject</strong>, nothing loads. This website remembers your choice in a cookie for about
        ${CONSENT_MONTHS} months. To change it or withdraw your consent, choose <strong>Cookie settings</strong> at the
        bottom of any page. Withdrawing removes the analytics cookies.</p>`
          : '<p>This website runs no analytics.</p>'}
        <p>Our hosting provider receives your IP address and basic details of each visit to deliver the page and
        protect the site.</p>`,
    },
    {
      id: 'rights',
      title: 'Your Rights',
      content: `
        <p>Depending on where you live, you may have the right to access, correct, delete or get a copy of your
        personal data, and to object to or limit how we use it. ffly has no account, so unless you added your
        email address to feedback, we usually can't tell which records are yours.</p>
        <ul>
          <li>Delete trips in the Trips list, or delete the app to remove the data on your iPhone.</li>
          <li>Manage or cancel a ${APP.proName} subscription in your Apple ID account settings.</li>
          <li>Ask us to delete feedback you sent (Section 8).</li>
        </ul>
        <p>To make a request, email ${mailto(CONTACT_EMAIL)}. You can also complain to your local data protection
        authority.</p>`,
    },
    {
      id: 'children',
      title: "Children's Privacy",
      content: `
        <p>ffly isn't meant for children. We don't knowingly collect personal data from children under 13, or the
        higher age your local law sets. If you think a child has given us personal data, contact us and we'll
        delete it.</p>`,
    },
    {
      id: 'changes',
      title: 'Changes to This Policy',
      content: `
        <p>We may update this policy as ffly changes, and we'll post the new version here with a new date. If we
        start collecting a new kind of data, we'll update this policy before the app version that collects it is
        released.</p>`,
    },
    {
      id: 'contact',
      title: 'Contact Us',
      content: `
        <ul>
          <li><strong>Operator:</strong> ${OPERATOR}</li>
          <li><strong>Email:</strong> ${mailto(CONTACT_EMAIL)}</li>
          <li><strong>Support:</strong> <a href="${pathFor('support')}">ffly Support</a></li>
        </ul>`,
    },
  ],
};
