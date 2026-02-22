import crypto from "node:crypto";

type CacheControlOptions = {
  visibility?: "private" | "public";
  maxAge?: number;
  sMaxAge?: number;
  staleWhileRevalidate?: number;
};

type HeaderSetter = {
  setHeader: (name: string, value: string) => void;
};

type RequestWithHeaders = {
  headers: Record<string, string | string[] | undefined>;
};

export function setCacheControl(
  response: HeaderSetter,
  {
    visibility = "private",
    maxAge = 0,
    sMaxAge,
    staleWhileRevalidate,
  }: CacheControlOptions = {},
): void {
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

export function buildWeakEtag(payload: unknown): string {
  const payloadString =
    typeof payload === "string" ? payload : JSON.stringify(payload);
  const hash = crypto
    .createHash("sha1")
    .update(payloadString)
    .digest("base64url")
    .slice(0, 20);
  return `W/"${hash}"`;
}

export function isEtagMatch(
  request: RequestWithHeaders,
  etag: string,
): boolean {
  const ifNoneMatchHeader = request.headers["if-none-match"];
  const requestEtag = Array.isArray(ifNoneMatchHeader)
    ? ifNoneMatchHeader[0]
    : ifNoneMatchHeader;

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

function normalizeEtag(value: string): string {
  return value.replace(/^W\//, "").replace(/^"/, "").replace(/"$/, "");
}
