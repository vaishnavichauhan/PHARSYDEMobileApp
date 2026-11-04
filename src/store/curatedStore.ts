import { create } from 'zustand';
import { API_ENDPOINTS } from '../config/api';
import { Product } from './productStore';

export type CuratedType = 'new-arrivals' | 'best-sellers';

interface CuratedState {
  newArrivals: Product[];
  newArrivalsLimit: number;
  isLoadingNewArrivals: boolean;
  errorNewArrivals: string | null;

  bestSellers: Product[];
  isLoadingBestSellers: boolean;
  errorBestSellers: string | null;

  activeModal: CuratedType | null;

  fetchNewArrivals: (force?: boolean) => Promise<void>;
  fetchBestSellers: (force?: boolean) => Promise<void>;
  openCuratedModal: (type: CuratedType) => void;
  closeCuratedModal: () => void;
}

export const useCuratedStore = create<CuratedState>((set, get) => ({
  newArrivals: [],
  newArrivalsLimit: 24,
  isLoadingNewArrivals: false,
  errorNewArrivals: null,

  bestSellers: [],
  isLoadingBestSellers: false,
  errorBestSellers: null,

  activeModal: null,

  fetchNewArrivals: async (force = false) => {
    const { newArrivals, isLoadingNewArrivals } = get();
    if (!force && newArrivals.length > 0) return;
    if (isLoadingNewArrivals) return;

    set({ isLoadingNewArrivals: true, errorNewArrivals: null });
    try {
      const res = await fetch(API_ENDPOINTS.newArrivals, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to load new arrivals`);
      }
      const data = await res.json();
      if (data && Array.isArray(data.products)) {
        set({
          newArrivals: data.products,
          newArrivalsLimit: data.limit || 24,
          isLoadingNewArrivals: false,
        });
      } else {
        throw new Error(data.message || 'Invalid new arrivals response');
      }
    } catch (err: any) {
      console.warn('[CuratedStore] fetchNewArrivals error:', err);
      set({
        isLoadingNewArrivals: false,
        errorNewArrivals: err?.message || 'Unable to load new arrivals',
      });
    }
  },

  fetchBestSellers: async (force = false) => {
    const { bestSellers, isLoadingBestSellers } = get();
    if (!force && bestSellers.length > 0) return;
    if (isLoadingBestSellers) return;

    set({ isLoadingBestSellers: true, errorBestSellers: null });
    try {
      const res = await fetch(API_ENDPOINTS.bestSellers, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to load best sellers`);
      }
      const data = await res.json();
      if (data && Array.isArray(data.products)) {
        set({
          bestSellers: data.products,
          isLoadingBestSellers: false,
        });
      } else {
        throw new Error(data.message || 'Invalid best sellers response');
      }
    } catch (err: any) {
      console.warn('[CuratedStore] fetchBestSellers error:', err);
      set({
        isLoadingBestSellers: false,
        errorBestSellers: err?.message || 'Unable to load best sellers',
      });
    }
  },

  openCuratedModal: (type: CuratedType) => {
    set({ activeModal: type });
    if (type === 'new-arrivals') {
      get().fetchNewArrivals(true);
    } else {
      get().fetchBestSellers(true);
    }
  },

  closeCuratedModal: () => {
    set({ activeModal: null });
  },
}));

