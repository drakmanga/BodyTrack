import { useEffect, useRef, useState } from 'react';
import { deleteMeasurement, listMeasurements } from '../../api/measurements';
import { listPhotos } from '../../api/photos';
import { formatDateDisplay } from '../../utils/date';
import { formatMeasurement } from '../../utils/units';
import MeasurementFormModal from './MeasurementFormModal';
import Skeleton from '../../components/Skeleton';
import ConfirmDialog from '../../components/ConfirmDialog';

const PAGE_SIZE = 10;

export default function HistorySection({ metrics, unitSystem, dataVersion, onDataChanged }) {
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(0);
  const [measurementsPage, setMeasurementsPage] = useState(null);
  const [photoDates, setPhotoDates] = useState(new Set());
  const [editing, setEditing] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    setMeasurementsPage(null);
    listMeasurements({ page, size: expanded ? PAGE_SIZE : 5 }).then(setMeasurementsPage);
  }, [page, expanded, dataVersion]);

  useEffect(() => {
    listPhotos({ page: 0, size: 500 }).then((p) => setPhotoDates(new Set(p.content.map((ph) => ph.photoDate))));
  }, [dataVersion]);

  function updateScrollFades() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }

  useEffect(() => {
    updateScrollFades();
  }, [measurementsPage, metrics]);

  function handleDelete(id) {
    setConfirmDeleteId(id);
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await deleteMeasurement(confirmDeleteId);
      setConfirmDeleteId(null);
      onDataChanged();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section>
      <button
        type="button"
        onClick={() => {
          setExpanded((v) => !v);
          setPage(0);
        }}
        className="flex items-center gap-2 font-medium text-stone-800 dark:text-stone-100 mb-3"
      >
        Storico misurazioni
        <span className="text-xs text-stone-400">{expanded ? '▲ nascondi' : '▼ mostra storico completo'}</span>
      </button>

      {measurementsPage === null ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : measurementsPage.content.length === 0 ? (
        <p className="text-sm text-stone-400">Nessuna misurazione registrata ancora.</p>
      ) : (
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={updateScrollFades}
            className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm"
          >
          <table className="w-full text-sm">
            <thead className="bg-stone-50 dark:bg-stone-900 text-stone-500 dark:text-stone-400">
              <tr>
                <th className="text-left font-medium px-3 py-2">Data</th>
                {metrics.map((m) => (
                  <th key={m.id} className="text-left font-medium px-3 py-2 whitespace-nowrap">
                    {m.name}
                  </th>
                ))}
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {measurementsPage.content.map((measurement) => {
                const hasPhoto = photoDates.has(measurement.measurementDate);
                return (
                  <tr key={measurement.id} className="border-t border-stone-100 dark:border-stone-800">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatDateDisplay(measurement.measurementDate)}
                      {!hasPhoto && (
                        <span title="Nessuna foto per questa data" className="ml-1 text-amber-500 cursor-help">
                          📷⚠
                        </span>
                      )}
                    </td>
                    {metrics.map((m) => {
                      const v = measurement.values.find((val) => val.metricDefinitionId === m.id);
                      return (
                        <td key={m.id} className="px-3 py-2 whitespace-nowrap text-stone-600 dark:text-stone-300">
                          {v ? formatMeasurement(v.value, v.unit, unitSystem) : '—'}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 whitespace-nowrap text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => setEditing(measurement)}
                        className="text-teal-600 dark:text-teal-400 text-xs font-medium hover:underline"
                      >
                        Modifica
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(measurement.id)}
                        className="text-red-600 dark:text-red-400 text-xs font-medium hover:underline"
                      >
                        Elimina
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          <div
            aria-hidden="true"
            className={`absolute inset-y-0 left-0 w-8 rounded-l-xl bg-gradient-to-r from-stone-50 dark:from-stone-950 to-transparent pointer-events-none transition-opacity duration-200 ${
              canScrollLeft ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <div
            aria-hidden="true"
            className={`absolute inset-y-0 right-0 w-8 rounded-r-xl bg-gradient-to-l from-stone-50 dark:from-stone-950 to-transparent pointer-events-none transition-opacity duration-200 ${
              canScrollRight ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </div>
      )}

      {expanded && measurementsPage && measurementsPage.page.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-3 text-sm">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 rounded-lg border border-stone-300 dark:border-stone-700 disabled:opacity-40"
          >
            ← Precedente
          </button>
          <span className="text-stone-500">
            Pagina {page + 1} di {measurementsPage.page.totalPages}
          </span>
          <button
            type="button"
            disabled={page + 1 >= measurementsPage.page.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 rounded-lg border border-stone-300 dark:border-stone-700 disabled:opacity-40"
          >
            Successiva →
          </button>
        </div>
      )}

      {editing && (
        <MeasurementFormModal
          metrics={metrics}
          editingMeasurement={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onDataChanged();
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
    </section>
  );
}
