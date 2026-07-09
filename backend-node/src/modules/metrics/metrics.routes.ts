import type { FastifyInstance } from "fastify";
import { parseBody, parseIdParam } from "../../common/validation.js";
import { createMetricSchema, updateMetricSchema } from "./metrics.schemas.js";
import { listActive, createMetric, updateMetric, softDeleteMetric } from "./metrics.service.js";
import { mapMetric } from "./metrics.mapper.js";
import { METRIC_CATALOG } from "./metrics.catalog.js";

export default async function metricsRoutes(fastify: FastifyInstance) {
  fastify.get("/api/metrics", async (request) => {
    const metrics = await listActive(fastify.prisma, request.currentProfile!.id);
    return metrics.map(mapMetric);
  });

  fastify.get("/api/metrics/catalog", async () => METRIC_CATALOG);

  fastify.post("/api/metrics", async (request, reply) => {
    const input = parseBody(createMetricSchema, request.body);
    const metric = await createMetric(fastify.prisma, request.currentProfile!.id, input);
    return reply.status(201).send(mapMetric(metric));
  });

  fastify.put<{ Params: { id: string } }>("/api/metrics/:id", async (request) => {
    const id = parseIdParam(request.params.id);
    const input = parseBody(updateMetricSchema, request.body);
    const metric = await updateMetric(fastify.prisma, request.currentProfile!.id, id, input);
    return mapMetric(metric);
  });

  fastify.delete<{ Params: { id: string } }>("/api/metrics/:id", async (request, reply) => {
    const id = parseIdParam(request.params.id);
    await softDeleteMetric(fastify.prisma, request.currentProfile!.id, id);
    return reply.status(204).send();
  });
}
