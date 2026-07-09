import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "../../env.js";
import { ApiException } from "../../common/errors.js";

const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const storageRoot = path.resolve(env.PHOTOS_STORAGE_PATH);

export function ensureStorageRoot(): void {
  fs.mkdirSync(storageRoot, { recursive: true });
}

export function extensionForContentType(contentType: string | undefined): string {
  const ext = contentType ? ALLOWED_CONTENT_TYPES[contentType] : undefined;
  if (!ext) {
    throw ApiException.badRequest("Unsupported file type, only JPG/PNG/WEBP images are allowed");
  }
  return ext;
}

export function buildRelativePath(profileId: bigint, extension: string): string {
  return `${profileId}/${randomUUID()}.${extension}`;
}

/** Path-traversal guard, kept even though relativePath is always server-generated (defense in depth). */
export function resolveAbsolutePath(relativePath: string): string {
  const target = path.normalize(path.join(storageRoot, relativePath));
  if (!target.startsWith(storageRoot)) {
    throw ApiException.badRequest("Invalid file path");
  }
  return target;
}

export function guessContentType(relativePath: string): string {
  if (relativePath.endsWith(".png")) return "image/png";
  if (relativePath.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}
