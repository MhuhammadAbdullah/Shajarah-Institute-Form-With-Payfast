"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type PromotionDiscountType } from "@prisma/client";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import {
  createPromotion,
  updatePromotion,
  duplicatePromotion,
  togglePromotionActive,
  deletePromotion,
  bulkSetPromotionsActive,
  recordPromotionAudit,
  type PromotionInput,
} from "@/services/promotion.service";
import { bulkDeleteWithFkGuard, type BulkDeleteResult } from "@/lib/admin/bulkDelete";

export interface PromotionFormState {
  error?: string;
  success?: boolean;
}

function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  const str = String(value ?? "").trim();
  if (!str) return null;
  const num = Number(str);
  return Number.isFinite(num) ? num : null;
}

function parseOptionalDate(value: FormDataEntryValue | null): Date | null {
  const str = String(value ?? "").trim();
  if (!str) return null;
  const date = new Date(str);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseCheckbox(value: FormDataEntryValue | null): boolean {
  return value === "on" || value === "true";
}

function parsePromotionFormData(formData: FormData): PromotionInput | { error: string } {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter a discount name." };

  const discountType = String(formData.get("discountType") ?? "PERCENT") as PromotionDiscountType;
  const requiresCode = parseCheckbox(formData.get("requiresCode"));
  const code = String(formData.get("code") ?? "").trim();

  if (requiresCode && !code) {
    return { error: "Enter a coupon code, or turn off \"Requires code\" for an automatic discount." };
  }

  if (discountType === "BOGO") {
    const buyQuantity = parseOptionalNumber(formData.get("buyQuantity"));
    const freeQuantity = parseOptionalNumber(formData.get("freeQuantity"));
    if (!buyQuantity || buyQuantity < 1 || !freeQuantity || freeQuantity < 1) {
      return { error: "Buy X Get Y Free requires a Buy Quantity and Free Quantity of at least 1." };
    }
  } else {
    const value = parseOptionalNumber(formData.get("value"));
    if (value == null || value < 0) {
      return { error: "Enter a valid discount value." };
    }
    if (discountType === "PERCENT" && value > 100) {
      return { error: "Percentage discount cannot exceed 100." };
    }
  }

  return {
    name,
    description: String(formData.get("description") ?? "").trim() || null,
    requiresCode,
    code: requiresCode ? code : null,
    publicTitle: String(formData.get("publicTitle") ?? "").trim() || null,
    subtitle: String(formData.get("subtitle") ?? "").trim() || null,
    bannerText: String(formData.get("bannerText") ?? "").trim() || null,
    discountType,
    value: parseOptionalNumber(formData.get("value")),
    maxDiscountAmount: parseOptionalNumber(formData.get("maxDiscountAmount")),
    buyQuantity: parseOptionalNumber(formData.get("buyQuantity")),
    freeQuantity: parseOptionalNumber(formData.get("freeQuantity")),
    startDate: parseOptionalDate(formData.get("startDate")),
    endDate: parseOptionalDate(formData.get("endDate")),
    priority: parseOptionalNumber(formData.get("priority")) ?? 0,
    isStackable: parseCheckbox(formData.get("isStackable")),
    allowBogoStacking: parseCheckbox(formData.get("allowBogoStacking")),
    usageLimit: parseOptionalNumber(formData.get("usageLimit")),
    usageLimitPerUser: parseOptionalNumber(formData.get("usageLimitPerUser")),
    minOrderAmount: parseOptionalNumber(formData.get("minOrderAmount")),
    minRegistrationCount: parseOptionalNumber(formData.get("minRegistrationCount")),
    showOnForm: parseCheckbox(formData.get("showOnForm")),
    isFeatured: parseCheckbox(formData.get("isFeatured")),
    bannerColor: String(formData.get("bannerColor") ?? "").trim() || null,
    bannerIcon: String(formData.get("bannerIcon") ?? "").trim() || null,
    displayOrder: parseOptionalNumber(formData.get("displayOrder")) ?? 0,
    programIds: formData.getAll("programIds").map(String),
    sessionIds: formData.getAll("sessionIds").map(String),
  };
}

export async function savePromotionAction(_prev: PromotionFormState, formData: FormData): Promise<PromotionFormState> {
  const admin = await getCurrentAdmin();
  if (!admin) return { error: "Your session has expired. Please sign in again." };

  const parsed = parsePromotionFormData(formData);
  if ("error" in parsed) return { error: parsed.error };

  const id = String(formData.get("id") ?? "");

  try {
    if (id) {
      await updatePromotion(id, parsed);
      await recordPromotionAudit(id, "UPDATED", admin);
    } else {
      const created = await createPromotion(parsed);
      await recordPromotionAudit(created.id, "CREATED", admin);
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "A promotion with that coupon code already exists." };
    }
    throw error;
  }

  revalidatePath("/admin/promotions");
  return { success: true };
}

export async function duplicatePromotionAction(formData: FormData): Promise<void> {
  const admin = await getCurrentAdmin();
  if (!admin) return;
  const id = String(formData.get("id"));
  const duplicate = await duplicatePromotion(id);
  await recordPromotionAudit(duplicate.id, "DUPLICATED", admin, { sourcePromotionId: id });
  revalidatePath("/admin/promotions");
}

export async function togglePromotionAction(formData: FormData): Promise<void> {
  const admin = await getCurrentAdmin();
  if (!admin) return;
  const id = String(formData.get("id"));
  const updated = await togglePromotionActive(id);
  await recordPromotionAudit(id, updated.isActive ? "ENABLED" : "DISABLED", admin);
  revalidatePath("/admin/promotions");
}

export async function deletePromotionAction(_prev: PromotionFormState, formData: FormData): Promise<PromotionFormState> {
  const admin = await getCurrentAdmin();
  if (!admin) return { error: "Your session has expired. Please sign in again." };

  const id = String(formData.get("id"));

  try {
    // No audit-log write on delete: PromotionAuditLog cascades with its
    // parent Promotion, so a row referencing an about-to-be-deleted
    // promotion can never survive the delete anyway.
    await deletePromotion(id);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return { error: "This promotion has been used by at least one registration and can't be deleted. Disable it instead." };
    }
    throw error;
  }

  revalidatePath("/admin/promotions");
  return { success: true };
}

export async function bulkSetPromotionsActiveAction(ids: string[], isActive: boolean): Promise<void> {
  const admin = await getCurrentAdmin();
  if (!admin) return;
  await bulkSetPromotionsActive(ids, isActive);
  await Promise.all(ids.map((id) => recordPromotionAudit(id, isActive ? "ENABLED" : "DISABLED", admin)));
  revalidatePath("/admin/promotions");
}

export async function bulkDeletePromotionsAction(ids: string[]): Promise<BulkDeleteResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { deletedCount: 0, failedCount: ids.length };
  const result = await bulkDeleteWithFkGuard(ids, deletePromotion);
  revalidatePath("/admin/promotions");
  return result;
}
