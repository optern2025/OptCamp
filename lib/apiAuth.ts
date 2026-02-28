import { type NextRequest } from "next/server";

export function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}
