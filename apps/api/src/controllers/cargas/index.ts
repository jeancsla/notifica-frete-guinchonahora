/**
 * Cargas controller modules - barrel export
 *
 * This module exports all cargas-related handlers.
 * Import from here for the main API routes.
 */

export { cargasListHandler } from "./list-handler";
export { cargasCheckHandler } from "./check-handler";
export { cargasWebhookHandler } from "./webhook-handler";
export { cargasHealthHandler } from "./health-handler";

// Re-export guards for use in other controllers
export {
  isTestMode,
  hasAdminApiKey,
  hasCronSecret,
  hasSessionOrAdminAccess,
  requireSession,
} from "./guards";

// Re-export validators for use in tests
export {
  isValidCronEventId,
  parseMockedResult,
  getContentLength,
  parseListCargasParams,
} from "./validators";
