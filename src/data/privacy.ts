import {
  APP,
  CONTACT_EMAIL,
  EXTERNAL,
  FEEDBACK,
  OPERATOR,
  SERVICE,
  SITE_HOST,
  externalLink,
  mailto,
} from '../app';
import { pathFor } from '../site-pages';
import type { LegalDocument } from './types';

// Every collected item here is one row of ios-ffly/Template/PrivacyInfo.xcprivacy and
// docs/compliance/data-inventory.yaml. Linked: Search History, Purchase History and User ID, because every
// search carries the app user id, RevenueCat keeps purchases under it and feedback can pair it with an email
// address; Email Address (optional) and Customer Support, both from the feedback form (ios-ffly spec 012).
// Not linked: Product Interaction, Device ID. No tracking. Change one, change all three, and the App Store
// Connect privacy answers. Retention figures come from the ffly API config (job_ttl_seconds,
// entitlement_ttl_seconds) and are in SERVICE. Feedback facts come from 1B-bots shared/form-aggregator and
// are in FEEDBACK.

export const PRIVACY: LegalDocument = {
  pageTitle: 'Privacy Policy',
  description:
    'How the ffly iPhone app handles data: no account, no location, no ads, no tracking. Trip searches stay in server memory for up to 24 hours; analytics are anonymous.',
  summaryTitle: 'The short version',
  summaryText: `ffly has no account and no sign-in. We do not collect your name, phone number or location, and
    we collect your email address only if you choose to add it to feedback you send. We do not use the advertising identifier (IDFA), we show no ads and we do not track you across
    other apps or websites. To find routes, the trip you search for (places, dates, nights and priority) is sent
    to our server together with an anonymous app user id. The server keeps it in memory only, for at most
    ${SERVICE.searchRetentionHours} hours. We collect anonymous usage analytics to improve the app. Subscriptions
    are paid through Apple and verified through RevenueCat. If you send us feedback, our own form service stores
    your message with basic app and device details, and passes it to our team through Telegram.`,
  sections: [
    {
      id: 'who-we-are',
      title: 'Who We Are',
      content: `
        <p>ffly is an iPhone app that finds cheap multi-city trips. It is operated by <strong>${OPERATOR}</strong>
        ("we", "us"), the controller of the personal data described here. This policy covers the ffly app, the
        ffly API at <code>${SERVICE.apiHost}/ffly</code> that the app talks to, the form service at
        <code>${FEEDBACK.serviceHost}</code> that receives feedback from the app, and this website.</p>`,
    },
    {
      id: 'not-collected',
      title: 'What We Do Not Collect',
      content: `
        <ul>
          <li><strong>No account.</strong> ffly has no sign-up or login, so we hold no name, phone number, password
          or profile. We receive an email address only if you add one to feedback you send (Section 8).</li>
          <li><strong>No location.</strong> You pick places by name. ffly does not use Location Services.</li>
          <li><strong>No advertising identifier and no tracking.</strong> ffly does not read the IDFA, does not show
          the App Tracking Transparency prompt because it does not track you, and contains no advertising SDKs.</li>
          <li><strong>No ads.</strong> ffly shows no advertising.</li>
          <li><strong>No payment details.</strong> Apple processes all payments. We never see your card or Apple ID
          credentials.</li>
          <li><strong>No sale of data.</strong> We do not sell your data or share it for advertising.</li>
        </ul>`,
    },
    {
      id: 'searches',
      title: 'Trip Searches Sent to Our Server',
      content: `
        <p>When you tap <strong>Find route</strong>, ffly sends the search to the ffly API over HTTPS:</p>
        <ul>
          <li>the start place, the end places and the cities you want to visit (each marked "must" or "maybe"),
          plus the airports you chose for them;</li>
          <li>the date window, the minimum and maximum nights per city, and the priority you picked;</li>
          <li>a random request id, so that a retried request does not count as a new search;</li>
          <li>the fact that the request comes from the iOS app.</li>
        </ul>
        <p>We use this only to compute your routes. The search and its results are kept <strong>in the server's
        memory only</strong>, never in a database, and are deleted after at most ${SERVICE.searchRetentionHours}
        hours, or sooner when the server restarts. Each search carries your anonymous app user id (Section 4), so
        we treat your searches as data linked to you.</p>
        <p>Our server checks fares on third-party airline and fare-search websites by itself. One of those sources
        is the Aviasales data API, provided through the Travelpayouts partner programme, which our server queries
        for cached fares. Your device does not contact those websites or that API while a search runs, and they
        receive nothing from you through ffly.</p>`,
    },
    {
      id: 'app-user-id',
      title: 'Anonymous App User ID',
      content: `
        <p>Each request from ffly to our server carries an anonymous app user id. It is the random, app-specific id
        that RevenueCat (our subscription provider, see Section 6) assigns to your installation, or a random install
        id if subscriptions are unavailable. It is not your Apple ID and contains no personal information.</p>
        <p>We use it to:</p>
        <ul>
          <li>check with RevenueCat whether you have ${APP.proName}, by subscription or ${APP.lifetimeName};</li>
          <li>count the free searches you have used and apply the fair-use daily search limit for ${APP.proName};</li>
          <li>tell which feedback messages come from the same installation (Section 8).</li>
        </ul>
        <p>The subscription status (cached for about ${SERVICE.entitlementCacheMinutes} minutes) and the search
        counters are held in the server's memory only and are lost when the server restarts.</p>
        <p>On its own the id does not identify you. If you add an email address to feedback, the two travel
        together, so we treat the app user id as data linked to you.</p>`,
    },
    {
      id: 'ip-address',
      title: 'IP Address',
      content: `
        <p>Like any internet service, our server receives the IP address your request comes from. The ffly API uses
        it only to apply a daily search limit to requests that arrive without an app user id. Those counters are
        held in memory and reset daily. We do not use your IP address to locate you or to build a profile of you.
        The infrastructure that hosts our servers may process it to route and protect traffic.</p>`,
    },
    {
      id: 'purchases',
      title: 'Subscriptions and Purchases',
      content: `
        <p>${APP.proName} is sold through the App Store as weekly and yearly in-app subscriptions and as a one-time
        ${APP.lifetimeName} purchase. Apple processes the payment, under
        ${externalLink(EXTERNAL.applePrivacy, "Apple's Privacy Policy")}.</p>
        <p>We use <strong>RevenueCat</strong>, a third-party subscription platform, to verify purchases. RevenueCat
        receives your anonymous app user id and the App Store transaction details of your ${APP.proName} purchases
        (product, dates, status). It does not receive your name, email address or payment card. Our server asks
        RevenueCat only whether your app user id has active ${APP.proName} access. Apple and RevenueCat keep
        purchase records as needed for entitlement, accounting, refunds and fraud prevention. RevenueCat keeps
        them under your app user id, so we treat your purchase history as data linked to you. See the
        ${externalLink(EXTERNAL.revenueCatPrivacy, 'RevenueCat Privacy Policy')}.</p>`,
    },
    {
      id: 'analytics',
      title: 'Anonymous Usage Analytics',
      content: `
        <p>ffly sends anonymous usage events to our own analytics service at <code>${SERVICE.analyticsHost}</code>.
        The events are: search submitted, priority chosen, search finished, booking link tapped, paywall shown and
        purchase completed; onboarding started, page viewed, answered, completed or skipped; and feedback sent, and
        search rated or rating dismissed.</p>
        <p>Each event carries:</p>
        <ul>
          <li>the app version, iOS version and device model;</li>
          <li>your device's language, region and time zone settings;</li>
          <li>whether you are on Free or ${APP.proName};</li>
          <li>the identifier for vendor (IDFV, an Apple id that is unique to our apps on your device and is not the
          advertising identifier), a random install id and a random session id;</li>
          <li>event details: the number of cities, maybe cities and end places in a search and the chosen priority;
          whether you changed the suggested priority; the outcome of a search and the number of routes found; the
          position of a route whose booking link you tapped, with its airline and fare source; the screen that
          opened the paywall; the purchased product; the onboarding page you viewed or finished on, and whether you
          set a home place (yes or no, never the place); the category of feedback you sent, whether you added an
          email address (yes or no, never the address), whether the message was sent or queued, and whether it was
          about the app or a search; and, for a search you rate (${APP.proName} only), the number of stars, the
          search's priority, its number of routes and whether you went on to write feedback.</li>
        </ul>
        <p>Analytics events never contain the names of the places you search, your travel dates, the text of your
        feedback, or any contact detail. They are not linked to your identity and are not used for tracking or advertising. We keep them
        only as long as needed to understand how the app is used, then aggregate or delete them.</p>`,
    },
    {
      id: 'feedback',
      title: 'Feedback You Send',
      content: `
        <p>You can send us a message from <strong>Send feedback</strong> in Settings, from <strong>Tell us about
        this search</strong> on a search, or, with ${APP.proName}, after rating a search with three stars or fewer.
        Nothing is sent until you tap <strong>Send</strong>. A message contains:</p>
        <ul>
          <li>the text you write and the category you pick (general, feature request or bug report), and the
          stars you gave if you came from rating a search;</li>
          <li>the app version and build, iOS version, device model, the app's language and whether you are on Free
          or ${APP.proName};</li>
          <li>when you send it from a search: the search id, the codes of the places in the route, the date window,
          the priority, whether the search found routes, found none, failed or was still running, the number of
          routes, your plan
          and, if you were looking at a route, its position in the list;</li>
          <li>your email address, only if you type one into the optional email field;</li>
          <li>your anonymous app user id (Section 4) and a two-letter language code.</li>
        </ul>
        <p>We use it only to read and answer your feedback and to fix what you report.</p>
        <p>The message goes over HTTPS to our own form service at <code>${FEEDBACK.serviceHost}</code>. It stores
        the message in its database together with the IP address and user agent of the request, and records it in
        its server logs. It also uses the IP address to limit how many messages can be sent per minute. It then
        forwards a copy to a Telegram chat that our team uses to read feedback: the text (long messages are
        shortened), your email address if you added one, and your app user id. Telegram processes that copy under
        the ${externalLink(EXTERNAL.telegramPrivacy, 'Telegram Privacy Policy')}.</p>
        <p>Feedback is linked to you: it carries your app user id, and your email address if you added one. If you
        would rather not be contacted, leave the email field empty. We keep feedback as long as we need it to handle your message.
        You can ask us to delete it, and the email address you gave, at any time by writing to
        ${mailto(CONTACT_EMAIL)}.</p>
        <p>If you are offline, the message waits on your device (up to ${FEEDBACK.queuedMessages} messages, for at
        most ${FEEDBACK.queuedDays} days) and is sent the next time ffly starts and can reach our server.</p>`,
    },
    {
      id: 'on-device',
      title: 'Data Stored Only on Your Device',
      content: `
        <ul>
          <li><strong>Trips:</strong> up to ${APP.savedTrips} past searches, each with its request and the latest
          results, so you can reopen them. You can delete a trip by swiping it in the Trips list.</li>
          <li><strong>Free search counter:</strong> the number of free searches used, kept in the iOS Keychain. iOS
          may keep Keychain items after the app is deleted, so reinstalling does not reset it.</li>
          <li><strong>App settings:</strong> the random install id and app state such as whether onboarding is done
          and when the notification and rating prompts were shown, and which searches you rated or dismissed the
          rating for.</li>
        </ul>
        <p>This data is not uploaded. Deleting the app removes it, except the Keychain counter described above.</p>`,
    },
    {
      id: 'notifications',
      title: 'Notifications',
      content: `
        <p>ffly can notify you when a search finishes while the app is in the background. It asks for permission
        the first time you search. These notifications are created on your device; ffly does not register for push
        notifications and sends no device token to us. You can turn them off at any time in iOS Settings.</p>`,
    },
    {
      id: 'booking-links',
      title: 'Booking Links and Third-Party Websites',
      content: `
        <p>Fares come from third-party airline and fare-search websites. When you tap <strong>Book</strong>, the
        airline's site or a booking site such as Aviasales opens in an in-app Safari browser. ffly cannot see what
        you browse or enter there. Anything you do on that website, including booking and payment, is governed by
        that website's own terms and privacy policy.</p>
        <p>For some fares, <strong>Book</strong> opens aviasales.com, which sets its own cookies under its own
        privacy policy. That link carries ffly's partner identifier so that Aviasales can attribute a booking to
        ffly. It identifies ffly, not you.</p>`,
    },
    {
      id: 'app-store-labels',
      title: 'App Store Privacy Details',
      content: `
        <ul>
          <li><strong>Data used to track you:</strong> none.</li>
          <li><strong>Data linked to you:</strong> Search History (trip searches, which carry the app user id),
          Purchase History (${APP.proName} transactions, kept by RevenueCat under the app user id), User ID
          (the anonymous app user id), Email Address (Contact Info), only if you add one to feedback, and Customer
          Support (User Content), the feedback you send.</li>
          <li><strong>Data not linked to you:</strong> Product Interaction (usage events) and Device ID (IDFV and the
          random install id).</li>
        </ul>`,
    },
    {
      id: 'legal-bases',
      title: 'Why We Process This Data',
      content: `
        <p>Where the GDPR or similar laws apply, we process trip searches, the app user id and purchase status to
        provide the service you ask for (performance of a contract), and anonymous analytics and search limits on
        the basis of our legitimate interests in improving ffly, keeping it fair and protecting it from abuse. We
        process feedback you send, and the email address you choose to add, on the basis of our legitimate interest
        in answering you and fixing what you report.</p>`,
    },
    {
      id: 'sharing',
      title: 'Who Receives Data',
      content: `
        <ul>
          <li><strong>Apple</strong> processes App Store payments.</li>
          <li><strong>RevenueCat</strong> verifies subscriptions, as described in Section 6.</li>
          <li><strong>Our form service</strong> receives the feedback you send, and <strong>Telegram</strong> carries
          a copy of it to our team, as described in Section 8. See the
          ${externalLink(EXTERNAL.telegramPrivacy, 'Telegram Privacy Policy')}.</li>
          <li>The infrastructure providers that host our servers and this website process data on our behalf.</li>
        </ul>
        <p>We may also disclose information when the law requires it. We do not sell data and do not share it with
        advertisers or data brokers.</p>`,
    },
    {
      id: 'rights',
      title: 'Your Choices and Rights',
      content: `
        <p>Depending on where you live, you may have the right to access, correct, delete or port your personal
        data, and to object to or restrict its processing. ffly has no account and never asks your name, so unless
        you added your email address to feedback we usually cannot tell which records are yours. Search data on
        our server expires on its own within ${SERVICE.searchRetentionHours} hours.</p>
        <ul>
          <li>Delete trips in the Trips list, or delete the app to remove the data on your device.</li>
          <li>Turn off notifications in iOS Settings.</li>
          <li>Manage or cancel a ${APP.proName} subscription in your Apple ID account settings.</li>
          <li>Ask us to delete feedback you sent and the email address you added. Write from that address, or tell
          us roughly when you sent it, so we can find it.</li>
        </ul>
        <p>To make a request or ask a question, email ${mailto(CONTACT_EMAIL)}. You also have the right to lodge a
        complaint with your local data protection authority.</p>`,
    },
    {
      id: 'children',
      title: "Children's Privacy",
      content: `
        <p>ffly is not directed to children, and we do not knowingly collect personal information from children
        under 13 (or the higher age set by your local law). If you believe a child has given us personal
        information, contact us and we will delete it.</p>`,
    },
    {
      id: 'security',
      title: 'Security and International Transfers',
      content: `
        <p>All traffic between ffly and our servers is encrypted with HTTPS. Our servers may be located in a
        country other than yours. Where data protection law requires it, we protect such transfers with appropriate
        safeguards.</p>`,
    },
    {
      id: 'web-search',
      title: `Web Search on ${SITE_HOST}`,
      content: `
        <p>The <a href="${pathFor('search')}">web search</a> on this website sends your search from your browser
        straight to the ffly API over HTTPS: the start and finish places, the cities you want to visit, the date
        window, the minimum and maximum nights per city, the priority, whether you asked for direct flights only, a
        random request id, and the fact that the request comes from the web. It sends no app user id.</p>
        <p>The search and its results are kept <strong>in the server's memory only</strong> and are deleted after at
        most ${SERVICE.searchRetentionHours} hours, or sooner when the server restarts. They are not stored with
        your IP address.</p>
        <p>The ffly API uses your IP address only to count the free web searches made from it today. That count is
        held in memory, not in a database, and is cleared at the start of each day (UTC) or when the server
        restarts.</p>
        <p>Your browser keeps your latest web search and its id in the tab's session storage, so reloading the page
        picks it up again. It is deleted when you close the tab. The web search sets no cookies, runs no analytics
        and shows no ads. If that changes, we will update this policy first.</p>`,
    },
    {
      id: 'website',
      title: 'This Website',
      content: `
        <p>This website is static. It sets no cookies, runs no analytics and loads no third-party scripts. It is
        hosted by Vercel, which processes the IP address and request details of each visit to deliver the page and
        protect the service, and keeps those logs for a short period under the
        ${externalLink(EXTERNAL.vercelPrivacy, 'Vercel Privacy Policy')}.</p>`,
    },
    {
      id: 'changes',
      title: 'Changes to This Policy',
      content: `
        <p>We may update this policy as ffly changes. We will post the new version on this page with a new
        effective date. If we start collecting a new kind of data, we will update this policy before the app
        version that collects it is released.</p>`,
    },
    {
      id: 'contact',
      title: 'Contact Us',
      content: `
        <p>Questions about this policy or ffly's data practices:</p>
        <ul>
          <li><strong>Operator:</strong> ${OPERATOR}</li>
          <li><strong>Email:</strong> ${mailto(CONTACT_EMAIL)}</li>
          <li><strong>Support:</strong> <a href="${pathFor('support')}">ffly Support</a></li>
        </ul>`,
    },
  ],
};
