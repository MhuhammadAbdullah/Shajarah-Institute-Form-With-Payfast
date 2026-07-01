import type { PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface RegistrationFilters {
  search?: string;
  status?: PaymentStatus;
  page?: number;
  pageSize?: number;
}

export async function listRegistrations(filters: RegistrationFilters) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize ?? 20;

  const where: Prisma.RegistrationWhereInput = {
    ...(filters.status ? { paymentStatus: filters.status } : {}),
    ...(filters.search
      ? {
          OR: [
            { studentName: { contains: filters.search, mode: "insensitive" } },
            { email: { contains: filters.search, mode: "insensitive" } },
            { phone: { contains: filters.search, mode: "insensitive" } },
            { basketId: { contains: filters.search, mode: "insensitive" } },
            { transactionId: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [registrations, total] = await Promise.all([
    prisma.registration.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.registration.count({ where }),
  ]);

  return { registrations, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getRegistrationDetail(id: string) {
  return prisma.registration.findUnique({
    where: { id },
    include: { payments: { orderBy: { createdAt: "desc" } } },
  });
}

export async function getRegistrationCounts() {
  const [pending, paid, failed, total] = await Promise.all([
    prisma.registration.count({ where: { paymentStatus: "PENDING" } }),
    prisma.registration.count({ where: { paymentStatus: "PAID" } }),
    prisma.registration.count({ where: { paymentStatus: "FAILED" } }),
    prisma.registration.count(),
  ]);
  return { pending, paid, failed, total };
}
