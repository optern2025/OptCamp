import * as argon2 from "argon2";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function hashValue(value: string): Promise<string> {
  return await argon2.hash(value);
}

export async function verifyHash(hash: string, value: string): Promise<boolean> {
  return await argon2.verify(hash, value);
}

export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateOTP(length: number = 6): string {
  // Generate a numeric OTP
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += (array[i] % 10).toString();
  }
  return otp;
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set("session_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get("session_token");
  return cookie?.value;
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("session_token");
}
