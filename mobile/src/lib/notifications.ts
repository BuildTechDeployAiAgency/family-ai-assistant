// Local scheduled notifications — the v1 reminder delivery channel.
// (Remote push needs an EAS dev build; Expo Go on SDK 53+ can't receive it.
// Local notifications work fine in Expo Go, but only fire on the device that
// created the reminder — the server scheduler stays authoritative for
// server-side channels like phone calls.)
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

// Schedule a local notification; returns its id (for cancellation) or null
// when permission is denied or the date is in the past.
export async function scheduleLocalReminder(
  title: string,
  body: string,
  date: Date
): Promise<string | null> {
  if (date.getTime() <= Date.now()) return null;
  const ok = await ensureNotificationPermission();
  if (!ok) return null;
  return Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });
}

export async function cancelLocalReminder(id: string) {
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}
