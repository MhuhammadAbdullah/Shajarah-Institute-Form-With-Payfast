import { Prisma, type Registration, type Participant } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/config/env";
import { computeValidationHash, isValidationHashValid } from "@/lib/payfast/hash";
import { parseIpnAmount } from "@/lib/payfast/amount";
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
  | { outcome: "amount_mismatch" }
  | { outcome: "internal_error"; message: string };

const AMOUNT_TOLERANCE = 0.01;

/**
 * Builds the Google Sheet row for a registration and appends it, recording
 * the outcome on the registration itself (`sheetSyncedAt` / `sheetSyncError`)
 * so a failure is visible and retryable from the admin panel instead of
 * silently disappearing into server logs.
 */
async function syncRegistrationToSheet(
  registration: Registration & { participants: Participant[] },
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
      customFieldValues: (registration.customFieldValues as Record<string, unknown>) ?? {},
      registrationType: registration.registrationType,
      participants: registration.participants.map((p) => ({ fullName: p.fullName, cnic: p.cnic })),
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
  const logPrefix = `[PayFast IPN] basketId=${payload.basketId || "?"}`;

  // Tracks the outcome to report if something throws *after* the DB write
  // already committed (email, Sheets, or anything unexpected) - PayFast must
  // still get a success response in that case, since the registration is
  // genuinely PAID/FAILED in the database and a retry would just repeat the
  // same work for nothing.
  let committedOutcome: IpnResult | null = null;

  try {
    const env = getEnv();

    if (!payload.basketId) {
      console.error(`${logPrefix} rejected: missing basket_id in IPN payload`);
      return { outcome: "registration_not_found" };
    }

    console.log(`${logPrefix} registration lookup: querying by basketId`);
    const registration = await prisma.registration.findUnique({
      where: { basketId: payload.basketId },
      include: { participants: { orderBy: { order: "asc" } } },
    });

    if (!registration) {
      console.error(`${logPrefix} rejected: no registration found for this basket_id`);
      return { outcome: "registration_not_found" };
    }
    console.log(`${logPrefix} registration lookup: found registrationId=${registration.id} currentStatus=${registration.paymentStatus}`);

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
          amount: parseIpnAmount(payload.amount, "0", logPrefix),
          merchantAmount: payload.merchantAmount ? parseIpnAmount(payload.merchantAmount, "0", logPrefix) : null,
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
      const receivedAmount = Number((payload.amount || payload.merchantAmount || "0").replace(/,/g, ""));
      const amountMatches = Number.isFinite(receivedAmount) && Math.abs(expectedAmount - receivedAmount) <= AMOUNT_TOLERANCE;

      console.log(
        `${logPrefix} payment verification: expectedAmount=${expectedAmount} receivedAmount=${receivedAmount} matches=${amountMatches}`,
      );

      if (!amountMatches) {
        await prisma.payment.create({
          data: {
            registrationId: registration.id,
            basketId: payload.basketId,
            transactionId: payload.transactionId || null,
            amount: parseIpnAmount(payload.amount, "0", logPrefix),
            merchantAmount: payload.merchantAmount ? parseIpnAmount(payload.merchantAmount, "0", logPrefix) : null,
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

      console.log(`${logPrefix} database update: starting transaction (registration -> PAID, payment row -> SUCCESS)`);
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
            amount: parseIpnAmount(payload.amount, String(expectedAmount), logPrefix),
            merchantAmount: payload.merchantAmount ? parseIpnAmount(payload.merchantAmount, "0", logPrefix) : null,
            errCode: payload.errCode || null,
            errMessage: payload.errMsg || null,
            validationHash: payload.validationHash || null,
            paymentName: payload.paymentName || null,
            gatewayResponse: payload as unknown as Prisma.InputJsonValue,
            status: "SUCCESS",
          },
        }),
      ]);
      // Once this line is reached, the transaction has committed - Prisma
      // does not roll back a $transaction after it resolves, so nothing
      // past this point can undo the PAID status. This is recorded purely
      // so *this function* still reports the right outcome to the caller
      // even if something below unexpectedly throws.
      committedOutcome = { outcome: "success" };
      console.log(`${logPrefix} database update: committed - registration marked PAID, payment row recorded`);

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
      console.log(`${logPrefix} Google Sheets update: starting (non-blocking)`);
      syncRegistrationToSheet(registration, payload.paymentName || null, payload.transactionId || null, expectedAmount, paymentDate).catch(
        (error) => {
          console.error(`${logPrefix} unexpected error during sheet sync`, error);
        },
      );

      return { outcome: "success" };
    }

    console.log(`${logPrefix} database update: starting transaction (registration -> FAILED)`);
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
          amount: parseIpnAmount(payload.amount, "0", logPrefix),
          merchantAmount: payload.merchantAmount ? parseIpnAmount(payload.merchantAmount, "0", logPrefix) : null,
          errCode: payload.errCode || null,
          errMessage: payload.errMsg || "Payment failed",
          validationHash: payload.validationHash || null,
          paymentName: payload.paymentName || null,
          gatewayResponse: payload as unknown as Prisma.InputJsonValue,
          status: "FAILED",
        },
      }),
    ]);
    committedOutcome = { outcome: "recorded_failure" };

    console.log(`${logPrefix} database update: committed - registration marked FAILED (errCode=${payload.errCode})`);

    return committedOutcome;
  } catch (error) {
    const stack = error instanceof Error ? (error.stack ?? error.message) : String(error);
    console.error(`${logPrefix} UNCAUGHT EXCEPTION (committedOutcome=${JSON.stringify(committedOutcome)}):\n${stack}`, error);

    // The DB write already committed - the registration genuinely is PAID
    // (or FAILED, per the branch taken), so tell PayFast we're done. Only a
    // failure *before* that point should make PayFast retry.
    if (committedOutcome) {
      return committedOutcome;
    }
    return { outcome: "internal_error", message: error instanceof Error ? error.message : String(error) };
  }
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
  const registration = await prisma.registration.findUnique({
    where: { id: input.registrationId },
    include: { participants: { orderBy: { order: "asc" } } },
  });

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
 * the sheet row. Replays the original successful Payment row's data
 * (amount/date/method) rather than "now", so a retry doesn't drift the
 * recorded payment date away from when the payment actually happened; the
 * sheet-side row itself is upserted by registration ID, so re-running this
 * updates the existing row instead of adding a duplicate.
 */
