import { useEffect, useState } from 'react';
import { listMeasurements } from '../../api/measurements';
import { getSummary } from '../../api/metrics';
import { formatMeasurement } from '../../utils/units';
import { formatDateDisplay } from '../../utils/date';
import Skeleton from '../../components/Skeleton';
import Sparkline from './Sparkline';
import MetricDetailModal from './MetricDetailModal';
import InfoTooltip from '../../components/InfoTooltip';

const SPARKLINE_MAX_POINTS = 12;

function computeLatestForMetric(measurements, metricId) {
  let latest = null;
  let previous = null;
  const sparklineValues = [];

  for (const measurement of measurements) {
    const found = measurement.values.find((v) => v.metricDefinitionId === metricId);
    if (found) {
      if (!latest) {
        latest = { date: measurement.measurementDate, value: found.value, unit: found.unit, measurement };
      } else if (!previous) {
        previous = { date: measurement.measurementDate, value: found.value };
      }
      if (sparklineValues.length < SPARKLINE_MAX_POINTS) {
        sparklineValues.push(found.value);
      }
    }
  }

  // measurements are DESC by date; sparkline should read chronologically left-to-right.
  sparklineValues.reverse();

  return { latest, previous, sparklineValues };
}

export default function LatestMeasurements({ metrics, unitSystem, profile, dataVersion, onDataChanged }) {
  const [measurements, setMeasurements] = useState(null);
  const [deltaAbsoluteByMetric, setDeltaAbsoluteByMetric] = useState({});
  const [detailMetric, setDetailMetric] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setMeasurements(null);
    listMeasurements({ page: 0, size: 30 }).then((page) => {
      if (!cancelled) setMeasurements(page.content);
    });
    return () => {
      cancelled = true;
    };
  }, [dataVersion]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(metrics.map((m) => getSummary(m.id).then((s) => [m.id, s.deltaAbsolute]))).then((entries) => {
      if (cancelled) return;
      setDeltaAbsoluteByMetric(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics, dataVersion]);

  if (measurements === null) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {metrics.map((m) => (
          <Skeleton key={m.id} className="h-28" />
        ))}
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <p className="text-sm text-stone-500 dark:text-stone-400">
        Nessuna metrica attiva. Vai in Impostazioni per aggiungerne una.
      </p>
    );
  }

  return (
    <div>
      <p className="text-xs text-stone-400 dark:text-stone-500 mb-3">
        Tocca una misura per vedere l&apos;andamento nel dettaglio.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {metrics.map((metric) => {
        const { latest, previous, sparklineValues } = computeLatestForMetric(measurements, metric.id);
        const delta = latest && previous ? latest.value - previous.value : null;
        const deltaAbsolute = deltaAbsoluteByMetric[metric.id] ?? null;
        return (
          <div
            key={metric.id}
            role="button"
            tabIndex={0}
            onClick={() => setDetailMetric(metric)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setDetailMetric(metric);
              }
            }}
            className="relative text-left bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 shadow-sm transition-all hover:border-teal-300 dark:hover:border-teal-800 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
          >
            {metric.howToMeasure && (
              <InfoTooltip text={metric.howToMeasure} className="absolute top-2 right-2" />
            )}
            <p className="text-sm text-stone-500 dark:text-stone-400 truncate pr-6">{metric.name}</p>
            {latest ? (
              <>
                <p className="text-2xl sm:text-3xl font-semibold text-stone-900 dark:text-stone-50">
                  {formatMeasurement(latest.value, latest.unit, unitSystem)}
                </p>
                <p className="text-xs text-stone-400">
                  {formatDateDisplay(latest.date)}
                  {delta !== null && (
                    <span className={delta < 0 ? 'text-teal-600 dark:text-teal-400 ml-1' : delta > 0 ? 'text-amber-600 dark:text-amber-400 ml-1' : 'ml-1'}>
                      {delta > 0 ? '↑' : delta < 0 ? '↓' : '='}
                      {Math.abs(delta).toFixed(1)}
                    </span>
                  )}
                </p>
                {deltaAbsolute !== null && (
                  <p className="text-xs text-stone-400">
                    Totale:
                    <span className={deltaAbsolute < 0 ? 'text-teal-600 dark:text-teal-400 ml-1' : deltaAbsolute > 0 ? 'text-amber-600 dark:text-amber-400 ml-1' : 'ml-1'}>
                      {deltaAbsolute > 0 ? '↑' : deltaAbsolute < 0 ? '↓' : '='}
                      {Math.abs(deltaAbsolute).toFixed(1)}
                    </span>
                  </p>
                )}
                <Sparkline points={sparklineValues} />
              </>
            ) : (
              <p className="text-sm text-stone-400 mt-1">Nessun dato</p>
            )}
          </div>
          );
        })}
      </div>

      {detailMetric && (
        <MetricDetailModal
          metric={detailMetric}
          metrics={metrics}
          unitSystem={unitSystem}
          profile={profile}
          dataVersion={dataVersion}
          onClose={() => setDetailMetric(null)}
          onDataChanged={onDataChanged}
        />
      )}
    </div>
  );
}
