import type { Measurement, MeasurementValue, MetricDefinition } from "@prisma/client";
import { toDateString, toNumber } from "../../common/serialization.js";

type MeasurementWithValues = Measurement & {
  values: (MeasurementValue & { metricDefinition: MetricDefinition })[];
};

export function mapMeasurement(m: MeasurementWithValues) {
  return {
    id: Number(m.id),
    measurementDate: toDateString(m.measurementDate),
    note: m.note,
    values: m.values.map((v) => ({
      metricDefinitionId: Number(v.metricDefinitionId),
      metricName: v.metricDefinition.name,
      unit: v.metricDefinition.unit,
      value: toNumber(v.value),
    })),
  };
}
