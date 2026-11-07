/**
 * Cart Store (Zustand)
 * Manages shopping cart state, items, quantities, totals, drawer visibility,
 * and promo discounts matching the Pharsyde Web Frontend.
 */

import { create } from 'zustand';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from './productStore';
import { API_ENDPOINTS } from '../config/api';
import {
  MAX_CANNABIS_GRAMS,
  calculateCartCannabisGrams,
  getProductCannabisGrams,
} from '../utils/cannabisLimit';

export interface CartItem {
  product: Product;
  quantity: number;
}

const CANNABIS_LIMIT_STORAGE_KEY = 'pharsyde_cannabis_limit';
const FREE_DELIVERY_STORAGE_KEY = 'pharsyde_free_delivery_threshold';

let hasLiveSettingsLoaded = false;

export const DEFAULT_MAX_CANNABIS_GRAMS = 30.0;
export const FREE_SHIPPING_THRESHOLD = 75.0;
export const TAX_RATE = 0.12; // Manitoba Tax: 5% GST + 7% PST = 12%
export const STANDARD_DELIVERY_FEE = 9.99;

interface CartState {
  items: Record<string, CartItem>;
  totalCount: number;
  totalPrice: number;
  totalCannabisGrams: number;
  cannabisMaxGrams: number;
  freeDeliveryThreshold: number;
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
  setCannabisMaxGrams: (grams: number) => void;
  fetchPublicSettings: () => Promise<void>;
  addToCart: (product: Product, quantity?: number, openDrawer?: boolean) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

const computeTotals = (
  items: Record<string, CartItem>,
  maxLimit: number = DEFAULT_MAX_CANNABIS_GRAMS,
) => {
  let count = 0;
  let price = 0;
  const itemsList = Object.values(items);
  itemsList.forEach(item => {
    count += item.quantity;
    const p = parseFloat(item.product.retail_price || '0');
    price += p * item.quantity;
  });
  const totalCannabisGrams = calculateCartCannabisGrams(itemsList);
  const effectiveMax = Number(maxLimit) > 0 ? Number(maxLimit) : DEFAULT_MAX_CANNABIS_GRAMS;
  const isCannabisLimitExceeded = totalCannabisGrams > effectiveMax;

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
  cannabisMaxGrams: DEFAULT_MAX_CANNABIS_GRAMS,
  freeDeliveryThreshold: FREE_SHIPPING_THRESHOLD,
  isCannabisLimitExceeded: false,

  setCannabisMaxGrams: (grams: number) => {
    const valid = Number(grams) > 0 ? Number(grams) : DEFAULT_MAX_CANNABIS_GRAMS;
    set(state => {
      const totals = computeTotals(state.items, valid);
      return {
        cannabisMaxGrams: valid,
        ...totals,
      };
    });
  },

  fetchPublicSettings: async () => {
    try {
      const url = `${API_ENDPOINTS.publicSettings}?_t=${Date.now()}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
          Accept: 'application/json',
        },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to load public settings`);
      }
      const json = await res.json();
      if (json?.settings?.cannabis_max_grams !== undefined) {
        const parsed = parseFloat(json.settings.cannabis_max_grams);
        if (Number.isFinite(parsed) && parsed > 0) {
          hasLiveSettingsLoaded = true;
          get().setCannabisMaxGrams(parsed);
          AsyncStorage.setItem(CANNABIS_LIMIT_STORAGE_KEY, String(parsed)).catch(() => {});
        }
      }
      if (json?.settings?.free_delivery_threshold !== undefined) {
        const parsedThreshold = parseFloat(json.settings.free_delivery_threshold);
        if (Number.isFinite(parsedThreshold) && parsedThreshold >= 0) {
          set({ freeDeliveryThreshold: parsedThreshold });
          AsyncStorage.setItem(FREE_DELIVERY_STORAGE_KEY, String(parsedThreshold)).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('Could not load public storefront settings:', err);
    }
  },

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

  addToCart: (product: Product, quantity: number = 1, openDrawer: boolean = false) => {
    const id = product.pk || product.sku;
    if (!id) return;

    // Validate dynamic cannabis legal limit
    const maxGrams = get().cannabisMaxGrams || DEFAULT_MAX_CANNABIS_GRAMS;
    const itemGrams = getProductCannabisGrams(product);
    if (itemGrams > 0) {
      const currentGrams = get().totalCannabisGrams;
      const proposedGrams = currentGrams + itemGrams * quantity;
      if (proposedGrams > maxGrams) {
        Alert.alert(
          'Cannabis Purchase Limit',
          `Under Manitoba regulations, you cannot purchase more than ${maxGrams.toFixed(1)}g of cannabis per transaction.\n\nCurrent cart: ${currentGrams.toFixed(1)}g\nAttempting to add: ${(itemGrams * quantity).toFixed(1)}g\nTotal would be: ${proposedGrams.toFixed(1)}g`,
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
      const totals = computeTotals(nextItems, state.cannabisMaxGrams);
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
      const totals = computeTotals(nextItems, state.cannabisMaxGrams);
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

    // Validate dynamic cannabis legal limit when increasing
    if (quantity > existing.quantity) {
      const diff = quantity - existing.quantity;
      const itemGrams = getProductCannabisGrams(existing.product);
      if (itemGrams > 0) {
        const currentGrams = get().totalCannabisGrams;
        const proposedGrams = currentGrams + itemGrams * diff;
        const maxGrams = get().cannabisMaxGrams || DEFAULT_MAX_CANNABIS_GRAMS;
        if (proposedGrams > maxGrams) {
          Alert.alert(
            'Cannabis Purchase Limit',
            `Cannot increase quantity: Exceeds ${maxGrams.toFixed(1)}g legal cannabis limit per transaction.\n\nCurrent cart: ${currentGrams.toFixed(1)}g\nProposed total: ${proposedGrams.toFixed(1)}g`,
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
      const totals = computeTotals(nextItems, state.cannabisMaxGrams);
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

// Hydrate saved settings from AsyncStorage (only if live network settings haven't arrived yet)
AsyncStorage.getItem(CANNABIS_LIMIT_STORAGE_KEY)
  .then(saved => {
    if (saved && !hasLiveSettingsLoaded) {
      const parsed = parseFloat(saved);
      if (Number.isFinite(parsed) && parsed > 0) {
        useCartStore.getState().setCannabisMaxGrams(parsed);
      }
    }
  })
  .catch(() => {});

AsyncStorage.getItem(FREE_DELIVERY_STORAGE_KEY)
  .then(saved => {
    if (saved) {
      const parsed = parseFloat(saved);
      if (Number.isFinite(parsed) && parsed >= 0) {
        useCartStore.setState({ freeDeliveryThreshold: parsed });
      }
    }
  })
  .catch(() => {});

// Fetch latest public settings immediately from backend API
useCartStore.getState().fetchPublicSettings();
