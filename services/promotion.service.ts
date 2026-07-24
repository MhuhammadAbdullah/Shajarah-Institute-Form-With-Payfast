import { Prisma, type PromotionDiscountType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PromotionStatus = "DRAFT" | "SCHEDULED" | "ACTIVE" | "EXPIRED" | "DISABLED";

export interface PromotionStatusInput {
  isActive: boolean;
  firstActivatedAt: Date | null;
  startDate: Date | null;
  endDate: Date | null;
}

/**
 * Always computed on read - never stored as a column. A stored+reconciled
 * status risks a stale-but-still-"ACTIVE" promotion firing after a cron
 * hasn't run, which is unacceptable for money-affecting eligibility. See
 * services/promotionEngine.service.ts for where this gates real discounts.
 */
export function derivePromotionStatus(promo: PromotionStatusInput, now: Date = new Date()): PromotionStatus {
  if (!promo.isActive) {
    return promo.firstActivatedAt ? "DISABLED" : "DRAFT";
  }
  if (promo.startDate && now < promo.startDate) return "SCHEDULED";
  if (promo.endDate && now > promo.endDate) return "EXPIRED";
  return "ACTIVE";
}

export function statusWhere(status: PromotionStatus, now: Date = new Date()): Prisma.PromotionWhereInput {
  switch (status) {
    case "DRAFT":
      return { isActive: false, firstActivatedAt: null };
    case "DISABLED":
      return { isActive: false, firstActivatedAt: { not: null } };
    case "SCHEDULED":
      return { isActive: true, startDate: { gt: now } };
    case "EXPIRED":
      return { isActive: true, endDate: { lt: now } };
    case "ACTIVE":
      return {
        isActive: true,
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null }, { endDate: { gte: now } }] },
        ],
      };
  }
}

/** Coupon codes are always stored/looked-up uppercased+trimmed - see plan risk callout on case/whitespace duplication. */
export function normalizeCouponCode(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? "").trim().toUpperCase();
  return trimmed || null;
}

export interface PromotionInput {
  name: string;
  description?: string | null;
  requiresCode: boolean;
  code?: string | null;
  publicTitle?: string | null;
  subtitle?: string | null;
  bannerText?: string | null;
  discountType: PromotionDiscountType;
  value?: number | null;
  maxDiscountAmount?: number | null;
  buyQuantity?: number | null;
  freeQuantity?: number | null;
  startDate?: Date | null;
  endDate?: Date | null;
  priority?: number;
  isStackable?: boolean;
  allowBogoStacking?: boolean;
  usageLimit?: number | null;
  usageLimitPerUser?: number | null;
  minOrderAmount?: number | null;
  minRegistrationCount?: number | null;
  showOnForm?: boolean;
  isFeatured?: boolean;
  bannerColor?: string | null;
  bannerIcon?: string | null;
  displayOrder?: number;
  programIds?: string[];
  sessionIds?: string[];
}

function scalarData(input: PromotionInput) {
  return {
    name: input.name,
    description: input.description ?? null,
    requiresCode: input.requiresCode,
    code: input.requiresCode ? normalizeCouponCode(input.code) : null,
    publicTitle: input.publicTitle ?? null,
    subtitle: input.subtitle ?? null,
    bannerText: input.bannerText ?? null,
    discountType: input.discountType,
    value: input.value != null ? new Prisma.Decimal(input.value) : null,
    maxDiscountAmount: input.maxDiscountAmount != null ? new Prisma.Decimal(input.maxDiscountAmount) : null,
    buyQuantity: input.discountType === "BOGO" ? (input.buyQuantity ?? null) : null,
    freeQuantity: input.discountType === "BOGO" ? (input.freeQuantity ?? null) : null,
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    priority: input.priority ?? 0,
    isStackable: input.isStackable ?? false,
    allowBogoStacking: input.allowBogoStacking ?? false,
    usageLimit: input.usageLimit ?? null,
    usageLimitPerUser: input.usageLimitPerUser ?? null,
    minOrderAmount: input.minOrderAmount != null ? new Prisma.Decimal(input.minOrderAmount) : null,
    minRegistrationCount: input.minRegistrationCount ?? null,
    showOnForm: input.showOnForm ?? true,
    isFeatured: input.isFeatured ?? false,
    bannerColor: input.bannerColor ?? null,
    bannerIcon: input.bannerIcon ?? null,
    displayOrder: input.displayOrder ?? 0,
  };
}

