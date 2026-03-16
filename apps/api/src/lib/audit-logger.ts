import { logger } from "./logger";
import { query } from "../infra/database";

const log = logger.child({ component: "audit_logger" });

export type AuditEventType =
  | "login_success"
  | "login_failure"
  | "login_rate_limited"
  | "password_updated"
  | "user_created"
  | "admin_api_accessed"
  | "webhook_received"
  | "webhook_rejected"
  | "migration_applied"
  | "api_error";

export type AuditSeverity = "debug" | "info" | "warn" | "error";

export interface AuditLogEntry {
  eventType: AuditEventType;
  userId?: number;
  username?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  severity?: AuditSeverity;
}

/**
 * Log a security event asynchronously (fire-and-forget).
 * Does not block request processing.
 * (PERF-2: Fire-and-forget audit logging)
 */
export function auditLog(entry: AuditLogEntry): void {
  // Queue the audit log for async processing
  // This prevents blocking the main request handler
  setImmediate(() => {
    logAuditEventAsync(entry).catch((error) => {
      log.warn("audit_logger.async_write_failed", {
        event_type: entry.eventType,
        error,
      });
    });
  });
}

/**
 * Internal async function to write audit log to database.
 */
async function logAuditEventAsync(entry: AuditLogEntry): Promise<void> {
  try {
    await query({
      text: `
        INSERT INTO notifica_frete_audit_logs
        (event_type, user_id, username, ip_address, user_agent, details, severity)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      values: [
        entry.eventType,
        entry.userId ?? null,
        entry.username ?? null,
        entry.ipAddress ?? null,
        entry.userAgent ?? null,
        entry.details ? JSON.stringify(entry.details) : null,
        entry.severity ?? "info",
      ],
    });

    log.debug("audit_logger.event_logged", {
      event_type: entry.eventType,
      user_id: entry.userId,
    });
  } catch (error) {
    // Log the error but don't throw - audit logging failure shouldn't affect main flow
    log.error("audit_logger.write_failed", {
      event_type: entry.eventType,
      error,
    });
  }
}

/**
 * Helper to extract IP address from request headers.
 */
export function extractIpAddress(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const forwarded = forwardedFor.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip") || "";
  const cfConnectingIp = request.headers.get("cf-connecting-ip") || "";
  return forwarded || realIp || cfConnectingIp || "unknown";
}

/**
 * Helper to extract user agent from request.
 */
export function extractUserAgent(request: Request): string {
  return request.headers.get("user-agent") || "unknown";
}
