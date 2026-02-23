import {
  buildSessionClearCookie,
  buildSessionCookie,
  getSessionUser,
} from "../lib/session";
import { attachRequestIdHeader, createRequestLogger } from "../lib/logger";
import {
  clearAuthFailures,
  getAuthRateLimitState,
  recordAuthFailure,
} from "../lib/rate-limit";
import { timingSafeEqualString } from "../lib/security";

function getAdminCredentials() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  const isProd = process.env.NODE_ENV === "production";
  const allowDevDefaults = process.env.ALLOW_DEV_DEFAULT_ADMIN === "true";

  if (username && password) {
    return { username, password };
  }

  if (!isProd && allowDevDefaults) {
    return { username: "admin", password: "admin" };
  }

  throw new Error("ADMIN_USERNAME/ADMIN_PASSWORD must be configured.");
}

function getClientIdentifier(request: Request, username: string) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const forwarded = forwardedFor.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip") || "";
  const ip = forwarded || realIp || "unknown";
  return `${ip}:${username.toLowerCase()}`;
}

function getContentLength(request: Request) {
  const value = request.headers.get("content-length");
  if (!value) {
    return 0;
  }

  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function loginHandler({
  request,
  set,
}: {
  request: Request;
  set: { status?: number | string; headers: Record<string, string | number> };
}) {
  if (request.method !== "POST") {
    attachRequestIdHeader(set.headers, request);
    set.status = 405;
    createRequestLogger(request)
      .child({ handler: "auth.login" })
      .warn("auth.login.method_not_allowed", { method: request.method });
    return { error: "Method not allowed" };
  }

  const log = createRequestLogger(request).child({ handler: "auth.login" });
  attachRequestIdHeader(set.headers, request);

  if (getContentLength(request) > 2_048) {
    set.status = 413;
    log.warn("auth.login.payload_too_large", {
      content_length: request.headers.get("content-length"),
    });
    return { message: "Payload too large" };
  }

  const body = (await request.json().catch(() => null)) as {
    username?: string;
    password?: string;
  } | null;

  if (
    !body ||
    typeof body.username !== "string" ||
    typeof body.password !== "string"
  ) {
    set.status = 400;
    log.warn("auth.login.invalid_payload");
    return { message: "Invalid credentials payload" };
  }

  const clientKey = getClientIdentifier(request, body.username);
  const rateLimit = await getAuthRateLimitState(clientKey);
  if (rateLimit.blocked) {
    set.status = 429;
    if (rateLimit.retryAfterSeconds > 0) {
      set.headers["retry-after"] = rateLimit.retryAfterSeconds;
    }
    log.warn("auth.login.rate_limited", {
      retry_after_seconds: rateLimit.retryAfterSeconds,
    });
    return { message: "Too many login attempts. Try again later." };
  }

  let validUser = "";
  let validPassword = "";
  try {
    ({ username: validUser, password: validPassword } = getAdminCredentials());
  } catch (error) {
    log.error("auth.login.misconfigured", { error });
    set.status = 500;
    return { message: "Server misconfigured" };
  }

  if (
    timingSafeEqualString(body.username, validUser) &&
    timingSafeEqualString(body.password, validPassword)
  ) {
    await clearAuthFailures(clientKey);
    set.headers["set-cookie"] = buildSessionCookie(body.username);
    log.info("auth.login.success", { username: body.username });
    return { ok: true };
  }

  await recordAuthFailure(clientKey);

  const updatedRateLimit = await getAuthRateLimitState(clientKey);
  if (updatedRateLimit.blocked) {
    set.status = 429;
    if (updatedRateLimit.retryAfterSeconds > 0) {
      set.headers["retry-after"] = updatedRateLimit.retryAfterSeconds;
    }
    log.warn("auth.login.rate_limited_after_failure", {
      retry_after_seconds: updatedRateLimit.retryAfterSeconds,
      username: body.username,
    });
    return { message: "Too many login attempts. Try again later." };
  }

  set.status = 401;
  log.warn("auth.login.invalid_credentials", { username: body.username });
  return { message: "Invalid credentials" };
}

export async function logoutHandler({
  request,
  set,
}: {
  request: Request;
  set: { status?: number | string; headers: Record<string, string | number> };
}) {
  if (request.method !== "POST") {
    attachRequestIdHeader(set.headers, request);
    set.status = 405;
    createRequestLogger(request)
      .child({ handler: "auth.logout" })
      .warn("auth.logout.method_not_allowed", { method: request.method });
    return { error: "Method not allowed" };
  }

  attachRequestIdHeader(set.headers, request);
  createRequestLogger(request)
    .child({ handler: "auth.logout" })
    .info("auth.logout.success");
  set.headers["set-cookie"] = buildSessionClearCookie();
  return { ok: true };
}

export async function userHandler({ request }: { request: Request }) {
  const user = getSessionUser(request);

  if (user) {
    return {
      isLoggedIn: true,
      ...user,
    };
  }

  return {
    isLoggedIn: false,
  };
}
