import type { Measurement, MeasurementValue, MetricDefinition, PrismaClient } from "@prisma/client";
import { ApiException } from "../../common/errors.js";
import { parseDateOnly } from "../../common/serialization.js";
import type { MeasurementInput } from "./measurements.schemas.js";

type MeasurementWithValues = Measurement & {
  values: (MeasurementValue & { metricDefinition: MetricDefinition })[];
};

const valuesInclude = {
  values: { include: { metricDefinition: true }, orderBy: { id: "asc" as const } },
};

function validateNoDuplicates(values: { metricDefinitionId: number }[]): void {
  const seen = new Set<number>();
  for (const v of values) {
    if (seen.has(v.metricDefinitionId)) {
      throw ApiException.badRequest(`Duplicate metricDefinitionId ${v.metricDefinitionId} in values`);
    }
    seen.add(v.metricDefinitionId);
  }
}

async function assertMetricsOwned(prisma: PrismaClient, profileId: bigint, metricIds: bigint[]): Promise<void> {
  if (metricIds.length === 0) return;
  const owned = await prisma.metricDefinition.findMany({
    where: { id: { in: metricIds }, profileId },
    select: { id: true },
  });
  const ownedSet = new Set(owned.map((o) => o.id.toString()));
  for (const id of metricIds) {
    if (!ownedSet.has(id.toString())) {
      throw ApiException.badRequest(`Metric definition ${id} not found`);
    }
  }
}

export async function getOwnedMeasurement(prisma: PrismaClient, profileId: bigint, id: bigint): Promise<Measurement> {
  const measurement = await prisma.measurement.findFirst({ where: { id, profileId } });
  if (!measurement) {
    throw ApiException.notFound("Measurement not found");
  }
  return measurement;
}

async function getMeasurementWithValues(prisma: PrismaClient, id: bigint): Promise<MeasurementWithValues> {
  const measurement = await prisma.measurement.findUniqueOrThrow({
    where: { id },
    include: valuesInclude,
  });
  return measurement;
}

export async function listMeasurements(
  prisma: PrismaClient,
  profileId: bigint,
  from: Date,
  to: Date,
  skip: number,
  take: number,
): Promise<{ measurements: MeasurementWithValues[]; total: number }> {
  const where = { profileId, measurementDate: { gte: from, lte: to } };
  const [measurements, total] = await Promise.all([
    prisma.measurement.findMany({
      where,
      include: valuesInclude,
      orderBy: { measurementDate: "desc" },
      skip,
      take,
    }),
    prisma.measurement.count({ where }),
  ]);
  return { measurements, total };
}

export async function createMeasurement(
  prisma: PrismaClient,
  profileId: bigint,
  input: MeasurementInput,
): Promise<MeasurementWithValues> {
  validateNoDuplicates(input.values);
  const measurementDate = parseDateOnly(input.measurementDate);

  const existing = await prisma.measurement.findFirst({ where: { profileId, measurementDate } });
  if (existing) {
    throw ApiException.conflict("A measurement already exists for this date, use PUT to update it");
  }

  const metricIds = input.values.map((v) => BigInt(v.metricDefinitionId));
  await assertMetricsOwned(prisma, profileId, metricIds);

  const created = await prisma.measurement.create({
    data: {
      profileId,
      measurementDate,
      note: input.note ?? null,
      values: {
        create: input.values.map((v) => ({
          metricDefinitionId: BigInt(v.metricDefinitionId),
          value: v.value,
        })),
      },
    },
    include: valuesInclude,
  });

  return created;
}

export async function updateMeasurement(
  prisma: PrismaClient,
  profileId: bigint,
  id: bigint,
  input: MeasurementInput,
): Promise<MeasurementWithValues> {
  const measurement = await getOwnedMeasurement(prisma, profileId, id);
  validateNoDuplicates(input.values);

  const newDate = parseDateOnly(input.measurementDate);
  const dateChanged = measurement.measurementDate.getTime() !== newDate.getTime();

  if (dateChanged) {
    const collision = await prisma.measurement.findFirst({ where: { profileId, measurementDate: newDate } });
    if (collision) {
      throw ApiException.conflict("A measurement already exists for this date");
    }
  }

  const metricIds = input.values.map((v) => BigInt(v.metricDefinitionId));
  await assertMetricsOwned(prisma, profileId, metricIds);

  const currentValues = await prisma.measurementValue.findMany({ where: { measurementId: id } });
  const requestedIds = new Set(metricIds.map(String));
  const currentIds = new Set(currentValues.map((v) => v.metricDefinitionId.toString()));

  const toDelete = currentValues
    .filter((v) => !requestedIds.has(v.metricDefinitionId.toString()))
    .map((v) => v.metricDefinitionId);
  const toInsert = input.values.filter((v) => !currentIds.has(String(v.metricDefinitionId)));
  const toUpdate = input.values.filter((v) => currentIds.has(String(v.metricDefinitionId)));

  await prisma.$transaction([
    ...(toDelete.length > 0
      ? [prisma.measurementValue.deleteMany({ where: { measurementId: id, metricDefinitionId: { in: toDelete } } })]
      : []),
    ...toUpdate.map((v) =>
      prisma.measurementValue.updateMany({
        where: { measurementId: id, metricDefinitionId: BigInt(v.metricDefinitionId) },
        data: { value: v.value },
      }),
    ),
    ...(toInsert.length > 0
      ? [
          prisma.measurementValue.createMany({
            data: toInsert.map((v) => ({
              measurementId: id,
              metricDefinitionId: BigInt(v.metricDefinitionId),
              value: v.value,
            })),
          }),
        ]
      : []),
    prisma.measurement.update({
      where: { id },
      data: { measurementDate: newDate, note: input.note ?? null },
    }),
  ]);

  return getMeasurementWithValues(prisma, id);
}

export async function deleteMeasurement(prisma: PrismaClient, profileId: bigint, id: bigint): Promise<void> {
  await getOwnedMeasurement(prisma, profileId, id);
  await prisma.measurement.delete({ where: { id } });
}
