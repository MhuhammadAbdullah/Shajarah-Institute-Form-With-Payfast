import { Prisma, type Registration } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateBasketId } from "@/services/basketId.service";
import { PROGRAM_FEES } from "@/constants/programs";
import type { RegistrationFormValues } from "@/validators/registration.schema";

const MAX_BASKET_ID_RETRIES = 3;

/**
 * Persists a new pending registration with a freshly generated, unique
 * Basket ID. Retries a handful of times on the (extremely unlikely) chance
 * of a Basket ID collision.
 */
export async function createPendingRegistration(input: RegistrationFormValues): Promise<Registration> {
  const fee = PROGRAM_FEES[input.program];

  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_BASKET_ID_RETRIES; attempt++) {
    const basketId = await generateBasketId();

    try {
      return await prisma.registration.create({
        data: {
          basketId,
          studentName: input.studentName,
          fatherName: input.fatherName || null,
          email: input.email,
          phone: input.phone,
          cnic: input.cnic || null,
          gender: input.gender,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
          program: input.program,
          batch: input.batch,
          campus: input.campus,
          session: input.session,
          fee: new Prisma.Decimal(fee),
          country: input.country,
          city: input.city,
          address: input.address,
          agreementAccepted: input.agreementAccepted,
          paymentStatus: "PENDING",
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
