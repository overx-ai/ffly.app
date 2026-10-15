import { describe, expect, it, vi } from 'vitest';
import { EVENTS } from '../src/app';
import { analytics, setAnalytics } from '../src/scripts/consent-state';
import { track } from '../src/scripts/track';

const params = { placement: 'results', kind: 'direct', tier: 'free' } as const;

describe('track', () => {
  it('does nothing before Accept has started analytics', () => {
    expect(analytics()).toBeUndefined();
    expect(() => track(EVENTS.book, params)).not.toThrow();
  });

  it('sends the event by beacon once analytics runs, with no city, date, price or account', () => {
    const gtag = vi.fn();
    setAnalytics(gtag);
    track(EVENTS.kit, { placement: 'route', kind: 'hotel', tier: 'pro' });
    expect(gtag).toHaveBeenCalledWith('event', 'kit_click', { placement: 'route', kind: 'hotel', tier: 'pro', transport_type: 'beacon' });
  });
});
