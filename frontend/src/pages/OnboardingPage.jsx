import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createMetric, deleteMetric, getCatalog, listMetrics } from '../api/metrics';
import { createMeasurement } from '../api/measurements';
import { updateProfile } from '../api/profiles';
import { useAuth } from '../context/AuthContext';
import { todayIso } from '../utils/date';
import { sanitizeDecimalInput } from '../utils/numeric';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { activeProfile, refreshProfiles } = useAuth();
  const [catalog, setCatalog] = useState([]);
  const [existing, setExisting] = useState([]);
  const [selected, setSelected] = useState({});
  const [customMetrics, setCustomMetrics] = useState([]);
  const [customName, setCustomName] = useState('');
  const [customUnit, setCustomUnit] = useState('cm');
  const [heightCm, setHeightCm] = useState('');
  const [wristCm, setWristCm] = useState('');
  const [sex, setSex] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([getCatalog(), listMetrics()])
      .then(([catalogData, existingData]) => {
        setCatalog(catalogData);
        setExisting(existingData);
        const existingNames = new Set(existingData.map((m) => m.name));
        const initialSelection = {};
        catalogData.forEach((entry) => {
          initialSelection[entry.name] = existingNames.has(entry.name);
        });
        setSelected(initialSelection);
      })
      .finally(() => setLoading(false));
  }, []);

  function toggle(name) {
    setSelected((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  function addCustomMetric() {
    if (!customName.trim()) return;
    setCustomMetrics((prev) => [...prev, { name: customName.trim(), unit: customUnit.trim() || 'cm' }]);
    setCustomName('');
    setCustomUnit('cm');
  }

  function removeCustomMetric(index) {
    setCustomMetrics((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const existingByName = new Map(existing.map((m) => [m.name, m]));

      for (const entry of catalog) {
        const isSelected = !!selected[entry.name];
        const existingMetric = existingByName.get(entry.name);
        if (isSelected && !existingMetric) {
          await createMetric({ name: entry.name, unit: entry.unit, howToMeasure: entry.howToMeasure });
        } else if (!isSelected && existingMetric) {
          await deleteMetric(existingMetric.id);
        }
      }

      for (const custom of customMetrics) {
        await createMetric({ name: custom.name, unit: custom.unit, howToMeasure: null });
      }

      if ((heightCm || wristCm || sex) && activeProfile) {
        await updateProfile(activeProfile.id, {
          heightCm: heightCm ? Number(heightCm) : null,
          wristCm: wristCm ? Number(wristCm) : null,
          sex: sex || null,
        });
        await refreshProfiles();
      }

      if (weightKg && selected['Peso']) {
        try {
          const currentMetrics = await listMetrics();
          const pesoMetric = currentMetrics.find((m) => m.name === 'Peso');
          if (pesoMetric) {
            await createMeasurement({
              measurementDate: todayIso(),
              note: null,
              values: [{ metricDefinitionId: pesoMetric.id, value: Number(weightKg) }],
            });
          }
        } catch {
          // A measurement for today may already exist (e.g. re-running onboarding) — that's
          // fine, the weight the user typed here just won't overwrite it silently.
        }
      }

      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Errore durante il salvataggio, riprova.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !activeProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-stone-500">Caricamento…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50 mb-1">Benvenuto su BodyTrack</h1>
        <p className="text-stone-500 dark:text-stone-400 mb-8">
          Le metriche standard sono già tutte attive. Deseleziona quelle che non ti interessano — potrai
          riattivarle in qualsiasi momento dalle impostazioni.
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="bg-white dark:bg-stone-900 rounded-2xl border border-teal-200 dark:border-teal-900 p-6">
            <h2 className="font-medium text-stone-900 dark:text-stone-50 mb-1">Il tuo peso attuale</h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
              Registra subito la tua prima misurazione del peso, così parti già con un dato in archivio.
            </p>
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Peso (kg)</label>
              <input
                type="text"
                inputMode="decimal"
                value={weightKg}
                onChange={(e) => setWeightKg(sanitizeDecimalInput(e.target.value))}
                placeholder="es. 78.5"
                className="w-40 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-stone-900 dark:text-stone-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </section>

          <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6">
            <h2 className="font-medium text-stone-900 dark:text-stone-50 mb-4">Metriche standard (attive di default)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {catalog.map((entry) => (
                <label
                  key={entry.name}
                  className="flex items-start gap-3 p-3 rounded-lg border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={!!selected[entry.name]}
                    onChange={() => toggle(entry.name)}
                    className="mt-1 accent-teal-600"
                  />
                  <span>
                    <span className="block font-medium text-stone-800 dark:text-stone-100">
                      {entry.name} <span className="text-stone-400 font-normal">({entry.unit})</span>
                    </span>
                    <span className="block text-xs text-stone-500 dark:text-stone-400">{entry.howToMeasure}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6">
            <h2 className="font-medium text-stone-900 dark:text-stone-50 mb-4">Metriche personalizzate</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              <input
                type="text"
                placeholder="Nome (es. Polso sx)"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="flex-1 min-w-[10rem] rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm text-stone-900 dark:text-stone-50"
              />
              <input
                type="text"
                placeholder="Unità (es. cm)"
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value)}
                className="w-24 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm text-stone-900 dark:text-stone-50"
              />
              <button
                type="button"
                onClick={addCustomMetric}
                className="px-4 py-2 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 text-sm font-medium hover:bg-stone-200 dark:hover:bg-stone-700"
              >
                Aggiungi
              </button>
            </div>
            {customMetrics.length > 0 && (
              <ul className="space-y-1">
                {customMetrics.map((m, i) => (
                  <li key={`${m.name}-${i}`} className="flex items-center justify-between text-sm bg-stone-50 dark:bg-stone-800/50 rounded-lg px-3 py-2">
                    <span>{m.name} ({m.unit})</span>
                    <button type="button" onClick={() => removeCustomMetric(i)} className="text-stone-400 hover:text-red-600">
                      Rimuovi
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6">
            <h2 className="font-medium text-stone-900 dark:text-stone-50 mb-1">Dati opzionali</h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
              Altezza e polso si impostano una sola volta, servono per calcolare il BMI e stimare la corporatura
              (serve anche il sesso, per lo stesso motivo).
            </p>
            <div className="flex gap-4 flex-wrap">
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Altezza (cm)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={heightCm}
                  onChange={(e) => setHeightCm(sanitizeDecimalInput(e.target.value))}
                  className="w-32 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-stone-900 dark:text-stone-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Polso (cm)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={wristCm}
                  onChange={(e) => setWristCm(sanitizeDecimalInput(e.target.value))}
                  className="w-32 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-stone-900 dark:text-stone-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Sesso</label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value)}
                  className="rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-stone-900 dark:text-stone-50"
                >
                  <option value="">Non specificato</option>
                  <option value="MALE">Uomo</option>
                  <option value="FEMALE">Donna</option>
                </select>
              </div>
            </div>
          </section>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-medium"
          >
            {submitting ? 'Salvataggio…' : 'Inizia a tracciare'}
          </button>
        </form>
      </div>
    </div>
  );
}
