import { APP, CONTACT_EMAIL, EXTERNAL, SERVICE, externalLink, mailto } from '../app';
import { pathFor } from '../site-pages';
import { privacySection } from './privacy';
import type { FaqItem } from './types';

export const SUPPORT = {
  pageTitle: 'Support',
  description:
    'Help with ffly: restoring purchases, cancelling ffly Pro, what Free includes, why fares are indicative, and deleting your data.',
} as const;

export const SUPPORT_FAQ: readonly FaqItem[] = [
  {
    question: 'How do I restore my purchase?',
    answer: `<p>In ffly, open the <strong>Settings</strong> tab and tap <strong>Restore purchases</strong>. Use the
      same Apple ID you bought ${APP.proName} with.</p>`,
  },
  {
    question: `How do I cancel ${APP.proName}?`,
    answer: `<p>On your iPhone, open Settings, then your name (Apple ID), then <strong>Subscriptions</strong>, then
      ffly. You can also tap <strong>Manage</strong> in ffly's Settings tab. Cancel at least 24 hours before the
      current period ends to avoid the next renewal. ${APP.proName} stays active until the end of the period you
      have paid for. ${APP.lifetimeName} is a one-time purchase, so there is nothing to cancel.</p>`,
  },
  {
    question: `I bought ${APP.lifetimeName} but I'm still being charged`,
    answer: `<p>Buying ${APP.lifetimeName} does not cancel a weekly or yearly subscription you already had. Cancel the
      subscription on your iPhone: open Settings, then your name (Apple ID), then <strong>Subscriptions</strong>,
      then ffly. ${APP.lifetimeName} stays active. For a refund of a charge you did not want, request one from
      Apple at ${externalLink(EXTERNAL.appleRefund, 'reportaproblem.apple.com')}.</p>`,
  },
  {
    question: `What do Free and ${APP.proName} include?`,
    answer: `<p><strong>Free:</strong> ${APP.freeSearches} searches in the app, each showing every route in full,
      with dates, flight times and booking links.</p>
      <p><strong>${APP.proName}:</strong> every route in full, with dates, flight times and booking links, and no
      ${APP.freeSearches}-search limit. It comes as a weekly or yearly subscription, or a one-time
      ${APP.lifetimeName} purchase that does not renew. Prices are shown in the app, in your currency, before you
      buy.</p>`,
  },
  {
    question: 'Why are prices indicative?',
    answer: `<p>ffly checks fares on airline and fare-search websites at a point in time, and some fares were found
      earlier and may be up to a week old. Fares change often and may not include baggage or other fees, so always
      confirm the final price where you book: Book opens the airline's site or a booking site.</p>`,
  },
  {
    question: `What happens after my ${APP.freeSearches} free searches?`,
    answer: `<p>Your first ${APP.freeSearches} searches show every route in full. After that, <strong>Find
      route</strong> offers ${APP.proName} before it searches. The trips you already searched stay in your Trips
      list, and deleting and reinstalling ffly does not reset the count.</p>`,
  },
  {
    question: 'Is ffly a travel agent?',
    answer: `<p>No. ffly is a search tool. It does not sell tickets and is not a party to your booking. Book opens
      the airline's site or a booking site, and you book with that company, under its terms.</p>`,
  },
  {
    question: 'How do I delete my data?',
    answer: `<p>ffly has no account. Swipe a trip in the Trips list to delete it, and uninstall the app to clear
      the rest of the data on your device, except the free-search counter, which stays on your iPhone after you
      uninstall. Your searches in the app are deleted within ${SERVICE.searchRetentionHours} hours. Apple, and the service that
      manages ${APP.proName} purchases for us, keep purchase records as needed for refunds and accounting.</p>
      <p>To delete feedback you sent, and the email address if you added one, write to ${mailto(CONTACT_EMAIL)} from
      that address or tell us roughly when you sent it, as
      <a href="${pathFor('privacy')}#feedback">Section ${privacySection('feedback')} of the Privacy Policy</a> describes.</p>`,
  },
];
