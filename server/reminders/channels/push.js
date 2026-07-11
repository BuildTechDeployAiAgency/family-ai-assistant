// Push channel — STUB.
//
// Expo Go (SDK 53+) cannot receive remote push notifications, so v1 delivery
// happens as LOCAL notifications scheduled on-device when the reminder is
// created (mobile/src/lib/notifications.ts). This server channel exists so
// the scheduler pipeline is complete; wire it to expo-server-sdk once the
// team moves to an EAS dev build:
//
//   import { Expo } from 'expo-server-sdk';
//   const expo = new Expo();
//   await expo.sendPushNotificationsAsync([{ to: user.expo_push_token, title, body }]);
//
// (Requires storing each device's Expo push token on the user row.)
export async function send(reminder, user, task) {
  console.log(
    `[reminder:push] user=${user.email} task="${task?.title ?? reminder.task_id ?? 'ad-hoc'}" remindAt=${reminder.remind_at} (stub — delivered as on-device local notification)`
  );
}
