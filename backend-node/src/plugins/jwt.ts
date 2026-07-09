import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import type { FastifyInstance } from "fastify";
import { env } from "../env.js";

export default fp(async function jwtPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyJwt, {
    secret: env.JWT_SECRET,
  });

  fastify.decorate(
    "signAuthToken",
    function signAuthToken(user: { id: bigint; username: string; profileId: bigint }): string {
      return fastify.jwt.sign(
        { uid: Number(user.id), pid: Number(user.profileId) },
        { sub: user.username, expiresIn: `${env.JWT_EXPIRATION_MINUTES}m` },
      );
    },
  );
});

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { uid: number; pid: number };
    user: { uid: number; pid: number; sub: string; iat: number; exp: number };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    signAuthToken: (user: { id: bigint; username: string; profileId: bigint }) => string;
  }
}
