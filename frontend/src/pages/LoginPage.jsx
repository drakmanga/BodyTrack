import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';

export default function LoginPage() {
  const { isAuthenticated, login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Captured once on first render only: redirects a user who lands on /login while
  // already authenticated, without reacting to the isAuthenticated flip that THIS
  // page itself causes on successful login/register (that flow navigates explicitly
  // in handleSubmit — reacting here too would race with it).
  const [wasAlreadyAuthenticated] = useState(isAuthenticated);

  useEffect(() => {
    if (wasAlreadyAuthenticated) {
      navigate('/', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (wasAlreadyAuthenticated) {
    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(username, password);
        navigate('/', { replace: true });
      } else {
        await register(username, password);
        navigate('/onboarding', { replace: true });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Errore imprevisto, riprova.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-stone-50 dark:bg-stone-950">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-600 text-white text-xl font-semibold mb-3">
            B
          </div>
          <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">BodyTrack</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            Tieni traccia dei tuoi progressi fisici
          </p>
        </div>

        <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-6">
          <div className="flex gap-1 mb-6 bg-stone-100 dark:bg-stone-800 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === 'login'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-50 shadow-sm'
                  : 'text-stone-500 dark:text-stone-400'
              }`}
            >
              Accedi
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === 'register'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-50 shadow-sm'
                  : 'text-stone-500 dark:text-stone-400'
              }`}
            >
              Registrati
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                Nome utente
              </label>
              <input
                id="username"
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-stone-900 dark:text-stone-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={mode === 'register' ? 8 : undefined}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-stone-900 dark:text-stone-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {mode === 'register' && (
                <p className="text-xs text-stone-400 mt-1">Minimo 8 caratteri.</p>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-medium transition-colors"
            >
              {submitting ? 'Attendere…' : mode === 'login' ? 'Accedi' : 'Crea account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
