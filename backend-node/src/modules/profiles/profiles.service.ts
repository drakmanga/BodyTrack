import path from "node:path";
import fsp from "node:fs/promises";
import type { Profile, PrismaClient } from "@prisma/client";
import { ApiException } from "../../common/errors.js";
import { METRIC_CATALOG } from "../metrics/metrics.catalog.js";
import { storageRoot } from "../photos/photo-storage.js";
import type { CreateProfileInput, UpdateProfileInput } from "./profiles.schemas.js";

export async function listProfiles(prisma: PrismaClient, accountId: bigint): Promise<Profile[]> {
  return prisma.profile.findMany({ where: { accountId }, orderBy: { createdAt: "asc" } });
}

export async function getOwnedProfile(prisma: PrismaClient, accountId: bigint, id: bigint): Promise<Profile> {
  const profile = await prisma.profile.findFirst({ where: { id, accountId } });
  if (!profile) {
    throw ApiException.notFound("Profile not found");
  }
  return profile;
}

export async function createProfile(
  prisma: PrismaClient,
  accountId: bigint,
  input: CreateProfileInput,
): Promise<Profile> {
  return prisma.$transaction(async (tx) => {
    const profile = await tx.profile.create({
      data: { accountId, displayName: input.displayName, isPrimary: false },
    });

    // Same default catalog a new account gets at registration, see auth.service.ts.
    await tx.metricDefinition.createMany({
      data: METRIC_CATALOG.map((entry, index) => ({
        profileId: profile.id,
        name: entry.name,
        unit: entry.unit,
        displayOrder: index,
        howToMeasure: entry.howToMeasure,
      })),
    });

    return profile;
  });
}

export async function updateProfile(
  prisma: PrismaClient,
  accountId: bigint,
  id: bigint,
  input: UpdateProfileInput,
): Promise<Profile> {
  await getOwnedProfile(prisma, accountId, id);

  return prisma.profile.update({
    where: { id },
    data: {
      ...(input.displayName != null && { displayName: input.displayName }),
      ...(input.heightCm != null && { heightCm: input.heightCm }),
      ...(input.wristCm != null && { wristCm: input.wristCm }),
      ...(input.sex != null && { sex: input.sex }),
      ...(input.unitSystem != null && { unitSystem: input.unitSystem }),
    },
  });
}

export async function deleteProfile(prisma: PrismaClient, accountId: bigint, id: bigint): Promise<void> {
  const profile = await getOwnedProfile(prisma, accountId, id);
  if (profile.isPrimary) {
    throw ApiException.badRequest("The primary profile cannot be deleted");
  }

  await prisma.profile.delete({ where: { id } });
  // DB rows (metrics/measurements/photos) are gone via cascade; the photo files themselves
  // live on disk and aren't touched by the DB cascade, so remove that folder explicitly.
  await fsp.rm(path.join(storageRoot, id.toString()), { recursive: true, force: true });
}
