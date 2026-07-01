import { createHash } from "crypto";

/**
 * PayFast IPN validation hash: SHA-256 of "BasketID|SecureKey|MerchantID|err_code"
 * per the PayFast integration spec. Used both to verify inbound IPN callbacks
 * and (defensively) to recompute the expected value server-side.
 */
export function computeValidationHash(params: {
  basketId: string;
  secureKey: string;
  merchantId: string;
  errCode: string;
}): string {
  const raw = `${params.basketId}|${params.secureKey}|${params.merchantId}|${params.errCode}`;
  return createHash("sha256").update(raw).digest("hex");
}

export function isValidationHashValid(params: {
  basketId: string;
  secureKey: string;
  merchantId: string;
  errCode: string;
  receivedHash: string;
}): boolean {
  const expected = computeValidationHash(params);
  return timingSafeEqualStrings(expected, params.receivedHash.toLowerCase());
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
