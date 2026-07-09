import { useEffect, useState } from 'react';
import Header from '../components/Header';
import AddProfileModal from '../components/AddProfileModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import { createMetric, deleteMetric, getCatalog, listMetrics } from '../api/metrics';
import { createProfile, deleteProfile, updateProfile } from '../api/profiles';
import { sanitizeDecimalInput } from '../utils/numeric';
import { estimateFrameSize, estimateIdealWeightKg, FRAME_SIZE_LABELS } from '../utils/frameSize';
import InfoTooltip from '../components/InfoTooltip';

export default function SettingsPage() {
  const { profiles, activeProfile, switchProfile, refreshProfiles } = useAuth();
  const [metrics, setMetrics] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [heightCm, setHeightCm] = useState('');
  const [wristCm, setWristCm] = useState('');
  const [sex, setSex] = useState('');
  const [unitSystem, setUnitSystem] = useState('METRIC');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('cm');
  const [loading, setLoading] = useState(true);
  const [metricsError, setMetricsError] = useState(null);
  const [peopleError, setPeopleError] = useState(null);
  const [addProfileOpen, setAddProfileOpen] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingProfile, setDeletingProfile] = useState(null);
  const [deletingSubmitting, setDeletingSubmitting] = useState(false);

  function reloadMetrics() {
    return listMetrics().then(setMetrics);
  }

  useEffect(() => {
    Promise.all([listMetrics(), getCatalog()])
      .then(([metricsData, catalogData]) => {
        setMetrics(metricsData);
        setCatalog(catalogData);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeProfile) return;
    setHeightCm(activeProfile.heightCm ?? '');
    setWristCm(activeProfile.wristCm ?? '');
    setSex(activeProfile.sex ?? '');
    setUnitSystem(activeProfile.unitSystem);
  }, [activeProfile]);

  async function handleSaveProfile(event) {
    event.preventDefault();
    if (!activeProfile) return;
    setSavingProfile(true);
    setProfileSaved(false);
    setProfileError(null);
    try {
      await updateProfile(activeProfile.id, {
        heightCm: heightCm ? Number(heightCm) : null,
        wristCm: wristCm ? Number(wristCm) : null,
        sex: sex || null,
        unitSystem,
      });
      await refreshProfiles();
      setProfileSaved(true);
    } catch (err) {
      setProfileError(err.message || 'Errore durante il salvataggio, riprova.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleAddCatalogMetric(entry) {
    setMetricsError(null);
    try {
      await createMetric({ name: entry.name, unit: entry.unit, howToMeasure: entry.howToMeasure });
      await reloadMetrics();
    } catch (err) {
      setMetricsError(err.message || 'Errore durante il salvataggio, riprova.');
    }
  }

  async function handleAddCustomMetric(event) {
    event.preventDefault();
    if (!newName.trim()) return;
    setMetricsError(null);
    try {
      await createMetric({ name: newName.trim(), unit: newUnit.trim() || 'cm', howToMeasure: null });
      setNewName('');
      setNewUnit('cm');
      await reloadMetrics();
    } catch (err) {
      setMetricsError(err.message || 'Errore durante il salvataggio, riprova.');
    }
  }

  async function handleDeactivate(id) {
    setMetricsError(null);
    try {
      await deleteMetric(id);
      await reloadMetrics();
    } catch (err) {
      setMetricsError(err.message || 'Errore durante la disattivazione, riprova.');
    }
  }

  async function handleCreateProfile(displayName) {
    const created = await createProfile({ displayName });
    await switchProfile(created.id);
  }

  function startRename(profile) {
    setPeopleError(null);
    setRenamingId(profile.id);
    setRenameValue(profile.displayName);
  }

  async function submitRename(event) {
    event.preventDefault();
    if (!renameValue.trim()) return;
    setPeopleError(null);
    try {
      await updateProfile(renamingId, { displayName: renameValue.trim() });
      setRenamingId(null);
      await refreshProfiles();
    } catch (err) {
      setPeopleError(err.message || 'Errore durante la rinomina, riprova.');
    }
  }

  async function confirmDeleteProfile() {
    if (!deletingProfile) return;
    setDeletingSubmitting(true);
    setPeopleError(null);
    try {
      await deleteProfile(deletingProfile.id);
      setDeletingProfile(null);
      await refreshProfiles();
    } catch (err) {
      setPeopleError(err.message || "Errore durante l'eliminazione, riprova.");
    } finally {
      setDeletingSubmitting(false);
    }
  }

  if (loading || !activeProfile) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
        <Header />
        <p className="text-center text-stone-500 mt-10">Caricamento…</p>
      </div>
    );
  }

  const activeNames = new Set(metrics.map((m) => m.name));
  const availableCatalog = catalog.filter((entry) => !activeNames.has(entry.name));

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">Impostazioni</h1>

        <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6">
          <h2 className="font-medium text-stone-900 dark:text-stone-50 mb-4">Persone</h2>
          {peopleError && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{peopleError}</p>}
          <ul className="space-y-1 mb-4">
            {profiles.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 text-sm bg-stone-50 dark:bg-stone-800/50 rounded-lg px-3 py-2"
              >
                {renamingId === p.id ? (
                  <form onSubmit={submitRename} className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="flex-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-2 py-1 text-stone-900 dark:text-stone-50"
                    />
                    <button type="submit" className="text-teal-600 hover:text-teal-700 text-xs font-medium">
                      Salva
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenamingId(null)}
                      className="text-stone-400 hover:text-stone-600 text-xs font-medium"
                    >
                      Annulla
                    </button>
                  </form>
                ) : (
                  <>
                    <span className={`flex-1 truncate ${p.isActive ? 'font-medium text-teal-700 dark:text-teal-400' : ''}`}>
                      {p.displayName}
                      {p.isPrimary && <span className="ml-1.5 text-xs text-stone-400 font-normal">(principale)</span>}
                      {p.isActive && <span className="ml-1.5">✓</span>}
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      {!p.isActive && (
                        <button
                          type="button"
                          onClick={() => switchProfile(p.id)}
                          className="text-stone-400 hover:text-teal-600 text-xs font-medium"
                        >
                          Seleziona
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => startRename(p)}
                        className="text-stone-400 hover:text-teal-600 text-xs font-medium"
                      >
                        Rinomina
                      </button>
                      {!p.isPrimary && (
                        <button
                          type="button"
                          onClick={() => setDeletingProfile(p)}
                          className="text-stone-400 hover:text-red-600 text-xs font-medium"
                        >
                          Elimina
                        </button>
                      )}
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setAddProfileOpen(true)}
            className="text-sm px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-teal-500 hover:text-teal-600"
          >
            + Aggiungi persona
          </button>
        </section>

        <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6">
          <h2 className="font-medium text-stone-900 dark:text-stone-50 mb-4">Profilo — {activeProfile.displayName}</h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
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
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Unità</label>
                <select
                  value={unitSystem}
                  onChange={(e) => setUnitSystem(e.target.value)}
                  className="rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-stone-900 dark:text-stone-50"
                >
                  <option value="METRIC">Metrico (kg/cm)</option>
                  <option value="IMPERIAL">Imperiale (lb/in)</option>
                </select>
              </div>
            </div>
            {(() => {
              const h = Number(heightCm);
              const w = Number(wristCm);
              if (!h || !w) return null;
              if (!sex) {
                return (
                  <p className="text-sm text-stone-400">
                    Imposta il sesso qui sopra per vedere la corporatura stimata e il peso ideale di riferimento.
                  </p>
                );
              }
              const frameSize = estimateFrameSize(h, w, sex);
              const idealWeight = estimateIdealWeightKg(h, sex, frameSize);
              return (
                <p className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-stone-600 dark:text-stone-300">
                  Corporatura stimata: <span className="font-medium">{FRAME_SIZE_LABELS[frameSize]}</span>
                  {idealWeight && (
                    <>
                      · Peso ideale di riferimento: <span className="font-medium">~{idealWeight.toFixed(1)} kg</span>
                    </>
                  )}
                  <InfoTooltip text="Stima basata sul rapporto altezza/polso (corporatura) e sulla formula di Hamwi corretta per la corporatura (peso ideale). Sono indicazioni di massima, non dati medici individuali." />
                </p>
              );
            })()}
            <button
              type="submit"
              disabled={savingProfile}
              className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-medium"
            >
              {savingProfile ? 'Salvataggio…' : 'Salva profilo'}
            </button>
            {profileSaved && <span className="ml-3 text-sm text-teal-600 dark:text-teal-400">Salvato ✓</span>}
            {profileError && <p className="text-sm text-red-600 dark:text-red-400">{profileError}</p>}
          </form>
        </section>

        <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6">
          <h2 className="font-medium text-stone-900 dark:text-stone-50 mb-4">Metriche attive</h2>
          {metricsError && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{metricsError}</p>}
          <ul className="space-y-1 mb-4">
            {metrics.map((m) => (
              <li key={m.id} className="flex items-center justify-between text-sm bg-stone-50 dark:bg-stone-800/50 rounded-lg px-3 py-2">
                <span>{m.name} ({m.unit})</span>
                <button
                  type="button"
                  onClick={() => handleDeactivate(m.id)}
                  className="text-stone-400 hover:text-red-600 text-xs font-medium"
                >
                  Disattiva
                </button>
              </li>
            ))}
          </ul>

          {availableCatalog.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-stone-500 dark:text-stone-400 mb-2">Aggiungi dal catalogo standard:</p>
              <div className="flex flex-wrap gap-2">
                {availableCatalog.map((entry) => (
                  <button
                    key={entry.name}
                    type="button"
                    onClick={() => handleAddCatalogMetric(entry)}
                    className="text-xs px-2.5 py-1.5 rounded-full border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-teal-500 hover:text-teal-600"
                  >
                    + {entry.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleAddCustomMetric} className="flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="Nome metrica personalizzata"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 min-w-[10rem] rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm text-stone-900 dark:text-stone-50"
            />
            <input
              type="text"
              placeholder="Unità"
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              className="w-24 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm text-stone-900 dark:text-stone-50"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 text-sm font-medium hover:bg-stone-200 dark:hover:bg-stone-700"
            >
              Aggiungi
            </button>
          </form>
        </section>
      </main>

      {addProfileOpen && (
        <AddProfileModal onClose={() => setAddProfileOpen(false)} onCreate={handleCreateProfile} />
      )}

      {deletingProfile && (
        <ConfirmDialog
          title="Elimina persona"
          message={`Eliminare definitivamente "${deletingProfile.displayName}"? Tutte le sue metriche, misurazioni e foto verranno cancellate per sempre.`}
          confirmLabel="Elimina"
          submitting={deletingSubmitting}
          onConfirm={confirmDeleteProfile}
          onCancel={() => setDeletingProfile(null)}
        />
      )}
    </div>
  );
}
