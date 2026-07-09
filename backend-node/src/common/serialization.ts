import type { Prisma } from "@prisma/client";

/** Postgres DATE columns always come back as UTC-midnight Date objects from Prisma. */
export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Parses a "YYYY-MM-DD" string into the UTC-midnight Date Prisma expects for @db.Date columns. */
export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function toNumberOrNull(value: Prisma.Decimal | null | undefined): number | null {
  return value == null ? null : value.toNumber();
}

export function toNumber(value: Prisma.Decimal): number {
  return value.toNumber();
}
