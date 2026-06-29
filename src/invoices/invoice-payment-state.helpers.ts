import { InvoiceStatus } from "@prisma/client";

/**
 * Invoice payment states derived from stored status, due date, and paid date.
 */
export const INVOICE_PAYMENT_STATES = {
  Draft: "draft",
  Pending: "pending",
  Overdue: "overdue",
  Paid: "paid",
  Cancelled: "cancelled",
} as const;

export type InvoicePaymentState =
  (typeof INVOICE_PAYMENT_STATES)[keyof typeof INVOICE_PAYMENT_STATES];

type InvoicePaymentStateSource = {
  status: InvoiceStatus;
  dueDate: Date | string;
  paidDate?: Date | string | null;
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
 * Converts an invoice business date into the persisted UTC calendar day.
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

      throw new RangeError(`Invalid invoice business date "${value}".`);
    }
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new RangeError(`Invalid invoice business date "${String(value)}".`);
  }

  return normalizeToStartOfDay(parsed);
}

/**
 * Derives the payment state exposed by invoice read models and dashboard
 * totals without mutating the stored Invoice.status enum.
 *
 * @param invoice Stored invoice fields needed for payment-state calculation.
 * @param from Base date used for deterministic tests and runtime calculations.
 * @returns Derived invoice payment state for list, alert, and dashboard use.
 */
export function deriveInvoicePaymentState(
  invoice: InvoicePaymentStateSource,
  from: Date = new Date(),
): InvoicePaymentState {
  if (invoice.status === InvoiceStatus.paid || invoice.paidDate) {
    return INVOICE_PAYMENT_STATES.Paid;
  }

  if (invoice.status === InvoiceStatus.cancelled) {
    return INVOICE_PAYMENT_STATES.Cancelled;
  }

  if (invoice.status === InvoiceStatus.draft) {
    return INVOICE_PAYMENT_STATES.Draft;
  }

  if (parseBusinessDate(invoice.dueDate) < normalizeToStartOfDay(from)) {
    return INVOICE_PAYMENT_STATES.Overdue;
  }

  return INVOICE_PAYMENT_STATES.Pending;
}
