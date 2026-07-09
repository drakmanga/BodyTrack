import { usePhotoUrl } from '../../hooks/usePhotoUrl';
import { formatDateDisplay } from '../../utils/date';

export default function PhotoLightbox({ photo, onClose, onDelete }) {
  const url = usePhotoUrl(photo.id);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
        {url && <img src={url} alt={`Foto del ${formatDateDisplay(photo.photoDate)}`} className="w-full rounded-lg" />}
        <div className="flex items-center justify-between mt-3">
          <span className="text-white text-sm">{formatDateDisplay(photo.photoDate)}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onDelete(photo.id)}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm"
            >
              Elimina
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
