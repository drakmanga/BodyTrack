export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 bg-stone-100 dark:bg-stone-800/60 rounded-xl p-1.5 overflow-x-auto">
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={`flex-1 shrink-0 whitespace-nowrap py-2 px-2.5 sm:py-2.5 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              isActive
                ? 'bg-white dark:bg-stone-900 text-teal-700 dark:text-teal-400 shadow-sm'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-white/60 dark:hover:bg-stone-900/40'
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
