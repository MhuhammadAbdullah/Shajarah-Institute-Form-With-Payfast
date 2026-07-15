import { NextResponse } from "next/server";
import { normalizeIpnPayload, parseIpnRequestBody } from "@/lib/payfast/ipn";
import { processPayFastIpn } from "@/services/payment.service";

/**
 * PayFast IPN callback. Must always be reachable without auth/CSRF (the
 * gateway calls this server-to-server) and must respond quickly with a
 * plain 200 so PayFast does not retry a request we already handled.
 */
export async function POST(request: Request) {
  const headers = Object.fromEntries(request.headers.entries());
  console.log(`[PayFast IPN] Request received. Headers: ${JSON.stringify(headers)}`);

  let rawFields: Record<string, string>;
  try {
    rawFields = await parseIpnRequestBody(request);
  } catch (error) {
    console.error("[PayFast IPN] Failed to parse request body", error);
    return respond("Invalid IPN payload", 400);
  }

  console.log(`[PayFast IPN] Raw body fields: ${JSON.stringify(rawFields)}`);

  const payload = normalizeIpnPayload(rawFields);

  console.log(
    `[PayFast IPN] Received basketId=${payload.basketId || "?"} errCode=${payload.errCode || "?"} paymentName=${payload.paymentName || "?"} transactionId=${payload.transactionId || "?"}`,
  );

  if (!payload.basketId || !payload.validationHash) {
    console.error(`[PayFast IPN] Rejected: missing basket_id or validation_hash in payload`);
    return respond("Missing required IPN fields", 400);
  }

  try {
    const result = await processPayFastIpn(payload);
    console.log(`[PayFast IPN] Processed basketId=${payload.basketId} outcome=${result.outcome}`);

    switch (result.outcome) {
      case "success":
      case "duplicate":
      case "recorded_failure":
        return respond("OK", 200);
      case "registration_not_found":
        return respond("Registration not found", 404);
      case "invalid_hash":
        return respond("Invalid validation hash", 400);
      case "amount_mismatch":
        return respond("Amount mismatch", 400);
      case "internal_error":
        // Genuinely failed before any DB write committed (see
        // services/payment.service.ts) - PayFast should retry this one.
        console.error(`[PayFast IPN] Internal error before DB commit: ${result.message}`);
        return respond("Internal error", 500);
      default:
        return respond("OK", 200);
    }
  } catch (error) {
    // processPayFastIpn already isolates its own failures into an
    // "internal_error" outcome above; reaching this block means something
    // threw outside that boundary (e.g. processPayFastIpn itself failed to
    // even return). Log the full stack trace rather than a generic message.
    const stack = error instanceof Error ? (error.stack ?? error.message) : String(error);
    console.error(`[PayFast IPN] Unhandled exception processing basketId=${payload.basketId}:\n${stack}`, error);
    return respond("Internal error", 500);
  }
}

function respond(body: string, status: number): NextResponse {
  console.log(`[PayFast IPN] Response returned: status=${status} body=${body}`);
  return new NextResponse(body, { status });
}

export function GET() {
  return new NextResponse("Method not allowed", { status: 405 });
}
