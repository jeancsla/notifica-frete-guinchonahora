const seenWebhookEvents = new Map<string, number>();

function getReplayWindowSeconds() {
  return Math.max(
    30,
    parseInt(process.env.CRON_WEBHOOK_MAX_SKEW_SECONDS || "300", 10),
  );
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

export function registerWebhookEventId(
  eventId: string,
  nowMs = Date.now(),
  ttlSeconds = getReplayWindowSeconds(),
) {
  cleanupExpired(nowMs);

  if (seenWebhookEvents.has(eventId)) {
    return false;
  }

  seenWebhookEvents.set(eventId, nowMs + ttlSeconds * 1_000);
  return true;
}

export function resetReplayProtectionState() {
  seenWebhookEvents.clear();
}
