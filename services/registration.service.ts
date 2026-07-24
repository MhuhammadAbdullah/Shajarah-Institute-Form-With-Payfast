import { Prisma, type Registration } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateBasketId } from "@/services/basketId.service";
import { findActiveFeeStructure, computeFee, type FeeBreakdown } from "@/services/feeStructure.service";
import { computePromotions } from "@/services/promotionEngine.service";
import { normalizeCouponCode } from "@/services/promotion.service";
import type { AppliedPromotion, CouponError } from "@/types/promotion";

const MAX_BASKET_ID_RETRIES = 3;

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface CoreRegistrationFields {
  studentName: string;
  fatherName?: string | null;
  email: string;
  phone: string;
  cnic?: string | null;
  gender: string;
  dateOfBirth?: string | null;
  program: string;
  campus: string;
  session: string;
  country: string;
  province: string;
  city: string;
  postalCode?: string | null;
  address: string;
  agreementAccepted: boolean;
  registrationType?: "SINGLE" | "MULTIPLE";
}

export interface ParticipantInput {
  fullName: string;
  email: string;
  phone: string;
  cnic: string;
  age: number;
}

export class FeeNotConfiguredError extends Error {
  constructor() {
    super("No active fee is configured for this Program + Campus + Session combination.");
    this.name = "FeeNotConfiguredError";
  }
}

export class PromotionExhaustedError extends Error {
  constructor(promotionName: string) {
    super(`The promotion "${promotionName}" is no longer available (its usage limit was just reached). Please remove it and try again.`);
    this.name = "PromotionExhaustedError";
  }
}

/**
 * Resolves the authoritative fee for a program+campus+session combination
 * and quantity via FeeStructure (never accepted from the client - a
 * tampered request body can't pay less than the real price). Throws if no
 * active FeeStructure row exists for the exact combination - never
 * silently substitutes a fee.
 */
export async function resolveFee(programName: string, campusName: string, sessionName: string, quantity: number): Promise<FeeBreakdown> {
  const [program, campus, session] = await Promise.all([
    prisma.program.findUnique({ where: { name: programName } }),
    prisma.campus.findUnique({ where: { name: campusName } }),
    prisma.session.findUnique({ where: { name: sessionName } }),
  ]);

  if (!program || !campus || !session) {
    throw new FeeNotConfiguredError();
  }

  const feeStructure = await findActiveFeeStructure(program.id, campus.id, session.id);
  if (!feeStructure) {
    throw new FeeNotConfiguredError();
  }

  return computeFee(feeStructure.id, quantity);
}

export interface PricingBreakdown {
  unitFee: number;
  quantity: number;
  subtotal: number; // unitFee * quantity, before ANY discount (= Registration.originalAmount)
  appliedRule: FeeBreakdown["appliedRule"];
  bulkDiscountAmount: number; // layer-1 DiscountRule tier discount
  layer1Total: number; // subtotal - bulkDiscountAmount (layer 1's own final amount)
  promotionDiscountAmount: number; // layer-2 Promotion engine discount
  appliedPromotions: AppliedPromotion[];
  freeRegistrationCount: number;
  totalDiscountAmount: number; // bulkDiscountAmount + promotionDiscountAmount
  finalTotal: number; // layer1Total - promotionDiscountAmount, floored at 0 (= Registration.fee)
  couponError: CouponError | null;
  currency: string;
}

/**
 * Layer 1 (resolveFee/computeFee, the existing DiscountRule bulk-tier
 * system) stays completely unchanged and is called first. The Promotion
 * engine (layer 2) is computed on top of layer 1's own final amount,
 * never against a value that later shrinks further - see
 * services/promotionEngine.service.ts for why this invariant matters.
 */
export async function resolveFeeWithPromotions(
  programName: string,
  campusName: string,
  sessionName: string,
  quantity: number,
  couponCode: string | null,
  userEmail: string,
): Promise<PricingBreakdown> {
  const feeBreakdown = await resolveFee(programName, campusName, sessionName, quantity);

  const [program, session] = await Promise.all([
    prisma.program.findUnique({ where: { name: programName } }),
    prisma.session.findUnique({ where: { name: sessionName } }),
  ]);
  // resolveFee already succeeded, so Program/Session are guaranteed to exist.
  const programId = program!.id;
  const sessionId = session!.id;

  const promoResult = await computePromotions({
    layer1Subtotal: feeBreakdown.totalFee,
    quantity,
    programId,
    sessionId,
    couponCode: normalizeCouponCode(couponCode),
    userEmail,
    now: new Date(),
  });

  return {
    unitFee: feeBreakdown.unitFee,
    quantity,
    subtotal: feeBreakdown.subtotal,
    appliedRule: feeBreakdown.appliedRule,
    bulkDiscountAmount: feeBreakdown.discountAmount,
    layer1Total: feeBreakdown.totalFee,
    promotionDiscountAmount: promoResult.promotionDiscountAmount,
    appliedPromotions: promoResult.appliedPromotions,
    freeRegistrationCount: promoResult.freeRegistrationCount,
    totalDiscountAmount: round2(feeBreakdown.discountAmount + promoResult.promotionDiscountAmount),
    finalTotal: promoResult.finalAmount,
    couponError: promoResult.couponError,
    currency: feeBreakdown.currency,
  };
}

