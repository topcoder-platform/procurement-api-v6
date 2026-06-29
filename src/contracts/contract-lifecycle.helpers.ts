import { ContractStatus } from "@prisma/client";

export const DEFAULT_EXPIRING_CONTRACT_DAYS = 30;

/**
 * Contract lifecycle states derived from stored status and end date.
 */
export const CONTRACT_LIFECYCLE = {
  Active: "active",
  Expiring: "expiring",
  Expired: "expired",
  Draft: "draft",
  Terminated: "terminated",
} as const;

export type ContractLifecycle =
  (typeof CONTRACT_LIFECYCLE)[keyof typeof CONTRACT_LIFECYCLE];

type ContractLifecycleSource = {
  status: ContractStatus;
  endDate: Date | string;
};

/**
 * Normalizes a date to the beginning of its UTC calendar day.
 *
 * @param date Date to normalize; defaults to the current time.
 * @returns A new Date set to 00:00:00.000 UTC for the same calendar day.
 */
export function normalizeToStartOfDay(date: Date = new Date()): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/**
 * Normalizes a date to the end of its UTC calendar day.
 *
 * @param date Date to normalize; defaults to the current time.
 * @returns A new Date set to 23:59:59.999 UTC for the same calendar day.
 */
export function normalizeToEndOfDay(date: Date = new Date()): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}

/**
 * Converts a contract business date into the persisted UTC calendar day.
 *
 * @param value Date or ISO-8601 date string supplied by a request or database.
 * @returns A Date at midnight UTC for the represented calendar date.
 * @throws RangeError when the value cannot be parsed into a valid date.
 */
export function parseBusinessDate(value: Date | string): Date {
  if (typeof value === "string") {
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

    if (dateOnlyMatch) {
      const parsed = new Date(
        Date.UTC(
          Number(dateOnlyMatch[1]),
          Number(dateOnlyMatch[2]) - 1,
          Number(dateOnlyMatch[3]),
        ),
      );

      if (
        parsed.getUTCFullYear() === Number(dateOnlyMatch[1]) &&
        parsed.getUTCMonth() === Number(dateOnlyMatch[2]) - 1 &&
        parsed.getUTCDate() === Number(dateOnlyMatch[3])
      ) {
        return parsed;
      }

      throw new RangeError(`Invalid contract business date "${value}".`);
    }
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new RangeError(`Invalid contract business date "${String(value)}".`);
  }

  return normalizeToStartOfDay(parsed);
}

/**
 * Calculates the inclusive cutoff for the expiring-contract alert window.
 *
 * @param days Number of days beyond today to include in the alert window.
 * @param from Base date used for deterministic tests and runtime calculations.
 * @returns End-of-day cutoff for the requested window.
 */
export function getExpiringContractCutoff(
  days: number = DEFAULT_EXPIRING_CONTRACT_DAYS,
  from: Date = new Date(),
): Date {
  const cutoff = normalizeToStartOfDay(from);
  cutoff.setUTCDate(cutoff.getUTCDate() + days);
  return normalizeToEndOfDay(cutoff);
}

/**
 * Derives the lifecycle exposed by contract read models and dashboard alerts.
 *
 * @param contract Stored contract fields needed for lifecycle calculation.
 * @param days Expiring window in days; defaults to the v1 alert window.
 * @param from Base date used for deterministic tests and runtime calculations.
 * @returns Derived lifecycle without mutating the stored Contract.status enum.
 */
export function deriveContractLifecycle(
  contract: ContractLifecycleSource,
  days: number = DEFAULT_EXPIRING_CONTRACT_DAYS,
  from: Date = new Date(),
): ContractLifecycle {
  if (contract.status === ContractStatus.draft) {
    return CONTRACT_LIFECYCLE.Draft;
  }

  if (contract.status === ContractStatus.terminated) {
    return CONTRACT_LIFECYCLE.Terminated;
  }

  if (contract.status === ContractStatus.expired) {
    return CONTRACT_LIFECYCLE.Expired;
  }

  const endDate = parseBusinessDate(contract.endDate);
  const today = normalizeToStartOfDay(from);

  if (endDate < today) {
    return CONTRACT_LIFECYCLE.Expired;
  }

  if (endDate <= getExpiringContractCutoff(days, from)) {
    return CONTRACT_LIFECYCLE.Expiring;
  }

  return CONTRACT_LIFECYCLE.Active;
}
