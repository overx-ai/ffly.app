import {
  APP,
  CONTACT_EMAIL,
  EXTERNAL,
  LEGAL_EFFECTIVE_DATE,
  OPERATOR,
  SERVICE,
  externalLink,
  mailto,
} from '../app';
import { pathFor } from '../site-pages';
import type { LegalDocument } from './types';

// Every collected item here is one row of ios-ffly/Template/PrivacyInfo.xcprivacy and
// docs/compliance/data-inventory.yaml (Search History, User ID, Purchase History, Product
// Interaction, Device ID, all not linked, no tracking). Change one, change all three, and the
// App Store Connect privacy answers. Retention figures come from the ffly API config
// (job_ttl_seconds, entitlement_ttl_seconds) and are in SERVICE.

export const PRIVACY: LegalDocument = {
  pageTitle: 'Privacy Policy',
  description:
    'How the ffly iPhone app handles data: no account, no location, no ads, no tracking. Trip searches stay in server memory for up to 24 hours; analytics are anonymous.',
  lastUpdated: LEGAL_EFFECTIVE_DATE,
  summaryTitle: 'The short version',
  summaryText: `ffly has no account and no sign-in. We do not collect your name, email address, phone number
    or location, we do not use the advertising identifier (IDFA), we show no ads and we do not track you across
    other apps or websites. To find routes, the trip you search for (places, dates, nights and priority) is sent
    to our server together with an anonymous app user id. The server keeps it in memory only, for at most
    ${SERVICE.searchRetentionHours} hours. We collect anonymous usage analytics to improve the app. Subscriptions
    are paid through Apple and verified through RevenueCat.`,
  sections: [
    {
      id: 'who-we-are',
      title: 'Who We Are',
      content: `
        <p>ffly is an iPhone app that finds cheap multi-city trips. It is operated by <strong>${OPERATOR}</strong>
        ("we", "us"), the controller of the personal data described here. This policy covers the ffly app, the
        ffly API at <code>${SERVICE.apiHost}/ffly</code> that the app talks to, and this website.</p>`,
    },
    {
      id: 'not-collected',
      title: 'What We Do Not Collect',
      content: `
        <ul>
          <li><strong>No account.</strong> ffly has no sign-up or login, so we hold no name, email address, phone
          number, password or profile.</li>
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
        hours, or sooner when the server restarts. They are not linked to your identity.</p>
        <p>Our server checks fares on third-party airline and fare-search websites by itself. Your device does not
        contact those websites while a search runs, and they receive nothing from you through ffly.</p>`,
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
          <li>count the free searches you have used and apply the fair-use daily search limit for ${APP.proName}.</li>
        </ul>
        <p>The subscription status (cached for about ${SERVICE.entitlementCacheMinutes} minutes) and the search
        counters are held in the server's memory only and are lost when the server restarts.</p>`,
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
        purchase records as needed for entitlement, accounting, refunds and fraud prevention. See the
        ${externalLink(EXTERNAL.revenueCatPrivacy, 'RevenueCat Privacy Policy')}.</p>`,
    },
    {
      id: 'analytics',
      title: 'Anonymous Usage Analytics',
      content: `
        <p>ffly sends anonymous usage events to our own analytics service at <code>${SERVICE.analyticsHost}</code>.
        The events are: search submitted, search finished, booking link tapped, paywall shown, purchase completed,
        and onboarding started, completed or skipped.</p>
        <p>Each event carries:</p>
        <ul>
          <li>the app version, iOS version and device model;</li>
          <li>your device's language, region and time zone settings;</li>
          <li>whether you are on Free or ${APP.proName};</li>
          <li>the identifier for vendor (IDFV, an Apple id that is unique to our apps on your device and is not the
          advertising identifier), a random install id and a random session id;</li>
          <li>event details: the number of cities, maybe cities and end places in a search and the chosen priority;
          the outcome of a search and the number of routes found; the position of a route whose booking link you
          tapped, with its airline and fare source; the screen that opened the paywall; the purchased product; and
          the onboarding page you finished on.</li>
        </ul>
        <p>Analytics events never contain the names of the places you search, your travel dates, or any contact
        detail. They are not linked to your identity and are not used for tracking or advertising. We keep them
        only as long as needed to understand how the app is used, then aggregate or delete them.</p>`,
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
          and when the notification and rating prompts were shown.</li>
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
        airline's or fare site's page opens in an in-app Safari browser. ffly cannot see what you browse or enter
        there. Anything you do on that website, including booking and payment, is governed by that website's own
        terms and privacy policy.</p>`,
    },
    {
      id: 'app-store-labels',
      title: 'App Store Privacy Details',
      content: `
        <ul>
          <li><strong>Data used to track you:</strong> none.</li>
          <li><strong>Data linked to you:</strong> none.</li>
          <li><strong>Data not linked to you:</strong> Search History (trip searches), User ID (the anonymous app
          user id), Purchase History (${APP.proName} transactions), Product Interaction (usage events) and Device ID
          (IDFV and the random install id).</li>
        </ul>`,
    },
    {
      id: 'legal-bases',
      title: 'Why We Process This Data',
      content: `
        <p>Where the GDPR or similar laws apply, we process trip searches, the app user id and purchase status to
        provide the service you ask for (performance of a contract), and anonymous analytics and search limits on
        the basis of our legitimate interests in improving ffly, keeping it fair and protecting it from abuse.</p>`,
    },
    {
      id: 'sharing',
      title: 'Who Receives Data',
      content: `
        <ul>
          <li><strong>Apple</strong> processes App Store payments.</li>
          <li><strong>RevenueCat</strong> verifies subscriptions, as described in Section 6.</li>
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
        data, and to object to or restrict its processing. Because ffly has no account and the data we receive is
        not linked to your identity, we usually cannot tell which records are yours. Search data on our server
        expires on its own within ${SERVICE.searchRetentionHours} hours.</p>
        <ul>
          <li>Delete trips in the Trips list, or delete the app to remove the data on your device.</li>
          <li>Turn off notifications in iOS Settings.</li>
          <li>Manage or cancel a ${APP.proName} subscription in your Apple ID account settings.</li>
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