/**
 * Persists a new pending registration with a freshly generated, unique
 * Basket ID. Retries a handful of times on the (extremely unlikely) chance
 * of a Basket ID collision.
 */
export async function createPendingRegistration(
  core: CoreRegistrationFields,
  customFieldValues: Record<string, unknown>,
  participants: ParticipantInput[] = [],
  couponCode: string | null = null,
): Promise<Registration> {
  const isMultiple = core.registrationType === "MULTIPLE";
  const quantity = isMultiple ? Math.max(participants.length, 1) : 1;
  const pricing = await resolveFeeWithPromotions(core.program, core.campus, core.session, quantity, couponCode, core.email);

  const normalizedCoupon = normalizeCouponCode(couponCode);
  const couponWasApplied = normalizedCoupon != null && pricing.appliedPromotions.some((p) => p.code === normalizedCoupon);

  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_BASKET_ID_RETRIES; attempt++) {
    const basketId = await generateBasketId();

    try {
      // Registration create, usage-limit consumption, and redemption rows
      // all happen inside one transaction so a P2002 basket-id collision (or
      // a PromotionExhaustedError) rolls back everything cleanly - the retry
      // loop then re-enters with no partial usage consumed. See
      // PricingBreakdown/resolveFeeWithPromotions above: the discount amounts
      // themselves are computed once, read-only, before this transaction -
      // only the usage-limit CHECK is re-verified atomically here.
      return await prisma.$transaction(async (tx) => {
        const registration = await tx.registration.create({
          data: {
            basketId,
            studentName: core.studentName,
            fatherName: core.fatherName || null,
            email: core.email,
            phone: core.phone,
            cnic: core.cnic || null,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            gender: core.gender as any,
            dateOfBirth: core.dateOfBirth ? new Date(core.dateOfBirth) : null,
            program: core.program,
            campus: core.campus,
            session: core.session,
            fee: new Prisma.Decimal(pricing.finalTotal),
            originalAmount: new Prisma.Decimal(pricing.subtotal),
            bulkDiscountAmount: new Prisma.Decimal(pricing.bulkDiscountAmount),
            promotionDiscountAmount: new Prisma.Decimal(pricing.promotionDiscountAmount),
            freeRegistrationCount: pricing.freeRegistrationCount,
            appliedCouponCode: couponWasApplied ? normalizedCoupon : null,
            country: core.country,
            province: core.province,
            city: core.city,
            postalCode: core.postalCode || null,
            address: core.address,
            agreementAccepted: core.agreementAccepted,
            registrationType: isMultiple ? "MULTIPLE" : "SINGLE",
            participantCount: quantity,
            customFieldValues: customFieldValues as Prisma.InputJsonValue,
            paymentStatus: "PENDING",
            ...(isMultiple && participants.length > 0
              ? {
                  participants: {
                    create: participants.map((p, index) => ({
                      order: index,
                      fullName: p.fullName,
                      email: p.email,
                      phone: p.phone,
                      cnic: p.cnic,
                      age: p.age,
                    })),
                  },
                }
              : {}),
          },
        });

        for (const applied of pricing.appliedPromotions) {
          const promo = await tx.promotion.findUniqueOrThrow({
            where: { id: applied.promotionId },
            select: { usageLimit: true, name: true },
          });

          // Atomic conditional increment - re-checks the LIVE usageCount at
          // this moment (not the value observed during the earlier read-only
          // compute pass), so two concurrent requests can never both push a
          // limited promotion past its usageLimit.
          const updated = await tx.promotion.updateMany({
            where: {
              id: applied.promotionId,
              OR: [{ usageLimit: null }, { usageCount: { lt: promo.usageLimit ?? 0 } }],
            },
            data: { usageCount: { increment: 1 } },
          });
          if (updated.count === 0) {
            throw new PromotionExhaustedError(promo.name);
          }

          await tx.promotionRedemption.create({
            data: {
              promotionId: applied.promotionId,
              registrationId: registration.id,
              userEmail: core.email,
              discountAmount: new Prisma.Decimal(applied.discountAmount),
              freeCount: applied.freeCount ?? null,
            },
          });
        }

        return registration;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Failed to generate a unique basket ID");
}

export async function saveAccessToken(registrationId: string, accessToken: string): Promise<void> {
  await prisma.registration.update({
    where: { id: registrationId },
    data: { accessToken },
  });
}

export async function findRegistrationByBasketId(basketId: string): Promise<Registration | null> {
  return prisma.registration.findUnique({ where: { basketId } });
}
