import fp from "fastify-plugin";
import multipart from "@fastify/multipart";
import type { FastifyInstance } from "fastify";

export default fp(async function multipartPlugin(fastify: FastifyInstance) {
  await fastify.register(multipart, {
    attachFieldsToBody: true,
    limits: { fileSize: 10 * 1024 * 1024 },
  });
});
