export function parseCookies(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const parts = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
  const cookies = new Map<string, string>();

  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    cookies.set(key, decodeURIComponent(value));
  }

  return cookies;
}

export function buildCookie(
  name: string,
  value: string,
  options: {
    path?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "Lax" | "Strict" | "None";
    maxAge?: number;
  } = {},
) {
  const attrs = [`${name}=${encodeURIComponent(value)}`];

  attrs.push(`Path=${options.path ?? "/"}`);

  if (typeof options.maxAge === "number") {
    attrs.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  }

  if (options.httpOnly !== false) {
    attrs.push("HttpOnly");
  }

  attrs.push(`SameSite=${options.sameSite ?? "Lax"}`);

  if (options.secure) {
    attrs.push("Secure");
  }

  return attrs.join("; ");
}
