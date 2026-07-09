import fs from "node:fs";
import type { FastifyInstance } from "fastify";
import type { MultipartFile } from "@fastify/multipart";
import { ApiException } from "../../common/errors.js";
import { parseIdParam } from "../../common/validation.js";
import { parseFullRange } from "../../common/date-range.js";
import { parseDateOnly } from "../../common/serialization.js";
import { parsePageParams, buildPage } from "../../common/pagination.js";
import { listPhotos, uploadPhoto, deletePhoto, resolvePhotoFile } from "./photos.service.js";
import { mapPhoto } from "./photos.mapper.js";

interface MultipartValueField {
  value: string;
}

export default async function photosRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { from?: string; to?: string; page?: string; size?: string } }>(
    "/api/photos",
    async (request) => {
      const { from, to } = parseFullRange(request.query.from, request.query.to);
      const { page, size, skip, take } = parsePageParams(request.query, { defaultSize: 50, maxSize: 200 });
      const { photos, total } = await listPhotos(fastify.prisma, request.currentProfile!.id, from, to, skip, take);
      return buildPage(photos.map(mapPhoto), total, page, size);
    },
  );

  fastify.post("/api/photos", async (request, reply) => {
    const body = request.body as Record<string, MultipartFile | MultipartValueField | undefined>;
    const filePart = body?.file as MultipartFile | undefined;
    if (!filePart || typeof filePart.toBuffer !== "function") {
      throw ApiException.badRequest("File is required");
    }
    const buffer = await filePart.toBuffer();

    const photoDateField = body?.photoDate as MultipartValueField | undefined;
    if (!photoDateField?.value) {
      throw ApiException.badRequest("photoDate is required");
    }

    const measurementIdField = body?.measurementId as MultipartValueField | undefined;

    const photo = await uploadPhoto(fastify.prisma, request.currentProfile!.id, {
      buffer,
      mimetype: filePart.mimetype,
      photoDate: parseDateOnly(photoDateField.value),
      measurementId: measurementIdField?.value ? BigInt(measurementIdField.value) : null,
    });

    return reply.status(201).send(mapPhoto(photo));
  });

  fastify.delete<{ Params: { id: string } }>("/api/photos/:id", async (request, reply) => {
    const id = parseIdParam(request.params.id);
    await deletePhoto(fastify.prisma, request.currentProfile!.id, id);
    return reply.status(204).send();
  });

  fastify.get<{ Params: { id: string } }>("/api/photos/:id/file", async (request, reply) => {
    const id = parseIdParam(request.params.id);
    const { absolutePath, contentType } = await resolvePhotoFile(fastify.prisma, request.currentProfile!.id, id);
    reply.type(contentType);
    return reply.send(fs.createReadStream(absolutePath));
  });
}
