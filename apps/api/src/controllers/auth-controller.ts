import {
  buildSessionClearCookie,
  buildSessionCookie,
  getSessionUser,
} from "../lib/session";
import { timingSafeEqualString } from "../lib/security";

function getAdminCredentials() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  const isProd = process.env.NODE_ENV === "production";

  if (!username || !password) {
    if (isProd) {
      throw new Error(
        "ADMIN_USERNAME/ADMIN_PASSWORD must be set in production.",
      );
    }

    return { username: "admin", password: "admin", usingDefaults: true };
  }

  return { username, password, usingDefaults: false };
}

export async function loginHandler({
  request,
  set,
}: {
  request: Request;
  set: { status?: number | string; headers: Record<string, string | number> };
}) {
  if (request.method !== "POST") {
    set.status = 405;
    return { error: "Method not allowed" };
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
    return { message: "Invalid credentials payload" };
  }

  let validUser = "";
  let validPassword = "";
  let usingDefaultCredentials = false;
  try {
    ({
      username: validUser,
      password: validPassword,
      usingDefaults: usingDefaultCredentials,
    } = getAdminCredentials());
  } catch (error) {
    console.error("[Auth] Login blocked due to misconfiguration:", error);
    set.status = 500;
    return { message: "Server misconfigured" };
  }

  if (
    timingSafeEqualString(body.username, validUser) &&
    timingSafeEqualString(body.password, validPassword)
  ) {
    set.headers["set-cookie"] = buildSessionCookie(body.username);
    return { ok: true };
  }

  set.status = 401;
  if (usingDefaultCredentials) {
    return {
      message:
        "Invalid credentials. In development, use admin/admin or set ADMIN_USERNAME and ADMIN_PASSWORD.",
    };
  }
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
    set.status = 405;
    return { error: "Method not allowed" };
  }

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
