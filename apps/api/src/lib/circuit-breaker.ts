import { logger } from "./logger";
import {
  setCircuitBreakerState,
  recordCircuitBreakerResult,
} from "./metrics";

const log = logger.child({ component: "circuit_breaker" });

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export type CircuitBreakerConfig = {
  /** Number of failures before opening the circuit */
  failureThreshold: number;
  /** Time in ms before attempting to close the circuit */
  resetTimeoutMs: number;
  /** Half-open request count to test if service recovered */
  halfOpenMaxCalls: number;
};

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 30000,
  halfOpenMaxCalls: 3,
};

class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failures = 0;
  private successes = 0;
  private nextAttempt = 0;
  private halfOpenCalls = 0;

  constructor(
    private name: string,
    private config: CircuitBreakerConfig = DEFAULT_CONFIG,
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() < this.nextAttempt) {
        const remaining = Math.ceil((this.nextAttempt - Date.now()) / 1000);
        throw new CircuitBreakerOpenError(
          `Circuit breaker '${this.name}' is OPEN. Retry after ${remaining}s`,
          this.name,
        );
      }
      this.state = "HALF_OPEN";
      this.halfOpenCalls = 0;
      setCircuitBreakerState(this.name, "HALF_OPEN");
      log.info("circuit_breaker.half_open", { name: this.name });
    }

    if (this.state === "HALF_OPEN") {
      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        throw new CircuitBreakerOpenError(
          `Circuit breaker '${this.name}' is HALF_OPEN and at capacity. Retry later.`,
          this.name,
        );
      }
      this.halfOpenCalls++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    recordCircuitBreakerResult(this.name, true);
    if (this.state === "HALF_OPEN") {
      this.successes++;
      if (this.successes >= this.config.halfOpenMaxCalls) {
        this.close();
      }
    }
  }

  private onFailure(): void {
    recordCircuitBreakerResult(this.name, false);
    this.failures++;

    if (this.state === "HALF_OPEN") {
      this.open();
      return;
    }

    if (this.failures >= this.config.failureThreshold) {
      this.open();
    }
  }

  private open(): void {
    this.state = "OPEN";
    this.nextAttempt = Date.now() + this.config.resetTimeoutMs;
    this.failures = 0;
    this.successes = 0;
    setCircuitBreakerState(this.name, "OPEN");
    log.warn("circuit_breaker.opened", {
      name: this.name,
      nextAttempt: new Date(this.nextAttempt).toISOString(),
    });
  }

  private close(): void {
    this.state = "CLOSED";
    this.failures = 0;
    this.successes = 0;
    this.halfOpenCalls = 0;
    setCircuitBreakerState(this.name, "CLOSED");
    log.info("circuit_breaker.closed", { name: this.name });
  }

  getState(): CircuitState {
    return this.state;
  }

  getMetrics() {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      nextAttempt: this.nextAttempt,
      halfOpenCalls: this.halfOpenCalls,
    };
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(
    message: string,
    public readonly circuitName: string,
  ) {
    super(message);
    this.name = "CircuitBreakerOpenError";
  }
}

// Circuit breaker registry for external services
const circuitBreakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(
  name: string,
  config?: Partial<CircuitBreakerConfig>,
): CircuitBreaker {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(
      name,
      new CircuitBreaker(name, { ...DEFAULT_CONFIG, ...config }),
    );
  }
  return circuitBreakers.get(name)!;
}

export function getAllCircuitBreakerMetrics() {
  const metrics: Record<string, ReturnType<CircuitBreaker["getMetrics"]>> = {};
  for (const [name, breaker] of circuitBreakers) {
    metrics[name] = breaker.getMetrics();
  }
  return metrics;
}
