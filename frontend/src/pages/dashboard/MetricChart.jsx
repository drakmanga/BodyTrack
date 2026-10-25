import { useEffect, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getHistory, getSummary } from '../../api/metrics';
import { formatDateDisplay, periodToLabel } from '../../utils/date';
import { formatMeasurement } from '../../utils/units';
import { estimateFrameSize, estimateIdealWeightKg } from '../../utils/frameSize';
import Skeleton from '../../components/Skeleton';

function periodToRange(period) {
  const to = new Date();
  let from = null;
  if (period === '30d') {
    from = new Date(to);
    from.setDate(from.getDate() - 30);
  } else if (period === '90d') {
    from = new Date(to);
    from.setDate(from.getDate() - 90);
  } else if (period === '1y') {
    from = new Date(to);
    from.setFullYear(from.getFullYear() - 1);
  }
  const iso = (d) => d.toISOString().slice(0, 10);
  return { from: from ? iso(from) : undefined, to: iso(to) };
}

export default function MetricChart({ metric, period, unitSystem, profile, dataVersion, onResolved }) {
  const [points, setPoints] = useState(null);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setPoints(null);
    setSummary(null);
    const { from, to } = periodToRange(period);
    Promise.all([getHistory(metric.id, { from, to }), getSummary(metric.id, period)]).then(
      ([historyPage, summaryData]) => {
        if (cancelled) return;
        setPoints(historyPage.content);
        setSummary(summaryData);
        onResolved?.(metric.id, historyPage.content.length >= 2);
      }
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric.id, period, dataVersion]);

  if (points === null) {
    return <Skeleton className="h-64 rounded-xl" />;
  }

  const latestBmi = metric.unit === 'kg' && points.length > 0 ? points[points.length - 1].bmi : null;
  const idealWeight =
    metric.unit === 'kg' && profile?.heightCm && profile?.wristCm && profile?.sex
      ? estimateIdealWeightKg(profile.heightCm, profile.sex, estimateFrameSize(profile.heightCm, profile.wristCm, profile.sex))
      : null;

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-sm p-4">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-medium text-stone-800 dark:text-stone-100">{metric.name}</h3>
        {summary && summary.dataPointCount > 0 && (
          <span className="text-xs text-stone-400">{periodToLabel(period)}</span>
        )}
      </div>

      {points.length < 2 ? (
        <div className="h-48 flex items-center justify-center text-center px-4">
          <p className="text-sm text-stone-400">
            {points.length === 0
              ? 'Nessuna misurazione ancora. Aggiungine una per iniziare a vedere l’andamento.'
              : 'Aggiungi un’altra misurazione per vedere l’andamento.'}
          </p>
        </div>
      ) : (
        <>
          {summary && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500 dark:text-stone-400 mb-3">
              <span>
                Attuale: <strong className="text-stone-700 dark:text-stone-200">{formatMeasurement(summary.current, metric.unit, unitSystem)}</strong>
              </span>
              {summary.delta !== null && (
                <span className={summary.delta < 0 ? 'text-teal-600 dark:text-teal-400' : summary.delta > 0 ? 'text-amber-600 dark:text-amber-400' : ''}>
                  Delta periodo: {summary.delta > 0 ? '+' : ''}{summary.delta.toFixed(1)} {metric.unit}
                </span>
              )}
              {summary.deltaAbsolute !== null && (
                <span className={summary.deltaAbsolute < 0 ? 'text-teal-600 dark:text-teal-400' : summary.deltaAbsolute > 0 ? 'text-amber-600 dark:text-amber-400' : ''}>
                  Delta totale: {summary.deltaAbsolute > 0 ? '+' : ''}{summary.deltaAbsolute.toFixed(1)} {metric.unit}
                </span>
              )}
              <span>Min: {formatMeasurement(summary.min, metric.unit, unitSystem)}</span>
              <span>Max: {formatMeasurement(summary.max, metric.unit, unitSystem)}</span>
              <span>Media: {formatMeasurement(summary.average, metric.unit, unitSystem)}</span>
              {latestBmi && <span>BMI: {latestBmi}</span>}
              {idealWeight && <span>Peso ideale: ~{idealWeight.toFixed(1)} kg</span>}
            </div>
          )}
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={points} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-stone-200 dark:stroke-stone-800" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDateDisplay}
                tick={{ fontSize: 11 }}
                minTickGap={30}
              />
              <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
              <Tooltip
                labelFormatter={formatDateDisplay}
                formatter={(value) => [`${value} ${metric.unit}`, metric.name]}
              />
              <Line type="monotone" dataKey="value" stroke="#0d9488" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}
