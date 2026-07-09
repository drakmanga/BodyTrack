import type { FastifyInstance } from "fastify";
import { parseBody, parseIdParam } from "../../common/validation.js";
import { parseFullRange } from "../../common/date-range.js";
import { parsePageParams, buildPage } from "../../common/pagination.js";
import { measurementSchema } from "./measurements.schemas.js";
import { listMeasurements, createMeasurement, updateMeasurement, deleteMeasurement } from "./measurements.service.js";
import { mapMeasurement } from "./measurements.mapper.js";

export default async function measurementsRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { from?: string; to?: string; page?: string; size?: string } }>(
    "/api/measurements",
    async (request) => {
      const { from, to } = parseFullRange(request.query.from, request.query.to);
      const { page, size, skip, take } = parsePageParams(request.query, { defaultSize: 50, maxSize: 200 });
      const { measurements, total } = await listMeasurements(
        fastify.prisma,
        request.currentProfile!.id,
        from,
        to,
        skip,
        take,
      );
      return buildPage(measurements.map(mapMeasurement), total, page, size);
    },
  );

  fastify.post("/api/measurements", async (request, reply) => {
    const input = parseBody(measurementSchema, request.body);
    const measurement = await createMeasurement(fastify.prisma, request.currentProfile!.id, input);
    return reply.status(201).send(mapMeasurement(measurement));
  });

  fastify.put<{ Params: { id: string } }>("/api/measurements/:id", async (request) => {
    const id = parseIdParam(request.params.id);
    const input = parseBody(measurementSchema, request.body);
    const measurement = await updateMeasurement(fastify.prisma, request.currentProfile!.id, id, input);
    return mapMeasurement(measurement);
  });

  fastify.delete<{ Params: { id: string } }>("/api/measurements/:id", async (request, reply) => {
    const id = parseIdParam(request.params.id);
    await deleteMeasurement(fastify.prisma, request.currentProfile!.id, id);
    return reply.status(204).send();
  });
}
