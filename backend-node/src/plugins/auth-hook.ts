import fp from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ApiException } from "../common/errors.js";

// Must be registered after the prisma and jwt plugins (app.ts controls the order).
export default fp(async function authHookPlugin(fastify: FastifyInstance) {
  fastify.decorate("requireAuth", async function requireAuth(request: FastifyRequest, _reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch {
      throw ApiException.unauthorized("Authentication required");
    }

    const payload = request.user;
    const user = await fastify.prisma.user.findUnique({ where: { id: BigInt(payload.uid) } });
    if (!user || user.username !== payload.sub) {
      throw ApiException.unauthorized("Authentication required");
    }

    // Re-verified on every request, same spirit as the username check above: a profile that
    // was deleted (or somehow belongs to a different account) after the token was issued must
    // not keep working just because the token itself still parses.
    const profile = await fastify.prisma.profile.findUnique({ where: { id: BigInt(payload.pid) } });
    if (!profile || profile.accountId !== user.id) {
      throw ApiException.unauthorized("Authentication required");
    }

    request.currentUser = { id: user.id, username: user.username };
    request.currentProfile = {
      id: profile.id,
      displayName: profile.displayName,
      isPrimary: profile.isPrimary,
      heightCm: profile.heightCm,
      wristCm: profile.wristCm,
      unitSystem: profile.unitSystem,
    };
  });
});

declare module "fastify" {
  interface FastifyInstance {
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    currentUser?: { id: bigint; username: string };
    currentProfile?: {
      id: bigint;
      displayName: string;
      isPrimary: boolean;
      heightCm: import("@prisma/client").Prisma.Decimal | null;
      wristCm: import("@prisma/client").Prisma.Decimal | null;
      unitSystem: string;
    };
  }
}
