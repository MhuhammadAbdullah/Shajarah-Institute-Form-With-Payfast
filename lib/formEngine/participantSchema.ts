import { z } from "zod";

/**
 * Participants bypass the generic dynamic FormField engine entirely -
 * customFieldValues is a flat {key: value} map, not designed for repeating
 * groups, so this is a small dedicated schema shared by the wizard's
 * client-side validation and the server's authoritative check in
 * app/api/register/route.ts.
 */
export const participantSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required"),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().min(1, "Phone number is required"),
  cnic: z.string().trim().min(1, "CNIC is required"),
  age: z.coerce.number().int().min(1, "Enter a valid age").max(120, "Enter a valid age"),
});

export const participantsArraySchema = z.array(participantSchema).min(1, "Add at least one participant");

export type ParticipantFormValues = z.infer<typeof participantSchema>;
