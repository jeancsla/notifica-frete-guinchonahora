import crypto from "node:crypto";

const isProd = process.env.NODE_ENV === "production";
const SESSION_COOKIE = "cargo_session";

function getSessionSecret() {
  const sessionSecret = process.env.SESSION_SECRET;

  if (!sessionSecret && isProd) {
    throw new Error("SESSION_SECRET must be set in production.");
  }

  return sessionSecret || "dev-only-insecure-session-secret-change-me";
}

function signPayload(payload) {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");
}

function parseCookieHeader(cookieHeader = "") {
  const cookies = {};

  cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const eq = part.indexOf("=");
      if (eq === -1) {
        return;
      }

      const key = part.slice(0, eq).trim();
      const value = part.slice(eq + 1).trim();
      cookies[key] = decodeURIComponent(value);
    });

  return cookies;
}

function decodeSessionToken(token) {
  if (!token || typeof token !== "string") {
    return null;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const decoded = Buffer.from(payload, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded);

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

export async function getSession(req) {
  const cookies = parseCookieHeader(req?.headers?.cookie || "");
  const user = decodeSessionToken(cookies[SESSION_COOKIE]);

  return {
    user: user || null,
  };
}
