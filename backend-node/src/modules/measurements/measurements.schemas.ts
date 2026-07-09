import { z } from "zod";
import { todayIso } from "../../common/date-range.js";

const measurementValueSchema = z.object({
  metricDefinitionId: z.number().int(),
  value: z.number().positive(),
});

export const measurementSchema = z.object({
  measurementDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "must be a valid date")
    .refine((d) => d <= todayIso(), "must be a date in the past or in the present"),
  note: z.string().max(2000).nullish(),
  values: z.array(measurementValueSchema).min(1),
});

export type MeasurementInput = z.infer<typeof measurementSchema>;
