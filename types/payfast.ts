export interface PayFastAccessTokenResponse {
  ACCESS_TOKEN?: string;
  access_token?: string;
  EXPIRES_IN?: string;
  errCode?: string;
  errMsg?: string;
  [key: string]: unknown;
}

export interface PayFastIpnPayload {
  err_code?: string;
  ERR_CODE?: string;
  err_msg?: string;
  ERR_MSG?: string;
  basket_id?: string;
  BASKET_ID?: string;
  transaction_id?: string;
  TRANSACTION_ID?: string;
  transaction_amount?: string;
  TRANSACTION_AMOUNT?: string;
  amount?: string;
  AMOUNT?: string;
  merchant_amount?: string;
  MERCHANT_AMOUNT?: string;
  payment_name?: string;
  PAYMENT_NAME?: string;
  validation_hash?: string;
  VALIDATION_HASH?: string;
  [key: string]: unknown;
}

export interface NormalizedIpnPayload {
  errCode: string;
  errMsg: string;
  basketId: string;
  transactionId: string;
  amount: string;
  merchantAmount: string;
  paymentName: string;
  validationHash: string;
}
