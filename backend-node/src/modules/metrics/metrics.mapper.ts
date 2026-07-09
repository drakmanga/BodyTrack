import type { MetricDefinition } from "@prisma/client";

export interface MetricDefinitionResponse {
  id: number;
  name: string;
  unit: string;
  displayOrder: number;
  howToMeasure: string | null;
}

export function mapMetric(m: MetricDefinition): MetricDefinitionResponse {
  return {
    id: Number(m.id),
    name: m.name,
    unit: m.unit,
    displayOrder: m.displayOrder,
    howToMeasure: m.howToMeasure,
  };
}
