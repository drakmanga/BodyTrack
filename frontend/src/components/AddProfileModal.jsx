import { useState } from 'react';
import Modal from './Modal';

export default function AddProfileModal({ onClose, onCreate }) {
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!displayName.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onCreate(displayName.trim());
      onClose();
    } catch (err) {
      setError(err.message || 'Errore durante la creazione, riprova.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Aggiungi persona" onClose={onClose} maxWidth="max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Nome</label>
          <input
            type="text"
            autoFocus
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="es. Marco"
            className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm text-stone-900 dark:text-stone-50"
          />
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
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
            {submitting ? 'Creazione…' : 'Aggiungi'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
