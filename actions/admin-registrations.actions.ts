"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { manuallyMarkRegistrationPaid, manuallyMarkRegistrationRefunded, retrySheetSync } from "@/services/payment.service";

export interface MarkPaidState {
  error?: string;
  success?: boolean;
}

export async function markRegistrationPaidAction(
  _prevState: MarkPaidState,
  formData: FormData,
): Promise<MarkPaidState> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return { error: "Your session has expired. Please sign in again." };
  }

  const registrationId = String(formData.get("registrationId") ?? "");
  const transactionId = String(formData.get("transactionId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!registrationId || !transactionId || !note) {
    return { error: "Transaction ID and a note explaining the override are both required." };
  }

  const result = await manuallyMarkRegistrationPaid({
    registrationId,
    transactionId,
    note,
    adminId: admin.adminId,
    adminEmail: admin.email,
  });

  if (result.outcome === "registration_not_found") {
    return { error: "Registration not found." };
  }
  if (result.outcome === "already_paid") {
    return { error: "This registration is already marked as paid." };
  }

  revalidatePath(`/admin/registrations/${registrationId}`);
  revalidatePath("/admin/registrations");
  revalidatePath("/admin/dashboard");

  return { success: true };
}

export interface RetrySheetSyncState {
  error?: string;
  success?: boolean;
}

export async function retrySheetSyncAction(
  _prevState: RetrySheetSyncState,
  formData: FormData,
): Promise<RetrySheetSyncState> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return { error: "Your session has expired. Please sign in again." };
  }

  const registrationId = String(formData.get("registrationId") ?? "");
  if (!registrationId) {
    return { error: "Missing registration ID." };
  }

  const result = await retrySheetSync(registrationId);

  if (result.outcome === "registration_not_found") {
    return { error: "Registration not found." };
  }
  if (result.outcome === "not_paid") {
    return { error: "This registration isn't marked as paid yet - nothing to sync." };
  }

  revalidatePath(`/admin/registrations/${registrationId}`);

  return { success: true };
}

export interface MarkRefundedState {
  error?: string;
  success?: boolean;
}

export async function markRegistrationRefundedAction(
  _prevState: MarkRefundedState,
  formData: FormData,
): Promise<MarkRefundedState> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return { error: "Your session has expired. Please sign in again." };
  }

  const registrationId = String(formData.get("registrationId") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!registrationId || !note) {
    return { error: "A note explaining the refund is required." };
  }

  const result = await manuallyMarkRegistrationRefunded({
    registrationId,
    note,
    adminId: admin.adminId,
    adminEmail: admin.email,
  });

  if (result.outcome === "registration_not_found") {
    return { error: "Registration not found." };
  }
  if (result.outcome === "not_paid") {
    return { error: "Only a paid registration can be marked as refunded." };
  }

  revalidatePath(`/admin/registrations/${registrationId}`);
  revalidatePath("/admin/registrations");
  revalidatePath("/admin/dashboard");

  return { success: true };
}
