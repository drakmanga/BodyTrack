import type { MetricDefinition } from "@prisma/client";
import { toDateString, toNumber } from "../../common/serialization.js";
import type { MeasurementWithValues } from "./export.service.js";

export function mapExportBundle(metrics: MetricDefinition[], measurements: MeasurementWithValues[]) {
  return {
    metricDefinitions: metrics.map((m) => ({
      id: Number(m.id),
      name: m.name,
      unit: m.unit,
      displayOrder: m.displayOrder,
      active: m.isActive,
      howToMeasure: m.howToMeasure,
    })),
    measurements: measurements.map((m) => ({
      id: Number(m.id),
      measurementDate: toDateString(m.measurementDate),
      note: m.note,
      values: m.values.map((v) => ({
        metricDefinitionId: Number(v.metricDefinitionId),
        metricName: v.metricDefinition.name,
        unit: v.metricDefinition.unit,
        value: toNumber(v.value),
      })),
    })),
  };
}
