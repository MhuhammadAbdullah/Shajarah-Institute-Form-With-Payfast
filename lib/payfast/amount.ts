import { Prisma } from "@prisma/client";

/**
 * PayFast's IPN amount fields aren't guaranteed to arrive as a bare decimal
 * string - thousands separators, a currency prefix, or incidental
 * whitespace from form-encoding are all real-world possibilities, and
 * `Prisma.Decimal` throws synchronously on any of them (verified: it throws
 * even on a plain empty string). An uncaught throw here happens before the
 * database transaction runs, so it previously surfaced to PayFast as a
 * bare HTTP 500 with the registration never marked PAID. This always
 * returns a valid Decimal, falling back and logging instead of throwing.
 */
export function parseIpnAmount(value: string, fallback: string, logPrefix: string): Prisma.Decimal {
  const cleaned = value.trim().replace(/,/g, "").replace(/[^0-9.\-]/g, "");

  if (cleaned) {
    try {
      return new Prisma.Decimal(cleaned);
    } catch (error) {
      console.error(`${logPrefix} failed to parse amount "${value}" (cleaned: "${cleaned}"), falling back to ${fallback}`, error);
    }
  } else if (value) {
    console.error(`${logPrefix} amount "${value}" had no numeric content after cleaning, falling back to ${fallback}`);
  }

  return new Prisma.Decimal(fallback);
}
