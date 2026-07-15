import { prisma } from "@/lib/prisma";

export async function listCampusesForProgram(programId: string) {
  const links = await prisma.programCampus.findMany({
    where: { programId },
    include: { campus: true },
  });
  return links.map((link) => link.campus).sort((a, b) => a.displayOrder - b.displayOrder);
}

export async function listCampusIdsForProgram(programId: string) {
  const links = await prisma.programCampus.findMany({ where: { programId }, select: { campusId: true } });
  return links.map((link) => link.campusId);
}

/** Replaces the full set of campuses associated with a program - simplest semantics for a checkbox-list admin UI. */
export async function setCampusesForProgram(programId: string, campusIds: string[]) {
  await prisma.$transaction([
    prisma.programCampus.deleteMany({ where: { programId } }),
    prisma.programCampus.createMany({
      data: campusIds.map((campusId) => ({ programId, campusId })),
      skipDuplicates: true,
    }),
  ]);
}
