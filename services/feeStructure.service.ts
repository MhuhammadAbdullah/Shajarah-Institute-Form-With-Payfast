import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface FeeStructureInput {
  programId: string;
  campusId: string;
  sessionId: string;
  currency: string;
  fee: number;
  registrationFee?: number | null;
  discountAmount?: number | null;
  discountPercent?: number | null;
}

export async function listFeeStructures(programId?: string) {
  return prisma.feeStructure.findMany({
    where: programId ? { programId } : undefined,
    include: { program: true, campus: true, session: true, discountRules: { orderBy: { minQuantity: "asc" } } },
    orderBy: [{ program: { displayOrder: "asc" } }, { campus: { displayOrder: "asc" } }, { session: { displayOrder: "asc" } }],
  });
}

export const FEE_STRUCTURE_SORT_KEYS = ["program", "campus", "session", "fee", "createdAt"] as const;
export type FeeStructureSortKey = (typeof FEE_STRUCTURE_SORT_KEYS)[number];

export interface FeeStructureListFilters {
  search?: string;
  status?: "all" | "active" | "inactive";
  page?: number;
  pageSize?: number;
  sort?: FeeStructureSortKey;
  dir?: "asc" | "desc";
}

function feeStructureOrderBy(sort: FeeStructureSortKey | undefined, dir: "asc" | "desc"): Prisma.FeeStructureOrderByWithRelationInput[] {
  switch (sort) {
    case "program":
      return [{ program: { name: dir } }];
    case "campus":
      return [{ campus: { name: dir } }];
    case "session":
      return [{ session: { name: dir } }];
    case "fee":
      return [{ fee: dir }];
    case "createdAt":
      return [{ createdAt: dir }];
    default:
      return [{ program: { displayOrder: "asc" } }, { campus: { displayOrder: "asc" } }, { session: { displayOrder: "asc" } }];
  }
}

