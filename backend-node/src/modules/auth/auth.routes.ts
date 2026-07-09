import type { FastifyInstance } from "fastify";
import { parseBody } from "../../common/validation.js";
import { loginRateLimit } from "../../plugins/login-rate-limit.js";
import { registerSchema, loginSchema } from "./auth.schemas.js";
import { registerUser, authenticateUser } from "./auth.service.js";

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post("/api/auth/register", async (request, reply) => {
    const input = parseBody(registerSchema, request.body);
    const user = await registerUser(fastify.prisma, input);
    const token = fastify.signAuthToken(user);
    return reply.status(201).send({ token, username: user.username });
  });

  fastify.post(
    "/api/auth/login",
    { preHandler: loginRateLimit },
    async (request, reply) => {
      const input = parseBody(loginSchema, request.body);
      const user = await authenticateUser(fastify.prisma, input);
      const token = fastify.signAuthToken(user);
      return reply.status(200).send({ token, username: user.username });
    },
  );
}
