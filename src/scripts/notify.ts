import { WEB_NOTIFY } from '../app';
import type { Dict } from '../i18n';

// ponytail: no service worker or web push, so the tab must stay open; add push if the share of open tabs is low.

type NotificationApi = typeof Notification;

export type NotifyText = Dict['widget']['script']['notify'];

interface Doc {
  hidden: boolean;
  title: string;
  addEventListener(type: 'visibilitychange', listener: () => void): void;
  removeEventListener(type: 'visibilitychange', listener: () => void): void;
}

export const canAsk = (api: NotificationApi | undefined) => api?.permission === 'default';

export const ask = async (api: NotificationApi) => (await api.requestPermission()) === 'granted';

export function routesReady({
  Notification: api,
  doc,
  focus,
  text,
}: {
  Notification?: NotificationApi;
  doc: Doc;
  focus: () => void;
  text: NotifyText;
}) {
  if (!doc.hidden) return;
  if (api?.permission === 'granted') {
    try {
      const note = new api(text.title, { body: text.body, icon: WEB_NOTIFY.icon });
      note.onclick = () => {
        focus();
        note.close();
      };
    } catch {
      // Android Chrome allows notifications only from a service worker; the tab title still tells.
    }
  }
  const title = doc.title;
  doc.title = text.tabTitle;
  const restore = () => {
    if (doc.hidden) return;
    doc.title = title;
    doc.removeEventListener('visibilitychange', restore);
  };
  doc.addEventListener('visibilitychange', restore);
}
