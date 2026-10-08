import {
  ADSENSE_CLIENT,
  APP,
  CONSENT,
  CONTACT_EMAIL,
  EU_REPRESENTATIVE,
  EXTERNAL,
  FEEDBACK,
  GA_MEASUREMENT_ID,
  OPERATOR,
  OPERATOR_COUNTRY,
  PREFS,
  SERVICE,
  SITE_HOST,
  UK_REPRESENTATIVE,
  externalLink,
  mailto,
} from '../app';
import { pathFor } from '../site-pages';
import { ADDRESS_ON_REQUEST, legalSections } from './sections';
import type { LegalDocument } from './types';

// #app-store-labels is ios-ffly/Template/PrivacyInfo.xcprivacy and docs/compliance/data-inventory.yaml, in Apple's
// names: scripts/check-legal.mjs reads the inventory and fails on any difference. Change one, change all three, and
// the App Store Connect privacy answers. Only this page and /terms name processors (Apple, RevenueCat, AppsFlyer,
// Google); every other recipient is a category. The website's ad copy follows ADSENSE_CLIENT, its analytics copy
// GA_MEASUREMENT_ID.
const ADS = Boolean(ADSENSE_CLIENT);
const ANALYTICS = Boolean(GA_MEASUREMENT_ID);
const GOOGLE = ADS || ANALYTICS;
const CONSENT_MONTHS = Math.round(CONSENT.days / 30);
const GA_COOKIES = GA_MEASUREMENT_ID ? ['_ga', `_ga_${GA_MEASUREMENT_ID.replace(/^G-/, '')}`] : [];
const ATT_SETTINGS = 'iOS Settings &rarr; Privacy &amp; Security &rarr; Tracking';
const AD_MEASUREMENT = "<strong>Ad measurement</strong> in ffly's Settings &rarr; Privacy";

const REPRESENTATIVES = [
  ['EU representative', EU_REPRESENTATIVE],
  ['UK representative', UK_REPRESENTATIVE],
].filter(([, who]) => who);
const REPRESENTATIVE_ROWS = REPRESENTATIVES.map(([role, who]) => `
          <li><strong>${role}:</strong> ${who}</li>`).join('');

const ALL_IDS = [
  'who-we-are', 'representatives', 'app-store-labels', 'not-collected', 'searches', 'app-user-id', 'ip-address',
  'purchases', 'analytics', 'crash-performance', 'attribution', 'live-activity', 'feedback', 'on-device',
  'booking-links', 'web-search', 'website', 'legal-bases', 'sharing', 'transfers', 'security', 'retention', 'rights',
  'ccpa', 'children', 'changes', 'contact',
] as const;
const IDS = ALL_IDS.filter((id) => id !== 'representatives' || REPRESENTATIVES.length > 0);
const { number, ref, build } = legalSections(IDS);
export const privacySection = number;

const label = (type: string) => `<span class="label">${type}</span>`;
const cookie = (name: string) => `<code>${name}</code>`;
const list = (items: readonly string[]) =>
  items.map((item, i) => `<li>${item}${i < items.length - 1 ? ';' : '.'}</li>`).join('\n          ');

const CONSENT_BASES = [
  "Apple's advertising identifier, only after you choose <strong>Allow</strong> when ffly asks (App Tracking Transparency)",
  `attribution with AppsFlyer in the EEA, the UK and Switzerland, only after you turn on ${AD_MEASUREMENT}`,
  ...(ANALYTICS ? ['we measure visits to this website only with your consent'] : []),
  ...(ADS ? ['we show personalised ads on this website only with your consent'] : []),
];

const GOOGLE_ROLES = [
  ...(ANALYTICS ? ['measures visits to this website with Google Analytics'] : []),
  ...(ADS ? ['shows ads on this website with Google AdSense'] : []),
];

const CONTACT_ROWS = `
          <li><strong>Controller:</strong> ${OPERATOR}</li>
          <li><strong>Email:</strong> ${mailto(CONTACT_EMAIL)}</li>
          <li>${ADDRESS_ON_REQUEST}</li>`;

