import { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/Modal';
import MetricChart from './MetricChart';
import MeasurementFormModal from './MeasurementFormModal';
import { deleteMeasurement, listMeasurements } from '../../api/measurements';
import { formatDateDisplay } from '../../utils/date';
import { formatMeasurement } from '../../utils/units';
import Skeleton from '../../components/Skeleton';
import ConfirmDialog from '../../components/ConfirmDialog';

const PERIODS = [
  { key: '30d', label: '30gg' },
  { key: '90d', label: '90gg' },
  { key: '1y', label: '1 anno' },
  { key: 'all', label: 'Tutto' },
];

export default function MetricDetailModal({ metric, metrics, unitSystem, profile, dataVersion, onClose, onDataChanged }) {
  const [period, setPeriod] = useState('90d');
  const [measurements, setMeasurements] = useState(null);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setMeasurements(null);
    listMeasurements({ page: 0, size: 200 }).then((page) => setMeasurements(page.content));
  }, [dataVersion]);

  const rows = useMemo(() => {
    if (!measurements) return null;
    return measurements
      .map((m) => {
        const v = m.values.find((val) => val.metricDefinitionId === metric.id);
        return v ? { date: m.measurementDate, value: v.value, unit: v.unit, measurement: m } : null;
      })
      .filter(Boolean);
  }, [measurements, metric.id]);

  function handleDelete(id) {
    setConfirmDeleteId(id);
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await deleteMeasurement(confirmDeleteId);
      setConfirmDeleteId(null);
      onDataChanged?.();
    } finally {
      setDeleting(false);
    }
  }

  const visibleRows = expanded ? rows : rows?.slice(0, 5);

  return (
    <Modal title={metric.name} onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white shrink-0"
          >
            + Aggiungi misurazione
          </button>
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

        <MetricChart metric={metric} period={period} unitSystem={unitSystem} profile={profile} dataVersion={dataVersion} onResolved={() => {}} />

        <div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-300 mb-2"
          >
            Storico di {metric.name}
            {rows && rows.length > 5 && (
              <span className="text-xs text-stone-400">
                {expanded ? '▲ mostra meno' : `▼ mostra tutte (${rows.length})`}
              </span>
            )}
          </button>

          {rows === null ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-9" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-stone-400">
              Nessuna misurazione registrata ancora per questa metrica. Usa &quot;+ Aggiungi misurazione&quot; qui
              sopra per inserire il primo valore.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 dark:bg-stone-900 text-stone-500 dark:text-stone-400">
                  <tr>
                    <th className="text-left font-medium px-3 py-2">Data</th>
                    <th className="text-left font-medium px-3 py-2">Valore</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={row.measurement.id} className="border-t border-stone-100 dark:border-stone-800">
                      <td className="px-3 py-2 whitespace-nowrap">{formatDateDisplay(row.date)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-stone-700 dark:text-stone-200 font-medium">
                        {formatMeasurement(row.value, row.unit, unitSystem)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => setEditing(row.measurement)}
                          className="text-teal-600 dark:text-teal-400 text-xs font-medium hover:underline"
                        >
                          Modifica
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row.measurement.id)}
                          className="text-red-600 dark:text-red-400 text-xs font-medium hover:underline"
                        >
                          Elimina
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {editing && (
        <MeasurementFormModal
          metrics={metrics}
          editingMeasurement={editing}
          onlyMetric={metric}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onDataChanged?.();
          }}
        />
      )}

      {adding && (
        <MeasurementFormModal
          metrics={metrics}
          onlyMetric={metric}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            onDataChanged?.();
          }}
        />
      )}

      {confirmDeleteId && (
        <ConfirmDialog
          title="Elimina misurazione"
          message="Eliminare questa misurazione? L'operazione non può essere annullata."
          submitting={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </Modal>
  );
}
