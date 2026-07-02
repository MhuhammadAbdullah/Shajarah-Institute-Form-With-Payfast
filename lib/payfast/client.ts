import { getEnv } from "@/config/env";
import {
  PAYFAST_CHECKOUT_ENDPOINT,
  PAYFAST_CURRENCY_CODE,
  PAYFAST_PROC_CODE,
  PAYFAST_TOKEN_ENDPOINT,
  PAYFAST_TXN_DESC,
  PAYFAST_VERSION,
} from "@/constants/payfast";
import type { PayFastAccessTokenResponse } from "@/types/payfast";
import type { CheckoutFields } from "@/types/registration";

export class PayFastError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PayFastError";
  }
}

function getTokenEndpoint(): string {
  const env = getEnv();
  return PAYFAST_TOKEN_ENDPOINT[env.PAYFAST_ENV];
}

function getCheckoutEndpoint(): string {
  const env = getEnv();
  return PAYFAST_CHECKOUT_ENDPOINT[env.PAYFAST_ENV];
}

/**
 * Requests a one-time access token from PayFast for the given basket/amount,
 * required before redirecting the customer to the hosted checkout page.
 */
export async function getAccessToken(params: { basketId: string; amount: number }): Promise<string> {
  const env = getEnv();
  const endpoint = getTokenEndpoint();

  const body = new URLSearchParams({
    MERCHANT_ID: env.PAYFAST_MERCHANT_ID,
    SECURED_KEY: env.PAYFAST_SECURED_KEY,
    TXNAMT: params.amount.toFixed(2),
    BASKET_ID: params.basketId,
    CURRENCY_CODE: PAYFAST_CURRENCY_CODE,
    PROCCODE: PAYFAST_PROC_CODE,
    VERSION: PAYFAST_VERSION,
    TXNDESC: PAYFAST_TXN_DESC,
  });

  console.log(
    `[PayFast] Requesting access token env=${env.PAYFAST_ENV} endpoint=${endpoint} basketId=${params.basketId} amount=${params.amount} proccode=${PAYFAST_PROC_CODE} merchantId=${env.PAYFAST_MERCHANT_ID}`,
  );

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    const rawBody = await response.text();
    console.error(
      `[PayFast] Token request failed basketId=${params.basketId} status=${response.status} body=${rawBody}`,
    );
    throw new PayFastError(`PayFast token request failed with status ${response.status}`);
  }

  const data = (await response.json()) as PayFastAccessTokenResponse;
  const token = data.ACCESS_TOKEN ?? data.access_token;

  if (!token) {
    console.error(
      `[PayFast] No access token in response basketId=${params.basketId} errCode=${data.errCode ?? "?"} errMsg=${data.errMsg ?? "?"} raw=${JSON.stringify(data)}`,
    );
    throw new PayFastError(
      `PayFast did not return an access token: ${data.errMsg ?? JSON.stringify(data)}`,
    );
  }

  return token;
}

/**
 * Builds the hidden form fields required to auto-submit the customer to the
 * PayFast hosted checkout page.
 */
export function buildCheckoutFields(params: {
  token: string;
  basketId: string;
  amount: number;
  customerMobile: string;
  customerEmail: string;
}): CheckoutFields {
  const env = getEnv();

  return {
    MERCHANT_ID: env.PAYFAST_MERCHANT_ID,
    MERCHANT_NAME: env.PAYFAST_MERCHANT_NAME,
    TOKEN: params.token,
    PROCCODE: PAYFAST_PROC_CODE,
    TXNAMT: params.amount.toFixed(2),
    CUSTOMER_MOBILE_NO: params.customerMobile,
    CUSTOMER_EMAIL_ADDRESS: params.customerEmail,
    SIGNATURE: params.token,
    VERSION: PAYFAST_VERSION,
    TXNDESC: PAYFAST_TXN_DESC,
    SUCCESS_URL: env.PAYFAST_RETURN_URL,
    FAILURE_URL: env.PAYFAST_CANCEL_URL,
    BASKET_ID: params.basketId,
    ORDER_DATE: new Date().toISOString(),
    CHECKOUT_URL: getCheckoutEndpoint(),
    CURRENCY_CODE: PAYFAST_CURRENCY_CODE,
  };
}

export function getCheckoutPostUrl(): string {
  return getCheckoutEndpoint();
}
