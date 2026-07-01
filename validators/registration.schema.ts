import { z } from "zod";
import { GENDERS, PROGRAMS } from "@/constants/programs";

const phoneRegex = /^(\+92|0)?3\d{9}$/;
const cnicRegex = /^\d{5}-?\d{7}-?\d{1}$/;

export const registrationSchema = z.object({
  studentName: z
    .string()
    .trim()
    .min(3, "Full name must be at least 3 characters")
    .max(100, "Full name is too long"),
  fatherName: z.string().trim().max(100).optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, "Enter a valid Pakistani mobile number (e.g. 03001234567)"),
  cnic: z
    .string()
    .trim()
    .regex(cnicRegex, "Enter a valid CNIC (e.g. 42101-1234567-1)")
    .optional()
    .or(z.literal("")),
  gender: z.enum(GENDERS, { message: "Please select a gender" }),
  dateOfBirth: z.string().trim().optional().or(z.literal("")),

  // The fee is intentionally NOT part of this schema — it is never accepted
  // from the client. The server derives it from `program` via PROGRAM_FEES
  // so a tampered request body can't pay less than the real price.
  program: z.enum(PROGRAMS, { message: "Please select a valid program" }),
  batch: z.string().trim().min(1, "Please select a batch"),
  campus: z.string().trim().min(1, "Please select a campus"),
  session: z.string().trim().min(1, "Please select a session"),

  country: z.string().trim().min(1, "Please select a country"),
  city: z.string().trim().min(2, "City is required"),
  address: z.string().trim().min(5, "Address must be at least 5 characters").max(500),

  agreementAccepted: z.boolean().refine((value) => value === true, {
    message: "You must accept the terms and conditions",
  }),
});

export type RegistrationFormInput = z.input<typeof registrationSchema>;
export type RegistrationFormValues = z.output<typeof registrationSchema>;
