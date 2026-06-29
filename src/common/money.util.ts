type MoneySource =
  | number
  | string
  | {
      toNumber?: () => number;
      toString: () => string;
    };

/**
 * Converts Prisma Decimal-compatible money values into API-safe numbers.
 *
 * @param value Decimal, string, or number value returned by Prisma or tests.
 * @returns A JavaScript number suitable for JSON responses and totals.
 * @throws Error when the supplied value cannot be converted into a number.
 */
export function serializeMoney(value: MoneySource): number {
  const serialized =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : typeof value.toNumber === "function"
          ? value.toNumber()
          : Number(value.toString());

  if (Number.isNaN(serialized)) {
    throw new Error("Money value could not be serialized.");
  }

  return serialized;
}

/**
 * Converts optional Prisma Decimal-compatible money values into API-safe
 * numbers while preserving absent optional fields as `null`.
 *
 * @param value Optional Decimal, string, or number value returned by Prisma.
 * @returns A number for present money values, otherwise `null`.
 */
export function serializeOptionalMoney(
  value: MoneySource | null | undefined,
): number | null {
  return value == null ? null : serializeMoney(value);
}
