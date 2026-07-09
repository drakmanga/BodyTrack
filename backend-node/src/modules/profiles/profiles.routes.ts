import type { FastifyInstance } from "fastify";
import { parseBody, parseIdParam } from "../../common/validation.js";
import { createProfileSchema, updateProfileSchema } from "./profiles.schemas.js";
import { listProfiles, createProfile, updateProfile, deleteProfile, getOwnedProfile } from "./profiles.service.js";
import { mapProfile } from "./profiles.mapper.js";

export default async function profilesRoutes(fastify: FastifyInstance) {
  fastify.get("/api/profiles", async (request) => {
    const profiles = await listProfiles(fastify.prisma, request.currentUser!.id);
    return profiles.map((p) => mapProfile(p, request.currentProfile!.id));
  });

  fastify.post("/api/profiles", async (request, reply) => {
    const input = parseBody(createProfileSchema, request.body);
    const profile = await createProfile(fastify.prisma, request.currentUser!.id, input);
    return reply.status(201).send(mapProfile(profile, request.currentProfile!.id));
  });

  fastify.put<{ Params: { id: string } }>("/api/profiles/:id", async (request) => {
    const id = parseIdParam(request.params.id);
    const input = parseBody(updateProfileSchema, request.body);
    const profile = await updateProfile(fastify.prisma, request.currentUser!.id, id, input);
    return mapProfile(profile, request.currentProfile!.id);
  });

  fastify.delete<{ Params: { id: string } }>("/api/profiles/:id", async (request, reply) => {
    const id = parseIdParam(request.params.id);
    await deleteProfile(fastify.prisma, request.currentUser!.id, id);
    return reply.status(204).send();
  });

  fastify.post<{ Params: { id: string } }>("/api/profiles/:id/activate", async (request) => {
    const id = parseIdParam(request.params.id);
    const profile = await getOwnedProfile(fastify.prisma, request.currentUser!.id, id);
    const token = fastify.signAuthToken({
      id: request.currentUser!.id,
      username: request.currentUser!.username,
      profileId: profile.id,
    });
    return { token };
  });
}
