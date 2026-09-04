interface AttemptRecord {
  count: number;
  firstAttemptTime: number;
  lastAttemptTime: number;
  blockedUntil?: number;
}

const attemptsMap = new Map<string, AttemptRecord>();
const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000; // 5 minute
const BLOCK_DURATION_MS = 5 * 60 * 1000; // 5 minute blocare

// Curățare automată a intrărilor vechi la fiecare 10 minute
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of attemptsMap.entries()) {
    if (now - record.lastAttemptTime > WINDOW_MS * 2 && (!record.blockedUntil || now > record.blockedUntil)) {
      attemptsMap.delete(key);
    }
  }
}, 10 * 60 * 1000);

export function checkRateLimit(key: string): { allowed: boolean; retryAfterSeconds: number } {
  const record = attemptsMap.get(key);
  if (!record) return { allowed: true, retryAfterSeconds: 0 };

  const now = Date.now();

  // Dacă utilizatorul este în perioada de blocare
  if (record.blockedUntil && record.blockedUntil > now) {
    const retryAfter = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, retryAfterSeconds: retryAfter };
  }

  // Dacă fereastra a expirat, resetăm
  if (now - record.firstAttemptTime > WINDOW_MS && (!record.blockedUntil || record.blockedUntil <= now)) {
    attemptsMap.delete(key);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function recordFailedAttempt(key: string): { blocked: boolean; attemptsLeft: number } {
  const now = Date.now();
  let record = attemptsMap.get(key);

  if (!record || now - record.firstAttemptTime > WINDOW_MS) {
    record = {
      count: 1,
      firstAttemptTime: now,
      lastAttemptTime: now,
    };
    attemptsMap.set(key, record);
    return { blocked: false, attemptsLeft: MAX_FAILED_ATTEMPTS - 1 };
  }

  record.count += 1;
  record.lastAttemptTime = now;

  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.blockedUntil = now + BLOCK_DURATION_MS;
    return { blocked: true, attemptsLeft: 0 };
  }

  return { blocked: false, attemptsLeft: MAX_FAILED_ATTEMPTS - record.count };
}

export function clearFailedAttempts(key: string): void {
  attemptsMap.delete(key);
}
