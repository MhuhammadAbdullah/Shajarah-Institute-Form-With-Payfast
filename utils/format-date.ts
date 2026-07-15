/**
 * Every admin-facing and customer-facing timestamp in this app must render
 * in Shajarah Institute's local time zone, not the server's runtime zone
 * (Vercel serverless functions default to UTC) - `Intl.DateTimeFormat`
 * without an explicit `timeZone` uses the *server's* zone regardless of the
 * `en-PK` locale, which only affects formatting conventions, not the zone.
 */
export const APP_TIME_ZONE = "Asia/Karachi";

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

export function formatDateTimeLong(date: Date): string {
  return new Intl.DateTimeFormat("en-PK", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeZone: APP_TIME_ZONE }).format(date);
}

/**
 * Pure calendar dates with no time-of-day meaning (date of birth) must
 * always render in UTC - formatting them in a local zone can shift the
 * displayed day depending on where the value falls relative to midnight.
 */
export function formatCalendarDate(date: Date): string {
  return new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}