export async function createPromotion(input: PromotionInput) {
  const programIds = input.programIds ?? [];
  const sessionIds = input.sessionIds ?? [];

  return prisma.promotion.create({
    data: {
      ...scalarData(input),
      programs: programIds.length > 0 ? { create: programIds.map((programId) => ({ programId })) } : undefined,
      sessions: sessionIds.length > 0 ? { create: sessionIds.map((sessionId) => ({ sessionId })) } : undefined,
    },
  });
}

export async function updatePromotion(id: string, input: PromotionInput) {
  const programIds = input.programIds ?? [];
  const sessionIds = input.sessionIds ?? [];

  return prisma.$transaction(async (tx) => {
    await tx.promotionProgram.deleteMany({ where: { promotionId: id } });
    await tx.promotionSession.deleteMany({ where: { promotionId: id } });

    return tx.promotion.update({
      where: { id },
      data: {
        ...scalarData(input),
        programs: programIds.length > 0 ? { create: programIds.map((programId) => ({ programId })) } : undefined,
        sessions: sessionIds.length > 0 ? { create: sessionIds.map((sessionId) => ({ sessionId })) } : undefined,
      },
    });
  });
}

/** Additive, one-time conversion: never touches/deactivates the original tiers. */
export async function duplicatePromotion(id: string) {
  const original = await prisma.promotion.findUniqueOrThrow({
    where: { id },
    include: { programs: true, sessions: true },
  });

  return prisma.promotion.create({
    data: {
      name: `${original.name} (Copy)`,
      description: original.description,
      requiresCode: original.requiresCode,
      code: null, // code is unique - admin must set a new one before re-enabling
      publicTitle: original.publicTitle,
      subtitle: original.subtitle,
      bannerText: original.bannerText,
      discountType: original.discountType,
      value: original.value,
      maxDiscountAmount: original.maxDiscountAmount,
      buyQuantity: original.buyQuantity,
      freeQuantity: original.freeQuantity,
      isActive: false,
      firstActivatedAt: null,
      startDate: original.startDate,
      endDate: original.endDate,
      priority: original.priority,
      isStackable: original.isStackable,
      allowBogoStacking: original.allowBogoStacking,
      usageLimit: original.usageLimit,
      usageLimitPerUser: original.usageLimitPerUser,
      usageCount: 0,
      minOrderAmount: original.minOrderAmount,
      minRegistrationCount: original.minRegistrationCount,
      showOnForm: original.showOnForm,
      isFeatured: false,
      bannerColor: original.bannerColor,
      bannerIcon: original.bannerIcon,
      displayOrder: original.displayOrder,
      programs: { create: original.programs.map((p) => ({ programId: p.programId })) },
      sessions: { create: original.sessions.map((s) => ({ sessionId: s.sessionId })) },
    },
  });
}

export async function togglePromotionActive(id: string) {
  const promotion = await prisma.promotion.findUniqueOrThrow({ where: { id } });
  const nextActive = !promotion.isActive;
  return prisma.promotion.update({
    where: { id },
    data: {
      isActive: nextActive,
      firstActivatedAt: nextActive && !promotion.firstActivatedAt ? new Date() : undefined,
    },
  });
}

export async function deletePromotion(id: string) {
  return prisma.promotion.delete({ where: { id } });
}

export async function bulkSetPromotionsActive(ids: string[], isActive: boolean) {
  if (isActive) {
    // Each row needs its own conditional firstActivatedAt set, so this can't
    // be a single updateMany the way other bulk-activate actions in this
    // codebase are.
    await Promise.all(
      ids.map(async (id) => {
        const promotion = await prisma.promotion.findUnique({ where: { id } });
        if (!promotion) return;
        await prisma.promotion.update({
          where: { id },
          data: { isActive: true, firstActivatedAt: promotion.firstActivatedAt ?? new Date() },
        });
      }),
    );
    return;
  }
  await prisma.promotion.updateMany({ where: { id: { in: ids } }, data: { isActive: false } });
}

