export interface CheckoutFields {
  MERCHANT_ID: string;
  MERCHANT_NAME: string;
  TOKEN: string;
  PROCCODE: string;
  TXNAMT: string;
  CUSTOMER_MOBILE_NO: string;
  CUSTOMER_EMAIL_ADDRESS: string;
  SIGNATURE: string;
  VERSION: string;
  TXNDESC: string;
  SUCCESS_URL: string;
  FAILURE_URL: string;
  BASKET_ID: string;
  ORDER_DATE: string;
  CHECKOUT_URL: string;
  CURRENCY_CODE: string;
}

export interface RegisterResponse {
  success: true;
  registrationId: string;
  basketId: string;
  checkoutUrl: string;
  fields: CheckoutFields;
}
