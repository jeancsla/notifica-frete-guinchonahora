import { getSessionUser } from "../../lib/session";
import { timingSafeEqualString } from "../../lib/security";

export function isTestMode(): boolean {
  return process.env.TEST_MODE === "1";
}

export function hasAdminApiKey(request: Request): boolean {
  const apiKey = request.headers.get("x-admin-key") || "";
  const expected = process.env.ADMIN_API_KEY || "";
  if (!apiKey || !expected) {
    return false;
  }

  return timingSafeEqualString(apiKey, expected);
}

export function hasCronSecret(request: Request): boolean {
  const secret = request.headers.get("x-cron-secret") || "";
  const expectedSecret = process.env.CRON_WEBHOOK_SECRET || "";
  if (!secret || !expectedSecret) {
    return false;
  }

  return timingSafeEqualString(secret, expectedSecret);
}

export function hasSessionOrAdminAccess(request: Request): boolean {
  return Boolean(getSessionUser(request)) || hasAdminApiKey(request);
}

export function requireSession(
  request: Request,
): { success: true } | { success: false; error: string } {
  if (!getSessionUser(request)) {
    return { success: false, error: "Unauthorized" };
  }
  return { success: true };
}
