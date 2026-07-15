import { prisma } from "@/lib/prisma";
import { getRegistrationCounts, listRegistrations } from "@/services/admin.service";

const DAILY_SERIES_DEFAULT_DAYS = 30;

export async function getDashboardStats() {
  const [counts, programsCount, campusesCount, activeSessionsCount, revenueAgg] = await Promise.all([
    getRegistrationCounts(),
    prisma.program.count(),
    prisma.campus.count(),
    prisma.session.count({ where: { isActive: true } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "SUCCESS" } }),
  ]);

  return {
    totalRegistrations: counts.total,
    paidRegistrations: counts.paid,
    pendingPayments: counts.pending,
    revenue: Number(revenueAgg._sum.amount ?? 0),
    programsCount,
    activeSessionsCount,
    campusesCount,
  };
}

export async function getRecentRegistrations(limit = 6) {
  const { registrations } = await listRegistrations({ page: 1, pageSize: limit, view: "all" });
  return registrations;
}

export async function getRecentPayments(limit = 6) {
  return prisma.payment.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { registration: { select: { studentName: true, basketId: true, id: true } } },
  });
}

export interface DailySeriesPoint {
  date: string;
  registrations: number;
  revenue: number;
}

export async function getDailySeries(days = DAILY_SERIES_DEFAULT_DAYS): Promise<DailySeriesPoint[]> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const registrations = await prisma.registration.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true, paymentStatus: true, fee: true },
  });

  const buckets = new Map<string, DailySeriesPoint>();
  for (let i = 0; i < days; i++) {
    const day = new Date(since);
    day.setDate(day.getDate() + i);
    const key = day.toISOString().slice(0, 10);
    buckets.set(key, { date: key, registrations: 0, revenue: 0 });
  }

  for (const registration of registrations) {
    const key = registration.createdAt.toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.registrations += 1;
    if (registration.paymentStatus === "PAID") {
      bucket.revenue += Number(registration.fee);
    }
  }

  return Array.from(buckets.values());
}
