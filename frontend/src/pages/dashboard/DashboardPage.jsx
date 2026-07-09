import { useEffect, useState } from 'react';
import Header from '../../components/Header';
import Tabs from '../../components/Tabs';
import { useAuth } from '../../context/AuthContext';
import { listMetrics } from '../../api/metrics';
import { listMeasurements } from '../../api/measurements';
import LatestMeasurements from './LatestMeasurements';
import StatsSection from './StatsSection';
import PhotosSection from './PhotosSection';
import HistorySection from './HistorySection';
import MeasurementFormModal from './MeasurementFormModal';

const TABS = [
  { key: 'misure', label: 'Ultime misure' },
  { key: 'grafici', label: 'Grafici' },
  { key: 'foto', label: 'Foto' },
  { key: 'storico', label: 'Storico' },
];

export default function DashboardPage() {
  const { activeProfile } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [hasAnyMeasurement, setHasAnyMeasurement] = useState(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [tab, setTab] = useState('misure');

  useEffect(() => {
    listMetrics().then(setMetrics);
  }, []);

  useEffect(() => {
    listMeasurements({ page: 0, size: 1 }).then((page) => setHasAnyMeasurement(page.page.totalElements > 0));
  }, [dataVersion]);

  function bumpData() {
    setDataVersion((v) => v + 1);
  }

  const loading = activeProfile === null || metrics === null;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 pb-24 sm:pb-8">
      <Header onAddMeasurement={metrics && metrics.length > 0 ? () => setShowAddModal(true) : undefined} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {loading ? (
          <p className="text-stone-400 text-sm">Caricamento…</p>
        ) : (
          <>
            {hasAnyMeasurement === false && (
              <div className="bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900 rounded-xl p-4 text-sm text-teal-800 dark:text-teal-200">
                Aggiungi la tua prima misurazione per iniziare a vedere i grafici e i progressi. Usa il pulsante
                &quot;+ Aggiungi misurazione&quot; qui sopra.
              </div>
            )}

            <Tabs tabs={TABS} active={tab} onChange={setTab} />

            {tab === 'misure' && (
              <section>
                <LatestMeasurements
                  metrics={metrics}
                  unitSystem={activeProfile.unitSystem}
                  profile={activeProfile}
                  dataVersion={dataVersion}
                  onDataChanged={bumpData}
                />
              </section>
            )}

            {tab === 'grafici' && (
              <StatsSection metrics={metrics} unitSystem={activeProfile.unitSystem} profile={activeProfile} dataVersion={dataVersion} />
            )}

            {tab === 'foto' && <PhotosSection />}

            {tab === 'storico' && (
              <HistorySection
                metrics={metrics}
                unitSystem={activeProfile.unitSystem}
                dataVersion={dataVersion}
                onDataChanged={bumpData}
              />
            )}
          </>
        )}
      </main>

      {metrics && metrics.length > 0 && (
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          aria-label="Aggiungi misurazione"
          className="sm:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full bg-teal-600 hover:bg-teal-700 text-white text-2xl shadow-lg flex items-center justify-center z-40"
        >
          +
        </button>
      )}

      {showAddModal && (
        <MeasurementFormModal
          metrics={metrics}
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false);
            bumpData();
          }}
        />
      )}
    </div>
  );
}
