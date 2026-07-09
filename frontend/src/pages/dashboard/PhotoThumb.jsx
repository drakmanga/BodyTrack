import { usePhotoUrl } from '../../hooks/usePhotoUrl';
import Skeleton from '../../components/Skeleton';
import { formatDateDisplay } from '../../utils/date';

export default function PhotoThumb({ photo, selected, onClick }) {
  const url = usePhotoUrl(photo.id);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
        selected ? 'border-teal-500' : 'border-transparent'
      }`}
    >
      {url ? (
        <img src={url} alt={`Foto del ${formatDateDisplay(photo.photoDate)}`} className="w-full h-full object-cover" />
      ) : (
        <Skeleton className="w-full h-full rounded-lg" />
      )}
      <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[11px] py-0.5">
        {formatDateDisplay(photo.photoDate)}
      </span>
    </button>
  );
}
