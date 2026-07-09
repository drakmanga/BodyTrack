import type { Measurement, MeasurementValue, MetricDefinition, PrismaClient } from "@prisma/client";

export type MeasurementWithValues = Measurement & {
  values: (MeasurementValue & { metricDefinition: MetricDefinition })[];
};

export async function getAllMetrics(prisma: PrismaClient, profileId: bigint): Promise<MetricDefinition[]> {
  return prisma.metricDefinition.findMany({
    where: { profileId },
    orderBy: { displayOrder: "asc" },
  });
}

export async function getAllMeasurementsWithValues(
  prisma: PrismaClient,
  profileId: bigint,
): Promise<MeasurementWithValues[]> {
  return prisma.measurement.findMany({
    where: { profileId },
    include: { values: { include: { metricDefinition: true }, orderBy: { id: "asc" } } },
    orderBy: { measurementDate: "asc" },
  });
}
