import { NextResponse } from "next/server";
import { findRegistrationByBasketId } from "@/services/registration.service";

/**
 * Public, read-only status lookup for the informational success page - by
 * design returns only non-sensitive fields (never name/email/CNIC/address).
 * Basket IDs are sequential and guessable, so this deliberately does not
 * expose anything a caller couldn't already infer just by trying IDs.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const basketId = searchParams.get("basketId");

  if (!basketId) {
    return NextResponse.json({ success: false, error: "basketId is required" }, { status: 400 });
  }

  const registration = await findRegistrationByBasketId(basketId);
  if (!registration) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    basketId: registration.basketId,
    paymentStatus: registration.paymentStatus,
    transactionId: registration.transactionId,
    paymentMethod: registration.paymentMethod,
    fee: Number(registration.fee),
  });
}
