import { useCallback, useMemo, useState } from 'react';
import MetricChart from './MetricChart';

const PERIODS = [
  { key: '30d', label: '30gg' },
  { key: '90d', label: '90gg' },
  { key: '1y', label: '1 anno' },
  { key: 'all', label: 'Tutto' },
];

export default function StatsSection({ metrics, unitSystem, profile, dataVersion }) {
  const [period, setPeriod] = useState('all');
  const [insufficientIds, setInsufficientIds] = useState(() => new Set());
  const [showInsufficient, setShowInsufficient] = useState(false);

  const handleResolved = useCallback((metricId, hasEnoughData) => {
    setInsufficientIds((prev) => {
      const shouldBeMarked = !hasEnoughData;
      const alreadyMarked = prev.has(metricId);
      if (shouldBeMarked === alreadyMarked) return prev;
      const next = new Set(prev);
      if (shouldBeMarked) next.add(metricId);
      else next.delete(metricId);
      return next;
    });
  }, []);

  const { mainMetrics, insufficientMetrics } = useMemo(() => {
    const main = [];
    const insufficient = [];
    for (const m of metrics) {
      if (insufficientIds.has(m.id)) insufficient.push(m);
      else main.push(m);
    }
    return { mainMetrics: main, insufficientMetrics: insufficient };
  }, [metrics, insufficientIds]);

  if (metrics.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-medium text-stone-800 dark:text-stone-100">Statistiche</h2>
        <div className="flex gap-1 bg-stone-100 dark:bg-stone-800 rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                period === p.key
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-50 shadow-sm'
                  : 'text-stone-500 dark:text-stone-400'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <div key={metric.id} className={insufficientIds.has(metric.id) ? 'hidden' : ''}>
            <MetricChart metric={metric} period={period} unitSystem={unitSystem} profile={profile} dataVersion={dataVersion} onResolved={handleResolved} />
          </div>
        ))}
      </div>

      {insufficientMetrics.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowInsufficient((v) => !v)}
            className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
          >
            <span className="text-xs">{showInsufficient ? '▲' : '▼'}</span>
            {insufficientMetrics.length} metriche senza dati sufficienti
          </button>
          {showInsufficient && (
            <div className="mt-2 rounded-xl border border-stone-200 dark:border-stone-800 divide-y divide-stone-100 dark:divide-stone-800">
              {insufficientMetrics.map((m) => (
                <div key={m.id} className="px-3 py-2 flex items-center justify-between gap-3 text-sm">
                  <span className="text-stone-700 dark:text-stone-300 truncate">{m.name}</span>
                  <span className="text-stone-400 text-xs whitespace-nowrap">dati insufficienti</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hidden mount for insufficient-data metrics: still rendered (off-screen via `hidden` above)
          so MetricChart keeps polling onResolved and can promote itself back into the main grid. */}
      {mainMetrics.length === 0 && insufficientMetrics.length > 0 && !showInsufficient && (
        <p className="text-sm text-stone-400 mt-3">Nessun grafico con dati sufficienti ancora.</p>
      )}
    </section>
  );
}
