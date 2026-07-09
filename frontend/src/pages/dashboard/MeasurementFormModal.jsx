import { useEffect, useRef, useState } from 'react';
import Modal from '../../components/Modal';
import InfoTooltip from '../../components/InfoTooltip';
import { createMeasurement, listMeasurements, updateMeasurement } from '../../api/measurements';
import { todayIso } from '../../utils/date';
import { sanitizeDecimalInput } from '../../utils/numeric';

export default function MeasurementFormModal({ metrics, editingMeasurement, onlyMetric, onClose, onSaved }) {
  const isEdit = !!editingMeasurement;
  const [date, setDate] = useState(editingMeasurement?.measurementDate || todayIso());
  const [note, setNote] = useState(editingMeasurement?.note || '');
  const [values, setValues] = useState(() => {
    const initial = {};
    if (editingMeasurement) {
      editingMeasurement.values.forEach((v) => {
        initial[v.metricDefinitionId] = String(v.value);
      });
    }
    return initial;
  });
  // When adding (not already editing a specific measurement), a measurement for the chosen
  // date may already exist (e.g. onboarding logs today's weight) — in that case we silently
  // switch to updating it instead of failing with "already exists" and no way out.
  const [resolvedTarget, setResolvedTarget] = useState(editingMeasurement || null);
  const [foundExistingNotice, setFoundExistingNotice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  // Tracks which metric ids currently hold a value we auto-filled from a looked-up
  // measurement (as opposed to the user having typed it), so that switching the date
  // away from a prefilled day cleanly drops those values instead of leaving them
  // stuck in the form under the wrong date.
  const autoFilledIds = useRef(new Set());

  useEffect(() => {
    if (isEdit) return;
    let cancelled = false;
    listMeasurements({ from: date, to: date, size: 1 }).then((page) => {
      if (cancelled) return;
      const found = page.content[0] || null;
      setResolvedTarget(found);
      setFoundExistingNotice(!!found);

      setValues((prev) => {
        const next = { ...prev };
        autoFilledIds.current.forEach((id) => {
          delete next[id];
        });
        autoFilledIds.current = new Set();
        if (found) {
          found.values.forEach((v) => {
            if (next[v.metricDefinitionId] === undefined || next[v.metricDefinitionId] === '') {
              next[v.metricDefinitionId] = String(v.value);
              autoFilledIds.current.add(v.metricDefinitionId);
            }
          });
        }
        return next;
      });
      if (found) {
        setNote((prev) => prev || found.note || '');
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, isEdit]);

  function setValue(metricId, value) {
    autoFilledIds.current.delete(metricId);
    setValues((prev) => ({ ...prev, [metricId]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);

    const payloadValues = metrics
      .filter((m) => values[m.id] !== undefined && values[m.id] !== '')
      .map((m) => ({ metricDefinitionId: m.id, value: Number(values[m.id]) }));

    if (payloadValues.length === 0) {
      setError('Inserisci almeno un valore.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = { measurementDate: date, note: note || null, values: payloadValues };
      if (resolvedTarget) {
        await updateMeasurement(resolvedTarget.id, payload);
      } else {
        await createMeasurement(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.message || 'Errore durante il salvataggio.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={
        onlyMetric
          ? `${isEdit ? 'Modifica' : 'Aggiungi'} ${onlyMetric.name}`
          : isEdit
            ? 'Modifica misurazione'
            : 'Aggiungi misurazione'
      }
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Data</label>
            <input
              type="date"
              required
              disabled={isEdit}
              max={todayIso()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-stone-900 dark:text-stone-50 disabled:opacity-60"
            />
          </div>
        </div>

        {!isEdit && foundExistingNotice && (
          <p className="text-sm text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900 rounded-lg px-3 py-2">
            Per questa data hai già una misurazione: i valori esistenti sono precaricati, aggiungi o correggi
            quelli che vuoi e salva — verrà aggiornata la stessa voce.
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(onlyMetric ? [onlyMetric] : metrics).map((metric) => (
            <div key={metric.id}>
              <label className="flex items-center gap-1 text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">
                {metric.name} ({metric.unit})
                <InfoTooltip text={metric.howToMeasure} />
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={values[metric.id] ?? ''}
                onChange={(e) => setValue(metric.id, sanitizeDecimalInput(e.target.value))}
                className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm text-stone-900 dark:text-stone-50"
              />
            </div>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Note (opzionale)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm text-stone-900 dark:text-stone-50"
          />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-stone-600 dark:text-stone-300 text-sm font-medium hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-medium"
          >
            {submitting ? 'Salvataggio…' : 'Salva'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
