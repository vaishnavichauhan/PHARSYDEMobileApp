/**
 * Age Verification Store
 * Manages age-gate state with AsyncStorage persistence
 * and backend API health verification
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../config/api';

const AGE_VERIFIED_KEY = 'pharsyde_age_verified';
const PROVINCE_KEY = 'pharsyde_province';

// Province minimum ages – mirrors frontend AgeGateModal
export const PROVINCE_MIN_AGES: Record<string, number> = {
  MB: 19,
  ON: 19,
  BC: 19,
  AB: 18,
  SK: 19,
  QC: 21,
};

export interface Province {
  code: string;
  label: string;
}

export const PROVINCES: Province[] = [
  { code: 'MB', label: 'Manitoba (19+)' },
  { code: 'ON', label: 'Ontario (19+)' },
  { code: 'BC', label: 'British Columbia (19+)' },
  { code: 'AB', label: 'Alberta (18+)' },
  { code: 'SK', label: 'Saskatchewan (19+)' },
  { code: 'QC', label: 'Quebec (21+)' },
];

interface AgeVerificationState {
  isAgeVerified: boolean;
  isLoading: boolean;
  isVerifying: boolean;
  errorMessage: string;
  selectedProvince: string;

  // Actions
  initAgeVerification: () => Promise<void>;
  verifyAge: (birthYear: string, province: string) => Promise<boolean>;
  setProvince: (province: string) => void;
  setError: (msg: string) => void;
  clearError: () => void;
  resetVerification: () => void;
}

export const useAgeVerificationStore = create<AgeVerificationState>((set, get) => ({
  isAgeVerified: false,
  isLoading: true,
  isVerifying: false,
  errorMessage: '',
  selectedProvince: 'MB',

  /** Load persisted verification state on app launch */
  initAgeVerification: async () => {
    try {
      const [verified, province] = await Promise.all([
        AsyncStorage.getItem(AGE_VERIFIED_KEY),
        AsyncStorage.getItem(PROVINCE_KEY),
      ]);
      set({
        isAgeVerified: verified === 'true',
        selectedProvince: province || 'MB',
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  /** Verify age against local rules + confirm backend is reachable */
  verifyAge: async (birthDateOrYear: string, province: string = 'MB') => {
    const { setError } = get();

    if (!birthDateOrYear || !birthDateOrYear.trim()) {
      setError('Please enter your date of birth to confirm eligibility.');
      return false;
    }

    const trimmed = birthDateOrYear.trim();
    let birthDate: Date | null = null;

    // 1. Check DD/MM/YYYY or DD-MM-YYYY
    const dmy = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (dmy) {
      const day = parseInt(dmy[1], 10);
      const month = parseInt(dmy[2], 10) - 1;
      const year = parseInt(dmy[3], 10);
      birthDate = new Date(year, month, day);
      if (
        birthDate.getFullYear() !== year ||
        birthDate.getMonth() !== month ||
        birthDate.getDate() !== day
      ) {
        birthDate = null;
      }
    } else {
      // 2. Check YYYY-MM-DD or YYYY/MM/DD
      const ymd = trimmed.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
      if (ymd) {
        const year = parseInt(ymd[1], 10);
        const month = parseInt(ymd[2], 10) - 1;
        const day = parseInt(ymd[3], 10);
        birthDate = new Date(year, month, day);
        if (
          birthDate.getFullYear() !== year ||
          birthDate.getMonth() !== month ||
          birthDate.getDate() !== day
        ) {
          birthDate = null;
        }
      } else {
        // 3. Fallback: 4-digit year only
        const yearOnly = trimmed.match(/^(\d{4})$/);
        if (yearOnly) {
          const year = parseInt(yearOnly[1], 10);
          birthDate = new Date(year, 0, 1);
        }
      }
    }

    if (!birthDate || isNaN(birthDate.getTime())) {
      setError('Please enter a valid date of birth.');
      return false;
    }

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    const minAge = PROVINCE_MIN_AGES[province] ?? 19;
    if (age < minAge) {
      setError('You must be 19 years of age or older to enter this website.');
      return false;
    }

    // Age passes local check — verify backend is reachable
    set({ isVerifying: true, errorMessage: '' });
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(API_ENDPOINTS.health, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Backend unreachable');
      }

      // Persist verified state
      await Promise.all([
        AsyncStorage.setItem(AGE_VERIFIED_KEY, 'true'),
        AsyncStorage.setItem(PROVINCE_KEY, province),
      ]);

      set({ isAgeVerified: true, isVerifying: false, errorMessage: '' });
      return true;
    } catch (error) {
      // Backend offline – still allow local verification (matches frontend behaviour)
      await Promise.all([
        AsyncStorage.setItem(AGE_VERIFIED_KEY, 'true'),
        AsyncStorage.setItem(PROVINCE_KEY, province),
      ]);
      set({ isAgeVerified: true, isVerifying: false, errorMessage: '' });
      return true;
    }
  },

  setProvince: (province: string) => set({ selectedProvince: province }),
  setError: (msg: string) => set({ errorMessage: msg }),
  clearError: () => set({ errorMessage: '' }),

  /** Reset for testing / logout */
  resetVerification: async () => {
    await AsyncStorage.removeItem(AGE_VERIFIED_KEY);
    await AsyncStorage.removeItem(PROVINCE_KEY);
    set({ isAgeVerified: false, selectedProvince: 'MB', errorMessage: '', isLoading: false });
  },
}));
