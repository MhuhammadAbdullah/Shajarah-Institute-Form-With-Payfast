import { Prisma, type Registration } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/config/env";
import { computeValidationHash, isValidationHashValid } from "@/lib/payfast/hash";
import { PAYFAST_ERR_CODE_SUCCESS } from "@/constants/payfast";
import type { NormalizedIpnPayload } from "@/types/payfast";
import { sendPaymentConfirmationEmail } from "@/services/email.service";
import { appendPaidRegistrationRow } from "@/services/sheets.service";

export type IpnResult =
  | { outcome: "success" }
  | { outcome: "duplicate" }
  | { outcome: "recorded_failure" }
  | { outcome: "invalid_hash" }
  | { outcome: "registration_not_found" }
  | { outcome: "amount_mismatch" };

const AMOUNT_TOLERANCE = 0.01;

/**
 * Builds the Google Sheet row for a registration and appends it, recording
 * the outcome on the registration itself (`sheetSyncedAt` / `sheetSyncError`)
 * so a failure is visible and retryable from the admin panel instead of
 * silently disappearing into server logs.
 */
async function syncRegistrationToSheet(
  registration: Registration,
  paymentMethod: string | null,
  transactionId: string | null,
  amountPaid: number,
  paymentDate: Date,
): Promise<void> {
  try {
    await appendPaidRegistrationRow({
      registrationId: registration.id,
      registrationDate: registration.createdAt,
      formSubmissionTime: registration.createdAt,
      basketId: registration.basketId,
      studentName: registration.studentName,
      fatherName: registration.fatherName,
      email: registration.email,
      phone: registration.phone,
      cnic: registration.cnic,
      gender: registration.gender,
      dateOfBirth: registration.dateOfBirth,
      program: registration.program,
      batch: registration.batch,
      campus: registration.campus,
      session: registration.session,
      fee: Number(registration.fee),
      paymentStatus: "PAID",
      country: registration.country,
      province: registration.province,
      city: registration.city,
      postalCode: registration.postalCode,
      address: registration.address,
      paymentMethod,
      transactionId,
      amountPaid,
      paymentDate,
    });

    console.log(`[Sheets] Sync succeeded basketId=${registration.basketId}`);
    await prisma.registration.update({
      where: { id: registration.id },
      data: { sheetSyncedAt: new Date(), sheetSyncError: null },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Sheets] Sync failed basketId=${registration.basketId}: ${message}`, error);
    await prisma.registration
      .update({ where: { id: registration.id }, data: { sheetSyncError: message } })
      .catch((updateError) => {
        console.error(`[Sheets] Failed to record sync error for basketId=${registration.basketId}`, updateError);
      });
  }
}

export async function processPayFastIpn(payload: NormalizedIpnPayload): Promise<IpnResult> {
  const env = getEnv();
  const logPrefix = `[PayFast IPN] basketId=${payload.basketId || "?"}`;

  if (!payload.basketId) {
    console.error(`${logPrefix} rejected: missing basket_id in IPN payload`);
    return { outcome: "registration_not_found" };
  }

  const registration = await prisma.registration.findUnique({
    where: { basketId: payload.basketId },
  });

  if (!registration) {
    console.error(`${logPrefix} rejected: no registration found for this basket_id`);
    return { outcome: "registration_not_found" };
  }

  const hashValid = isValidationHashValid({
    basketId: payload.basketId,
    secureKey: env.PAYFAST_SECURED_KEY,
    merchantId: env.PAYFAST_MERCHANT_ID,
    errCode: payload.errCode,
    receivedHash: payload.validationHash,
  });

  console.log(`${logPrefix} signature verification: ${hashValid ? "valid" : "INVALID"}`);

  if (!hashValid) {
    const expectedHash = computeValidationHash({
      basketId: payload.basketId,
      secureKey: env.PAYFAST_SECURED_KEY,
      merchantId: env.PAYFAST_MERCHANT_ID,
      errCode: payload.errCode,
    });
    console.error(
      `${logPrefix} validation hash mismatch errCode=${payload.errCode} expectedHash=${expectedHash} receivedHash=${payload.validationHash}`,
    );
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
    console.log(`${logPrefix} duplicate IPN ignored (already marked PAID)`);
    return { outcome: "duplicate" };
  }

  const isSuccessCode = payload.errCode === PAYFAST_ERR_CODE_SUCCESS;

  if (isSuccessCode) {
    const expectedAmount = Number(registration.fee);
    const receivedAmount = Number(payload.amount || payload.merchantAmount || "0");
    const amountMatches = Math.abs(expectedAmount - receivedAmount) <= AMOUNT_TOLERANCE;

    console.log(
      `${logPrefix} payment verification: expectedAmount=${expectedAmount} receivedAmount=${receivedAmount} matches=${amountMatches}`,
    );

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

    const paymentDate = new Date();

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

    console.log(`${logPrefix} database update: registration marked PAID, payment row recorded`);

    sendPaymentConfirmationEmail({
      to: registration.email,
      studentName: registration.studentName,
      program: registration.program,
      basketId: registration.basketId,
      transactionId: payload.transactionId || "N/A",
      amount: expectedAmount,
      paymentDate,
    }).catch((error) => {
      console.error(`${logPrefix} failed to send confirmation email`, error);
    });

    // A Sheets outage must never block or reverse the payment confirmation
    // above - failures are recorded on the registration for admin retry.
    syncRegistrationToSheet(registration, payload.paymentName || null, payload.transactionId || null, expectedAmount, paymentDate).catch(
      (error) => {
        console.error(`${logPrefix} unexpected error during sheet sync`, error);
      },
    );

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

  console.log(`${logPrefix} database update: registration marked FAILED (errCode=${payload.errCode})`);

  return { outcome: "recorded_failure" };
}

export type ManualMarkPaidResult =
  | { outcome: "success" }
  | { outcome: "already_paid" }
  | { outcome: "registration_not_found" };

export interface ManualMarkPaidInput {
  registrationId: string;
  transactionId: string;
  note: string;
  adminId: string;
  adminEmail: string;
}

/**
 * Deliberate exception to the "only a verified PayFast IPN marks PAID" rule
 * above — for reconciling payments PayFast's gateway confirmed (e.g. on the
 * customer's success redirect) but never sent a server-to-server IPN for.
 * Every use is tied to the acting admin and a required note, recorded on the
 * Payment row, so it stays auditable and distinct from automated IPN rows.
 */
export async function manuallyMarkRegistrationPaid(input: ManualMarkPaidInput): Promise<ManualMarkPaidResult> {
  const registration = await prisma.registration.findUnique({ where: { id: input.registrationId } });

  if (!registration) {
    return { outcome: "registration_not_found" };
  }

  if (registration.paymentStatus === "PAID") {
    return { outcome: "already_paid" };
  }

  const amount = Number(registration.fee);
  const paymentDate = new Date();

  await prisma.$transaction([
    prisma.registration.update({
      where: { id: registration.id },
      data: {
        paymentStatus: "PAID",
        transactionId: input.transactionId,
        paymentMethod: "Manual (Admin Override)",
      },
    }),
    prisma.payment.create({
      data: {
        registrationId: registration.id,
        basketId: registration.basketId,
        transactionId: input.transactionId,
        amount: new Prisma.Decimal(amount),
        errCode: "000",
        errMessage: `Manually marked PAID by ${input.adminEmail}: ${input.note}`,
        paymentName: "Manual Override",
        gatewayResponse: {
          manual: true,
          adminId: input.adminId,
          adminEmail: input.adminEmail,
          note: input.note,
        } as unknown as Prisma.InputJsonValue,
        status: "SUCCESS",
      },
    }),
  ]);

  sendPaymentConfirmationEmail({
    to: registration.email,
    studentName: registration.studentName,
    program: registration.program,
    basketId: registration.basketId,
    transactionId: input.transactionId,
    amount,
    paymentDate,
  }).catch((error) => {
    console.error("Failed to send confirmation email", error);
  });

  syncRegistrationToSheet(registration, "Manual (Admin Override)", input.transactionId, amount, paymentDate).catch((error) => {
    console.error("Unexpected error during sheet sync", error);
  });

  return { outcome: "success" };
}

export type RetrySheetSyncResult =
  | { outcome: "success" }
  | { outcome: "not_paid" }
  | { outcome: "registration_not_found" };

/**
 * Re-runs the Google Sheets append for a registration whose automated sync
 * failed after payment was confirmed (see `sheetSyncError` on the
 * Registration model). Never touches payment/registration status - only
 * the sheet row.
 */
export async function retrySheetSync(registrationId: string): Promise<RetrySheetSyncResult> {
  const registration = await prisma.registration.findUnique({ where: { id: registrationId } });

  if (!registration) {
    return { outcome: "registration_not_found" };
  }

  if (registration.paymentStatus !== "PAID") {
    return { outcome: "not_paid" };
  }

  await syncRegistrationToSheet(
    registration,
    registration.paymentMethod,
    registration.transactionId,
    Number(registration.fee),
    new Date(),
  );

  return { outcome: "success" };
}
