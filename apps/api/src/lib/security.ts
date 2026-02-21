import crypto from "node:crypto";

export function timingSafeEqualString(a: string, b: string) {
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

export function getSingleHeader(request: Request, key: string) {
  return request.headers.get(key) ?? "";
}
