import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./env.js";
import prismaPlugin from "./plugins/prisma.js";
import errorHandlerPlugin from "./plugins/error-handler.js";
import jwtPlugin from "./plugins/jwt.js";
import authHookPlugin from "./plugins/auth-hook.js";
import multipartPlugin from "./plugins/multipart.js";
import healthRoutes from "./modules/health/health.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import profilesRoutes from "./modules/profiles/profiles.routes.js";
import metricsRoutes from "./modules/metrics/metrics.routes.js";
import metricStatsRoutes from "./modules/metrics/metric-stats.routes.js";
import measurementsRoutes from "./modules/measurements/measurements.routes.js";
import photosRoutes from "./modules/photos/photos.routes.js";
import exportRoutes from "./modules/export/export.routes.js";
import { ensureStorageRoot } from "./modules/photos/photo-storage.js";

function convertBigInts(value: unknown): unknown {
  if (typeof value === "bigint") return Number(value);
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((v) => {
      const c = convertBigInts(v);
      if (c !== v) changed = true;
      return c;
    });
    return changed ? next : value;
  }
  if (value !== null && typeof value === "object" && !(value instanceof Date)) {
    let changed = false;
    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const c = convertBigInts(v);
      if (c !== v) changed = true;
      next[k] = c;
    }
    return changed ? next : value;
  }
  return value;
}

export async function buildApp() {
  const fastify = Fastify({
    logger: true,
  });

  // Safety net: Fastify's serializer throws on BigInt, so if a mapper ever
  // forgets to convert a BigInt id to Number, this degrades to "still works"
  // instead of a 500. Real conversions belong in the route mappers, not here.
  fastify.addHook("preSerialization", async (request, _reply, payload) => {
    if (typeof payload !== "object" || payload === null) return payload;
    const converted = convertBigInts(payload);
    if (converted !== payload) {
      request.log.warn("BigInt found in response payload without explicit mapping");
    }
    return converted;
  });

  await fastify.register(cors, {
    origin: env.CORS_ALLOWED_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
    credentials: true,
  });

  await fastify.register(prismaPlugin);
  await fastify.register(errorHandlerPlugin);
  await fastify.register(jwtPlugin);
  await fastify.register(authHookPlugin);
  await fastify.register(multipartPlugin);

  ensureStorageRoot();

  // Public routes — no auth required.
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes);

  // Protected routes — everything else requires a valid Bearer token.
  await fastify.register(async (protectedApp) => {
    protectedApp.addHook("preHandler", fastify.requireAuth);
    await protectedApp.register(usersRoutes);
    await protectedApp.register(profilesRoutes);
    await protectedApp.register(metricsRoutes);
    await protectedApp.register(metricStatsRoutes);
    await protectedApp.register(measurementsRoutes);
    await protectedApp.register(photosRoutes);
    await protectedApp.register(exportRoutes);
  });

  return fastify;
}
