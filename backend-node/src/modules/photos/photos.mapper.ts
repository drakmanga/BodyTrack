import type { ProgressPhoto } from "@prisma/client";
import { toDateString } from "../../common/serialization.js";

export function mapPhoto(p: ProgressPhoto) {
  return {
    id: Number(p.id),
    photoDate: toDateString(p.photoDate),
    measurementId: p.measurementId != null ? Number(p.measurementId) : null,
  };
}
