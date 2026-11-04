import * as Notifications from 'expo-notifications';
import type { ScheduleEvent, ScheduleKind } from '@/data/storage';

export const SCHEDULE_KINDS: { key: ScheduleKind; label: string }[] = [
  { key: 'apply', label: '접수' },
  { key: 'document', label: '서류 제출' },
  { key: 'contract', label: '계약' },
  { key: 'move', label: '입주' },
  { key: 'other', label: '기타' },
];

const REMINDER_PREFIX = 'schedule-';
const REMINDER_HOUR = 9;
const DAY_MS = 24 * 60 * 60 * 1000;

export function kindLabel(kind: ScheduleKind) {
  return SCHEDULE_KINDS.find((item) => item.key === kind)?.label ?? '일정';
}

export function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function startOfDay(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// 오늘 기준 며칠 남았는지. 기간 일정은 마감일이 지나기 전까지 진행 중으로 본다.
export function daysUntil(event: ScheduleEvent, today = new Date()) {
  const base = startOfDay(toDateKey(today)).getTime();
  return Math.round((startOfDay(event.date).getTime() - base) / DAY_MS);
}

export function isEventOver(event: ScheduleEvent, today = new Date()) {
  const base = startOfDay(toDateKey(today)).getTime();
  return startOfDay(event.endDate ?? event.date).getTime() < base;
}

export function formatDday(event: ScheduleEvent, today = new Date()) {
  const days = daysUntil(event, today);
  if (days > 0) return `D-${days}`;
  if (days === 0) return 'D-day';
  return event.endDate ? '진행 중' : '지남';
}

export function formatEventDate(event: ScheduleEvent) {
  const short = (dateKey: string) => `${Number(dateKey.slice(5, 7))}.${Number(dateKey.slice(8, 10))}`;
  return event.endDate && event.endDate !== event.date ? `${short(event.date)}~${short(event.endDate)}` : short(event.date);
}

export function upcomingEvents(events: ScheduleEvent[] = [], today = new Date()) {
  return events
    .filter((event) => !isEventOver(event, today))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function reminderTimes(event: ScheduleEvent) {
  const atNine = (dateKey: string, offsetDays: number) => {
    const date = startOfDay(dateKey);
    date.setDate(date.getDate() + offsetDays);
    date.setHours(REMINDER_HOUR, 0, 0, 0);
    return date;
  };
  const label = kindLabel(event.kind);
  const reminders = [{ suffix: 'before', at: atNine(event.date, -1), title: `내일 ${label} 일정이 있어요`, body: event.title }];
  if (event.endDate && event.endDate !== event.date) {
    reminders.push({ suffix: 'end', at: atNine(event.endDate, 0), title: `오늘 ${label} 마감이에요`, body: event.title });
  } else {
    reminders.push({ suffix: 'today', at: atNine(event.date, 0), title: `오늘 ${label} 일정이에요`, body: event.title });
  }
  return reminders;
}

/**
 * 일정 알림을 이 기기에 다시 예약합니다. 일정은 계정으로 여러 기기에 동기화되므로,
 * 기기별로 예약 ID를 따로 저장하지 않고 매번 우리 알림만 지운 뒤 앞으로 올 알림을 새로 예약해요.
 */
export async function syncScheduleReminders(events: ScheduleEvent[] = []) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled
    .filter((item) => item.identifier.startsWith(REMINDER_PREFIX))
    .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));

  const now = Date.now();
  for (const event of events) {
    for (const reminder of reminderTimes(event)) {
      if (reminder.at.getTime() <= now) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: `${REMINDER_PREFIX}${event.id}-${reminder.suffix}`,
        content: { title: reminder.title, body: reminder.body, sound: 'default' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.at },
      });
    }
  }
}
