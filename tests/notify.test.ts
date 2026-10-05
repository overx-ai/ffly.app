import { describe, expect, it, vi } from 'vitest';
import { WEB_NOTIFY } from '../src/app';
import { ask, canAsk, routesReady } from '../src/scripts/notify';

function fakeNotification(permission: NotificationPermission, answer: NotificationPermission = 'granted') {
  const made: { title: string; options?: NotificationOptions; onclick: (() => void) | null; close: () => void }[] = [];
  class Fake {
    static permission = permission;
    static requestPermission = vi.fn(async () => {
      Fake.permission = answer;
      return answer;
    });
    onclick: (() => void) | null = null;
    close = vi.fn();
    constructor(public title: string, public options?: NotificationOptions) {
      made.push(this);
    }
  }
  return { Fake: Fake as unknown as typeof Notification & { requestPermission: ReturnType<typeof vi.fn> }, made };
}

function fakeDocument(hidden: boolean) {
  const listeners = new Set<() => void>();
  return {
    hidden,
    title: 'Search | ffly',
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    show() {
      this.hidden = false;
      for (const fn of [...listeners]) fn();
    },
    listeners,
  };
}

describe('soft ask', () => {
  it('asks only while the browser has not decided', () => {
    expect(canAsk(undefined)).toBe(false);
    expect(canAsk(fakeNotification('default').Fake)).toBe(true);
    expect(canAsk(fakeNotification('granted').Fake)).toBe(false);
    expect(canAsk(fakeNotification('denied').Fake)).toBe(false);
  });

  it('requests permission only through ask', async () => {
    const { Fake } = fakeNotification('default', 'granted');
    expect(Fake.requestPermission).not.toHaveBeenCalled();
    expect(await ask(Fake)).toBe(true);
    expect(Fake.requestPermission).toHaveBeenCalledTimes(1);
  });
});

describe('routesReady', () => {
  it('does nothing while the tab is visible', () => {
    const { Fake, made } = fakeNotification('granted');
    const doc = fakeDocument(false);
    routesReady({ Notification: Fake, doc, focus: vi.fn() });
    expect(made).toHaveLength(0);
    expect(doc.title).toBe('Search | ffly');
  });

  it('fires one notification on a hidden tab; clicking it focuses the tab', () => {
    const { Fake, made } = fakeNotification('granted');
    const focus = vi.fn();
    routesReady({ Notification: Fake, doc: fakeDocument(true), focus });
    expect(made).toHaveLength(1);
    expect(made[0].title).toBe(WEB_NOTIFY.title);
    made[0].onclick?.();
    expect(focus).toHaveBeenCalledTimes(1);
    expect(made[0].close).toHaveBeenCalled();
  });

  it('marks the tab title until the tab is visible again, with or without permission', () => {
    const { Fake, made } = fakeNotification('denied');
    const doc = fakeDocument(true);
    routesReady({ Notification: Fake, doc, focus: vi.fn() });
    expect(made).toHaveLength(0);
    expect(doc.title).toBe(WEB_NOTIFY.tabTitle);
    expect(WEB_NOTIFY.tabTitle).toBe('(1) Routes ready · ffly');
    doc.show();
    expect(doc.title).toBe('Search | ffly');
    expect(doc.listeners.size).toBe(0);
  });
});
