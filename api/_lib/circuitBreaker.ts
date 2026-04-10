interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeoutMs?: number;
  halfOpenMaxAttempts?: number;
}

type CircuitState = "closed" | "open" | "half-open";

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failureCount = 0;
  private lastFailureTime = 0;
  private halfOpenAttempts = 0;

  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly halfOpenMaxAttempts: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 60000;
    this.halfOpenMaxAttempts = options.halfOpenMaxAttempts ?? 2;
  }

  isRequestAllowed(): boolean {
    const now = Date.now();

    if (this.state === "open") {
      if (now - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = "half-open";
        this.halfOpenAttempts = 0;
      } else {
        return false;
      }
    }

    if (this.state === "half-open") {
      if (this.halfOpenAttempts >= this.halfOpenMaxAttempts) {
        return false;
      }
      this.halfOpenAttempts++;
    }

    return true;
  }

  recordSuccess(): void {
    this.state = "closed";
    this.failureCount = 0;
    this.halfOpenAttempts = 0;
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === "half-open" || this.failureCount >= this.failureThreshold) {
      this.state = "open";
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

export const claudeCircuitBreaker = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 300000 });
export const googleCircuitBreaker = new CircuitBreaker({ failureThreshold: 5, resetTimeoutMs: 120000 });
export const notionCircuitBreaker = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 300000 });
