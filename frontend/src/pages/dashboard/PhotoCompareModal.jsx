import { usePhotoUrl } from '../../hooks/usePhotoUrl';
import { formatDateDisplay } from '../../utils/date';

function ComparePane({ photo }) {
  const url = usePhotoUrl(photo.id);
  return (
    <div className="flex-1">
      {url && <img src={url} alt={`Foto del ${formatDateDisplay(photo.photoDate)}`} className="w-full rounded-lg" />}
      <p className="text-center text-sm text-stone-300 mt-2">{formatDateDisplay(photo.photoDate)}</p>
    </div>
  );
}

export default function PhotoCompareModal({ photos, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="max-w-4xl w-full flex flex-col sm:flex-row gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {photos.map((photo) => (
          <ComparePane key={photo.id} photo={photo} />
        ))}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm"
      >
        Chiudi
      </button>
    </div>
  );
}
