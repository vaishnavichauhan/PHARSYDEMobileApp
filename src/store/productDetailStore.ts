/**
 * Product Detail Store (Zustand)
 * Manages the currently viewed product for the big image and details modal.
 */

import { create } from 'zustand';
import { Product } from './productStore';

interface ProductDetailState {
  selectedProduct: Product | null;
  isOpen: boolean;
  openDetail: (product: Product) => void;
  closeDetail: () => void;
}

export const useProductDetailStore = create<ProductDetailState>((set) => ({
  selectedProduct: null,
  isOpen: false,
  openDetail: (product: Product) => set({ selectedProduct: product, isOpen: true }),
  closeDetail: () => set({ isOpen: false, selectedProduct: null }),
}));
