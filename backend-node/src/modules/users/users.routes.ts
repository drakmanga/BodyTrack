import type { FastifyInstance } from "fastify";
import { getUserById } from "./users.service.js";
import { mapUser } from "./users.mapper.js";

export default async function usersRoutes(fastify: FastifyInstance) {
  fastify.get("/api/users/me", async (request) => {
    const user = await getUserById(fastify.prisma, request.currentUser!.id);
    return mapUser(user);
  });
}
