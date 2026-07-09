import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth';
import { getMe } from '../api/users';
import { getProfiles, activateProfile as apiActivateProfile } from '../api/profiles';
import { clearToken, getToken, setToken } from '../api/client';

const AuthContext = createContext(null);

function rememberedProfileKey(username) {
  return `bodytrack_last_profile_${username}`;
}

// Login/register always come back scoped to the primary profile (see auth.service.ts); if this
// account was last using a different person, switch back to it right away so the session picks
// up where it left off instead of silently resetting to the primary person every time.
async function reactivateRememberedProfile(username) {
  const remembered = localStorage.getItem(rememberedProfileKey(username));
  if (!remembered) return;
  try {
    const { token: newToken } = await apiActivateProfile(Number(remembered));
    setToken(newToken);
  } catch {
    // Remembered profile no longer exists (e.g. deleted from another session) — ignore and
    // stay on the primary profile the login/register call already activated.
    localStorage.removeItem(rememberedProfileKey(username));
  }
}

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getToken());
  const [username, setUsername] = useState(null);
  const [profiles, setProfiles] = useState([]);

  const refreshProfiles = useCallback(async () => {
    const list = await getProfiles();
    setProfiles(list);
    return list;
  }, []);

  useEffect(() => {
    if (token && !username) {
      getMe()
        .then((me) => setUsername(me.username))
        .catch(() => {
          clearToken();
          setTokenState(null);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (token && username) {
      refreshProfiles().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, username]);

  const activeProfile = useMemo(() => profiles.find((p) => p.isActive) ?? null, [profiles]);

  const login = useCallback(async (usernameInput, password) => {
    const response = await authApi.login(usernameInput, password);
    setToken(response.token);
    await reactivateRememberedProfile(response.username);
    setTokenState(getToken());
    setUsername(response.username);
    return response;
  }, []);

  const register = useCallback(async (usernameInput, password) => {
    const response = await authApi.register(usernameInput, password);
    setToken(response.token);
    setTokenState(response.token);
    setUsername(response.username);
    return response;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setUsername(null);
    setProfiles([]);
  }, []);

  const switchProfile = useCallback(
    async (profileId) => {
      const { token: newToken } = await apiActivateProfile(profileId);
      setToken(newToken);
      if (username) {
        localStorage.setItem(rememberedProfileKey(username), String(profileId));
      }
      // Simplest correct way to make every already-loaded page (dashboard, settings, ...)
      // refetch under the new profile, instead of trying to invalidate scattered local state.
      window.location.reload();
    },
    [username]
  );

  const value = useMemo(
    () => ({
      token,
      username,
      isAuthenticated: !!token,
      login,
      register,
      logout,
      profiles,
      activeProfile,
      refreshProfiles,
      switchProfile,
    }),
    [token, username, login, register, logout, profiles, activeProfile, refreshProfiles, switchProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
