import type { FastifyRequest } from "fastify";
import { ApiException } from "../common/errors.js";

// Fixed-window limiter keyed by client IP, single-instance by design (matches
// the Java LoginRateLimitFilter — this deployment is never horizontally scaled).
const MAX_ATTEMPTS = 5;
const WINDOW_MILLIS = 60_000;

interface Window {
  windowStart: number;
  count: number;
}

const attemptsByIp = new Map<string, Window>();

function clientIp(request: FastifyRequest): string {
  const forwardedFor = request.headers["x-forwarded-for"];
  const value = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  if (value && value.trim() !== "") {
    return value.split(",")[0].trim();
  }
  return request.ip;
}

export async function loginRateLimit(request: FastifyRequest): Promise<void> {
  const ip = clientIp(request);
  const now = Date.now();
  let window = attemptsByIp.get(ip);

  if (!window || now - window.windowStart > WINDOW_MILLIS) {
    window = { windowStart: now, count: 0 };
    attemptsByIp.set(ip, window);
  }

  window.count += 1;
  if (window.count > MAX_ATTEMPTS) {
    throw ApiException.tooManyRequests("Too many login attempts, try again later");
  }
}