export async function listFeeStructuresPaginated(filters: FeeStructureListFilters = {}) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize ?? 10;
  const status = filters.status ?? "all";

  const where: Prisma.FeeStructureWhereInput = {
    ...(status === "active" ? { isActive: true } : status === "inactive" ? { isActive: false } : {}),
    ...(filters.search
      ? {
          OR: [
            { program: { name: { contains: filters.search, mode: "insensitive" } } },
            { campus: { name: { contains: filters.search, mode: "insensitive" } } },
            { session: { name: { contains: filters.search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.feeStructure.findMany({
      where,
      include: { program: true, campus: true, session: true, discountRules: { orderBy: { minQuantity: "asc" } } },
      orderBy: feeStructureOrderBy(filters.sort, filters.dir ?? "asc"),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.feeStructure.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getFeeStructure(id: string) {
  return prisma.feeStructure.findUnique({
    where: { id },
    include: { discountRules: { orderBy: { minQuantity: "asc" } } },
  });
}

/** Exact-match lookup used by the registration flow - never substitutes a fee for an unconfigured combination. */
export async function findActiveFeeStructure(programId: string, campusId: string, sessionId: string) {
  return prisma.feeStructure.findFirst({
    where: { programId, campusId, sessionId, isActive: true },
  });
}

export async function createFeeStructure(input: FeeStructureInput) {
  return prisma.feeStructure.create({
    data: {
      programId: input.programId,
      campusId: input.campusId,
      sessionId: input.sessionId,
      currency: input.currency,
      fee: new Prisma.Decimal(input.fee),
      registrationFee: input.registrationFee != null ? new Prisma.Decimal(input.registrationFee) : null,
      discountAmount: input.discountAmount != null ? new Prisma.Decimal(input.discountAmount) : null,
      discountPercent: input.discountPercent != null ? new Prisma.Decimal(input.discountPercent) : null,
    },
  });
}

export async function updateFeeStructure(id: string, input: FeeStructureInput) {
  return prisma.feeStructure.update({
    where: { id },
    data: {
      programId: input.programId,
      campusId: input.campusId,
      sessionId: input.sessionId,
      currency: input.currency,
      fee: new Prisma.Decimal(input.fee),
      registrationFee: input.registrationFee != null ? new Prisma.Decimal(input.registrationFee) : null,
      discountAmount: input.discountAmount != null ? new Prisma.Decimal(input.discountAmount) : null,
      discountPercent: input.discountPercent != null ? new Prisma.Decimal(input.discountPercent) : null,
    },
  });
}

export async function toggleFeeStructureActive(id: string) {
  const feeStructure = await prisma.feeStructure.findUniqueOrThrow({ where: { id } });
  return prisma.feeStructure.update({ where: { id }, data: { isActive: !feeStructure.isActive } });
}

export async function deleteFeeStructure(id: string) {
  return prisma.feeStructure.delete({ where: { id } });
}

export async function bulkSetFeeStructuresActive(ids: string[], isActive: boolean) {
  return prisma.feeStructure.updateMany({ where: { id: { in: ids } }, data: { isActive } });
}

// ── Quantity-based discount rules ──────────────────────────────────────────

export interface DiscountRuleInput {
  feeStructureId: string;
  minQuantity: number;
  discountType: "PERCENT" | "FIXED";
  value: number;
}

export async function listDiscountRules(feeStructureId: string) {
  return prisma.discountRule.findMany({ where: { feeStructureId }, orderBy: { minQuantity: "asc" } });
}

export async function createDiscountRule(input: DiscountRuleInput) {
  return prisma.discountRule.create({
    data: {
      feeStructureId: input.feeStructureId,
      minQuantity: input.minQuantity,
      discountType: input.discountType,
      value: new Prisma.Decimal(input.value),
    },
  });
}

export async function updateDiscountRule(id: string, input: Omit<DiscountRuleInput, "feeStructureId">) {
  return prisma.discountRule.update({
    where: { id },
    data: {
      minQuantity: input.minQuantity,
      discountType: input.discountType,
      value: new Prisma.Decimal(input.value),
    },
  });
}

export async function deleteDiscountRule(id: string) {
  return prisma.discountRule.delete({ where: { id } });
}

export async function toggleDiscountRuleActive(id: string) {
  const rule = await prisma.discountRule.findUniqueOrThrow({ where: { id } });
  return prisma.discountRule.update({ where: { id }, data: { isActive: !rule.isActive } });
}

export interface FeeBreakdown {
  unitFee: number;
  quantity: number;
  subtotal: number;
  appliedRule: { minQuantity: number; discountType: "PERCENT" | "FIXED"; value: number } | null;
  discountAmount: number;
  totalFee: number;
  currency: string;
}

/**
 * Computes the total payable for a given FeeStructure and quantity,
 * applying the highest-tier quantity discount that qualifies (highest
 * minQuantity <= quantity). Both PERCENT and FIXED discount types apply to
 * the whole subtotal (unitFee * quantity) at that tier, not per-participant.
 */
export async function computeFee(feeStructureId: string, quantity: number): Promise<FeeBreakdown> {
  const feeStructure = await prisma.feeStructure.findUniqueOrThrow({
    where: { id: feeStructureId },
    include: { discountRules: { where: { isActive: true }, orderBy: { minQuantity: "asc" } } },
  });

  const unitFee = Number(feeStructure.fee);
  const subtotal = unitFee * quantity;

  const qualifyingRules = feeStructure.discountRules.filter((rule) => rule.minQuantity <= quantity);
  const appliedRule = qualifyingRules.length > 0 ? qualifyingRules[qualifyingRules.length - 1] : null;

  let discountAmount = 0;
  if (appliedRule) {
    const value = Number(appliedRule.value);
    discountAmount = appliedRule.discountType === "PERCENT" ? subtotal * (value / 100) : value;
    discountAmount = Math.min(discountAmount, subtotal);
  }

  return {
    unitFee,
    quantity,
    subtotal,
    appliedRule: appliedRule
      ? { minQuantity: appliedRule.minQuantity, discountType: appliedRule.discountType, value: Number(appliedRule.value) }
      : null,
    discountAmount,
    totalFee: subtotal - discountAmount,
    currency: feeStructure.currency,
  };
}
