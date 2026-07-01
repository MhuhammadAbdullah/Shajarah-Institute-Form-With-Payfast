import type { Gender, PaymentStatus } from "@prisma/client";

export interface RegistrationInput {
  studentName: string;
  fatherName?: string;
  email: string;
  phone: string;
  cnic?: string;
  gender: Gender;
  dateOfBirth?: string;
  program: string;
  batch: string;
  campus: string;
  session: string;
  fee: number;
  country: string;
  city: string;
  address: string;
  agreementAccepted: boolean;
}

export interface RegistrationSummary {
  id: string;
  basketId: string;
  studentName: string;
  email: string;
  phone: string;
  program: string;
  batch: string;
  campus: string;
  session: string;
  fee: string;
  paymentStatus: PaymentStatus;
  transactionId: string | null;
  createdAt: string;
}

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
