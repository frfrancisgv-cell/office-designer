'use client';

import { useState } from 'react';
import type { UserPreferences } from '@/lib/types';
import { DEFAULT_USER_PREFERENCES, normalizeUserPreferences, USER_PREFERENCES_KEY } from '@/lib/user-preferences';

export function useUserPreferences() {
  const [preferences, setPreferencesState] = useState<UserPreferences>(() => {
    if (typeof window === 'undefined') return DEFAULT_USER_PREFERENCES;
    try {
      const stored = window.localStorage.getItem(USER_PREFERENCES_KEY);
      return stored ? normalizeUserPreferences(JSON.parse(stored)) : DEFAULT_USER_PREFERENCES;
    } catch (error) {
      console.warn('Could not read local office preferences:', error);
      return DEFAULT_USER_PREFERENCES;
    }
  });

  const setPreferences = (next: UserPreferences) => {
    const normalized = normalizeUserPreferences(next);
    setPreferencesState(normalized);
    try { window.localStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify(normalized)); }
    catch (error) { console.warn('Could not save local office preferences:', error); }
  };

  const resetPreferences = () => setPreferences(DEFAULT_USER_PREFERENCES);
  return { preferences, setPreferences, resetPreferences };
}
