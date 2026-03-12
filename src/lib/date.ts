import {
  addDays,
  eachDayOfInterval,
  format,
  startOfWeek,
  subDays,
} from "date-fns";
import { fromZonedTime, formatInTimeZone, toZonedTime } from "date-fns-tz";

export function getTodayKey(timezone: string, date = new Date()) {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}

export function getWeekStartKey(timezone: string, date = new Date()) {
  const zoned = toZonedTime(date, timezone);
  return format(startOfWeek(zoned, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function getDateLabel(dateKey: string, timezone: string) {
  const zoned = toZonedTime(fromZonedTime(`${dateKey}T12:00:00`, timezone), timezone);
  return format(zoned, "EEE d/M");
}

export function getExpiryForDate(dateKey: string, timezone: string) {
  const visibleUntil = `${format(addDays(new Date(`${dateKey}T00:00:00`), 1), "yyyy-MM-dd")}T12:00:00`;
  return fromZonedTime(visibleUntil, timezone).toISOString();
}

export function listDateKeysDescending(timezone: string, length: number) {
  const today = getTodayKey(timezone);
  const start = subDays(new Date(`${today}T00:00:00`), length - 1);
  const end = new Date(`${today}T00:00:00`);

  return eachDayOfInterval({ start, end })
    .map((date) => format(date, "yyyy-MM-dd"))
    .reverse();
}

export function getWeekdayInTimezone(dateKey: string, timezone: string) {
  const zoned = toZonedTime(fromZonedTime(`${dateKey}T12:00:00`, timezone), timezone);
  return zoned.getDay();
}

export function getWeekRange(timezone: string, date = new Date()) {
  const weekStart = getWeekStartKey(timezone, date);
  const weekEnd = format(addDays(new Date(`${weekStart}T00:00:00`), 6), "yyyy-MM-dd");

  return {
    weekStart,
    weekEnd,
  };
}
