import type { ZodSchema } from "zod";
import { ApiException } from "./errors.js";

export function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue.path.join(".") || "body";
    throw ApiException.badRequest(`${field}: ${issue.message}`);
  }
  return result.data;
}

export function parseIdParam(raw: string): bigint {
  if (!/^\d+$/.test(raw)) {
    throw ApiException.badRequest(`Invalid id: ${raw}`);
  }
  return BigInt(raw);
}
