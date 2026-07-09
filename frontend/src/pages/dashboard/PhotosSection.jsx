import { useCallback, useEffect, useState } from 'react';
import { deletePhoto, listPhotos, uploadPhoto } from '../../api/photos';
import { todayIso } from '../../utils/date';
import PhotoThumb from './PhotoThumb';
import PhotoLightbox from './PhotoLightbox';
import PhotoCompareModal from './PhotoCompareModal';
import PhotoUploadModal from './PhotoUploadModal';
import Skeleton from '../../components/Skeleton';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function PhotosSection() {
  const [photos, setPhotos] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadingDrop, setUploadingDrop] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const reload = useCallback(() => {
    listPhotos({ page: 0, size: 100 }).then((page) => setPhotos(page.content));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleDrop(event) {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    setUploadingDrop(true);
    try {
      await uploadPhoto({ file, photoDate: todayIso() });
      reload();
    } catch (err) {
      window.alert(err.message || 'Errore durante il caricamento della foto.');
    } finally {
      setUploadingDrop(false);
    }
  }

  function togglePhotoClick(photo) {
    if (compareMode) {
      setCompareSelection((prev) => {
        if (prev.includes(photo.id)) {
          return prev.filter((id) => id !== photo.id);
        }
        if (prev.length >= 2) {
          return [prev[1], photo.id];
        }
        return [...prev, photo.id];
      });
    } else {
      setLightboxPhoto(photo);
    }
  }

  function handleDelete(id) {
    setConfirmDeleteId(id);
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await deletePhoto(confirmDeleteId);
      setConfirmDeleteId(null);
      setLightboxPhoto(null);
      reload();
    } finally {
      setDeleting(false);
    }
  }

  const comparePhotos = photos?.filter((p) => compareSelection.includes(p.id)) ?? [];

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <h2 className="font-medium text-stone-800 dark:text-stone-100">Foto progresso</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setCompareMode((v) => !v);
              setCompareSelection([]);
            }}
            className={`flex-1 sm:flex-initial whitespace-nowrap text-xs font-medium px-3 py-1.5 rounded-lg border ${
              compareMode
                ? 'bg-teal-600 text-white border-teal-600'
                : 'border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300'
            }`}
          >
            {compareMode ? `Confronta (${compareSelection.length}/2)` : 'Confronta due foto'}
          </button>
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="flex-1 sm:flex-initial whitespace-nowrap text-xs font-medium px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white"
          >
            + Aggiungi foto
          </button>
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-3 transition-colors ${
          dragOver ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/20' : 'border-stone-200 dark:border-stone-800'
        }`}
      >
        {photos === null ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : uploadingDrop ? (
          <p className="text-sm text-stone-400 text-center py-8">Caricamento…</p>
        ) : photos.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-8">
            Nessuna foto ancora. Trascina un&apos;immagine qui o usa &quot;+ Aggiungi foto&quot;.
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {photos.map((photo) => (
              <PhotoThumb
                key={photo.id}
                photo={photo}
                selected={compareSelection.includes(photo.id)}
                onClick={() => togglePhotoClick(photo)}
              />
            ))}
          </div>
        )}
      </div>

      {lightboxPhoto && (
        <PhotoLightbox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} onDelete={handleDelete} />
      )}

      {comparePhotos.length === 2 && (
        <PhotoCompareModal
          photos={comparePhotos}
          onClose={() => {
            setCompareSelection([]);
          }}
        />
      )}

      {showUploadModal && (
        <PhotoUploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={async ({ file, photoDate }) => {
            await uploadPhoto({ file, photoDate });
            reload();
          }}
        />
      )}

      {confirmDeleteId && (
        <ConfirmDialog
          title="Elimina foto"
          message="Eliminare questa foto? L'operazione non può essere annullata."
          submitting={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </section>
  );
}
