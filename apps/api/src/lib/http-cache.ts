import crypto from "node:crypto";

export function setCacheControl(
  headers: Record<string, string>,
  {
    visibility = "private",
    maxAge = 0,
    sMaxAge,
    staleWhileRevalidate,
  }: {
    visibility?: "public" | "private";
    maxAge?: number;
    sMaxAge?: number;
    staleWhileRevalidate?: number;
  } = {},
) {
  const directives = [visibility, `max-age=${Math.max(0, maxAge)}`];

  if (typeof sMaxAge === "number") {
    directives.push(`s-maxage=${Math.max(0, sMaxAge)}`);
  }

  if (typeof staleWhileRevalidate === "number") {
    directives.push(
      `stale-while-revalidate=${Math.max(0, staleWhileRevalidate)}`,
    );
  }

  headers["Cache-Control"] = directives.join(", ");
}

export function buildWeakEtag(payload: unknown) {
  const payloadString =
    typeof payload === "string" ? payload : JSON.stringify(payload);
  const hash = crypto
    .createHash("sha1")
    .update(payloadString)
    .digest("base64url")
    .slice(0, 20);
  return `W/\"${hash}\"`;
}

export function isEtagMatch(request: Request, etag: string) {
  const requestEtag = request.headers.get("if-none-match");
  if (!requestEtag) {
    return false;
  }

  if (requestEtag === "*") {
    return true;
  }

  const requestedTags = requestEtag
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const normalizedTarget = normalizeEtag(etag);
  return requestedTags.some((candidate) => {
    return (
      candidate === etag ||
      normalizeEtag(candidate) === normalizedTarget ||
      candidate === "*"
    );
  });
}

function normalizeEtag(value: string) {
  return value.replace(/^W\//, "").replace(/^\"/, "").replace(/\"$/, "");
}
