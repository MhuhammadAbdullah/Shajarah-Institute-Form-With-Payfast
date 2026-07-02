export const PAYFAST_ERR_CODE_SUCCESS = "000";

export const PAYFAST_TOKEN_ENDPOINT = {
  sandbox: "https://ipguat.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken",
  production: "https://ipg2.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken",
} as const;

export const PAYFAST_CHECKOUT_ENDPOINT = {
  sandbox: "https://ipguat.apps.net.pk/Ecommerce/api/Transaction/PostTransaction",
  production: "https://ipg2.apps.net.pk/Ecommerce/api/Transaction/PostTransaction",
} as const;

export const PAYFAST_CURRENCY_CODE = "PKR";

export const PAYFAST_PROC_CODE = "00";

export const PAYFAST_VERSION = "MERCHANT-CART-0.1";

export const PAYFAST_TXN_DESC = "Shajarah Institute Registration Fee";
