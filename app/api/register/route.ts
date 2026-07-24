import { NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { buildCheckoutFields, getAccessToken, getCheckoutPostUrl, PayFastError } from "@/lib/payfast/client";
import {
  createPendingRegistration,
  saveAccessToken,
  FeeNotConfiguredError,
  PromotionExhaustedError,
  type CoreRegistrationFields,
} from "@/services/registration.service";
import { getPublicFormSchema } from "@/services/formBuilder.service";
import { buildZodSchemaForFields } from "@/lib/formEngine/buildZodSchema";
import { splitSubmission } from "@/lib/formEngine/splitSubmission";
import { participantsArraySchema } from "@/lib/formEngine/participantSchema";
import { apiError, apiSuccess } from "@/utils/api-response";
import type { ZodError } from "zod";

const REGISTER_RATE_LIMIT = 5;
const REGISTER_RATE_WINDOW_MS = 60_000;

/**
 * Field-level Zod issues are already returned as `details` on the error
 * response, but the top-level `error` string is what actually renders in
 * the wizard's error banner - keep it specific to whichever fields failed
 * instead of a bare "Validation failed" so both the browser network tab and
 * the on-page message point straight at the cause.
 */
function describeValidationError(error: ZodError): string {
  const paths = Array.from(new Set(error.issues.map((issue) => issue.path.join(".") || "value")));
  return paths.length > 0 ? `Validation failed: ${paths.join(", ")}` : "Validation failed";
}

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

  const steps = await getPublicFormSchema();
  const fields = steps.flatMap((step) => step.sections.flatMap((section) => section.fields));

  // Authoritative server-side validation against the *current* form
  // definition - independent of, and never trusting, whatever the client
  // validated. Same shared schema builder the wizard uses per-step.
  const schema = buildZodSchemaForFields(fields);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    console.error(
      `[POST /api/register] core validation failed. payloadKeys=${Object.keys(body as Record<string, unknown>).join(",")} issues=${JSON.stringify(parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })))}`,
    );
    return apiError(describeValidationError(parsed.error), 422, parsed.error.flatten());
  }

  const { core, custom } = splitSubmission(fields, parsed.data as Record<string, unknown>);

  const coreFields = core as unknown as CoreRegistrationFields;
  const rawCouponCode = (body as Record<string, unknown>).couponCode;
  const couponCode = typeof rawCouponCode === "string" && rawCouponCode.trim() ? rawCouponCode.trim().toUpperCase() : null;
  let participants: { fullName: string; email: string; phone: string; cnic: string; age: number }[] = [];

  if (coreFields.registrationType === "MULTIPLE") {
    const rawBody = body as Record<string, unknown>;
    const participantsParsed = participantsArraySchema.safeParse(rawBody.participants);
    if (!participantsParsed.success) {
      console.error(
        `[POST /api/register] participants validation failed. participantsReceived=${Array.isArray(rawBody.participants) ? rawBody.participants.length : typeof rawBody.participants} issues=${JSON.stringify(participantsParsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })))}`,
      );
      return apiError(describeValidationError(participantsParsed.error), 422, participantsParsed.error.flatten());
    }
    participants = participantsParsed.data;
  }

  try {
    const registration = await createPendingRegistration(coreFields, custom, participants, couponCode);

    try {
      const token = await getAccessToken({
        basketId: registration.basketId,
        amount: Number(registration.fee),
      });

      await saveAccessToken(registration.id, token);

      const checkoutFields = buildCheckoutFields({
        token,
        basketId: registration.basketId,
        amount: Number(registration.fee),
        customerMobile: registration.phone,
        customerEmail: registration.email,
      });

      console.log(
        `[PayFast] Checkout fields built basketId=${registration.basketId} SUCCESS_URL=${checkoutFields.SUCCESS_URL} FAILURE_URL=${checkoutFields.FAILURE_URL} CHECKOUT_URL(PayFast's own hosted page, not our IPN)=${checkoutFields.CHECKOUT_URL} - note: this gateway's checkout API has no notify_url/IPN field; the callback destination is a merchant-account-level setting on PayFast's side, not something sent per-request.`,
      );

      return apiSuccess({
        registrationId: registration.id,
        basketId: registration.basketId,
        checkoutUrl: getCheckoutPostUrl(),
        fields: checkoutFields,
      });
    } catch (error) {
      const message = error instanceof PayFastError ? error.message : "Failed to initiate payment with PayFast";
      return apiError(message, 502);
    }
  } catch (error) {
    if (error instanceof FeeNotConfiguredError) {
      return apiError(error.message, 422);
    }
    if (error instanceof PromotionExhaustedError) {
      return apiError(error.message, 409);
    }
    throw error;
  }
}

export function GET() {
  return NextResponse.json({ success: false, error: "Method not allowed" }, { status: 405 });
}
