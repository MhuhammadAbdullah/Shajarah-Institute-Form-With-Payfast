import { stringify } from "csv-stringify/sync";
import type { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const STATUS_OPTIONS: PaymentStatus[] = ["PENDING", "PAID", "FAILED", "CANCELLED", "REFUNDED"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const statusParam = searchParams.get("status");
  const status = STATUS_OPTIONS.includes(statusParam as PaymentStatus) ? (statusParam as PaymentStatus) : undefined;

  const registrations = await prisma.registration.findMany({
    where: {
      ...(status ? { paymentStatus: status } : {}),
      ...(search
        ? {
            OR: [
              { studentName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { basketId: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = registrations.map((r) => ({
    basketId: r.basketId,
    studentName: r.studentName,
    email: r.email,
    phone: r.phone,
    program: r.program,
    campus: r.campus,
    session: r.session,
    fee: r.fee.toString(),
    paymentStatus: r.paymentStatus,
    transactionId: r.transactionId ?? "",
    createdAt: r.createdAt.toISOString(),
  }));

  const csv = stringify(rows, {
    header: true,
    columns: [
      "basketId",
      "studentName",
      "email",
      "phone",
      "program",
      "campus",
      "session",
      "fee",
      "paymentStatus",
      "transactionId",
      "createdAt",
    ],
  });

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="registrations-${Date.now()}.csv"`,
    },
  });
}
