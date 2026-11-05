/**
 * Cart Store (Zustand)
 * Manages shopping cart state, items, quantities, totals, drawer visibility,
 * and promo discounts matching the Pharsyde Web Frontend.
 */

import { create } from 'zustand';
import { Alert } from 'react-native';
import { Product } from './productStore';
import {
  MAX_CANNABIS_GRAMS,
  calculateCartCannabisGrams,
  getProductCannabisGrams,
} from '../utils/cannabisLimit';

export interface CartItem {
  product: Product;
  quantity: number;
}

export const FREE_SHIPPING_THRESHOLD = 75.0;
export const TAX_RATE = 0.12; // Manitoba Tax: 5% GST + 7% PST = 12%
export const STANDARD_DELIVERY_FEE = 9.99;

interface CartState {
  items: Record<string, CartItem>;
  totalCount: number;
  totalPrice: number;
  totalCannabisGrams: number;
  isCannabisLimitExceeded: boolean;

  // Drawer / Screen state
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;

  // Promo code state
  promoCode: string;
  promoDiscount: number;
  promoApplied: boolean;
  promoError: string;
  setPromoCode: (code: string) => void;
  applyPromo: () => void;
  removePromo: () => void;

  // Actions
  addToCart: (product: Product, quantity?: number, openDrawer?: boolean) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

const computeTotals = (items: Record<string, CartItem>) => {
  let count = 0;
  let price = 0;
  const itemsList = Object.values(items);
  itemsList.forEach(item => {
    count += item.quantity;
    const p = parseFloat(item.product.retail_price || '0');
    price += p * item.quantity;
  });
  const totalCannabisGrams = calculateCartCannabisGrams(itemsList);
  const isCannabisLimitExceeded = totalCannabisGrams > MAX_CANNABIS_GRAMS;

  return {
    totalCount: count,
    totalPrice: price,
    totalCannabisGrams,
    isCannabisLimitExceeded,
  };
};

export const useCartStore = create<CartState>((set, get) => ({
  items: {},
  totalCount: 0,
  totalPrice: 0,
  totalCannabisGrams: 0,
  isCannabisLimitExceeded: false,

  isCartOpen: false,
  openCart: () => set({ isCartOpen: true }),
  closeCart: () => set({ isCartOpen: false }),

  promoCode: '',
  promoDiscount: 0,
  promoApplied: false,
  promoError: '',

  setPromoCode: (code: string) => set({ promoCode: code, promoError: '' }),

  applyPromo: () => {
    const { promoCode, totalPrice } = get();
    if (promoCode.trim().toUpperCase() === 'PHARSYDE10') {
      const discount = totalPrice * 0.1;
      set({
        promoDiscount: discount,
        promoApplied: true,
        promoError: '',
      });
    } else {
      set({
        promoError: 'Invalid coupon code. Try PHARSYDE10',
        promoApplied: false,
        promoDiscount: 0,
      });
    }
  },

  removePromo: () => {
    set({
      promoCode: '',
      promoDiscount: 0,
      promoApplied: false,
      promoError: '',
    });
  },

  addToCart: (product: Product, quantity: number = 1, openDrawer: boolean = true) => {
    const id = product.pk || product.sku;
    if (!id) return;

    // Validate 30.0g legal limit
    const itemGrams = getProductCannabisGrams(product);
    if (itemGrams > 0) {
      const currentGrams = get().totalCannabisGrams;
      const proposedGrams = currentGrams + itemGrams * quantity;
      if (proposedGrams > MAX_CANNABIS_GRAMS) {
        Alert.alert(
          'Cannabis Purchase Limit',
          `Under Manitoba regulations, you cannot purchase more than ${MAX_CANNABIS_GRAMS.toFixed(1)}g of cannabis per transaction.\n\nCurrent cart: ${currentGrams.toFixed(1)}g\nAttempting to add: ${(itemGrams * quantity).toFixed(1)}g\nTotal would be: ${proposedGrams.toFixed(1)}g`,
          [{ text: 'OK' }],
        );
        return;
      }
    }

    set(state => {
      const existing = state.items[id];
      const newQty = existing ? existing.quantity + quantity : quantity;
      const nextItems = {
        ...state.items,
        [id]: { product, quantity: newQty },
      };
      const totals = computeTotals(nextItems);
      const discount = state.promoApplied ? totals.totalPrice * 0.1 : 0;

      return {
        items: nextItems,
        promoDiscount: discount,
        isCartOpen: openDrawer ? true : state.isCartOpen,
        ...totals,
      };
    });
  },

  removeFromCart: (productId: string) => {
    set(state => {
      const nextItems = { ...state.items };
      delete nextItems[productId];
      const totals = computeTotals(nextItems);
      const discount = state.promoApplied ? totals.totalPrice * 0.1 : 0;

      return {
        items: nextItems,
        promoDiscount: discount,
        ...totals,
      };
    });
  },

  updateQuantity: (productId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeFromCart(productId);
      return;
    }

    const existing = get().items[productId];
    if (!existing) return;

    // Validate 30.0g legal limit when increasing
    if (quantity > existing.quantity) {
      const diff = quantity - existing.quantity;
      const itemGrams = getProductCannabisGrams(existing.product);
      if (itemGrams > 0) {
        const currentGrams = get().totalCannabisGrams;
        const proposedGrams = currentGrams + itemGrams * diff;
        if (proposedGrams > MAX_CANNABIS_GRAMS) {
          Alert.alert(
            'Cannabis Purchase Limit',
            `Cannot increase quantity: Exceeds ${MAX_CANNABIS_GRAMS.toFixed(1)}g legal cannabis limit per transaction.\n\nCurrent cart: ${currentGrams.toFixed(1)}g\nProposed total: ${proposedGrams.toFixed(1)}g`,
            [{ text: 'OK' }],
          );
          return;
        }
      }
    }

    set(state => {
      const nextItems = {
        ...state.items,
        [productId]: {
          ...existing,
          quantity,
        },
      };
      const totals = computeTotals(nextItems);
      const discount = state.promoApplied ? totals.totalPrice * 0.1 : 0;

      return {
        items: nextItems,
        promoDiscount: discount,
        ...totals,
      };
    });
  },

  clearCart: () =>
    set({
      items: {},
      totalCount: 0,
      totalPrice: 0,
      totalCannabisGrams: 0,
      isCannabisLimitExceeded: false,
      promoCode: '',
      promoDiscount: 0,
      promoApplied: false,
      promoError: '',
    }),
}));
