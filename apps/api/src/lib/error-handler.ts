import { logger } from "./logger";

const log = logger.child({ component: "error_handler" });

export type ErrorResponse = {
  message: string;
  requestId?: string;
  timestamp?: string;
};

/**
 * Generic error handler that returns safe error messages in production.
 * Prevents information disclosure while logging full details server-side.
 * (EC-9: Generic error messages)
 */
export function formatErrorResponse(
  error: unknown,
  options?: {
    requestId?: string;
    isDev?: boolean;
    defaultMessage?: string;
  },
): ErrorResponse {
  const isDev = options?.isDev ?? process.env.NODE_ENV !== "production";
  const defaultMessage = options?.defaultMessage ?? "An error occurred";
  const requestId = options?.requestId;

  // Log full error details server-side
  if (error instanceof Error) {
    log.error("error_handler.exception", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      request_id: requestId,
    });
  } else {
    log.error("error_handler.unknown_error", {
      error: String(error),
      request_id: requestId,
    });
  }

  const response: ErrorResponse = {
    message: isDev
      ? error instanceof Error
        ? error.message
        : String(error)
      : defaultMessage,
  };

  if (requestId) {
    response.requestId = requestId;
  }

  if (isDev) {
    response.timestamp = new Date().toISOString();
  }

  return response;
}

/**
 * Handler wrapper that catches synchronous and asynchronous errors.
 * Ensures all errors are logged and safe responses are returned.
 */
export function withErrorHandling<
  T extends Record<string, unknown>,
  R extends Record<string, unknown>,
>(
  handler: (context: T) => Promise<R> | R,
  options?: {
    isDev?: boolean;
    defaultMessage?: string;
  },
): (context: T) => Promise<ErrorResponse | R> {
  return async (context: T) => {
    try {
      return await handler(context);
    } catch (error) {
      const isDev = options?.isDev ?? process.env.NODE_ENV !== "production";
      return formatErrorResponse(error, {
        isDev,
        defaultMessage: options?.defaultMessage,
        requestId: (context as Record<string, unknown>).requestId as
          | string
          | undefined,
      });
    }
  };
}

/**
 * Common error messages (EC-9: Generic error messages)
 */
export const ERROR_MESSAGES = {
  INTERNAL_ERROR: "An internal error occurred",
  DATABASE_ERROR: "Database operation failed",
  INVALID_REQUEST: "Invalid request",
  UNAUTHORIZED: "Unauthorized",
  FORBIDDEN: "Access denied",
  NOT_FOUND: "Resource not found",
  CONFLICT: "Resource already exists",
  RATE_LIMITED: "Too many requests. Please try again later",
  SERVICE_UNAVAILABLE: "Service temporarily unavailable",
} as const;
