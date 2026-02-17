import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";

if (typeof global.TextEncoder === "undefined") {
  global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === "undefined") {
  global.TextDecoder = TextDecoder;
}

// In Node 18+, fetch is available on globalThis.
// However, JSDOM might be interfering.
if (typeof global.fetch !== "function") {
  global.fetch = globalThis.fetch;
}
