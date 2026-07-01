import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/config/env";
import { isValidationHashValid } from "@/lib/payfast/hash";
import { PAYFAST_ERR_CODE_SUCCESS } from "@/constants/payfast";
import type { NormalizedIpnPayload } from "@/types/payfast";
import { sendPaymentConfirmationEmail } from "@/services/email.service";

export type IpnResult =
  | { outcome: "success" }
  | { outcome: "duplicate" }
  | { outcome: "recorded_failure" }
  | { outcome: "invalid_hash" }
  | { outcome: "registration_not_found" }
  | { outcome: "amount_mismatch" };

const AMOUNT_TOLERANCE = 0.01;

export async function processPayFastIpn(payload: NormalizedIpnPayload): Promise<IpnResult> {
  const env = getEnv();

  if (!payload.basketId) {
    return { outcome: "registration_not_found" };
  }

  const registration = await prisma.registration.findUnique({
    where: { basketId: payload.basketId },
  });

  if (!registration) {
    return { outcome: "registration_not_found" };
  }

  const hashValid = isValidationHashValid({
    basketId: payload.basketId,
    secureKey: env.PAYFAST_SECURED_KEY,
    merchantId: env.PAYFAST_MERCHANT_ID,
    errCode: payload.errCode,
    receivedHash: payload.validationHash,
  });

  if (!hashValid) {
    await prisma.payment.create({
      data: {
        registrationId: registration.id,
        basketId: payload.basketId,
        transactionId: payload.transactionId || null,
        amount: new Prisma.Decimal(payload.amount || "0"),
        merchantAmount: payload.merchantAmount ? new Prisma.Decimal(payload.merchantAmount) : null,
        errCode: payload.errCode || null,
        errMessage: "Validation hash mismatch",
        validationHash: payload.validationHash || null,
        paymentName: payload.paymentName || null,
        gatewayResponse: payload as unknown as Prisma.InputJsonValue,
        status: "FAILED",
      },
    });
    return { outcome: "invalid_hash" };
  }

  const alreadyProcessed = await prisma.payment.findFirst({
    where: { basketId: payload.basketId, status: "SUCCESS" },
  });

  if (alreadyProcessed || registration.paymentStatus === "PAID") {
    return { outcome: "duplicate" };
  }

  const isSuccessCode = payload.errCode === PAYFAST_ERR_CODE_SUCCESS;

  if (isSuccessCode) {
    const expectedAmount = Number(registration.fee);
    const receivedAmount = Number(payload.amount || payload.merchantAmount || "0");
    const amountMatches = Math.abs(expectedAmount - receivedAmount) <= AMOUNT_TOLERANCE;

    if (!amountMatches) {
      await prisma.payment.create({
        data: {
          registrationId: registration.id,
          basketId: payload.basketId,
          transactionId: payload.transactionId || null,
          amount: new Prisma.Decimal(payload.amount || "0"),
          merchantAmount: payload.merchantAmount ? new Prisma.Decimal(payload.merchantAmount) : null,
          errCode: payload.errCode || null,
          errMessage: `Amount mismatch: expected ${expectedAmount}, received ${receivedAmount}`,
          validationHash: payload.validationHash || null,
          paymentName: payload.paymentName || null,
          gatewayResponse: payload as unknown as Prisma.InputJsonValue,
          status: "FAILED",
        },
      });
      return { outcome: "amount_mismatch" };
    }

    await prisma.$transaction([
      prisma.registration.update({
        where: { id: registration.id },
        data: {
          paymentStatus: "PAID",
          transactionId: payload.transactionId || null,
          paymentMethod: payload.paymentName || null,
        },
      }),
      prisma.payment.create({
        data: {
          registrationId: registration.id,
          basketId: payload.basketId,
          transactionId: payload.transactionId || null,
          amount: new Prisma.Decimal(payload.amount || expectedAmount),
          merchantAmount: payload.merchantAmount ? new Prisma.Decimal(payload.merchantAmount) : null,
          errCode: payload.errCode || null,
          errMessage: payload.errMsg || null,
          validationHash: payload.validationHash || null,
          paymentName: payload.paymentName || null,
          gatewayResponse: payload as unknown as Prisma.InputJsonValue,
          status: "SUCCESS",
        },
      }),
    ]);

    await sendPaymentConfirmationEmail({
      to: registration.email,
      studentName: registration.studentName,
      program: registration.program,
      basketId: registration.basketId,
      transactionId: payload.transactionId || "N/A",
      amount: expectedAmount,
      paymentDate: new Date(),
    }).catch((error) => {
      console.error("Failed to send confirmation email", error);
    });

    return { outcome: "success" };
  }

  await prisma.$transaction([
    prisma.registration.update({
      where: { id: registration.id },
      data: { paymentStatus: "FAILED" },
    }),
    prisma.payment.create({
      data: {
        registrationId: registration.id,
        basketId: payload.basketId,
        transactionId: payload.transactionId || null,
        amount: new Prisma.Decimal(payload.amount || "0"),
        merchantAmount: payload.merchantAmount ? new Prisma.Decimal(payload.merchantAmount) : null,
        errCode: payload.errCode || null,
        errMessage: payload.errMsg || "Payment failed",
        validationHash: payload.validationHash || null,
        paymentName: payload.paymentName || null,
        gatewayResponse: payload as unknown as Prisma.InputJsonValue,
        status: "FAILED",
      },
    }),
  ]);

  return { outcome: "recorded_failure" };
}
