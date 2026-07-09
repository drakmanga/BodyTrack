import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import type { PrismaClient, ProgressPhoto } from "@prisma/client";
import { ApiException } from "../../common/errors.js";
import {
  extensionForContentType,
  buildRelativePath,
  resolveAbsolutePath,
  guessContentType,
} from "./photo-storage.js";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export async function listPhotos(
  prisma: PrismaClient,
  profileId: bigint,
  from: Date,
  to: Date,
  skip: number,
  take: number,
): Promise<{ photos: ProgressPhoto[]; total: number }> {
  const where = { profileId, photoDate: { gte: from, lte: to } };
  const [photos, total] = await Promise.all([
    prisma.progressPhoto.findMany({ where, orderBy: { photoDate: "desc" }, skip, take }),
    prisma.progressPhoto.count({ where }),
  ]);
  return { photos, total };
}

export interface UploadInput {
  buffer: Buffer;
  mimetype: string | undefined;
  photoDate: Date;
  measurementId: bigint | null;
}

export async function uploadPhoto(
  prisma: PrismaClient,
  profileId: bigint,
  input: UploadInput,
): Promise<ProgressPhoto> {
  if (!input.buffer || input.buffer.length === 0) {
    throw ApiException.badRequest("File is required");
  }
  if (input.buffer.length > MAX_FILE_SIZE_BYTES) {
    throw ApiException.badRequest("File too large, max 10MB");
  }
  const extension = extensionForContentType(input.mimetype);

  if (input.measurementId != null) {
    const owned = await prisma.measurement.findFirst({ where: { id: input.measurementId, profileId } });
    if (!owned) {
      throw ApiException.badRequest(`Measurement ${input.measurementId} not found`);
    }
  }

  const relativePath = buildRelativePath(profileId, extension);
  const targetPath = resolveAbsolutePath(relativePath);
  await fsp.mkdir(path.dirname(targetPath), { recursive: true });
  await fsp.writeFile(targetPath, input.buffer);

  return prisma.progressPhoto.create({
    data: {
      profileId,
      measurementId: input.measurementId ?? undefined,
      photoDate: input.photoDate,
      filePath: relativePath,
    },
  });
}

export async function getOwnedPhoto(prisma: PrismaClient, profileId: bigint, id: bigint): Promise<ProgressPhoto> {
  const photo = await prisma.progressPhoto.findFirst({ where: { id, profileId } });
  if (!photo) {
    throw ApiException.notFound("Photo not found");
  }
  return photo;
}

export async function deletePhoto(prisma: PrismaClient, profileId: bigint, id: bigint): Promise<void> {
  const photo = await getOwnedPhoto(prisma, profileId, id);
  const filePath = resolveAbsolutePath(photo.filePath);
  await fsp.rm(filePath, { force: true });
  await prisma.progressPhoto.delete({ where: { id: photo.id } });
}

export interface ResolvedFile {
  absolutePath: string;
  contentType: string;
}

export async function resolvePhotoFile(prisma: PrismaClient, profileId: bigint, id: bigint): Promise<ResolvedFile> {
  const photo = await getOwnedPhoto(prisma, profileId, id);
  const absolutePath = resolveAbsolutePath(photo.filePath);
  if (!fs.existsSync(absolutePath)) {
    throw ApiException.notFound("Photo file not found");
  }
  return { absolutePath, contentType: guessContentType(photo.filePath) };
}
