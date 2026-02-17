import { getIronSession } from "iron-session";

const isProd = process.env.NODE_ENV === "production";
const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret && isProd) {
  throw new Error("SESSION_SECRET must be set in production.");
}

export const sessionOptions = {
  password: sessionSecret || "dev-only-insecure-session-secret-change-me",
  cookieName: "cargo_session",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
  },
};

export async function getSession(req, res) {
  const session = await getIronSession(req, res, sessionOptions);
  return session;
}
