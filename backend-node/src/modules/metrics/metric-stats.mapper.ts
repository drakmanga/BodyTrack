import { toDateString, toNumberOrNull } from "../../common/serialization.js";
import type { HistoryPoint, MetricSummary } from "./metric-stats.service.js";

export function mapHistoryPoint(point: HistoryPoint) {
  return {
    date: toDateString(point.date),
    value: toNumberOrNull(point.value),
    bmi: toNumberOrNull(point.bmi),
  };
}

export function mapSummary(summary: MetricSummary) {
  return {
    current: toNumberOrNull(summary.current),
    delta: toNumberOrNull(summary.delta),
    deltaAbsolute: toNumberOrNull(summary.deltaAbsolute),
    min: toNumberOrNull(summary.min),
    max: toNumberOrNull(summary.max),
    average: toNumberOrNull(summary.average),
    dataPointCount: summary.dataPointCount,
  };
}
