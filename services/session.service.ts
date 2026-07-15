import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface SessionInput {
  name: string;
  startDate?: Date | null;
  endDate?: Date | null;
  displayOrder?: number | null;
}

export const SESSION_SORT_KEYS = ["name", "displayOrder", "startDate", "endDate", "createdAt"] as const;
export type SessionSortKey = (typeof SESSION_SORT_KEYS)[number];

export interface SessionListFilters {
  search?: string;
  status?: "all" | "active" | "inactive";
  page?: number;
  pageSize?: number;
  sort?: SessionSortKey;
  dir?: "asc" | "desc";
}

/** Full unfiltered list - used for dropdown/checkbox option sources and the live public registration form. Do not paginate this. */
export async function listSessions() {
  return prisma.session.findMany({ orderBy: { displayOrder: "asc" } });
}

export async function listSessionsPaginated(filters: SessionListFilters = {}) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize ?? 10;
  const status = filters.status ?? "all";

  const where: Prisma.SessionWhereInput = {
    ...(status === "active" ? { isActive: true } : status === "inactive" ? { isActive: false } : {}),
    ...(filters.search ? { name: { contains: filters.search, mode: "insensitive" } } : {}),
  };

  const dir = filters.dir ?? "asc";
  const orderBy: Prisma.SessionOrderByWithRelationInput[] = filters.sort
    ? [{ [filters.sort]: dir }, { name: "asc" }]
    : [{ displayOrder: "asc" }, { name: "asc" }];

  const [items, total] = await Promise.all([
    prisma.session.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.session.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getSession(id: string) {
  return prisma.session.findUnique({ where: { id } });
}

export async function createSession(input: SessionInput) {
  let displayOrder = input.displayOrder ?? undefined;
  if (displayOrder == null) {
    const last = await prisma.session.findFirst({ orderBy: { displayOrder: "desc" } });
    displayOrder = (last?.displayOrder ?? -1) + 1;
  }
  return prisma.session.create({
    data: { name: input.name, startDate: input.startDate, endDate: input.endDate, displayOrder },
  });
}

export async function updateSession(id: string, input: SessionInput) {
  return prisma.session.update({
    where: { id },
    data: {
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      ...(input.displayOrder != null ? { displayOrder: input.displayOrder } : {}),
    },
  });
}

export async function toggleSessionActive(id: string) {
  const session = await prisma.session.findUniqueOrThrow({ where: { id } });
  return prisma.session.update({ where: { id }, data: { isActive: !session.isActive } });
}

export async function deleteSession(id: string) {
  return prisma.session.delete({ where: { id } });
}

export async function bulkSetSessionsActive(ids: string[], isActive: boolean) {
  return prisma.session.updateMany({ where: { id: { in: ids } }, data: { isActive } });
}
