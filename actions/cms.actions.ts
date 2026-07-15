"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import * as programService from "@/services/program.service";
import * as campusService from "@/services/campus.service";
import * as sessionService from "@/services/session.service";
import { setCampusesForProgram } from "@/services/programCampus.service";
import { setSessionsForProgram } from "@/services/programSession.service";
import { bulkDeleteWithFkGuard, type BulkDeleteResult } from "@/lib/admin/bulkDelete";

export interface CmsFormState {
  error?: string;
  success?: boolean;
}

function parseOptionalInt(value: FormDataEntryValue | null): number | undefined {
  const str = String(value ?? "").trim();
  if (!str) return undefined;
  const num = Number(str);
  return Number.isInteger(num) ? num : undefined;
}

function isForeignKeyRestriction(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003";
}

// ── Programs ────────────────────────────────────────────────────────────
export async function saveProgramAction(_prev: CmsFormState, formData: FormData): Promise<CmsFormState> {
  const admin = await getCurrentAdmin();
  if (!admin) return { error: "Your session has expired. Please sign in again." };

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const thumbnailUrl = String(formData.get("thumbnailUrl") ?? "").trim();

  if (!name) return { error: "Name is required." };

  const input = {
    name,
    description: description || null,
    thumbnailUrl: thumbnailUrl || null,
    displayOrder: parseOptionalInt(formData.get("displayOrder")),
  };
  const campusIds = formData.getAll("campusIds").map(String);
  const sessionIds = formData.getAll("sessionIds").map(String);

  try {
    const program = id ? await programService.updateProgram(id, input) : await programService.createProgram(input);
    await Promise.all([setCampusesForProgram(program.id, campusIds), setSessionsForProgram(program.id, sessionIds)]);
  } catch {
    return { error: "A program with that name already exists." };
  }

  revalidatePath("/admin/programs");
  return { success: true };
}

export async function toggleProgramAction(formData: FormData): Promise<void> {
  const admin = await getCurrentAdmin();
  if (!admin) return;
  await programService.toggleProgramActive(String(formData.get("id")));
  revalidatePath("/admin/programs");
}

export async function deleteProgramAction(_prev: CmsFormState, formData: FormData): Promise<CmsFormState> {
  const admin = await getCurrentAdmin();
  if (!admin) return { error: "Your session has expired. Please sign in again." };

  try {
    await programService.deleteProgram(String(formData.get("id")));
  } catch (error) {
    if (isForeignKeyRestriction(error)) {
      return { error: "Cannot delete this program while fee structures still reference it. Remove those fee structures first." };
    }
    throw error;
  }

  revalidatePath("/admin/programs");
  return { success: true };
}

export async function bulkSetProgramsActiveAction(ids: string[], isActive: boolean): Promise<void> {
  const admin = await getCurrentAdmin();
  if (!admin) return;
  await programService.bulkSetProgramsActive(ids, isActive);
  revalidatePath("/admin/programs");
}

export async function bulkDeleteProgramsAction(ids: string[]): Promise<BulkDeleteResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { deletedCount: 0, failedCount: ids.length };
  const result = await bulkDeleteWithFkGuard(ids, programService.deleteProgram);
  revalidatePath("/admin/programs");
  return result;
}

// ── Campuses ────────────────────────────────────────────────────────────
export async function saveCampusAction(_prev: CmsFormState, formData: FormData): Promise<CmsFormState> {
  const admin = await getCurrentAdmin();
  if (!admin) return { error: "Your session has expired. Please sign in again." };

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  if (!name) return { error: "Name is required." };

  const input = { name, address: address || null, displayOrder: parseOptionalInt(formData.get("displayOrder")) };

  try {
    if (id) {
      await campusService.updateCampus(id, input);
    } else {
      await campusService.createCampus(input);
    }
  } catch {
    return { error: "A campus with that name already exists." };
  }

  revalidatePath("/admin/campuses");
  return { success: true };
}

export async function toggleCampusAction(formData: FormData): Promise<void> {
  const admin = await getCurrentAdmin();
  if (!admin) return;
  await campusService.toggleCampusActive(String(formData.get("id")));
  revalidatePath("/admin/campuses");
}

export async function deleteCampusAction(_prev: CmsFormState, formData: FormData): Promise<CmsFormState> {
  const admin = await getCurrentAdmin();
  if (!admin) return { error: "Your session has expired. Please sign in again." };

  try {
    await campusService.deleteCampus(String(formData.get("id")));
  } catch (error) {
    if (isForeignKeyRestriction(error)) {
      return { error: "Cannot delete this campus while fee structures still reference it. Remove those fee structures first." };
    }
    throw error;
  }

  revalidatePath("/admin/campuses");
  return { success: true };
}

export async function bulkSetCampusesActiveAction(ids: string[], isActive: boolean): Promise<void> {
  const admin = await getCurrentAdmin();
  if (!admin) return;
  await campusService.bulkSetCampusesActive(ids, isActive);
  revalidatePath("/admin/campuses");
}

export async function bulkDeleteCampusesAction(ids: string[]): Promise<BulkDeleteResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { deletedCount: 0, failedCount: ids.length };
  const result = await bulkDeleteWithFkGuard(ids, campusService.deleteCampus);
  revalidatePath("/admin/campuses");
  return result;
}

// ── Sessions ────────────────────────────────────────────────────────────
export async function saveSessionAction(_prev: CmsFormState, formData: FormData): Promise<CmsFormState> {
  const admin = await getCurrentAdmin();
  if (!admin) return { error: "Your session has expired. Please sign in again." };

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim();
  if (!name) return { error: "Name is required." };

  const input = {
    name,
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    displayOrder: parseOptionalInt(formData.get("displayOrder")),
  };

  try {
    if (id) {
      await sessionService.updateSession(id, input);
    } else {
      await sessionService.createSession(input);
    }
  } catch {
    return { error: "A session with that name already exists." };
  }

  revalidatePath("/admin/sessions");
  return { success: true };
}

export async function toggleSessionAction(formData: FormData): Promise<void> {
  const admin = await getCurrentAdmin();
  if (!admin) return;
  await sessionService.toggleSessionActive(String(formData.get("id")));
  revalidatePath("/admin/sessions");
}

export async function deleteSessionAction(_prev: CmsFormState, formData: FormData): Promise<CmsFormState> {
  const admin = await getCurrentAdmin();
  if (!admin) return { error: "Your session has expired. Please sign in again." };

  try {
    await sessionService.deleteSession(String(formData.get("id")));
  } catch (error) {
    if (isForeignKeyRestriction(error)) {
      return { error: "Cannot delete this session while fee structures still reference it. Remove those fee structures first." };
    }
    throw error;
  }

  revalidatePath("/admin/sessions");
  return { success: true };
}

export async function bulkSetSessionsActiveAction(ids: string[], isActive: boolean): Promise<void> {
  const admin = await getCurrentAdmin();
  if (!admin) return;
  await sessionService.bulkSetSessionsActive(ids, isActive);
  revalidatePath("/admin/sessions");
}

export async function bulkDeleteSessionsAction(ids: string[]): Promise<BulkDeleteResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { deletedCount: 0, failedCount: ids.length };
  const result = await bulkDeleteWithFkGuard(ids, sessionService.deleteSession);
  revalidatePath("/admin/sessions");
  return result;
}
