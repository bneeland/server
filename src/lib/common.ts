import { isAfter, set, subDays } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

export const allowedOrigins = JSON.parse(process.env.ALLOWED_ORIGINS!);

export function lastLocalTime(timeString: string, timeZone: string): Date {
  const now = new Date();

  // 1) Convert "now" to the target time zone
  const zonedNow = toZonedTime(now, timeZone);

  const [hour, minute] = timeString.split(":");

  // 2) Set the desired local time
  let candidate = set(zonedNow, {
    hours: Number(hour),
    minutes: Number(minute),
    seconds: 0,
    milliseconds: 0,
  });

  // 3) If that time is in the future, go back one day
  if (isAfter(candidate, zonedNow)) {
    candidate = subDays(candidate, 1);
  }

  // 4) Convert back to UTC Date
  return fromZonedTime(candidate, timeZone);
}
