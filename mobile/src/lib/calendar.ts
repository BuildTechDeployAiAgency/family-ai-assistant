// Add events to the phone's native calendar (works in Expo Go).
import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

async function getWritableCalendarId(): Promise<string | null> {
  const { granted } = await Calendar.requestCalendarPermissionsAsync();
  if (!granted) return null;

  if (Platform.OS === 'ios') {
    const def = await Calendar.getDefaultCalendarAsync();
    return def?.id ?? null;
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = calendars.find((c) => c.allowsModifications && c.isPrimary)
    ?? calendars.find((c) => c.allowsModifications);
  return writable?.id ?? null;
}

export async function addEventToCalendar(event: {
  title: string;
  notes?: string;
  startDate: Date;
  endDate: Date;
}): Promise<boolean> {
  const calendarId = await getWritableCalendarId();
  if (!calendarId) return false;

  await Calendar.createEventAsync(calendarId, {
    title: event.title,
    notes: event.notes,
    startDate: event.startDate,
    endDate: event.endDate,
  });
  return true;
}
