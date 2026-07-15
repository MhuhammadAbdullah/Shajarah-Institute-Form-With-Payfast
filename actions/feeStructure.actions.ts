"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import {
  createFeeStructure,
  updateFeeStructure,
  toggleFeeStructureActive,
  deleteFeeStructure,
  bulkSetFeeStructuresActive,
  createDiscountRule,
  updateDiscountRule,
  deleteDiscountRule,
  toggleDiscountRuleActive,
} from "@/services/feeStructure.service";
import { bulkDeleteWithFkGuard, type BulkDeleteResult } from "@/lib/admin/bulkDelete";

export interface FeeStructureFormState {
  error?: string;
  success?: boolean;
}

function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  const str = String(value ?? "").trim();
  if (!str) return null;
  const num = Number(str);
  return Number.isFinite(num) ? num : null;
}

export async function saveFeeStructureAction(
  _prev: FeeStructureFormState,
  formData: FormData,
): Promise<FeeStructureFormState> {
  const admin = await getCurrentAdmin();
  if (!admin) return { error: "Your session has expired. Please sign in again." };

  const id = String(formData.get("id") ?? "");
  const programId = String(formData.get("programId") ?? "");
  const campusId = String(formData.get("campusId") ?? "");
  const sessionId = String(formData.get("sessionId") ?? "");
  const currency = String(formData.get("currency") ?? "PKR").trim() || "PKR";
  const fee = Number(formData.get("fee"));

  if (!programId || !campusId || !sessionId) {
    return { error: "Program, campus, and session are all required." };
  }
  if (!Number.isFinite(fee) || fee < 0) {
    return { error: "Enter a valid fee amount." };
  }

  const input = {
    programId,
    campusId,
    sessionId,
    currency,
    fee,
    registrationFee: parseOptionalNumber(formData.get("registrationFee")),
    discountAmount: parseOptionalNumber(formData.get("discountAmount")),
    discountPercent: parseOptionalNumber(formData.get("discountPercent")),
  };

  try {
    if (id) {
      await updateFeeStructure(id, input);
    } else {
      await createFeeStructure(input);
    }
  } catch {
    return { error: "A fee structure for this exact Program + Campus + Session combination already exists." };
  }

  revalidatePath("/admin/fee-structures");
  return { success: true };
}

export async function toggleFeeStructureAction(formData: FormData): Promise<void> {
  const admin = await getCurrentAdmin();
  if (!admin) return;
  await toggleFeeStructureActive(String(formData.get("id")));
  revalidatePath("/admin/fee-structures");
}

export async function deleteFeeStructureAction(_prev: FeeStructureFormState, formData: FormData): Promise<FeeStructureFormState> {
  const admin = await getCurrentAdmin();
  if (!admin) return { error: "Your session has expired. Please sign in again." };

  await deleteFeeStructure(String(formData.get("id")));

  revalidatePath("/admin/fee-structures");
  return { success: true };
}

export async function bulkSetFeeStructuresActiveAction(ids: string[], isActive: boolean): Promise<void> {
  const admin = await getCurrentAdmin();
  if (!admin) return;
  await bulkSetFeeStructuresActive(ids, isActive);
  revalidatePath("/admin/fee-structures");
}

export async function bulkDeleteFeeStructuresAction(ids: string[]): Promise<BulkDeleteResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { deletedCount: 0, failedCount: ids.length };
  const result = await bulkDeleteWithFkGuard(ids, deleteFeeStructure);
  revalidatePath("/admin/fee-structures");
  return result;
}

// ── Discount rules ──────────────────────────────────────────────────────

export interface DiscountRuleFormState {
  error?: string;
  success?: boolean;
}

export async function saveDiscountRuleAction(
  _prev: DiscountRuleFormState,
  formData: FormData,
): Promise<DiscountRuleFormState> {
  const admin = await getCurrentAdmin();
  if (!admin) return { error: "Your session has expired. Please sign in again." };

  const id = String(formData.get("id") ?? "");
  const feeStructureId = String(formData.get("feeStructureId") ?? "");
  const minQuantity = Number(formData.get("minQuantity"));
  const discountType = String(formData.get("discountType") ?? "PERCENT") as "PERCENT" | "FIXED";
  const value = Number(formData.get("value"));

  if (!feeStructureId || !Number.isInteger(minQuantity) || minQuantity < 1) {
    return { error: "Enter a valid minimum quantity (whole number, at least 1)." };
  }
  if (!Number.isFinite(value) || value < 0) {
    return { error: "Enter a valid discount value." };
  }

  try {
    if (id) {
      await updateDiscountRule(id, { minQuantity, discountType, value });
    } else {
      await createDiscountRule({ feeStructureId, minQuantity, discountType, value });
    }
  } catch {
    return { error: "A discount tier for that quantity already exists on this Fee Structure." };
  }

  revalidatePath("/admin/fee-structures");
  return { success: true };
}

export async function deleteDiscountRuleAction(
  _prev: DiscountRuleFormState,
  formData: FormData,
): Promise<DiscountRuleFormState> {
  const admin = await getCurrentAdmin();
  if (!admin) return { error: "Your session has expired. Please sign in again." };

  await deleteDiscountRule(String(formData.get("id")));

  revalidatePath("/admin/fee-structures");
  return { success: true };
}

export async function toggleDiscountRuleAction(formData: FormData): Promise<void> {
  const admin = await getCurrentAdmin();
  if (!admin) return;
  await toggleDiscountRuleActive(String(formData.get("id")));
  revalidatePath("/admin/fee-structures");
}
