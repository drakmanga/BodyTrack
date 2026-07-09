import { z } from "zod";

export const createMetricSchema = z.object({
  name: z.string().min(1).max(100),
  unit: z.string().min(1).max(20),
  howToMeasure: z.string().max(2000).nullish(),
});

export const updateMetricSchema = z.object({
  name: z.string().min(1).max(100),
  unit: z.string().min(1).max(20),
  displayOrder: z.number().int(),
  howToMeasure: z.string().max(2000).nullish(),
});

export type CreateMetricInput = z.infer<typeof createMetricSchema>;
export type UpdateMetricInput = z.infer<typeof updateMetricSchema>;
