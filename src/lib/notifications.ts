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

/** Local notifications on the phone: Daily Drop at its release time and the review reminder. */
export function useNotificationSchedule() {
  const onboarded = useApp((s) => s.onboarded);
  const notify = useApp((s) => s.settings.notify);
  const active = useApp((s) => s.settings.active);
  const ui = useApp((s) => s.settings.uiLang);

  useEffect(() => {
    if (Platform.OS === 'web' || !onboarded) return;
    (async () => {
      try {
        let perm = await Notifications.getPermissionsAsync();
        if (!perm.granted && (notify.drop || notify.review)) perm = await Notifications.requestPermissionsAsync();
        await Notifications.cancelAllScheduledNotificationsAsync();
        if (!perm.granted) return;
        if (notify.review) {
          await Notifications.scheduleNotificationAsync({
            content: { title: 'Thingual', body: translate(ui, 'learn.start') },
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
  }, [onboarded, notify.drop, notify.review, notify.reviewHour, active, ui]);
}
