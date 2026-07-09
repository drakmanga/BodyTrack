import { parseDateOnly } from "./serialization.js";

const MIN_DATE = "1900-01-01";
const MAX_DATE = "9999-12-31";

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Used by /api/measurements and /api/photos: unrestricted range when omitted. */
export function parseFullRange(from?: string, to?: string) {
  return {
    from: parseDateOnly(from || MIN_DATE),
    to: parseDateOnly(to || MAX_DATE),
  };
}

/** Used by /api/metrics/:id/history: capped at "today" when omitted. */
export function parseHistoryRange(from?: string, to?: string) {
  return {
    from: parseDateOnly(from || MIN_DATE),
    to: parseDateOnly(to || todayIso()),
  };
}
