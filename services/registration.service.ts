import { Prisma, type Registration } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateBasketId } from "@/services/basketId.service";
import { findActiveFeeStructure, computeFee, type FeeBreakdown } from "@/services/feeStructure.service";

const MAX_BASKET_ID_RETRIES = 3;

export interface CoreRegistrationFields {
  studentName: string;
  fatherName?: string | null;
  email: string;
  phone: string;
  cnic?: string | null;
  gender: string;
  dateOfBirth?: string | null;
  program: string;
  campus: string;
  session: string;
  country: string;
  province: string;
  city: string;
  postalCode?: string | null;
  address: string;
  agreementAccepted: boolean;
  registrationType?: "SINGLE" | "MULTIPLE";
}

export interface ParticipantInput {
  fullName: string;
  email: string;
  phone: string;
  cnic: string;
  age: number;
}

export class FeeNotConfiguredError extends Error {
  constructor() {
    super("No active fee is configured for this Program + Campus + Session combination.");
    this.name = "FeeNotConfiguredError";
  }
}

/**
 * Resolves the authoritative fee for a program+campus+session combination
 * and quantity via FeeStructure (never accepted from the client - a
 * tampered request body can't pay less than the real price). Throws if no
 * active FeeStructure row exists for the exact combination - never
 * silently substitutes a fee.
 */
export async function resolveFee(programName: string, campusName: string, sessionName: string, quantity: number): Promise<FeeBreakdown> {
  const [program, campus, session] = await Promise.all([
    prisma.program.findUnique({ where: { name: programName } }),
    prisma.campus.findUnique({ where: { name: campusName } }),
    prisma.session.findUnique({ where: { name: sessionName } }),
  ]);

  if (!program || !campus || !session) {
    throw new FeeNotConfiguredError();
  }

  const feeStructure = await findActiveFeeStructure(program.id, campus.id, session.id);
  if (!feeStructure) {
    throw new FeeNotConfiguredError();
  }

  return computeFee(feeStructure.id, quantity);
}

/**
 * Persists a new pending registration with a freshly generated, unique
 * Basket ID. Retries a handful of times on the (extremely unlikely) chance
 * of a Basket ID collision.
 */
export async function createPendingRegistration(
  core: CoreRegistrationFields,
  customFieldValues: Record<string, unknown>,
  participants: ParticipantInput[] = [],
): Promise<Registration> {
  const isMultiple = core.registrationType === "MULTIPLE";
  const quantity = isMultiple ? Math.max(participants.length, 1) : 1;
  const feeBreakdown = await resolveFee(core.program, core.campus, core.session, quantity);

  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_BASKET_ID_RETRIES; attempt++) {
    const basketId = await generateBasketId();

    try {
      return await prisma.registration.create({
        data: {
          basketId,
          studentName: core.studentName,
          fatherName: core.fatherName || null,
          email: core.email,
          phone: core.phone,
          cnic: core.cnic || null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          gender: core.gender as any,
          dateOfBirth: core.dateOfBirth ? new Date(core.dateOfBirth) : null,
          program: core.program,
          campus: core.campus,
          session: core.session,
          fee: new Prisma.Decimal(feeBreakdown.totalFee),
          country: core.country,
          province: core.province,
          city: core.city,
          postalCode: core.postalCode || null,
          address: core.address,
          agreementAccepted: core.agreementAccepted,
          registrationType: isMultiple ? "MULTIPLE" : "SINGLE",
          participantCount: quantity,
          customFieldValues: customFieldValues as Prisma.InputJsonValue,
          paymentStatus: "PENDING",
          ...(isMultiple && participants.length > 0
            ? {
                participants: {
                  create: participants.map((p, index) => ({
                    order: index,
                    fullName: p.fullName,
                    email: p.email,
                    phone: p.phone,
                    cnic: p.cnic,
                    age: p.age,
                  })),
                },
              }
            : {}),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Failed to generate a unique basket ID");
}

export async function saveAccessToken(registrationId: string, accessToken: string): Promise<void> {
  await prisma.registration.update({
    where: { id: registrationId },
    data: { accessToken },
  });
}

export async function findRegistrationByBasketId(basketId: string): Promise<Registration | null> {
  return prisma.registration.findUnique({ where: { basketId } });
}
