import type { Prisma, PromotionDiscountType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { derivePromotionStatus } from "@/services/promotion.service";
import type { AppliedPromotion, CouponError, CouponIneligibleReason } from "@/types/promotion";

/**
 * Core discount-selection algorithm - see prisma/schema.prisma's "Discount &
 * Promotion engine" section header and the plan this was designed against
 * (C:\Users\Abdullah\.claude\plans\dapper-kindling-trinket.md) for the full
 * rationale. Non-negotiable invariants, do not regress:
 *
 * - Every eligibility check and every discount amount is computed against
 *   the FIXED `ctx.layer1Subtotal`/`ctx.quantity` snapshot taken once at the
 *   start of a call - never a value that shrinks as promotions get applied.
 *   This is what makes the result deterministic and order-independent.
 * - Stacked percentages/fixed amounts ADD, they never compound.
 * - At most one BOGO promotion applies unless `allowBogoStacking` is set on
 *   the one already applied.
 * - The combined total is clamped to the subtotal (never negative), trimming
 *   from the lowest-priority applied promotion first if it would overflow.
 * - `evaluateEligibility` is the ONLY place eligibility/amount logic lives -
 *   both the Apply-button preview and the actual compute path call it, so
 *   they can never diverge.
 */

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

type PromotionWithScope = Prisma.PromotionGetPayload<{ include: { programs: true; sessions: true } }>;

export interface PromotionContext {
  layer1Subtotal: number;
  quantity: number;
  programId: string;
  sessionId: string;
  couponCode: string | null;
  userEmail: string;
  now: Date;
}

export interface EligibilityResult {
  eligible: boolean;
  reason?: CouponIneligibleReason;
  potentialDiscountAmount: number;
  freeCount?: number;
}

const REASON_MESSAGES: Record<CouponIneligibleReason, string> = {
  NOT_FOUND: "This coupon code isn't valid.",
  INACTIVE: "This coupon isn't currently active.",
  NOT_STARTED: "This coupon isn't active yet.",
  EXPIRED: "This coupon has expired.",
  USAGE_LIMIT_REACHED: "This coupon has reached its usage limit.",
  USER_USAGE_LIMIT_REACHED: "You've already used this coupon the maximum number of times.",
  PROGRAM_NOT_ELIGIBLE: "This coupon isn't valid for the selected program.",
  SESSION_NOT_ELIGIBLE: "This coupon isn't valid for the selected session.",
  MIN_REGISTRATION_COUNT: "This coupon requires more registrations to qualify.",
  MIN_ORDER_AMOUNT: "This coupon requires a higher order amount to qualify.",
  BOGO_MIN_QUANTITY_NOT_MET: "Register more people to qualify for this offer.",
};

export function describeReason(reason: CouponIneligibleReason): string {
  return REASON_MESSAGES[reason];
}

function ineligible(reason: CouponIneligibleReason): EligibilityResult {
  return { eligible: false, reason, potentialDiscountAmount: 0 };
}

/**
 * The single source of truth for "does this promotion apply, and for how
 * much" - reused unchanged by the Apply-button validation path
 * (validateCoupon) and the actual selection/compute path (computePromotions).
 */
export function evaluateEligibility(promo: PromotionWithScope, ctx: PromotionContext, usageCountForUser: number): EligibilityResult {
  const status = derivePromotionStatus(promo, ctx.now);
  if (status === "DRAFT" || status === "DISABLED") return ineligible("INACTIVE");
  if (status === "SCHEDULED") return ineligible("NOT_STARTED");
  if (status === "EXPIRED") return ineligible("EXPIRED");

  if (promo.usageLimit != null && promo.usageCount >= promo.usageLimit) return ineligible("USAGE_LIMIT_REACHED");
  if (promo.usageLimitPerUser != null && usageCountForUser >= promo.usageLimitPerUser) return ineligible("USER_USAGE_LIMIT_REACHED");

  if (promo.programs.length > 0 && !promo.programs.some((p) => p.programId === ctx.programId)) return ineligible("PROGRAM_NOT_ELIGIBLE");
  if (promo.sessions.length > 0 && !promo.sessions.some((s) => s.sessionId === ctx.sessionId)) return ineligible("SESSION_NOT_ELIGIBLE");

  if (promo.minRegistrationCount != null && ctx.quantity < promo.minRegistrationCount) return ineligible("MIN_REGISTRATION_COUNT");
  if (promo.minOrderAmount != null && ctx.layer1Subtotal < Number(promo.minOrderAmount)) return ineligible("MIN_ORDER_AMOUNT");

  if (promo.discountType === "BOGO") {
    const buyQty = promo.buyQuantity ?? 0;
    const freeQty = promo.freeQuantity ?? 0;
    const groupSize = buyQty + freeQty;
    if (groupSize <= 0) return ineligible("BOGO_MIN_QUANTITY_NOT_MET");

    const freeCount = Math.floor(ctx.quantity / groupSize) * freeQty;
    if (freeCount <= 0) return ineligible("BOGO_MIN_QUANTITY_NOT_MET");

    const perUnit = ctx.layer1Subtotal / ctx.quantity;
    let amount = round2(freeCount * perUnit);
    if (promo.maxDiscountAmount != null) amount = Math.min(amount, Number(promo.maxDiscountAmount));
    return { eligible: true, potentialDiscountAmount: amount, freeCount };
  }

  let amount =
    promo.discountType === "PERCENT" ? round2(ctx.layer1Subtotal * (Number(promo.value ?? 0) / 100)) : Number(promo.value ?? 0);
  amount = Math.min(amount, ctx.layer1Subtotal);
  if (promo.maxDiscountAmount != null) amount = Math.min(amount, Number(promo.maxDiscountAmount));
  return { eligible: true, potentialDiscountAmount: round2(amount) };
}

async function countUserRedemptions(promotionId: string, userEmail: string): Promise<number> {
  if (!userEmail) return 0;
  return prisma.promotionRedemption.count({ where: { promotionId, userEmail } });
}

async function loadCandidates(ctx: PromotionContext): Promise<PromotionWithScope[]> {
  const [automatic, coupon] = await Promise.all([
    prisma.promotion.findMany({
      where: { requiresCode: false, isActive: true },
      include: { programs: true, sessions: true },
    }),
    ctx.couponCode
      ? prisma.promotion.findFirst({
          where: { requiresCode: true, code: ctx.couponCode },
          include: { programs: true, sessions: true },
        })
      : Promise.resolve(null),
  ]);

  return coupon ? [...automatic, coupon] : automatic;
}

export interface PromotionComputeResult {
  appliedPromotions: AppliedPromotion[];
  promotionDiscountAmount: number;
  freeRegistrationCount: number;
  finalAmount: number;
  couponError: CouponError | null;
}

export async function computePromotions(ctx: PromotionContext): Promise<PromotionComputeResult> {
  const candidates = await loadCandidates(ctx);
  const couponPromo = ctx.couponCode ? candidates.find((p) => p.requiresCode && p.code === ctx.couponCode) : null;

  let couponError: CouponError | null = null;
  if (ctx.couponCode && !couponPromo) {
    couponError = { reason: "NOT_FOUND", message: describeReason("NOT_FOUND") };
  }

  const evaluated = await Promise.all(
    candidates.map(async (promo) => {
      const usageCountForUser = await countUserRedemptions(promo.id, ctx.userEmail);
      return { promo, result: evaluateEligibility(promo, ctx, usageCountForUser) };
    }),
  );

  if (couponPromo) {
    const couponEval = evaluated.find((e) => e.promo.id === couponPromo.id);
    if (couponEval && !couponEval.result.eligible) {
      couponError = { reason: couponEval.result.reason!, message: describeReason(couponEval.result.reason!) };
    }
  }

  const eligible = evaluated
    .filter((e) => e.result.eligible)
    .sort(
      (a, b) =>
        b.promo.priority - a.promo.priority ||
        b.result.potentialDiscountAmount - a.result.potentialDiscountAmount ||
        a.promo.createdAt.getTime() - b.promo.createdAt.getTime(),
    );

  if (eligible.length === 0) {
    return { appliedPromotions: [], promotionDiscountAmount: 0, freeRegistrationCount: 0, finalAmount: round2(ctx.layer1Subtotal), couponError };
  }

  const selected: { promo: PromotionWithScope; discountAmount: number; freeCount?: number }[] = [
    { promo: eligible[0].promo, discountAmount: eligible[0].result.potentialDiscountAmount, freeCount: eligible[0].result.freeCount },
  ];
  let bogoApplied = eligible[0].promo.discountType === "BOGO";

  if (eligible[0].promo.isStackable) {
    for (const candidate of eligible.slice(1)) {
      if (!candidate.promo.isStackable) continue;
      if (candidate.promo.discountType === "BOGO") {
        if (bogoApplied && !candidate.promo.allowBogoStacking) continue;
        bogoApplied = true;
      }
      selected.push({ promo: candidate.promo, discountAmount: candidate.result.potentialDiscountAmount, freeCount: candidate.result.freeCount });
    }
  }

  let promotionDiscountAmount = round2(selected.reduce((sum, s) => sum + s.discountAmount, 0));
  if (promotionDiscountAmount > ctx.layer1Subtotal) {
    // Clamp the SUMMED total (never each promo individually), trimming from
    // the lowest-priority applied promo first so the top-priority promo's
    // quoted discount is protected.
    let excess = round2(promotionDiscountAmount - ctx.layer1Subtotal);
    for (let i = selected.length - 1; i >= 0 && excess > 0; i--) {
      const reduceBy = Math.min(selected[i].discountAmount, excess);
      selected[i].discountAmount = round2(selected[i].discountAmount - reduceBy);
      excess = round2(excess - reduceBy);
    }
    promotionDiscountAmount = round2(selected.reduce((sum, s) => sum + s.discountAmount, 0));
  }

  const finalAmount = Math.max(0, round2(ctx.layer1Subtotal - promotionDiscountAmount));
  const freeRegistrationCount = selected.reduce((sum, s) => sum + (s.freeCount ?? 0), 0);

  return {
    appliedPromotions: selected.map((s) => ({
      promotionId: s.promo.id,
      name: s.promo.name,
      publicTitle: s.promo.publicTitle,
      code: s.promo.code,
      discountType: s.promo.discountType as PromotionDiscountType,
      discountAmount: s.discountAmount,
      freeCount: s.freeCount,
    })),
    promotionDiscountAmount,
    freeRegistrationCount,
    finalAmount,
    couponError,
  };
}

/** Thin wrapper around evaluateEligibility for the registration-form Apply-button preview - never a second implementation. */
export async function validateCoupon(code: string, ctx: Omit<PromotionContext, "couponCode">): Promise<CouponError | null> {
  const normalized = code.trim().toUpperCase();
  const promo = await prisma.promotion.findFirst({
    where: { requiresCode: true, code: normalized },
    include: { programs: true, sessions: true },
  });
  if (!promo) return { reason: "NOT_FOUND", message: describeReason("NOT_FOUND") };

  const usageCountForUser = await countUserRedemptions(promo.id, ctx.userEmail);
  const result = evaluateEligibility(promo, { ...ctx, couponCode: normalized }, usageCountForUser);
  if (result.eligible) return null;
  return { reason: result.reason!, message: describeReason(result.reason!) };
}
