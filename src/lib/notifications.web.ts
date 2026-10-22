/** Web: no local notifications (the PWA has no scheduler); keeps expo-notifications out of the web bundle. */
export function useNotificationSchedule() {}
export async function askNotifications(_force = false) {
  return false;
}
