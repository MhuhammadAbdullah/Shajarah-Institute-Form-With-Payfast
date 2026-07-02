import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  PAYFAST_MERCHANT_ID: z.string().min(1, "PAYFAST_MERCHANT_ID is required"),
  PAYFAST_MERCHANT_NAME: z.string().min(1, "PAYFAST_MERCHANT_NAME is required"),
  PAYFAST_SECURED_KEY: z.string().min(1, "PAYFAST_SECURED_KEY is required"),
  PAYFAST_ENV: z.enum(["sandbox", "production"]).default("sandbox"),

  PAYFAST_RETURN_URL: z.string().url("PAYFAST_RETURN_URL must be a valid URL"),
  PAYFAST_CANCEL_URL: z.string().url("PAYFAST_CANCEL_URL must be a valid URL"),
  PAYFAST_IPN_URL: z.string().url("PAYFAST_IPN_URL must be a valid URL"),

  NEXT_PUBLIC_BASE_URL: z.string().url("NEXT_PUBLIC_BASE_URL must be a valid URL"),

  SMTP_HOST: z.string().min(1, "SMTP_HOST is required"),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  SMTP_USER: z.string().min(1, "SMTP_USER is required"),
  SMTP_PASSWORD: z.string().min(1, "SMTP_PASSWORD is required"),
  SMTP_FROM_EMAIL: z.string().email("SMTP_FROM_EMAIL must be a valid email"),
  SMTP_FROM_NAME: z.string().default("Shajarah Institute"),

  ADMIN_SESSION_SECRET: z.string().min(16, "ADMIN_SESSION_SECRET must be at least 16 characters"),
});

const PAYFAST_CALLBACK_URL_KEYS = [
  "PAYFAST_RETURN_URL",
  "PAYFAST_CANCEL_URL",
  "PAYFAST_IPN_URL",
  "NEXT_PUBLIC_BASE_URL",
] as const;

/**
 * PayFast's servers must be able to reach these URLs over the public internet.
 * A localhost/http URL here silently breaks the IPN callback in production
 * (fetch just fails/times out server-side, no user-facing error) — refuse to
 * boot instead of failing invisibly.
 */
const finalSchema = envSchema.superRefine((env, ctx) => {
  if (env.PAYFAST_ENV !== "production") return;

  for (const key of PAYFAST_CALLBACK_URL_KEYS) {
    const url = new URL(env[key]);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      ctx.addIssue({
        code: "custom",
        path: [key],
        message: `${key} is "${env[key]}" but PAYFAST_ENV is "production" — PayFast cannot call back a localhost URL`,
      });
    }
    if (url.protocol !== "https:") {
      ctx.addIssue({
        code: "custom",
        path: [key],
        message: `${key} is "${env[key]}" but PAYFAST_ENV is "production" — must be HTTPS`,
      });
    }
  }
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | undefined;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const parsed = finalSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}