export async function retrySheetSync(registrationId: string): Promise<RetrySheetSyncResult> {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { participants: { orderBy: { order: "asc" } } },
  });

  if (!registration) {
    return { outcome: "registration_not_found" };
  }

  if (registration.paymentStatus !== "PAID") {
    return { outcome: "not_paid" };
  }

  const successfulPayment = await prisma.payment.findFirst({
    where: { registrationId: registration.id, status: "SUCCESS" },
    orderBy: { createdAt: "desc" },
  });

  await syncRegistrationToSheet(
    registration,
    registration.paymentMethod,
    registration.transactionId,
    successfulPayment ? Number(successfulPayment.amount) : Number(registration.fee),
    successfulPayment?.createdAt ?? registration.updatedAt,
  );

  return { outcome: "success" };
}

export type ManualMarkRefundedResult =
  | { outcome: "success" }
  | { outcome: "not_paid" }
  | { outcome: "registration_not_found" };

export interface ManualMarkRefundedInput {
  registrationId: string;
  note: string;
  adminId: string;
  adminEmail: string;
}

/**
 * Records a refund against a previously PAID registration. Only reachable
 * from a paid state, tied to the acting admin and a required note (same
 * audit pattern as `manuallyMarkRegistrationPaid`). Deliberately does not
 * touch the Google Sheets row or send an email - a refund is a business
 * event the admin records here, not something PayFast notifies us of via
 * this integration.
 */
export async function manuallyMarkRegistrationRefunded(
  input: ManualMarkRefundedInput,
): Promise<ManualMarkRefundedResult> {
  const registration = await prisma.registration.findUnique({ where: { id: input.registrationId } });

  if (!registration) {
    return { outcome: "registration_not_found" };
  }

  if (registration.paymentStatus !== "PAID") {
    return { outcome: "not_paid" };
  }

  await prisma.$transaction([
    prisma.registration.update({
      where: { id: registration.id },
      data: { paymentStatus: "REFUNDED" },
    }),
    prisma.payment.create({
      data: {
        registrationId: registration.id,
        basketId: registration.basketId,
        transactionId: registration.transactionId,
        amount: new Prisma.Decimal(registration.fee),
        errCode: "000",
        errMessage: `Marked REFUNDED by ${input.adminEmail}: ${input.note}`,
        paymentName: "Manual Refund",
        gatewayResponse: {
          manual: true,
          adminId: input.adminId,
          adminEmail: input.adminEmail,
          note: input.note,
        } as unknown as Prisma.InputJsonValue,
        status: "REFUNDED",
      },
    }),
  ]);

  return { outcome: "success" };
}
