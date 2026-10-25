import { Prisma, type PrismaClient } from "@prisma/client";
import { ApiException } from "../../common/errors.js";
import { getOwnedMetric } from "./metrics.service.js";

const EARLIEST_DATE = new Date("1900-01-01T00:00:00.000Z");
const WEIGHT_UNIT = "kg";

export type Period = "30d" | "90d" | "1y" | "all";

export function parsePeriod(raw: string | undefined): Period {
  const period = raw ?? "all";
  if (period !== "30d" && period !== "90d" && period !== "1y" && period !== "all") {
    throw ApiException.badRequest("Invalid period, expected one of: 30d, 90d, 1y, all");
  }
  return period;
}

function rangeForPeriod(period: Period): { from: Date; to: Date } {
  const to = new Date();
  if (period === "all") return { from: EARLIEST_DATE, to };
  const from = new Date(to);
  if (period === "30d") from.setUTCDate(from.getUTCDate() - 30);
  else if (period === "90d") from.setUTCDate(from.getUTCDate() - 90);
  else from.setUTCFullYear(from.getUTCFullYear() - 1);
  return { from, to };
}

function heightInMeters(heightCm: Prisma.Decimal | null): Prisma.Decimal | null {
  return heightCm == null ? null : heightCm.dividedBy(100);
}

export function bmiFor(unit: string, weightValue: Prisma.Decimal, heightM: Prisma.Decimal | null): Prisma.Decimal | null {
  // Deliberately fragile, ported as-is from the Java backend: BMI is tied to a
  // literal "kg" unit-string match, not an explicit isWeight flag.
  if (heightM == null || unit.toLowerCase() !== WEIGHT_UNIT) return null;
  return weightValue.dividedBy(heightM.times(heightM)).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export interface HistoryPoint {
  date: Date;
  value: Prisma.Decimal;
  bmi: Prisma.Decimal | null;
}

export async function history(
  prisma: PrismaClient,
  profileId: bigint,
  metricId: bigint,
  from: Date,
  to: Date,
  skip: number,
  take: number,
): Promise<{ points: HistoryPoint[]; total: number }> {
  const metric = await getOwnedMetric(prisma, profileId, metricId);
  const profile = await prisma.profile.findUnique({ where: { id: profileId } });
  const heightM = heightInMeters(profile?.heightCm ?? null);

  const where = {
    metricDefinitionId: metricId,
    measurement: { profileId, measurementDate: { gte: from, lte: to } },
  };

  const [rows, total] = await Promise.all([
    prisma.measurementValue.findMany({
      where,
      include: { measurement: true },
      orderBy: { measurement: { measurementDate: "asc" } },
      skip,
      take,
    }),
    prisma.measurementValue.count({ where }),
  ]);

  const points = rows.map((row) => ({
    date: row.measurement.measurementDate,
    value: row.value,
    bmi: bmiFor(metric.unit, row.value, heightM),
  }));

  return { points, total };
}

export interface MetricSummary {
  current: Prisma.Decimal | null;
  delta: Prisma.Decimal | null;
  deltaAbsolute: Prisma.Decimal | null;
  min: Prisma.Decimal | null;
  max: Prisma.Decimal | null;
  average: Prisma.Decimal | null;
  dataPointCount: number;
}

export async function summary(
  prisma: PrismaClient,
  profileId: bigint,
  metricId: bigint,
  period: Period,
): Promise<MetricSummary> {
  await getOwnedMetric(prisma, profileId, metricId);
  const { from, to } = rangeForPeriod(period);

  const rows = await prisma.measurementValue.findMany({
    where: { metricDefinitionId: metricId, measurement: { profileId, measurementDate: { gte: from, lte: to } } },
    orderBy: { measurement: { measurementDate: "asc" } },
    select: { value: true },
  });

  if (rows.length === 0) {
    return { current: null, delta: null, deltaAbsolute: null, min: null, max: null, average: null, dataPointCount: 0 };
  }

  const values = rows.map((r) => r.value);
  const current = values[values.length - 1];
  const delta = values.length >= 2 ? current.minus(values[0]) : null;
  let min = values[0];
  let max = values[0];
  let sum = new Prisma.Decimal(0);
  for (const v of values) {
    if (v.lessThan(min)) min = v;
    if (v.greaterThan(max)) max = v;
    sum = sum.plus(v);
  }
  const average = sum.dividedBy(values.length).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

  // Absolute delta is always vs. the very first measurement ever taken for this
  // metric, regardless of the selected period's date range - unlike `delta`
  // above, which is scoped to the period.
  const everCount = await prisma.measurementValue.count({
    where: { metricDefinitionId: metricId, measurement: { profileId } },
  });
  let deltaAbsolute: Prisma.Decimal | null = null;
  if (everCount >= 2) {
    const firstEver = await prisma.measurementValue.findFirst({
      where: { metricDefinitionId: metricId, measurement: { profileId } },
      orderBy: { measurement: { measurementDate: "asc" } },
      select: { value: true },
    });
    if (firstEver) deltaAbsolute = current.minus(firstEver.value);
  }

  return { current, delta, deltaAbsolute, min, max, average, dataPointCount: values.length };
}
