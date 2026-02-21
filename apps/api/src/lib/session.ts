import crypto from "node:crypto";
import { buildCookie, parseCookies } from "./cookies";
import type { SessionUser } from "../types";

const SESSION_COOKIE = "cargo_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getSecret() {
  const isProd = process.env.NODE_ENV === "production";
  const secret = process.env.SESSION_SECRET;

  if (!secret && isProd) {
    throw new Error("SESSION_SECRET must be set in production.");
  }

  return secret || "dev-only-insecure-session-secret-change-me";
}

function signPayload(payload: string) {
  return crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64url");
}

function encodeSession(user: SessionUser) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = JSON.stringify({ user, exp });
  const encoded = Buffer.from(payload).toString("base64url");
  const signature = signPayload(encoded);
  return `${encoded}.${signature}`;
}

function decodeSession(token: string): SessionUser | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expected = signPayload(payload);
  const sigA = Buffer.from(signature);
  const sigB = Buffer.from(expected);

  if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
    return null;
  }

  try {
    const decoded = Buffer.from(payload, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as { user: SessionUser; exp: number };

    if (!parsed?.user?.username || !parsed?.exp) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (parsed.exp <= now) {
      return null;
    }

    return parsed.user;
  } catch {
    return null;
  }
}

export function getSessionUser(request: Request) {
  const cookies = parseCookies(request);
  const token = cookies.get(SESSION_COOKIE);
  if (!token) {
    return null;
  }

  return decodeSession(token);
}

export function buildSessionCookie(username: string) {
  return buildCookie(SESSION_COOKIE, encodeSession({ username }), {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function buildSessionClearCookie() {
  return buildCookie(SESSION_COOKIE, "", {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
}