export const PROMOTION_SORT_KEYS = ["name", "priority", "usageCount", "createdAt"] as const;
export type PromotionSortKey = (typeof PROMOTION_SORT_KEYS)[number];

export type PromotionListStatus = "all" | PromotionStatus;

export interface PromotionListFilters {
  search?: string;
  status?: PromotionListStatus;
  page?: number;
  pageSize?: number;
  sort?: PromotionSortKey;
  dir?: "asc" | "desc";
}

export async function listPromotionsPaginated(filters: PromotionListFilters = {}) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize ?? 10;
  const status = filters.status ?? "all";
  const now = new Date();

  const where: Prisma.PromotionWhereInput = {
    ...(status !== "all" ? statusWhere(status, now) : {}),
    ...(filters.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { code: { contains: filters.search, mode: "insensitive" } },
            { publicTitle: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const dir = filters.dir ?? "desc";
  const orderBy: Prisma.PromotionOrderByWithRelationInput[] = filters.sort
    ? [{ [filters.sort]: dir }]
    : [{ priority: "desc" }, { createdAt: "desc" }];

  const [items, total] = await Promise.all([
    prisma.promotion.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { programs: { include: { program: true } }, sessions: { include: { session: true } } },
    }),
    prisma.promotion.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getPromotion(id: string) {
  return prisma.promotion.findUnique({
    where: { id },
    include: {
      programs: { include: { program: true } },
      sessions: { include: { session: true } },
      redemptions: { orderBy: { createdAt: "desc" }, take: 20 },
      auditLogs: { orderBy: { createdAt: "desc" }, take: 20 },
      _count: { select: { redemptions: true } },
    },
  });
}

export async function getPromotionStats() {
  const now = new Date();
  const [draft, scheduled, active, expired, disabled, usage, revenue] = await Promise.all([
    prisma.promotion.count({ where: statusWhere("DRAFT", now) }),
    prisma.promotion.count({ where: statusWhere("SCHEDULED", now) }),
    prisma.promotion.count({ where: statusWhere("ACTIVE", now) }),
    prisma.promotion.count({ where: statusWhere("EXPIRED", now) }),
    prisma.promotion.count({ where: statusWhere("DISABLED", now) }),
    prisma.promotion.aggregate({ _sum: { usageCount: true } }),
    prisma.promotionRedemption.aggregate({ _sum: { discountAmount: true } }),
  ]);

  return {
    draft,
    scheduled,
    active,
    expired,
    disabled,
    totalUsage: usage._sum.usageCount ?? 0,
    revenueSaved: Number(revenue._sum.discountAmount ?? 0),
  };
}

export async function recordPromotionAudit(
  promotionId: string,
  action: "CREATED" | "UPDATED" | "ENABLED" | "DISABLED" | "DELETED" | "DUPLICATED",
  admin: { adminId: string; email: string },
  metadata?: Record<string, unknown>,
) {
  await prisma.promotionAuditLog.create({
    data: {
      promotionId,
      action,
      adminId: admin.adminId,
      adminEmail: admin.email,
      metadata: metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

/**
 * Banner-eligible active promotions, public fields only - consumed by
 * app/api/registration/promotions/route.ts. Never expose name/description
 * (internal) or usage counts here.
 */
export async function listActivePromotionsForBanner() {
  const now = new Date();
  const promotions = await prisma.promotion.findMany({
    where: { ...statusWhere("ACTIVE", now), showOnForm: true },
    orderBy: [{ isFeatured: "desc" }, { displayOrder: "asc" }],
  });

  return promotions.map((p) => ({
    id: p.id,
    publicTitle: p.publicTitle,
    subtitle: p.subtitle,
    bannerText: p.bannerText,
    requiresCode: p.requiresCode,
    code: p.requiresCode ? p.code : null,
    discountType: p.discountType,
    value: p.value != null ? Number(p.value) : null,
    buyQuantity: p.buyQuantity,
    freeQuantity: p.freeQuantity,
    isFeatured: p.isFeatured,
    bannerColor: p.bannerColor,
    bannerIcon: p.bannerIcon,
    endDate: p.endDate ? p.endDate.toISOString() : null,
  }));
}
