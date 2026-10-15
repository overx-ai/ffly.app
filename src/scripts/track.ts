import type { EVENTS } from '../app';
import { analytics } from './consent-state';
import type { Tier } from './ffly-api';

export type TrackEvent = (typeof EVENTS)[keyof typeof EVENTS];

export interface TrackParams {
  placement: 'results' | 'progress' | 'route';
  kind: string;
  tier: Tier;
}

// Fire and forget: never waits and never cancels the click, so a link opens the same with or without consent.
export function track(event: TrackEvent, params: TrackParams, gtag = analytics()) {
  gtag?.('event', event, { ...params, transport_type: 'beacon' });
}
