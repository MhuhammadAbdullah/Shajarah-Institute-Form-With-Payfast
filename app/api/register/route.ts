import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { buildCheckoutFields, getAccessToken, getCheckoutPostUrl, PayFastError } from "@/lib/payfast/client";
import { createPendingRegistration, saveAccessToken } from "@/services/registration.service";
import { registrationSchema } from "@/validators/registration.schema";
import { apiError, apiSuccess } from "@/utils/api-response";

const REGISTER_RATE_LIMIT = 5;
const REGISTER_RATE_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = rateLimit(`register:${ip}`, REGISTER_RATE_LIMIT, REGISTER_RATE_WINDOW_MS);
  if (!allowed) {
    return apiError("Too many registration attempts. Please try again in a minute.", 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Validation failed", 422, z.flattenError(parsed.error));
  }

  const input = parsed.data;

  const registration = await createPendingRegistration(input);

  try {
    const token = await getAccessToken({
      basketId: registration.basketId,
      amount: Number(registration.fee),
    });

    await saveAccessToken(registration.id, token);

    const fields = buildCheckoutFields({
      token,
      basketId: registration.basketId,
      amount: Number(registration.fee),
      customerMobile: registration.phone,
      customerEmail: registration.email,
    });

    console.log(
      `[PayFast] Checkout fields built basketId=${registration.basketId} SUCCESS_URL=${fields.SUCCESS_URL} FAILURE_URL=${fields.FAILURE_URL} CHECKOUT_URL(PayFast's own hosted page, not our IPN)=${fields.CHECKOUT_URL} - note: this gateway's checkout API has no notify_url/IPN field; the callback destination is a merchant-account-level setting on PayFast's side, not something sent per-request.`,
    );

    return apiSuccess({
      registrationId: registration.id,
      basketId: registration.basketId,
      checkoutUrl: getCheckoutPostUrl(),
      fields,
    });
  } catch (error) {
    const message = error instanceof PayFastError ? error.message : "Failed to initiate payment with PayFast";
    return apiError(message, 502);
  }
}

export function GET() {
  return NextResponse.json({ success: false, error: "Method not allowed" }, { status: 405 });
}
