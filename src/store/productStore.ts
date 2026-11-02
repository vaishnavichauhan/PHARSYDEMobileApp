/**
 * Product Store (Zustand)
 * Manages product fetching from backend, searching, category filtering,
 * sorting, and favorite/wishlist toggling.
 */

import { create } from 'zustand';
import { API_ENDPOINTS } from '../config/api';

export interface Product {
  pk: string;
  product_name: string;
  sku: string;
  category: string;
  brand: string;
  strain?: string;
  retail_price: string;
  sale_price?: string;
  membership_price?: string;
  imageUrl?: string;
  secondImageUrl?: string;
  thC_LEVEL?: string;
  cbD_LEVEL?: string;
  qty_available?: string;
  notes?: string;
  description?: string;
  size?: string;
  weight?: string;
  barcode?: string;
  other_category?: string;
  equivalent_g?: string;
}

export type SortOption =
  | 'default'
  | 'price_asc'
  | 'price_desc'
  | 'name_asc'
  | 'thc_desc';

export const SORT_LABELS: Record<SortOption, string> = {
  default: 'Featured',
  price_asc: 'Price: Low to High',
  price_desc: 'Price: High to Low',
  name_asc: 'Name: A to Z',
  thc_desc: 'THC: High to Low',
};

interface ProductState {
  products: Product[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  // Filters & Sorting
  searchQuery: string;
  selectedCategory: string;
  selectedSort: SortOption;

  // Favorites
  favorites: Record<string, boolean>;

  // Actions
  fetchProducts: () => Promise<void>;
  refreshProducts: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  setSelectedSort: (sort: SortOption) => void;
  toggleFavorite: (productId: string) => void;
  resetFilters: () => void;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  isLoading: true,
  isRefreshing: false,
  error: null,

  searchQuery: '',
  selectedCategory: 'All',
  selectedSort: 'default',
  favorites: {},

  /** Fetch products from backend API */
  fetchProducts: async () => {
    try {
      set({ isLoading: true, error: null });
      const res = await fetch(API_ENDPOINTS.products);
      const json = await res.json();
      const list: Product[] = Array.isArray(json)
        ? json
        : Array.isArray(json.products)
        ? json.products
        : Array.isArray(json.data)
        ? json.data
        : [];
      set({ products: list, isLoading: false });
    } catch (err: any) {
      console.warn('ProductStore: Failed to fetch products:', err);
      set({
        error: err?.message || 'Failed to load products',
        isLoading: false,
      });
    }
  },

  /** Pull to refresh */
  refreshProducts: async () => {
    try {
      set({ isRefreshing: true, error: null });
      const res = await fetch(API_ENDPOINTS.products);
      const json = await res.json();
      const list: Product[] = Array.isArray(json)
        ? json
        : Array.isArray(json.products)
        ? json.products
        : Array.isArray(json.data)
        ? json.data
        : [];
      set({ products: list, isRefreshing: false });
    } catch (err: any) {
      console.warn('ProductStore: Refresh failed:', err);
      set({ isRefreshing: false });
    }
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setSelectedCategory: (cat: string) => set({ selectedCategory: cat }),
  setSelectedSort: (sort: SortOption) => set({ selectedSort: sort }),

  toggleFavorite: (productId: string) => {
    const current = get().favorites;
    set({
      favorites: {
        ...current,
        [productId]: !current[productId],
      },
    });
  },

  resetFilters: () =>
    set({
      searchQuery: '',
      selectedCategory: 'All',
      selectedSort: 'default',
    }),
}));

/** Selector: Get all distinct categories */
export const selectCategories = (state: ProductState): string[] => {
  const set = new Set<string>();
  state.products.forEach(p => {
    if (p.category && p.category.trim()) {
      set.add(p.category.trim());
    }
  });
  return ['All', ...Array.from(set)];
};

/** Selector: Get filtered & sorted products */
export const selectFilteredProducts = (state: ProductState): Product[] => {
  let result = [...state.products];

  // Search filter
  if (state.searchQuery.trim()) {
    const q = state.searchQuery.toLowerCase().trim();
    result = result.filter(p => {
      const nameMatch = p.product_name?.toLowerCase().includes(q);
      const brandMatch = p.brand?.toLowerCase().includes(q);
      const skuMatch = p.sku?.toLowerCase().includes(q);
      const catMatch = p.category?.toLowerCase().includes(q);
      return nameMatch || brandMatch || skuMatch || catMatch;
    });
  }

  // Category filter
  if (state.selectedCategory !== 'All') {
    result = result.filter(
      p =>
        p.category?.trim().toLowerCase() ===
        state.selectedCategory.toLowerCase(),
    );
  }

  // Sorting
  if (state.selectedSort === 'price_asc') {
    result.sort(
      (a, b) =>
        parseFloat(a.retail_price || '0') - parseFloat(b.retail_price || '0'),
    );
  } else if (state.selectedSort === 'price_desc') {
    result.sort(
      (a, b) =>
        parseFloat(b.retail_price || '0') - parseFloat(a.retail_price || '0'),
    );
  } else if (state.selectedSort === 'name_asc') {
    result.sort((a, b) =>
      (a.product_name || '').localeCompare(b.product_name || ''),
    );
  } else if (state.selectedSort === 'thc_desc') {
    result.sort(
      (a, b) => parseFloat(b.thC_LEVEL || '0') - parseFloat(a.thC_LEVEL || '0'),
    );
  }

  return result;
};
