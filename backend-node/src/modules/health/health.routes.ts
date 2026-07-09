import type { FastifyInstance } from "fastify";

export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get("/actuator/health", async () => ({ status: "UP" }));
}
