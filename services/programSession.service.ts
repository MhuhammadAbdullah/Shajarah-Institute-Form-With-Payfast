import { prisma } from "@/lib/prisma";

export async function listSessionsForProgram(programId: string) {
  const links = await prisma.programSession.findMany({
    where: { programId },
    include: { session: true },
  });
  return links.map((link) => link.session).sort((a, b) => a.displayOrder - b.displayOrder);
}

export async function listSessionIdsForProgram(programId: string) {
  const links = await prisma.programSession.findMany({ where: { programId }, select: { sessionId: true } });
  return links.map((link) => link.sessionId);
}

/** Replaces the full set of sessions associated with a program - simplest semantics for a checkbox-list admin UI. */
export async function setSessionsForProgram(programId: string, sessionIds: string[]) {
  await prisma.$transaction([
    prisma.programSession.deleteMany({ where: { programId } }),
    prisma.programSession.createMany({
      data: sessionIds.map((sessionId) => ({ programId, sessionId })),
      skipDuplicates: true,
    }),
  ]);
}