export const PRIVACY: LegalDocument = {
  pageTitle: 'Privacy Policy',
  description: `How the ffly iPhone app and ${SITE_HOST} handle your data: no account, no location, the advertising identifier only if you allow tracking, and searches in the app deleted within ${SERVICE.searchRetentionHours} hours.`,
  summaryTitle: 'The short version',
  summaryText: `ffly has no account and no sign-in. We don't collect your name, phone number or location, and we
    get your email address only if you add it to feedback. To find routes, we receive the trip you search for. We
    delete a search from the app within ${SERVICE.searchRetentionHours} hours, and keep a web search's result, with
    nothing that identifies you, until the trip starts, so its link keeps working. We collect usage analytics, crash
    and performance data to improve the app. If you allow tracking, ffly uses Apple's advertising identifier, with
    AppsFlyer, to measure which ads bring people to ffly; in the EEA, the UK and Switzerland, AppsFlyer uses your data
    only after you also turn on Ad measurement. The app shows no ads${ADS ? ', and this website shows ads only after you choose' : ''}.
    Apple handles payments. We never sell your data for money.`,
  sections: build({
    'who-we-are': {
      title: 'Who We Are',
      content: `
        <p>ffly is an iPhone app that finds cheap multi-city trips. The controller of your personal data, who decides
        how it is used and is responsible for it, is <strong>${OPERATOR}</strong> ("we", "us"), an individual based in
        ${OPERATOR_COUNTRY}. This policy covers the ffly app, the web search on ${SITE_HOST} and this website.</p>
        <ul>${CONTACT_ROWS}
        </ul>`,
    },
    representatives: {
      title: 'Our Representatives in the EU and the UK',
      content: `
        <p>We are established in ${OPERATOR_COUNTRY}, outside the European Economic Area and the United Kingdom. Under
        Article 27 of the GDPR and of the UK GDPR, we have appointed representatives. You can contact them, instead of
        us or as well as us, about anything in this policy:</p>
        <ul>${REPRESENTATIVE_ROWS}
        </ul>`,
    },
    'app-store-labels': {
      title: 'App Store Privacy Details',
      content: `
        <p>The App Store shows these details on ffly's page. They are the data types the app declares to Apple, in
        Apple's own names, and the sections below explain each one.</p>
        <ul>
          <li><strong>Data used to track you:</strong> ${label('Device ID')} (Apple's advertising identifier, only if you
          allow tracking; ${ref('attribution')}).</li>
          <li><strong>Data linked to you:</strong> ${label('Search History')} (your trip searches), ${label('Purchase History')}
          (your ${APP.proName} purchases), ${label('User ID')} (a random identifier for your installation, not your Apple
          ID), ${label('Email Address')} (only if you add one to feedback), ${label('Customer Support')} (the feedback you
          send) and ${label('Device ID')} (the device identifiers in ${ref('analytics')}).</li>
          <li><strong>Data not linked to you:</strong> ${label('Product Interaction')} (how the app is used),
          ${label('Crash Data')} and ${label('Performance Data')} (${ref('crash-performance')}).</li>
        </ul>`,
    },
    'not-collected': {
      title: 'What We Do Not Collect',
      content: `
        <ul>
          <li><strong>No account.</strong> There's no sign-up, so we hold no name, phone number, password or
          profile.</li>
          <li><strong>No location.</strong> You pick places by name.</li>
          <li><strong>No contacts, photos or files</strong> from your iPhone.</li>
          <li><strong>No payment details.</strong> Apple handles every payment. We never see your card or your
          Apple ID password.</li>
          <li><strong>No ads in the app</strong>, and no sale of your data for money (${ref('ccpa')}).</li>
        </ul>`,
    },
    searches: {
      title: 'Your Trip Searches',
      content: `
        <p>When you search, ffly sends us the places, dates, nights, priority and flight times you chose. We use them
        only to find your routes. Each search carries the random identifier for your installation
        (${ref('app-user-id')}), so we treat your searches as linked to you.</p>
        <p>To check fares, we ask third-party airline and fare-search websites about the airports and dates in
        your search. We send them nothing that identifies you.</p>`,
    },
    'app-user-id': {
      title: 'Your Installation Identifier',
      content: `
        <p>ffly gives your installation a random identifier, through our subscription provider, RevenueCat. It is
        not your Apple ID and says nothing about who you are. We use it to:</p>
        <ul>
          ${list([
            `check whether you have ${APP.proName}`,
            `count your free searches and apply the daily fair-use limit of ${APP.proName}`,
          ])}
        </ul>
        <p>RevenueCat keeps your purchases under it, so we treat it as linked to you. It is never sent to AppsFlyer.</p>`,
    },
    'ip-address': {
      title: 'Your IP Address',
      content: `
        <p>Like any internet service, we receive the IP address your connection comes from. We use it only to
        apply daily free-search limits and to protect ffly from abuse, such as floods of messages. We don't use it
        to locate you or to build a profile of you. The companies in ${ref('sharing')} also see it when ffly or this
        website connects to them.</p>`,
    },
    purchases: {
      title: 'Subscriptions and Purchases',
      content: `
        <p>${APP.proName} is sold through the App Store as weekly and yearly subscriptions and as a one-time
        ${APP.lifetimeName} purchase. Apple handles the payment, under
        ${externalLink(EXTERNAL.applePrivacy, "Apple's Privacy Policy")}.</p>
        <p>Our subscription provider, RevenueCat, confirms and restores your purchases for us. It receives your
        installation identifier, the details of your ${APP.proName} purchases (product, price, dates and status, as
        Apple reports them), your IP address and the device identifiers in ${ref('analytics')}, never your name,
        email address or card. It keeps your purchases under your identifier, so we treat your purchase history as
        linked to you. RevenueCat also passes subscription events, such as a purchase, a renewal or a cancellation, to
        AppsFlyer (${ref('attribution')}).</p>`,
    },
    analytics: {
      title: 'Usage Analytics and Device Identifiers',
      content: `
        <p>ffly sends us usage events, such as opening the app, searching, viewing the ${APP.proName} offer, buying
        and the steps of the welcome screens. Each event comes with the app and iOS version, the device model, your
        language, region and time zone settings, whether you're on Free or ${APP.proName}, and a random session
        identifier.</p>
        <p>Events also carry device identifiers: a random identifier for this installation, which stays on your iPhone
        if you delete and reinstall ffly; Apple's identifier for vendors (IDFV); and, only if you choose
        <strong>Allow</strong> when ffly asks to track you, Apple's advertising identifier (IDFA). We treat these
        identifiers as linked to you. The advertising identifier is used for tracking, as Apple defines it, to measure
        which ads bring people to ffly (${ref('attribution')}).</p>
        <p>Analytics never include the places you search, your travel dates, the text of your feedback or any contact
        detail. We use the usage events only to understand, in total, how ffly is used, never to profile you or to
        choose ads for you.</p>`,
    },
    'crash-performance': {
      title: 'Crash and Performance Data',
      content: `
        <p>If ffly crashes, iOS hands the app a crash report the next time it opens, and ffly sends us a summary of
        it: the kind of crash and the app version. It never includes what you searched or typed.</p>
        <p>ffly also sends us how long a search took, why a search failed, and an error code when something unexpected
        happens, such as an answer the app could not read, a lost connection or a purchase check that failed.</p>
        <p>We use both only to find and fix problems. Neither is linked to you.</p>`,
    },
    attribution: {
      title: 'Advertising Attribution',
      content: `
        <p>We want to know which ads and links bring people to ffly, so we spend on the ones that work. This is
        measurement, not targeting: the app shows no ads, and nothing here decides what you see.</p>
        <ul>
          <li><strong>Apple Search Ads.</strong> If you found ffly through an ad on the App Store, Apple gives the app a
          short-lived token, which ffly sends to us once and which we exchange with Apple for the campaign, ad group
          and keyword that led to the install. It uses no advertising identifier.</li>
          <li><strong>SKAdNetwork.</strong> Apple's own install measurement tells an ad network that one of its ads led
          to an install, without telling it who you are. ffly asks Apple to send a copy of these reports to
          AppsFlyer.</li>
          <li><strong>AppsFlyer.</strong> AppsFlyer Ltd. matches an install to the ad or link that led to it, and
          measures the subscriptions that follow. It receives Apple's advertising identifier, only if you choose
          <strong>Allow</strong> when ffly asks to track you (App Tracking Transparency); Apple's identifier for
          vendors; your IP address; the device model and iOS version; the app version; when ffly is installed and
          opened; the Apple Search Ads token; and subscription events, such as a
          purchase, a renewal or a cancellation, which RevenueCat passes to it. Using the advertising identifier this
          way is tracking under Apple's definition, and the App Store lists it as such.</li>
        </ul>
        <p><strong>In the EEA, the UK and Switzerland</strong>, ffly tells AppsFlyer that you have not agreed, and
        AppsFlyer does not use your personal data for attribution, until you turn on ${AD_MEASUREMENT}. The advertising
        identifier still needs your <strong>Allow</strong> as well. If your iPhone's region is not set, ffly treats you
        as being in this group.</p>
        <p><strong>To stop it</strong>, turn off tracking for ffly in ${ATT_SETTINGS}, turn off Ad measurement in
        ffly's Settings &rarr; Privacy, or use ${externalLink(EXTERNAL.appsflyerOptout, "AppsFlyer's opt-out page")}.
        Saying no changes nothing else in ffly.</p>`,
    },
    'live-activity': {
      title: 'Live Activities',
      content: `
        <p>While a search runs, ffly can show its progress on your Lock Screen and in the Dynamic Island. So that it
        can update while ffly is closed, iOS gives ffly a push token for that one Live Activity, which ffly sends to
        us with the search. We use it only to send that search's progress to your iPhone through Apple's push
        notification service. The push token is deleted with the search, within ${SERVICE.searchRetentionHours}
        hours. You can turn Live Activities off for ffly in iOS Settings.</p>`,
    },
    feedback: {
      title: 'Feedback You Send',
      content: `
        <p>You can send us a message from <strong>Send feedback</strong> in Settings, from a search, or after
        rating a search. Nothing is sent until you tap <strong>Send</strong>. A message contains:</p>
        <ul>
          ${list([
            'what you write, the category you pick, and your star rating if you rated a search',
            "the app and iOS version, the device model, the app's language and your plan",
            'if you send it from a search: the places, dates and priority of that search and how it went',
            'your email address, only if you type one in',
            'a random identifier used only for feedback, so we can tell which messages come from the same iPhone, never your installation identifier or an analytics identifier',
          ])}
        </ul>
        <p>We use it only to read and answer your message and to fix what you report. We store it with the IP
        address it came from, and a copy goes to a messaging service our team uses to read feedback. If you're
        offline, the message waits on your iPhone for up to ${FEEDBACK.queuedDays} days and is sent once ffly can
        connect.</p>
        <p>Feedback is linked to you. If you'd rather not be contacted, leave the email field empty. To delete
        feedback and the email address you gave, write to ${mailto(CONTACT_EMAIL)}. Write from that address, or
        tell us roughly when you sent it, so we can find it.</p>`,
    },
    'on-device': {
      title: 'Data Kept on Your iPhone',
      content: `
        <ul>
          <li><strong>Trips:</strong> your saved searches and their results. Swipe a trip in the Trips list to
          delete it.</li>
          <li><strong>Free-search count:</strong> how many free searches you've used. It stays on your iPhone even
          after you delete the app, so reinstalling doesn't reset it.</li>
          <li><strong>App settings:</strong> things like whether you've finished onboarding, your trip defaults and
          your Ad measurement choice.</li>
          <li><strong>Notifications:</strong> ffly can tell you when a search is ready. It asks first, the
          notifications come from your iPhone itself, and you can turn them off in iOS Settings.</li>
        </ul>
        <p>None of this is sent to us. Deleting the app removes it, except the free-search count and the installation
        identifier in ${ref('analytics')}.</p>`,
    },
    'booking-links': {
      title: 'Booking Links and Other Websites',
      content: `
        <p>When you tap <strong>Book</strong>, the airline's site or a booking site opens in a browser inside
        ffly. We don't see the passenger or payment details you enter there. That website's own terms and
        privacy policy apply to what you do on it.</p>
        <p>For some fares, <strong>Book</strong> opens a booking partner's site, which may set its own cookies.
        That link carries ffly's partner identifier, so the partner can pay ffly a commission if you book, at no
        extra cost to you. The identifier is the same for every ffly user: it identifies ffly, not you.</p>`,
    },
    'web-search': {
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
        (${ref('booking-links')}).</p>`,
    },
    website: {
      title: 'This Website and Cookies',
      content: `
        <p>This website remembers your search choices in small cookies that only this website reads, so the search
        is filled in next time:</p>
        <ul>
          ${list([
            `${cookie(PREFS.from.cookie)} and ${cookie(PREFS.back.cookie)}: where you start and come back to, for ${PREFS.from.days} days`,
            `${cookie(PREFS.cities.cookie)}: the cities you picked, for ${PREFS.cities.days} days`,
            `${cookie(PREFS.nudge.cookie)}: which tip about the app it showed you last, for ${PREFS.nudge.days} days`,
            ...(ANALYTICS ? [`${cookie(CONSENT.cookie)}: your answer to the cookie banner, for about ${CONSENT_MONTHS} months`] : []),
          ])}
        </ul>
        <p>It never remembers your travel dates. It also keeps the list of cities in your browser's storage, so the
        search opens quickly; that list is the same for everyone. Once you pick a language or close the note offering
        this page in your language, it remembers that there too, so the note does not come back. You can delete these
        cookies and this storage in your browser at any time.</p>
        ${ADS
          ? `<p>This website shows ads from Google AdSense. Before any ad loads, Google's consent message asks whether
        you agree to personalised ads, and remembers your choice. If you don't agree, you may still see ads that are
        not personalised, which Google may still measure and limit where the law allows. You can change your choice
        at any time from the link the consent message adds to the page. Google receives your IP address and details
        of your browser and device, and may set its own cookies.</p>`
          : '<p>This website shows no ads.</p>'}
        ${ANALYTICS
          ? `<p>If you agree, this website uses Google Analytics, from Google, to measure visits, so we can see what
        helps and improve the site. It measures the pages you visit, how you use the site, your device and browser
        type, and your approximate location, worked out from your IP address. Google receives your IP address and
        details of your browser and device, and sets the cookies ${GA_COOKIES.map(cookie).join(' and ')} to tell
        visits apart, for about 2 years. We have turned off Google's advertising features and signals, so this is not
        used for advertising and builds no profile of you across other websites.
        ${externalLink(EXTERNAL.googlePartnerSites, 'How Google uses data from sites that use its services')}.</p>
        <p>Nothing is measured until you choose <strong>Accept</strong> in the banner, and if you choose
        <strong>Reject</strong>, nothing loads. If your browser sends the Global Privacy Control signal, this website
        treats it as <strong>Reject</strong> and doesn't show the banner. To change your choice or withdraw your
        consent, choose <strong>Cookie settings</strong> at the bottom of any page. Withdrawing removes the analytics
        cookies.</p>`
          : '<p>This website runs no analytics.</p>'}
        <p>Our hosting provider receives your IP address and basic details of each visit to deliver the page and
        protect the site.</p>`,
    },
    'legal-bases': {
      title: 'Why We Process This Data',
      content: `
        <p>Where the GDPR, the UK GDPR or similar laws apply, we rely on:</p>
        <ul>
          <li><strong>Performance of a contract</strong>, to provide ffly: running your searches, the installation
          identifier, checking and restoring your purchases, the free-search count, and the push token that updates a
          Live Activity.</li>
          <li><strong>Your consent</strong>: ${CONSENT_BASES.join('; ')}. You can withdraw consent at any time, as
          ${ref('attribution')} and ${ref('website')} describe, without affecting what happened before.</li>
          <li><strong>Our legitimate interests</strong>: usage analytics, crash and performance data, to improve ffly
          and fix faults; your IP address and search limits, to keep ffly fair and protect it from abuse; the Apple
          Search Ads campaign report, to learn which ads work; feedback and any email address you add, to answer you
          and fix what you report; and remembering your search choices on this website. We have weighed these against
          your interests, and you can object at any time (${ref('rights')}).</li>
          <li><strong>Legal obligations</strong>: keeping the records the law requires and answering lawful requests
          from authorities.</li>
        </ul>`,
    },
    sharing: {
      title: 'Who Receives Data',
      content: `
        <p>These are the companies that handle personal data from the app or this website. Each receives only what
        its part of ffly needs.</p>
        <ul>
          <li><strong>Apple Inc.</strong> sells ${APP.proName} on the App Store and handles payments and refunds,
          delivers Live Activity updates through its push notification service, and provides the Apple Search Ads
          campaign report and SKAdNetwork. Apple does this as an independent company, under
          ${externalLink(EXTERNAL.applePrivacy, "Apple's Privacy Policy")}.</li>
          <li><strong>RevenueCat, Inc.</strong>, our subscription provider, confirms and restores your
          ${APP.proName} purchases and passes subscription events to AppsFlyer (${ref('purchases')}).
          ${externalLink(EXTERNAL.revenuecatPrivacy, "RevenueCat's Privacy Policy")}.</li>
          <li><strong>AppsFlyer Ltd.</strong> measures which ads and links bring people to ffly (${ref('attribution')}).
          ${externalLink(EXTERNAL.appsflyerPrivacy, "AppsFlyer's Privacy Policy")}.</li>${GOOGLE ? `
          <li><strong>Google LLC</strong> ${GOOGLE_ROLES.join(' and ')}, only if you agree (${ref('website')}).
          ${externalLink(EXTERNAL.googlePrivacy, "Google's Privacy Policy")}.</li>` : ''}
          <li><strong>Our hosting providers</strong> run ffly and this website for us.</li>
          <li><strong>A messaging service our team uses to read feedback</strong> receives a copy of each message
          (${ref('feedback')}).</li>
          <li><strong>A booking partner</strong> receives what you do on its site once you open a partner link
          (${ref('booking-links')}).</li>
          <li><strong>Airline and fare-search websites</strong> receive the airports and dates of your search, never
          anything that identifies you (${ref('searches')}).</li>
        </ul>
        <p>RevenueCat, AppsFlyer, ${GOOGLE ? 'Google and ' : ''}our hosting providers handle personal data on our
        behalf, under contracts that require them to protect it at least as well as this policy does. We may also
        disclose data when the law requires it. We don't sell personal data for money or pass it to data
        brokers.</p>`,
    },
    transfers: {
      title: 'International Transfers',
      content: `
        <p>We are based in ${OPERATOR_COUNTRY}, outside the European Economic Area and the United Kingdom, and
        ${OPERATOR_COUNTRY} has no adequacy decision from either. When you use ffly from the EEA, the UK or
        Switzerland, your data therefore reaches us outside them, and some of the companies in ${ref('sharing')}
        handle it in the United States or other countries.</p>
        <p>Where the law requires a safeguard for such a transfer, we and our providers rely on the European
        Commission's Standard Contractual Clauses, with the UK International Data Transfer Addendum for data from the
        UK and the Swiss amendments for data from Switzerland, together with encryption in transit. You can ask us
        for a copy of these safeguards at ${mailto(CONTACT_EMAIL)}.</p>`,
    },
    security: {
      title: 'Security',
      content: `
        <p>Everything ffly sends is encrypted in transit, and access to your data is limited to us and to the
        companies in ${ref('sharing')}, for their part of ffly. No system is perfectly secure: if a breach of your
        personal data is likely to put you at risk, we will tell you and the authorities as the law requires.</p>`,
    },
    retention: {
      title: 'How Long We Keep Data',
      content: `
        <ul>
          <li>Searches in the app are deleted within ${SERVICE.searchRetentionHours} hours, with the push token of
          their Live Activity. A web search's result is kept, without anything that identifies you, until the trip's
          first day, then deleted.</li>
          <li>The free-search count for the web search resets daily, and so does the ${APP.proName} fair-use
          count. We keep your in-app free-search count only as long as the Free limit needs it.</li>
          <li>Feedback is kept to answer it and prevent abuse. You can ask us to delete it at any time.</li>
          <li>Usage analytics, crash and performance data and the device identifiers are kept only as long as we need
          them to understand how ffly is used and to fix faults, then combined into totals or deleted.</li>
          <li>AppsFlyer keeps attribution data only as long as our contract with it allows, to measure our campaigns,
          then deletes it.</li>
          <li>Apple and RevenueCat keep purchase records as needed for refunds, accounting and fraud prevention, and
          as tax law requires.</li>
          <li>Our hosting provider keeps visit logs for this website briefly.</li>${ANALYTICS ? `
          <li>Website analytics, if you agreed to them, are kept only as long as we need them to understand how
          this website is used, then deleted. The cookies last as long as ${ref('website')} says.</li>` : ''}
        </ul>`,
    },
    rights: {
      title: 'Your Rights',
      content: `
        <p>Depending on where you live, and in the EEA, the UK and Switzerland in any case, you have the right to:</p>
        <ul>
          ${list([
            'access your personal data and get a copy of it',
            'correct it if it is wrong',
            'delete it',
            'receive the data you gave us in a portable, machine-readable form',
            'object to processing based on our legitimate interests',
            'restrict how we use it while a question about it is settled',
            `withdraw your consent at any time, without affecting what happened before (${ref('attribution')}, ${ref('website')})`,
          ])}
        </ul>
        <p>ffly has no account, so unless you added your email address to feedback, we usually can't tell which
        records are yours. Tell us what you can, such as the email address you used or roughly when you sent
        feedback. We may ask for something that confirms your identity before we act, so we never hand your data to
        someone else. We answer within one month; if a request is complex, we may take up to two more months and will
        tell you why.</p>
        <ul>
          <li>Delete trips in the Trips list, or delete the app to remove the data on your iPhone.</li>
          <li>Manage or cancel a ${APP.proName} subscription in your Apple ID account settings.</li>
          <li>Ask us to delete feedback you sent (${ref('feedback')}).</li>
          <li>Turn off tracking and Ad measurement (${ref('attribution')}).</li>
        </ul>
        <p>To make a request, email ${mailto(CONTACT_EMAIL)}. You can also complain to the data protection authority
        where you live or work, or where you think the law was broken; we would rather you came to us first. We make no
        decisions about you based solely on automated processing, including profiling, that have legal or similarly
        significant effects on you.</p>`,
    },
    ccpa: {
      title: 'California and Other US State Privacy Rights',
      content: `
        <p>If you live in California, the California Consumer Privacy Act, as amended by the California Privacy Rights
        Act, gives you the rights below, and this section is our notice at collection. We give residents of other US
        states with similar laws the same rights.</p>
        <ul>
          <li><strong>Categories we collect:</strong> identifiers (the installation identifier, device identifiers,
          the advertising identifier if you allow tracking, your IP address and an email address you add to feedback);
          commercial information (your ${APP.proName} purchases); internet or other electronic network activity (usage
          events, crash and performance data, your searches, and website analytics if you agree); and the content of
          feedback you send. We collect them from you and your device, for the purposes in ${ref('legal-bases')}, and
          keep them as ${ref('retention')} says.</li>
          <li><strong>Categories we disclose</strong> for business purposes: identifiers and commercial information to
          RevenueCat and our hosting providers; identifiers and internet activity to AppsFlyer${ANALYTICS ? ', and on this website to Google if you agree' : ''}.</li>
          <li><strong>Sharing.</strong> Giving AppsFlyer your advertising identifier and related identifiers to
          measure which ads bring people to ffly counts as "sharing" for cross-context behavioural advertising under
          California law. To opt out, choose <strong>Ask App Not to Track</strong> when ffly asks, turn off tracking
          for ffly in ${ATT_SETTINGS}, or use ${externalLink(EXTERNAL.appsflyerOptout, "AppsFlyer's opt-out page")}.
          This website honours the Global Privacy Control signal (${ref('website')}).</li>
          <li><strong>No sale.</strong> We do not sell personal information for money, and have not done so in the
          past 12 months.</li>
          <li><strong>No sensitive personal information.</strong> We don't collect sensitive personal information as
          the law defines it, such as your precise location, and don't use any to infer things about you.</li>
          <li><strong>Your rights:</strong> to know what we collect, use and disclose; to delete it; to correct it;
          and to opt out of sharing. Make a request at ${mailto(CONTACT_EMAIL)}; an authorised agent may act for you
          with your signed permission, and we check requests as ${ref('rights')} describes. We will not treat you
          differently for using these rights.</li>
        </ul>`,
    },
    children: {
      title: "Children's Privacy",
      content: `
        <p>ffly isn't meant for children. We don't knowingly collect personal data from anyone under 13, or under 16
        in the EEA and the UK, unless the law of their country sets a lower age for consenting to online services. If
        you think a child has given us personal data, contact us and we'll delete it.</p>`,
    },
    changes: {
      title: 'Changes to This Policy',
      content: `
        <p>We may update this policy as ffly changes, and we'll post the new version here with a new effective date.
        If a change is material, such as a new kind of data or a new purpose, we'll announce it here at least 30 days
        before it takes effect, and the app asks you to accept the new version before you carry on. If we start
        collecting a new kind of data, the app version that collects it ships with updated App Store details.</p>`,
    },
    contact: {
      title: 'Contact Us',
      content: `
        <ul>${CONTACT_ROWS}${REPRESENTATIVE_ROWS}
          <li><strong>Support:</strong> <a href="${pathFor('support')}">ffly Support</a></li>
        </ul>`,
    },
  }),
};
