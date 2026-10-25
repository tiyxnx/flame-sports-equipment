/**
 * Asia/Kolkata (IST) Date and Time Utilities
 * All university equipment room operations follow Indian Standard Time (UTC+05:30).
 */

const IST_TIMEZONE = "Asia/Kolkata";

/**
 * Returns current Date object
 */
export function getNow(): Date {
  return new Date();
}

/**
 * Formats a date into Asia/Kolkata calendar date string (e.g., "25 October 2026")
 */
export function formatIstDate(date: Date | string = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TIMEZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/**
 * Formats a date/timestamp into IST time string (e.g., "04:30 PM IST")
 */
export function formatIstTime(date: Date | string = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const timeStr = new Intl.DateTimeFormat("en-US", {
    timeZone: IST_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
  return `${timeStr} IST`;
}

/**
 * Formats full IST date and time (e.g., "25 Oct 2026, 04:30 PM IST")
 */
export function formatIstDateTime(date: Date | string = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
  return `${parts} IST`;
}

/**
 * Returns the exact return deadline timestamp (11:00 PM IST of the given issue date)
 * In UTC ISO format.
 */
export function getReturnDeadlineForDate(date: Date = new Date()): string {
  // Extract Year, Month, Day in IST
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const istDateString = formatter.format(date); // YYYY-MM-DD
  // 11:00 PM IST is 23:00:00+05:30
  const deadlineIso = `${istDateString}T23:00:00+05:30`;
  return new Date(deadlineIso).toISOString();
}

/**
 * Checks if a deadline has passed
 */
export function isOverdue(dueTimestamp: string): boolean {
  return new Date().getTime() > new Date(dueTimestamp).getTime();
}

/**
 * Generates the mandatory liability disclaimer text with dynamic IST date
 */
export function getLiabilityDisclaimer(issueDate: Date = new Date()): string {
  const formattedDate = formatIstDate(issueDate);
  return `I acknowledge that I am responsible for the equipment issued under my name. If the equipment is damaged or is not returned to the sports equipment room by 11:00 PM IST on ${formattedDate}, I may be liable for a fine or other action as deemed appropriate by the Department of Sports, FLAME University.`;
}
