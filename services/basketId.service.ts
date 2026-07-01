import { prisma } from "@/lib/prisma";

const BASKET_PREFIX = "REG";
const SEQUENCE_PAD_LENGTH = 6;

/**
 * Atomically reserves the next sequence number for the given year using a
 * DB-level upsert (single UPSERT statement), so concurrent requests never
 * receive the same number.
 */
export async function generateBasketId(date: Date = new Date()): Promise<string> {
  const year = date.getFullYear();

  const sequence = await prisma.basketSequence.upsert({
    where: { year },
    update: { value: { increment: 1 } },
    create: { year, value: 1 },
  });

  const padded = sequence.value.toString().padStart(SEQUENCE_PAD_LENGTH, "0");
  return `${BASKET_PREFIX}-${year}-${padded}`;
}
