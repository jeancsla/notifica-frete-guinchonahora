import { logger } from "./logger";
import { getRedisClient, isRedisEnabled } from "./redis-client";

const log = logger.child({ component: "replay_protection" });

// In-memory fallback
const seenWebhookEvents = new Map<string, number>();

function getReplayWindowSeconds() {
  return Math.max(
    30,
    parseInt(process.env.CRON_WEBHOOK_MAX_SKEW_SECONDS || "300", 10),
  );
}

function getCacheKey(eventId: string): string {
  return `webhook_event:${eventId}`;
}

function cleanupExpired(nowMs: number) {
  for (const [eventId, expiresAtMs] of seenWebhookEvents.entries()) {
    if (expiresAtMs <= nowMs) {
      seenWebhookEvents.delete(eventId);
    }
  }
}

export function isWebhookTimestampValid(
  timestampSeconds: number,
  nowSeconds = Math.floor(Date.now() / 1_000),
) {
  const maxSkew = getReplayWindowSeconds();
  const delta = Math.abs(nowSeconds - timestampSeconds);
  return delta <= maxSkew;
}

export async function registerWebhookEventId(
  eventId: string,
  nowMs = Date.now(),
  ttlSeconds = getReplayWindowSeconds(),
) {
  cleanupExpired(nowMs);

  // Try Redis first
  if (isRedisEnabled()) {
    try {
      const client = await getRedisClient();
      // Use SETNX (set if not exists) semantics via get then set
      const existing = await client.get(getCacheKey(eventId));
      if (existing) {
        return false;
      }
      await client.set(getCacheKey(eventId), "1", ttlSeconds);
      return true;
    } catch (error) {
      log.warn("replay_protection.redis_failed", { eventId, error });
      // Fall through to memory
    }
  }

  // Fallback to memory
  if (seenWebhookEvents.has(eventId)) {
    return false;
  }

  seenWebhookEvents.set(eventId, nowMs + ttlSeconds * 1_000);
  return true;
}

export function resetReplayProtectionState() {
  seenWebhookEvents.clear();
}
