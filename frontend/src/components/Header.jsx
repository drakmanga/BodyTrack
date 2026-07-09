import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { createProfile } from '../api/profiles';
import AddProfileModal from './AddProfileModal';

export default function Header({ onAddMeasurement }) {
  const { username, logout, profiles, activeProfile, switchProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [addProfileOpen, setAddProfileOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  async function handleSwitchProfile(id) {
    if (switching || id === activeProfile?.id) {
      setMenuOpen(false);
      return;
    }
    setSwitching(true);
    try {
      await switchProfile(id);
    } finally {
      setSwitching(false);
    }
  }

  async function handleCreateProfile(displayName) {
    const created = await createProfile({ displayName });
    setMenuOpen(false);
    await switchProfile(created.id);
  }

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-stone-950/90 backdrop-blur border-b border-stone-200 dark:border-stone-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 font-semibold text-stone-900 dark:text-stone-50">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-teal-600 text-white text-sm">
            B
          </span>
          BodyTrack
        </Link>

        <div className="flex items-center gap-2">
          {onAddMeasurement && (
            <button
              type="button"
              onClick={onAddMeasurement}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-3 py-1.5 transition-colors"
            >
              + Aggiungi misurazione
            </button>
          )}

          <button
            type="button"
            aria-label="Cambia tema"
            onClick={toggleTheme}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <div className="relative min-w-0">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1 max-w-[7rem] sm:max-w-[16rem] rounded-lg px-2 py-1.5 text-sm text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <span className="truncate min-w-0">{activeProfile?.displayName || username || 'Profilo'}</span>
              <span className="shrink-0">▾</span>
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 mt-1 w-52 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-lg py-1 text-sm"
                onMouseLeave={() => setMenuOpen(false)}
              >
                {profiles.length > 0 && (
                  <>
                    <div className="px-3 pt-1.5 pb-1 text-xs font-medium text-stone-400 dark:text-stone-500 uppercase tracking-wide">
                      Persone
                    </div>
                    {profiles.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        disabled={switching}
                        onClick={() => handleSwitchProfile(p.id)}
                        className={`w-full flex items-center gap-2 text-left px-3 py-2 hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-60 ${
                          p.isActive ? 'text-teal-700 dark:text-teal-400 font-medium' : 'text-stone-700 dark:text-stone-200'
                        }`}
                      >
                        <span className="truncate flex-1">{p.displayName}</span>
                        {p.isActive && <span className="shrink-0">✓</span>}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setAddProfileOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 text-teal-700 dark:text-teal-400 hover:bg-stone-50 dark:hover:bg-stone-800"
                    >
                      + Aggiungi persona
                    </button>
                    <div className="my-1 border-t border-stone-200 dark:border-stone-800" />
                  </>
                )}
                <Link
                  to="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  Impostazioni
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-red-600 dark:text-red-400 hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  Esci
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {addProfileOpen && (
        <AddProfileModal onClose={() => setAddProfileOpen(false)} onCreate={handleCreateProfile} />
      )}
    </header>
  );
}
