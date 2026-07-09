import type { MetricDefinition, Prisma, PrismaClient } from "@prisma/client";
import { ApiException } from "../../common/errors.js";
import type { CreateMetricInput, UpdateMetricInput } from "./metrics.schemas.js";

type Client = PrismaClient | Prisma.TransactionClient;

export async function listActive(prisma: PrismaClient, profileId: bigint): Promise<MetricDefinition[]> {
  return prisma.metricDefinition.findMany({
    where: { profileId, isActive: true },
    orderBy: { displayOrder: "asc" },
  });
}

async function findMaxDisplayOrder(client: Client, profileId: bigint): Promise<number> {
  const result = await client.metricDefinition.aggregate({
    where: { profileId },
    _max: { displayOrder: true },
  });
  return result._max.displayOrder ?? -1;
}

export async function getOwnedMetric(prisma: PrismaClient, profileId: bigint, id: bigint): Promise<MetricDefinition> {
  const metric = await prisma.metricDefinition.findFirst({ where: { id, profileId } });
  if (!metric) {
    throw ApiException.notFound("Metric not found");
  }
  return metric;
}

export async function createMetric(
  prisma: PrismaClient,
  profileId: bigint,
  input: CreateMetricInput,
): Promise<MetricDefinition> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.metricDefinition.findFirst({
      where: { profileId, name: { equals: input.name, mode: "insensitive" } },
    });

    if (existing) {
      if (existing.isActive) {
        throw ApiException.conflict("A metric with this name already exists");
      }
      const nextOrder = (await findMaxDisplayOrder(tx, profileId)) + 1;
      return tx.metricDefinition.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          unit: input.unit,
          howToMeasure: input.howToMeasure ?? null,
          displayOrder: nextOrder,
        },
      });
    }

    const nextOrder = (await findMaxDisplayOrder(tx, profileId)) + 1;
    return tx.metricDefinition.create({
      data: {
        profileId,
        name: input.name,
        unit: input.unit,
        displayOrder: nextOrder,
        howToMeasure: input.howToMeasure ?? null,
      },
    });
  });
}

export async function updateMetric(
  prisma: PrismaClient,
  profileId: bigint,
  id: bigint,
  input: UpdateMetricInput,
): Promise<MetricDefinition> {
  const metric = await getOwnedMetric(prisma, profileId, id);

  if (metric.name.toLowerCase() !== input.name.toLowerCase()) {
    const other = await prisma.metricDefinition.findFirst({
      where: { profileId, name: { equals: input.name, mode: "insensitive" }, id: { not: id } },
    });
    if (other) {
      throw ApiException.conflict("A metric with this name already exists");
    }
  }

  return prisma.metricDefinition.update({
    where: { id },
    data: {
      name: input.name,
      unit: input.unit,
      displayOrder: input.displayOrder,
      howToMeasure: input.howToMeasure ?? null,
    },
  });
}

export async function softDeleteMetric(prisma: PrismaClient, profileId: bigint, id: bigint): Promise<void> {
  const result = await prisma.metricDefinition.updateMany({
    where: { id, profileId },
    data: { isActive: false },
  });
  if (result.count === 0) {
    throw ApiException.notFound("Metric not found");
  }
}
