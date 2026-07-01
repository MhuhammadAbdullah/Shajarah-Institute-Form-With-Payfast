import { SignJWT, jwtVerify } from "jose";

export const ADMIN_SESSION_COOKIE = "shajarah_admin_session";
const SESSION_DURATION = "8h";

export interface AdminSessionPayload {
  adminId: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN" | "ADMIN";
}

function getSecretKey(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("ADMIN_SESSION_SECRET must be set to a value at least 16 characters long");
  }
  return new TextEncoder().encode(secret);
}

export async function createAdminSessionToken(payload: AdminSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecretKey());
}

export async function verifyAdminSessionToken(token: string): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.adminId === "string" &&
      typeof payload.email === "string" &&
      typeof payload.name === "string" &&
      (payload.role === "SUPER_ADMIN" || payload.role === "ADMIN")
    ) {
      return {
        adminId: payload.adminId,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      };
    }
    return null;
  } catch {
    return null;
  }
}
