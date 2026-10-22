import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useApp } from '../store/useApp';
import { dropFor, dropReleaseTime } from '../data/social';
import { fullWord } from '../data/concepts';
import { translate } from '../i18n';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

/** Ask once, at a moment that makes sense (after the first finished session, or when turning a reminder on). */
export async function askNotifications(force = false) {
  if (Platform.OS === 'web') return false;
  const st = useApp.getState();
  if (st.settings.notifyAsked && !force) return false;
  try {
    const p = await Notifications.requestPermissionsAsync();
    useApp.getState().updateSettings({ notifyAsked: true });
    return p.granted;
  } catch {
    return false;
  }
}

/** Local notifications on the phone: Daily Drop at its release time and the review reminder. */
export function useNotificationSchedule() {
  const onboarded = useApp((s) => s.onboarded);
  const notify = useApp((s) => s.settings.notify);
  const active = useApp((s) => s.settings.active);
  const ui = useApp((s) => s.settings.uiLang);
  const asked = useApp((s) => !!s.settings.notifyAsked);

  useEffect(() => {
    if (Platform.OS === 'web' || !onboarded) return;
    (async () => {
      try {
        // never ask at launch: the question comes in context (askNotifications) — here we only schedule
        const perm = await Notifications.getPermissionsAsync();
        await Notifications.cancelAllScheduledNotificationsAsync();
        if (!perm.granted) return;
        if (notify.review) {
          await Notifications.scheduleNotificationAsync({
            content: { title: '🔥 Thingual', body: translate(ui, 'streak.keepAlive') },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: notify.reviewHour, minute: 0 },
          });
        }
        if (notify.drop) {
          for (let i = 0; i < 7; i++) {
            const day = new Date(Date.now() + i * 86400000);
            const at = dropReleaseTime(day);
            if (at.getTime() <= Date.now()) continue;
            await Notifications.scheduleNotificationAsync({
              content: { title: translate(ui, 'camera.dropBanner', { word: fullWord(dropFor(day), active) }), body: translate(ui, 'drop.sub') },
              trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
            });
          }
        }
      } catch {
        // notifications are best-effort
      }
    })();
  }, [onboarded, asked, notify.drop, notify.review, notify.reviewHour, active, ui]);
}
