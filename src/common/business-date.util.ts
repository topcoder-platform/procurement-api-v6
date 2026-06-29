/**
 * Normalizes a date to the beginning of its UTC calendar day.
 *
 * @param date Date to normalize; defaults to the current time.
 * @returns A new Date set to 00:00:00.000 UTC for the same calendar day.
 */
export function normalizeToStartOfUtcDay(date: Date = new Date()): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/**
 * Converts a business date into the persisted UTC calendar day.
 *
 * ISO-8601 string inputs preserve the submitted YYYY-MM-DD calendar date,
 * regardless of any time or timezone offset included by the caller.
 *
 * @param value Date or ISO-8601 date string supplied by a request or database.
 * @returns A Date at midnight UTC for the represented business date.
 * @throws RangeError when the value cannot be parsed into a valid date.
 */
export function parseBusinessDate(value: Date | string): Date {
  if (typeof value === "string") {
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

    if (dateOnlyMatch) {
      const year = Number(dateOnlyMatch[1]);
      const month = Number(dateOnlyMatch[2]) - 1;
      const day = Number(dateOnlyMatch[3]);
      const parsed = new Date(Date.UTC(year, month, day));

      if (
        parsed.getUTCFullYear() === year &&
        parsed.getUTCMonth() === month &&
        parsed.getUTCDate() === day
      ) {
        return parsed;
      }

      throw new RangeError(`Invalid business date "${value}".`);
    }
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new RangeError(`Invalid business date "${String(value)}".`);
  }

  return normalizeToStartOfUtcDay(parsed);
}
