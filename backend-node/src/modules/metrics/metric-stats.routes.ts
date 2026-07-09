import type { FastifyInstance } from "fastify";
import { parseIdParam } from "../../common/validation.js";
import { parseHistoryRange } from "../../common/date-range.js";
import { parsePageParams, buildPage } from "../../common/pagination.js";
import { history, summary, parsePeriod } from "./metric-stats.service.js";
import { mapHistoryPoint, mapSummary } from "./metric-stats.mapper.js";

export default async function metricStatsRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: { id: string }; Querystring: { from?: string; to?: string; page?: string; size?: string } }>(
    "/api/metrics/:id/history",
    async (request) => {
      const id = parseIdParam(request.params.id);
      const { from, to } = parseHistoryRange(request.query.from, request.query.to);
      const { page, size, skip, take } = parsePageParams(request.query, { defaultSize: 50, maxSize: 1000 });

      const { points, total } = await history(fastify.prisma, request.currentProfile!.id, id, from, to, skip, take);
      return buildPage(points.map(mapHistoryPoint), total, page, size);
    },
  );

  fastify.get<{ Params: { id: string }; Querystring: { period?: string } }>(
    "/api/metrics/:id/summary",
    async (request) => {
      const id = parseIdParam(request.params.id);
      const period = parsePeriod(request.query.period);
      const result = await summary(fastify.prisma, request.currentProfile!.id, id, period);
      return mapSummary(result);
    },
  );
}
