import type { NormalizedIpnPayload } from "@/types/payfast";

function pick(record: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== "") return value;
  }
  return "";
}

/**
 * PayFast's IPN callback field casing isn't fully consistent across
 * environments, so keys are looked up case-insensitively before falling
 * back to the documented lower/upper snake case variants.
 */
export function normalizeIpnPayload(raw: Record<string, string>): NormalizedIpnPayload {
  const lowerKeyed: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    lowerKeyed[key.toLowerCase()] = value;
  }

  return {
    errCode: pick(lowerKeyed, "err_code"),
    errMsg: pick(lowerKeyed, "err_msg"),
    basketId: pick(lowerKeyed, "basket_id"),
    transactionId: pick(lowerKeyed, "transaction_id"),
    amount: pick(lowerKeyed, "transaction_amount", "amount"),
    merchantAmount: pick(lowerKeyed, "merchant_amount"),
    paymentName: pick(lowerKeyed, "payment_name"),
    validationHash: pick(lowerKeyed, "validation_hash"),
  };
}

export async function parseIpnRequestBody(request: Request): Promise<Record<string, string>> {
  const contentType = request.headers.get("content-type") ?? "";
  const result: Record<string, string> = {};

  if (contentType.includes("application/json")) {
    const json = (await request.json()) as Record<string, unknown>;
    for (const [key, value] of Object.entries(json)) {
      result[key] = String(value);
    }
    return result;
  }

  const formData = await request.formData();
  for (const [key, value] of formData.entries()) {
    result[key] = String(value);
  }
  return result;
}
