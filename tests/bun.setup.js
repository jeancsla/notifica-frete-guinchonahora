import { TextDecoder, TextEncoder } from "node:util";
import dotenv from "dotenv";
import { afterEach } from "bun:test";
import { cleanup } from "@testing-library/react";

dotenv.config({ path: ".env.development" });

if (typeof globalThis.TextEncoder === "undefined") {
  globalThis.TextEncoder = TextEncoder;
}

if (typeof globalThis.TextDecoder === "undefined") {
  globalThis.TextDecoder = TextDecoder;
}

if (typeof globalThis.fetch !== "function") {
  globalThis.fetch = fetch;
}

afterEach(() => {
  cleanup();
});
