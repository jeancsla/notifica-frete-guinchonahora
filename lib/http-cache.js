import crypto from "crypto";

export function setCacheControl(
  response,
  { visibility = "private", maxAge = 0, sMaxAge, staleWhileRevalidate } = {},
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

  response.setHeader("Cache-Control", directives.join(", "));
}

export function buildWeakEtag(payload) {
  const payloadString =
    typeof payload === "string" ? payload : JSON.stringify(payload);
  const hash = crypto
    .createHash("sha1")
    .update(payloadString)
    .digest("base64url")
    .slice(0, 20);
  return `W/"${hash}"`;
}

export function isEtagMatch(request, etag) {
  const requestEtag = request.headers["if-none-match"];
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

function normalizeEtag(value) {
  return value.replace(/^W\//, "").replace(/^"/, "").replace(/"$/, "");
}
