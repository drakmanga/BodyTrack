import fp from "fastify-plugin";
import type { FastifyInstance, FastifyError } from "fastify";
import { ApiException } from "../common/errors.js";

export default fp(async function errorHandlerPlugin(fastify: FastifyInstance) {
  fastify.setErrorHandler((err: FastifyError | ApiException, request, reply) => {
    if (err instanceof ApiException) {
      return reply.status(err.status).send({ error: err.message, status: err.status });
    }

    if (err.validation) {
      const first = err.validation[0];
      const message = first ? `${first.instancePath || first.params?.missingProperty || "request"}: ${first.message}` : "Validation failed";
      return reply.status(400).send({ error: message, status: 400 });
    }

    const statusCode = (err as { statusCode?: number }).statusCode;
    const code = (err as { code?: string }).code;

    if (statusCode === 413 || code === "FST_REQ_FILE_TOO_LARGE" || code === "FST_FILES_LIMIT" || code === "FST_PARTS_LIMIT") {
      return reply.status(413).send({ error: "File too large", status: 413 });
    }

    if (statusCode === 400 || err instanceof SyntaxError) {
      return reply.status(400).send({ error: "Malformed request body", status: 400 });
    }

    request.log.error(err);
    return reply.status(500).send({ error: "Internal server error", status: 500 });
  });

  fastify.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({ error: "Not found", status: 404 });
  });
});
