import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../config/api';
import { useCheckoutStore } from './checkoutStore';

export interface CustomerUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  mob_no?: string;
  role?: string;
  user_type?: string;
  date_of_birth?: string;
  reward_points?: number;
  reward_points_dollar_value?: number;
  techpos_member_id?: number | string | null;
  is_elite?: boolean | number;
}

interface ProfileState {
  isOpen: boolean;
  user: CustomerUser | null;
  token: string | null;
  isLoggedIn: boolean;
  authTab: 'login' | 'register';
  initialEmail?: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  openProfile: (tab?: 'login' | 'register' | unknown, initialEmail?: string | null) => void;
  closeProfile: () => void;
  setAuthTab: (tab: 'login' | 'register') => void;
  clearError: () => void;
  initAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    dateOfBirth?: string;
  }) => Promise<boolean>;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
}

const CUSTOMER_TOKEN_KEY = 'pharsyde_customer_token';
const CUSTOMER_USER_KEY = 'pharsyde_customer_user';

export const useProfileStore = create<ProfileState>((set, get) => ({
  isOpen: false,
  user: null,
  token: null,
  isLoggedIn: false,
  authTab: 'login',
  initialEmail: null,
  isLoading: false,
  error: null,

  openProfile: (tab?: unknown, initialEmail?: string | null) =>
    set({
      isOpen: true,
      authTab: tab === 'login' || tab === 'register' ? tab : (get().isLoggedIn ? 'login' : get().authTab),
      initialEmail: typeof initialEmail === 'string' ? initialEmail : get().initialEmail,
      error: null,
    }),

  closeProfile: () => set({ isOpen: false, error: null }),

  setAuthTab: (tab: 'login' | 'register') => set({ authTab: tab, error: null }),

  clearError: () => set({ error: null }),

  initAuth: async () => {
    try {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem(CUSTOMER_TOKEN_KEY),
        AsyncStorage.getItem(CUSTOMER_USER_KEY),
      ]);

      if (storedToken && storedUser) {
        try {
          const parsedUser: CustomerUser = JSON.parse(storedUser);
          set({
            token: storedToken,
            user: parsedUser,
            isLoggedIn: true,
          });

          // Sync with checkout details
          const nameParts = (parsedUser.name || '').trim().split(' ');
          useCheckoutStore.getState().updateFormField('firstName', nameParts[0] || 'Valued');
          useCheckoutStore.getState().updateFormField('lastName', nameParts.slice(1).join(' ') || 'Customer');
          useCheckoutStore.getState().updateFormField('email', parsedUser.email || '');
          useCheckoutStore.getState().updateFormField('phone', parsedUser.phone || parsedUser.mob_no || '');

          // Hydrate customer orders from backend
          useCheckoutStore.getState().loadOrderHistory();

          // Verify token freshness in background
          fetch(API_ENDPOINTS.me, {
            headers: {
              Authorization: `Bearer ${storedToken}`,
              'Content-Type': 'application/json',
            },
          })
            .then(res => {
              if (res.ok) {
                return res.json();
              } else if (res.status === 401) {
                get().logout();
              }
              return null;
            })
            .then(data => {
              if (data && data.success && data.user) {
                const updatedUser: CustomerUser = {
                  ...data.user,
                  phone: data.user.phone || data.user.mob_no,
                  reward_points: Number(data.user.reward_points) || 0,
                  reward_points_dollar_value: Number(data.user.reward_points_dollar_value) || 0,
                  techpos_member_id: data.user.techpos_member_id || null,
                  is_elite: Boolean(data.user.is_elite),
                };
                set({ user: updatedUser });
                AsyncStorage.setItem(CUSTOMER_USER_KEY, JSON.stringify(updatedUser));
              }
            })
            .catch(() => {
              // Ignore network offline errors; keep cached credentials
            });
        } catch (e) {
          console.warn('Error parsing cached customer user:', e);
        }
      }
    } catch (err) {
      console.warn('Error reading stored customer session:', err);
    }
  },

  login: async (email: string, password: string) => {
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      set({ error: 'Please provide both your email and password.' });
      return false;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await fetch(API_ENDPOINTS.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPassword }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.token) {
        const user: CustomerUser = {
          ...data.user,
          phone: data.user.phone || data.user.mob_no,
          reward_points: Number(data.user.reward_points) || 0,
          reward_points_dollar_value: Number(data.user.reward_points_dollar_value) || 0,
          techpos_member_id: data.user.techpos_member_id || null,
          is_elite: Boolean(data.user.is_elite),
        };

        await Promise.all([
          AsyncStorage.setItem(CUSTOMER_TOKEN_KEY, data.token),
          AsyncStorage.setItem(CUSTOMER_USER_KEY, JSON.stringify(user)),
        ]);

        set({
          user,
          token: data.token,
          isLoggedIn: true,
          isLoading: false,
          error: null,
        });

        // Autofill checkout details
        const nameParts = (user.name || '').trim().split(' ');
        useCheckoutStore.getState().updateFormField('firstName', nameParts[0] || 'Valued');
        useCheckoutStore.getState().updateFormField('lastName', nameParts.slice(1).join(' ') || 'Customer');
        useCheckoutStore.getState().updateFormField('email', user.email || '');
        useCheckoutStore.getState().updateFormField('phone', user.phone || user.mob_no || '');

        // Fetch authenticated user orders
        useCheckoutStore.getState().loadOrderHistory();

        return true;
      } else {
        set({
          isLoading: false,
          error: data.message || 'Login failed. Please check your credentials.',
        });
        return false;
      }
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || 'Network error connecting to Pharsyde authentication service.',
      });
      return false;
    }
  },

  register: async ({ name, email, password, phone, dateOfBirth }) => {
    const cleanName = (name || '').trim();
    const cleanEmail = (email || '').trim();
    const cleanPassword = (password || '').trim();

    if (!cleanName || !cleanEmail || !cleanPassword) {
      set({ error: 'Please fill in all required fields (Name, Email, Password).' });
      return false;
    }

    // Normalize Date of Birth (MySQL DATE expects YYYY-MM-DD)
    let formattedDob = (dateOfBirth || '').trim();
    if (/^\d{4}$/.test(formattedDob)) {
      formattedDob = `${formattedDob}-01-01`;
    } else if (formattedDob && !/^\d{4}-\d{2}-\d{2}/.test(formattedDob)) {
      formattedDob = '';
    }

    set({ isLoading: true, error: null });
    try {
      const response = await fetch(API_ENDPOINTS.register, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password: cleanPassword,
          phone: (phone || '').trim(),
          dateOfBirth: formattedDob || null,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.token) {
        const user: CustomerUser = {
          ...data.user,
          phone: data.user.phone || data.user.mob_no,
          reward_points: Number(data.user.reward_points) || 0,
          reward_points_dollar_value: Number(data.user.reward_points_dollar_value) || 0,
          techpos_member_id: data.user.techpos_member_id || null,
          is_elite: Boolean(data.user.is_elite),
        };

        await Promise.all([
          AsyncStorage.setItem(CUSTOMER_TOKEN_KEY, data.token),
          AsyncStorage.setItem(CUSTOMER_USER_KEY, JSON.stringify(user)),
        ]);

        set({
          user,
          token: data.token,
          isLoggedIn: true,
          isLoading: false,
          error: null,
        });

        // Autofill checkout details
        const nameParts = (user.name || '').trim().split(' ');
        useCheckoutStore.getState().updateFormField('firstName', nameParts[0] || 'Valued');
        useCheckoutStore.getState().updateFormField('lastName', nameParts.slice(1).join(' ') || 'Customer');
        useCheckoutStore.getState().updateFormField('email', user.email || '');
        useCheckoutStore.getState().updateFormField('phone', user.phone || user.mob_no || '');

        // Fetch authenticated user orders
        useCheckoutStore.getState().loadOrderHistory();

        return true;
      } else {
        set({
          isLoading: false,
          error: data.message || 'Registration failed. Please check your details.',
        });
        return false;
      }
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || 'Network error connecting to Pharsyde authentication service.',
      });
      return false;
    }
  },

  logout: async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(CUSTOMER_TOKEN_KEY),
        AsyncStorage.removeItem(CUSTOMER_USER_KEY),
      ]);
      useCheckoutStore.getState().clearOrderHistory();
    } catch (e) {
      console.warn('Error clearing customer session:', e);
    }

    set({
      user: null,
      token: null,
      isLoggedIn: false,
      authTab: 'login',
      initialEmail: null,
      error: null,
    });

    // Clear checkout form customer fields
    useCheckoutStore.getState().updateFormField('firstName', '');
    useCheckoutStore.getState().updateFormField('lastName', '');
    useCheckoutStore.getState().updateFormField('email', '');
    useCheckoutStore.getState().updateFormField('phone', '');
  },

  fetchCurrentUser: async () => {
    const { token } = get();
    if (!token) return;

    try {
      const response = await fetch(API_ENDPOINTS.me, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          const user: CustomerUser = {
            ...data.user,
            phone: data.user.phone || data.user.mob_no,
            reward_points: Number(data.user.reward_points) || 0,
            reward_points_dollar_value: Number(data.user.reward_points_dollar_value) || 0,
            techpos_member_id: data.user.techpos_member_id || null,
            is_elite: Boolean(data.user.is_elite),
          };
          set({ user });
          await AsyncStorage.setItem(CUSTOMER_USER_KEY, JSON.stringify(user));
        }
      }
    } catch (err) {
      console.warn('Failed to refresh customer user:', err);
    }
  },
}));
