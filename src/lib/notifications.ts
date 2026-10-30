import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useApp } from '../store/useApp';
import { translate, translateArr } from '../i18n';
import { doneToday, visibleStreak } from './streak';

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

/** Local reminders in Tingo's voice: one a day at the chosen hour (not today if you already learned), plus a late
 *  "your flame is about to go out" nudge tonight when the streak is at risk. Rescheduled on every change. */
export function useNotificationSchedule() {
  const onboarded = useApp((s) => s.onboarded);
  const notify = useApp((s) => s.settings.notify);
  const active = useApp((s) => s.settings.active);
  const ui = useApp((s) => s.settings.uiLang);
  const asked = useApp((s) => !!s.settings.notifyAsked);
  const streak = useApp((s) => s.learnStreak);

  useEffect(() => {
    if (Platform.OS === 'web' || !onboarded) return;
    (async () => {
      try {
        // never ask at launch: the question comes in context (askNotifications) — here we only schedule
        const perm = await Notifications.getPermissionsAsync();
        await Notifications.cancelAllScheduledNotificationsAsync();
        if (!perm.granted || !notify.review) return;
        const lines = translateArr(ui, 'notify.tingo');
        const learned = doneToday(streak);
        const n = visibleStreak(streak);
        for (let d = 0; d < 7; d++) {
          const at = new Date();
          at.setDate(at.getDate() + d);
          at.setHours(notify.reviewHour, 0, 0, 0);
          if (at.getTime() <= Date.now() || (d === 0 && learned)) continue;
          await Notifications.scheduleNotificationAsync({
            content: { title: '🦊 Tingo', body: lines[(at.getDate() + d) % Math.max(1, lines.length)] ?? translate(ui, 'streak.keepAlive') },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
          });
        }
        // the streak is at risk tonight
        const late = new Date();
        late.setHours(21, 30, 0, 0);
        if (!learned && n > 0 && late.getTime() > Date.now() && notify.reviewHour < 21) {
          await Notifications.scheduleNotificationAsync({
            content: { title: '🔥 ' + translate(ui, 'notify.riskTitle', { n }), body: translate(ui, 'notify.riskBody') },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: late },
          });
        }
      } catch {
        // notifications are best-effort
      }
    })();
  }, [onboarded, asked, notify.review, notify.reviewHour, active, ui, streak.last, streak.count]);
}
