import { prisma } from "@/lib/prisma";

const SETTINGS_ID = "singleton";

export async function getSiteSettings() {
  return prisma.siteSetting.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: { id: SETTINGS_ID },
  });
}

export async function updateMaxParticipants(maxParticipants: number) {
  return prisma.siteSetting.upsert({
    where: { id: SETTINGS_ID },
    update: { maxParticipants },
    create: { id: SETTINGS_ID, maxParticipants },
  });
}
