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

export interface FetchProductsOptions {
  search?: string;
  category?: string;
  sort?: SortOption;
  limit?: number;
  hasImage?: boolean;
  isRefresh?: boolean;
}

interface ProductState {
  products: Product[];
  categories: string[];
  isLoading: boolean;
  isSearching: boolean;
  isRefreshing: boolean;
  error: string | null;

  // Filters & Sorting
  searchQuery: string;
  selectedCategory: string;
  selectedSort: SortOption;

  // Favorites
  favorites: Record<string, boolean>;

  // Actions
  fetchProducts: (options?: FetchProductsOptions) => Promise<void>;
  fetchCategories: () => Promise<void>;
  refreshProducts: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  setSelectedSort: (sort: SortOption) => void;
  toggleFavorite: (productId: string) => void;
  resetFilters: () => void;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  categories: ['All'],
  isLoading: true,
  isSearching: false,
  isRefreshing: false,
  error: null,

  searchQuery: '',
  selectedCategory: 'All',
  selectedSort: 'default',
  favorites: {},

  /** Fetch all categories from backend */
  fetchCategories: async () => {
    try {
      const res = await fetch(API_ENDPOINTS.categories);
      const json = await res.json();
      if (json && Array.isArray(json.categories)) {
        set({ categories: ['All', ...json.categories] });
      }
    } catch (err) {
      console.warn('ProductStore: Failed to fetch categories:', err);
    }
  },

  /** Fetch products from backend API with server-side search & filtering */
  fetchProducts: async (options?: FetchProductsOptions) => {
    const isRefresh = options?.isRefresh ?? false;
    const hasExistingProducts = get().products.length > 0;

    try {
      if (isRefresh) {
        set({ isRefreshing: true, error: null });
      } else if (!hasExistingProducts) {
        set({ isLoading: true, error: null });
      } else {
        // While searching or filtering on an already loaded view, do not unmount UI
        set({ isSearching: true, error: null });
      }

      const activeSearch = options?.search !== undefined ? options.search : get().searchQuery;
      const activeCategory = options?.category !== undefined ? options.category : get().selectedCategory;
      const activeSort = options?.sort !== undefined ? options.sort : get().selectedSort;

      const params = new URLSearchParams();
      if (activeSearch && activeSearch.trim()) {
        params.append('search', activeSearch.trim());
      }
      if (activeCategory && activeCategory !== 'All') {
        params.append('category', activeCategory);
      }

      // Default to hasImage=true exactly like the web frontend productService.js
      const shouldFilterImage = options?.hasImage !== undefined ? options.hasImage : true;
      if (shouldFilterImage) {
        params.append('hasImage', 'true');
      }

      if (activeSort === 'price_asc') {
        params.append('sortBy', 'retail_price');
        params.append('sortOrder', 'ASC');
      } else if (activeSort === 'price_desc') {
        params.append('sortBy', 'retail_price');
        params.append('sortOrder', 'DESC');
      } else if (activeSort === 'name_asc') {
        params.append('sortBy', 'product_name');
        params.append('sortOrder', 'ASC');
      } else {
        params.append('sortBy', 'modified');
        params.append('sortOrder', 'DESC');
      }

      params.append('limit', String(options?.limit ?? 100));

      const url = `${API_ENDPOINTS.products}?${params.toString()}`;
      const res = await fetch(url);
      const json = await res.json();
      const list: Product[] = Array.isArray(json)
        ? json
        : Array.isArray(json.products)
        ? json.products
        : Array.isArray(json.data)
        ? json.data
        : [];

      set({
        products: list,
        isLoading: false,
        isSearching: false,
        isRefreshing: false,
      });
    } catch (err: any) {
      console.warn('ProductStore: Failed to fetch products:', err);
      set({
        error: err?.message || 'Failed to load products',
        isLoading: false,
        isSearching: false,
        isRefreshing: false,
      });
    }
  },

  /** Pull to refresh */
  refreshProducts: async () => {
    await get().fetchProducts({ isRefresh: true });
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

  resetFilters: () => {
    set({
      searchQuery: '',
      selectedCategory: 'All',
      selectedSort: 'default',
    });
    get().fetchProducts({
      search: '',
      category: 'All',
      sort: 'default',
      hasImage: true,
    });
  },
}));

/** Selector: Get all distinct categories */
export const selectCategories = (state: ProductState): string[] => {
  if (state.categories && state.categories.length > 1) {
    return state.categories;
  }
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

  // Sorting for client-calculated fields like THC
  if (state.selectedSort === 'thc_desc') {
    result.sort(
      (a, b) => parseFloat(b.thC_LEVEL || '0') - parseFloat(a.thC_LEVEL || '0'),
    );
  }

  return result;
};
