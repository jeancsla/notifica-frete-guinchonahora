declare global {
  // Availability flags initialized in tests/bun.setup.ts
  var __POSTGRES_READY__: boolean | undefined;
  var __WEB_SERVER_READY__: boolean | undefined;
}

export {};
