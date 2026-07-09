import type { MetricDefinition } from "@prisma/client";
import { toDateString } from "../../common/serialization.js";
import type { MeasurementWithValues } from "./export.service.js";

function csvEscape(value: string | null | undefined): string {
  if (value == null) return "";
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildCsv(metrics: MetricDefinition[], measurements: MeasurementWithValues[]): string {
  let csv = "measurementDate,note";
  for (const metric of metrics) {
    csv += "," + csvEscape(`${metric.name} (${metric.unit})`);
  }
  csv += "\n";

  for (const measurement of measurements) {
    const valueByMetricId = new Map<string, string>();
    for (const v of measurement.values) {
      valueByMetricId.set(v.metricDefinitionId.toString(), v.value.toString());
    }
    csv += toDateString(measurement.measurementDate) + "," + csvEscape(measurement.note);
    for (const metric of metrics) {
      const value = valueByMetricId.get(metric.id.toString());
      csv += "," + (value ?? "");
    }
    csv += "\n";
  }

  return csv;
}
