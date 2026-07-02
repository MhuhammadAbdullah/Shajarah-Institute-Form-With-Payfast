import { NextResponse } from "next/server";
import { normalizeIpnPayload, parseIpnRequestBody } from "@/lib/payfast/ipn";
import { processPayFastIpn } from "@/services/payment.service";

/**
 * PayFast IPN callback. Must always be reachable without auth/CSRF (the
 * gateway calls this server-to-server) and must respond quickly with a
 * plain 200 so PayFast does not retry a request we already handled.
 */
export async function POST(request: Request) {
  let rawFields: Record<string, string>;
  try {
    rawFields = await parseIpnRequestBody(request);
  } catch {
    return new NextResponse("Invalid IPN payload", { status: 400 });
  }

  const payload = normalizeIpnPayload(rawFields);

  console.log(
    `[PayFast IPN] Received basketId=${payload.basketId || "?"} errCode=${payload.errCode || "?"} paymentName=${payload.paymentName || "?"} transactionId=${payload.transactionId || "?"}`,
  );

  if (!payload.basketId || !payload.validationHash) {
    return new NextResponse("Missing required IPN fields", { status: 400 });
  }

  try {
    const result = await processPayFastIpn(payload);
    console.log(`[PayFast IPN] Processed basketId=${payload.basketId} outcome=${result.outcome}`);

    switch (result.outcome) {
      case "success":
      case "duplicate":
      case "recorded_failure":
        return new NextResponse("OK", { status: 200 });
      case "registration_not_found":
        return new NextResponse("Registration not found", { status: 404 });
      case "invalid_hash":
        return new NextResponse("Invalid validation hash", { status: 400 });
      case "amount_mismatch":
        return new NextResponse("Amount mismatch", { status: 400 });
      default:
        return new NextResponse("OK", { status: 200 });
    }
  } catch (error) {
    console.error("Failed to process PayFast IPN", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export function GET() {
  return new NextResponse("Method not allowed", { status: 405 });
}
