"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { updateMaxParticipants } from "@/services/siteSetting.service";

export interface SiteSettingFormState {
  error?: string;
  success?: boolean;
}

export async function saveSiteSettingsAction(_prev: SiteSettingFormState, formData: FormData): Promise<SiteSettingFormState> {
  const admin = await getCurrentAdmin();
  if (!admin) return { error: "Your session has expired. Please sign in again." };

  const maxParticipants = Number(formData.get("maxParticipants"));
  if (!Number.isInteger(maxParticipants) || maxParticipants < 1) {
    return { error: "Max participants must be a whole number of at least 1." };
  }

  await updateMaxParticipants(maxParticipants);

  revalidatePath("/admin/settings");
  revalidatePath("/");
  return { success: true };
}
