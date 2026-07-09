import type { FastifyInstance } from "fastify";
import { ApiException } from "../../common/errors.js";
import { getAllMetrics, getAllMeasurementsWithValues } from "./export.service.js";
import { mapExportBundle } from "./export.mapper.js";
import { buildCsv } from "./csv.js";

export default async function exportRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { format?: string } }>("/api/export", async (request, reply) => {
    const format = (request.query.format ?? "json").toUpperCase();
    if (format !== "JSON" && format !== "CSV") {
      throw ApiException.badRequest("Invalid format, expected 'json' or 'csv'");
    }

    const profileId = request.currentProfile!.id;
    const metrics = await getAllMetrics(fastify.prisma, profileId);
    const measurements = await getAllMeasurementsWithValues(fastify.prisma, profileId);

    if (format === "CSV") {
      reply.header("Content-Disposition", 'attachment; filename="bodytrack-export.csv"');
      reply.type("text/csv");
      return reply.send(buildCsv(metrics, measurements));
    }

    reply.header("Content-Disposition", 'attachment; filename="bodytrack-export.json"');
    reply.type("application/json");
    return reply.send(mapExportBundle(metrics, measurements));
  });
}
