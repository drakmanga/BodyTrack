import Modal from './Modal';

export default function ConfirmDialog({
  title = 'Conferma',
  message,
  confirmLabel = 'Elimina',
  cancelLabel = 'Annulla',
  danger = true,
  submitting = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal title={title} onClose={onCancel} maxWidth="max-w-sm">
      <p className="text-sm text-stone-600 dark:text-stone-300 mb-5">{message}</p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-stone-600 dark:text-stone-300 text-sm font-medium hover:bg-stone-100 dark:hover:bg-stone-800"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={submitting}
          className={`px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 ${
            danger ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-600 hover:bg-teal-700'
          }`}
        >
          {submitting ? 'Attendere…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
