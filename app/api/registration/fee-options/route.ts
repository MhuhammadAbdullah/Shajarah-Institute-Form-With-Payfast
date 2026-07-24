import { NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { resolveFeeWithPromotions, FeeNotConfiguredError } from "@/services/registration.service";

const FEE_OPTIONS_RATE_LIMIT = 30;
const FEE_OPTIONS_RATE_WINDOW_MS = 60_000;

/**
 * Given the program/campus/session NAMES the customer selected (same
 * strings that end up in Registration.program/campus/session), a quantity
 * (participant count for Multiple registration, else 1), and an optional
 * coupon code + email, returns the full pricing breakdown - both the
 * existing bulk-tier (layer 1) discount and the Promotion engine (layer 2)
 * discount, combined. Called by the wizard's live fee panel whenever any of
 * the selects, the participant count, or the applied coupon changes, and
 * again by the Promo Code field's Apply button.
 *
 * Field compatibility note: `unitFee`/`quantity`/`subtotal`/`appliedRule`/
 * `discountAmount`/`currency` keep their exact original layer-1-only
 * meaning. `totalFee` is REDEFINED to be the true final payable (both
 * layers combined) - required so the "Total Amount Payable" row stays
 * correct once a promotion applies, not a breaking change to avoid. New
 * fields are purely additive.
 *
 * Rate-limited (unlike before this feature) because a `coupon` query param
 * that echoes back a validation error turns this into an unauthenticated
 * coupon-guessing oracle.
 */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = rateLimit(`fee-options:${ip}`, FEE_OPTIONS_RATE_LIMIT, FEE_OPTIONS_RATE_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json({ success: false, error: "Too many requests. Please slow down." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const program = searchParams.get("program");
  const campus = searchParams.get("campus");
  const session = searchParams.get("session");
  const quantity = Math.max(1, Number(searchParams.get("quantity")) || 1);
  const couponCode = searchParams.get("coupon");
  const email = searchParams.get("email") ?? "";

  if (!program || !campus || !session) {
    return NextResponse.json({ success: false, error: "program, campus, and session are all required" }, { status: 400 });
  }

  try {
    const pricing = await resolveFeeWithPromotions(program, campus, session, quantity, couponCode, email);

    return NextResponse.json({
      success: true,
      // layer 1 - unchanged meaning
      unitFee: pricing.unitFee,
      quantity: pricing.quantity,
      subtotal: pricing.subtotal,
      appliedRule: pricing.appliedRule,
      discountAmount: pricing.bulkDiscountAmount,
      currency: pricing.currency,
      // layer 2 - additive
      bulkDiscountAmount: pricing.bulkDiscountAmount,
      promotionDiscountAmount: pricing.promotionDiscountAmount,
      appliedPromotions: pricing.appliedPromotions,
      freeRegistrationCount: pricing.freeRegistrationCount,
      totalDiscountAmount: pricing.totalDiscountAmount,
      couponError: pricing.couponError,
      // redefined - now the true final payable (both layers combined)
      totalFee: pricing.finalTotal,
    });
  } catch (error) {
    if (error instanceof FeeNotConfiguredError) {
      return NextResponse.json({ success: false, error: "No fee available for this combination" }, { status: 404 });
    }
    throw error;
  }
}
