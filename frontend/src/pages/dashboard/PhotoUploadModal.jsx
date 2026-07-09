import { useRef, useState } from 'react';
import Modal from '../../components/Modal';
import { todayIso } from '../../utils/date';

export default function PhotoUploadModal({ onClose, onUpload }) {
  const [date, setDate] = useState(todayIso());
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  async function handleFileChosen(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      await onUpload({ file, photoDate: date });
      onClose();
    } catch (err) {
      setError(err.message || 'Errore durante il caricamento della foto.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal title="Aggiungi foto" onClose={onClose} maxWidth="max-w-sm">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Data della foto</label>
          <input
            type="date"
            required
            max={todayIso()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-stone-900 dark:text-stone-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
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
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-medium"
          >
            {uploading ? 'Caricamento…' : 'Carica foto'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChosen}
          />
        </div>
      </div>
    </Modal>
  );
}
