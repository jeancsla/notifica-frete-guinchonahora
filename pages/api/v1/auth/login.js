import crypto from "crypto";
import { getSession } from "lib/session";

const isProd = process.env.NODE_ENV === "production";

function getAdminCredentials() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    if (isProd) {
      throw new Error("ADMIN_USERNAME/ADMIN_PASSWORD must be set in production.");
    }
    console.warn(
      "[Auth] ADMIN_USERNAME/ADMIN_PASSWORD not set. Using insecure dev defaults.",
    );
    return { username: "admin", password: "admin" };
  }

  return { username, password };
}

function timingSafeEqualString(a, b) {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufferA, bufferB);
}

export default async function loginHandler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { username, password } = req.body;
  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ message: "Invalid credentials payload" });
  }

  let validUser;
  let validPassword;
  try {
    ({ username: validUser, password: validPassword } = getAdminCredentials());
  } catch (error) {
    console.error("[Auth] Login blocked due to misconfiguration:", error);
    return res.status(500).json({
      message: "Server misconfigured",
    });
  }

  if (
    timingSafeEqualString(username, validUser) &&
    timingSafeEqualString(password, validPassword)
  ) {
    const session = await getSession(req, res);
    session.user = { username };
    await session.save();
    return res.status(200).json({ ok: true });
  }

  return res.status(401).json({ message: "Invalid credentials" });
}
