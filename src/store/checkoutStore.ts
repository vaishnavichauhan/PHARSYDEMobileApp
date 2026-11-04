/**
 * Checkout Store (Zustand)
 * Manages the multi-stage Moneris checkout flow:
 * Stage 1: Checkout Form (Customer info, fulfillment, age consent)
 * Stage 2: Moneris Hosted Checkout / QA Sandbox Payment Terminal
 * Stage 3: Order Success & Confirmation
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../config/api';

const ORDER_HISTORY_STORAGE_KEY = 'pharsyde_order_history';

/**
 * Safely retrieve current customer auth token without circular import lock
 */
const getCustomerToken = (): string | null => {
  try {
    const profileStore = require('./profileStore');
    return profileStore.useProfileStore.getState().token || null;
  } catch {
    return null;
  }
};

export type CheckoutStage = 'checkout' | 'payment' | 'success';

export interface CheckoutFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  fulfillmentType: 'pickup' | 'delivery';
  address: string;
  city: string;
  postalCode: string;
  paymentMethod: 'card' | 'interac';
  ageConsent: boolean;
  idConsent: boolean;
  specialInstructions: string;
  govIdUrl?: string | null;
  govIdName?: string | null;
  govIdSize?: number | null;
}

export interface MonerisPaymentSession {
  paymentAttemptId: number | string;
  attemptNumber: string;
  merchantOrderNumber: string;
  ticket: string;
  amount: string;
  totalCents: number;
  environment?: string;
  checkoutMode?: string;
  guestToken?: string;
}

export interface ConfirmedOrder {
  id?: number;
  order_number: string;
  customer_name?: string;
  customer_email?: string;
  fulfillment_type: string;
  address?: string;
  city?: string;
  postal_code?: string;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  status?: string;
  order_status?: string;
  payment_method?: string;
  payment_status?: string;
  created_at?: string;
  items?: Array<{
    product_name: string;
    variant_label?: string;
    quantity: number;
    unit_price: number;
    line_total?: number;
  }>;
}

interface CheckoutState {
  isOpen: boolean;
  stage: CheckoutStage;
  formData: CheckoutFormData;
  errors: Record<string, string>;
  paymentSession: MonerisPaymentSession | null;
  confirmedOrder: ConfirmedOrder | null;
  orderHistory: ConfirmedOrder[];
  isSubmitting: boolean;
  loadingMessage: string;
  errorMessage: string | null;

  // Actions
  openCheckout: () => void;
  closeCheckout: () => void;
  setStage: (stage: CheckoutStage) => void;
  updateFormField: <K extends keyof CheckoutFormData>(field: K, value: CheckoutFormData[K]) => void;
  validateForm: (cartSubtotal: number) => boolean;
  initiateMonerisPreload: (
    cartItems: any[],
    cartSubtotal: number,
    rewardsOptions?: { redeem_rewards?: boolean; redeemed_points?: number },
  ) => Promise<boolean>;
  submitInteracOrder: (
    cartItems: any[],
    cartSubtotal: number,
    rewardsOptions?: { redeem_rewards?: boolean; redeemed_points?: number },
  ) => Promise<boolean>;
  finalizeMonerisPayment: () => Promise<boolean>;
  cancelPayment: () => Promise<void>;
  resetCheckout: () => void;
  loadOrderHistory: () => Promise<void>;
  clearOrderHistory: () => Promise<void>;
}

const initialFormData: CheckoutFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  fulfillmentType: 'pickup',
  address: '117 Regent Ave W',
  city: 'Winnipeg',
  postalCode: 'R2C 1R1',
  paymentMethod: 'card',
  ageConsent: true,
  idConsent: true,
  specialInstructions: '',
  govIdUrl: null,
  govIdName: null,
  govIdSize: null,
};

export const useCheckoutStore = create<CheckoutState>((set, get) => ({
  isOpen: false,
  stage: 'checkout',
  formData: { ...initialFormData },
  errors: {},
  paymentSession: null,
  confirmedOrder: null,
  orderHistory: [],
  isSubmitting: false,
  loadingMessage: '',
  errorMessage: null,

  openCheckout: () => {
    // Dynamic import / read of profile store
    const { useProfileStore } = require('./profileStore');
    const profileState = useProfileStore.getState();
    const currentUser = profileState.user;
    const isUserLoggedIn = profileState.isLoggedIn;

    let defaultFirst = '';
    let defaultLast = '';
    let defaultEmail = '';
    let defaultPhone = '';

    if (isUserLoggedIn && currentUser) {
      const parts = (currentUser.name || '').trim().split(' ');
      defaultFirst = parts[0] || '';
      defaultLast = parts.slice(1).join(' ') || '';
      defaultEmail = currentUser.email || '';
      defaultPhone = currentUser.phone || currentUser.mob_no || '';
    }

    set(state => ({
      isOpen: true,
      stage: 'checkout',
      errorMessage: null,
      errors: {},
      formData: {
        ...initialFormData,
        ...state.formData,
        firstName: isUserLoggedIn ? defaultFirst : (state.formData.firstName || ''),
        lastName: isUserLoggedIn ? defaultLast : (state.formData.lastName || ''),
        email: isUserLoggedIn ? defaultEmail : (state.formData.email || ''),
        phone: isUserLoggedIn ? defaultPhone : (state.formData.phone || ''),
        ageConsent: true,
        idConsent: true,
      },
    }));
  },

  closeCheckout: () => {
    set({
      isOpen: false,
      isSubmitting: false,
      errorMessage: null,
    });
  },

  setStage: (stage: CheckoutStage) => set({ stage, errorMessage: null }),

  updateFormField: (field, value) => {
    set(state => {
      const nextErrors = { ...state.errors };
      delete nextErrors[field];
      return {
        formData: { ...state.formData, [field]: value },
        errors: nextErrors,
      };
    });
  },

  validateForm: () => {
    const { formData } = get();
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      newErrors.email = 'Valid email is required';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required for fulfillment contact';
    }

    if (!formData.ageConsent) {
      newErrors.ageConsent = 'You must confirm you are at least 19 years of age.';
    }
    if (!formData.idConsent) {
      newErrors.idConsent = 'You must acknowledge valid photo ID is required upon receiving order.';
    }

    if (formData.fulfillmentType === 'delivery') {
      if (!formData.address.trim()) {
        newErrors.address = 'Street address is required for delivery';
      }
      if (!formData.postalCode.trim()) {
        newErrors.postalCode = 'Postal code is required';
      }
    }

    set({ errors: newErrors });
    return Object.keys(newErrors).length === 0;
  },

  initiateMonerisPreload: async (
    cartItems: any[],
    _subtotal?: number,
    rewardsOptions?: { redeem_rewards?: boolean; redeemed_points?: number },
  ) => {
    const { formData, validateForm } = get();
    if (!validateForm(0)) {
      return false;
    }

    set({
      isSubmitting: true,
      loadingMessage: 'Initializing Moneris secure session...',
      errorMessage: null,
    });

    try {
      const payload = {
        items: cartItems.map(item => ({
          product_id: item.product.pk || item.product.id,
          techpos_product_id: item.product.pk || item.product.id,
          sku: item.product.sku,
          product_name: item.product.product_name || item.product.name,
          variant_label: item.product.size || 'Standard',
          quantity: item.quantity,
          unit_price: parseFloat(item.product.retail_price || '0'),
          image_url: item.product.imageUrl || item.product.image || null,
        })),
        customer: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          address: formData.address.trim(),
          city: formData.city.trim() || 'Winnipeg',
          postalCode: formData.postalCode.trim(),
          govIdUrl: formData.govIdUrl || null,
          gov_id_url: formData.govIdUrl || null,
        },
        govIdUrl: formData.govIdUrl || null,
        gov_id_url: formData.govIdUrl || null,
        fulfillmentType: formData.fulfillmentType,
        address: formData.address.trim(),
        city: formData.city.trim() || 'Winnipeg',
        postalCode: formData.postalCode.trim(),
        paymentMethod: formData.paymentMethod,
        notes: formData.specialInstructions.trim(),
        redeem_rewards: Boolean(rewardsOptions?.redeem_rewards),
        redeemed_points: rewardsOptions?.redeem_rewards ? (rewardsOptions?.redeemed_points || 0) : 0,
      };

      const token = getCustomerToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(API_ENDPOINTS.paymentsPreload, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const err: any = new Error(data.message || 'Failed to initialize Moneris payment session.');
        err.code = data.code;
        err.data = data;
        throw err;
      }

      set({
        paymentSession: {
          paymentAttemptId: data.paymentAttemptId,
          attemptNumber: data.attemptNumber,
          merchantOrderNumber: data.merchantOrderNumber,
          ticket: data.ticket,
          amount: data.amount,
          totalCents: data.totalCents,
          environment: data.environment,
          checkoutMode: data.checkoutMode,
          guestToken: data.guestToken,
        },
        stage: 'payment',
        isSubmitting: false,
        loadingMessage: '',
      });

      return true;
    } catch (err: any) {
      const isAccountExists =
        err.code === 'ACCOUNT_EXISTS' ||
        (err.message && err.message.toLowerCase().includes('already exists'));
      set({
        isSubmitting: false,
        loadingMessage: '',
        errorMessage: isAccountExists
          ? 'An account with this email already exists. Please log in to complete your order.'
          : (err.message || 'Payment initialization failed. Please check network connection.'),
      });
      return false;
    }
  },

  submitInteracOrder: async (
    cartItems: any[],
    _subtotal?: number,
    rewardsOptions?: { redeem_rewards?: boolean; redeemed_points?: number },
  ) => {
    const { formData, validateForm } = get();
    if (!validateForm(0)) {
      return false;
    }

    set({
      isSubmitting: true,
      loadingMessage: 'Submitting your Manitoba order...',
      errorMessage: null,
    });

    try {
      const payload = {
        items: cartItems.map(item => ({
          product_id: item.product.pk || item.product.id,
          techpos_product_id: item.product.pk || item.product.id,
          sku: item.product.sku,
          product_name: item.product.product_name || item.product.name,
          variant_label: item.product.size || 'Standard',
          quantity: item.quantity,
          unit_price: parseFloat(item.product.retail_price || '0'),
          image_url: item.product.imageUrl || item.product.image || null,
        })),
        customer: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          address: formData.address.trim(),
          city: formData.city.trim() || 'Winnipeg',
          postalCode: formData.postalCode.trim(),
          govIdUrl: formData.govIdUrl || null,
          gov_id_url: formData.govIdUrl || null,
        },
        govIdUrl: formData.govIdUrl || null,
        gov_id_url: formData.govIdUrl || null,
        fulfillmentType: formData.fulfillmentType,
        address: formData.address.trim(),
        city: formData.city.trim() || 'Winnipeg',
        postalCode: formData.postalCode.trim(),
        paymentMethod: 'interac',
        notes: formData.specialInstructions.trim(),
        redeem_rewards: Boolean(rewardsOptions?.redeem_rewards),
        redeemed_points: rewardsOptions?.redeem_rewards ? (rewardsOptions?.redeemed_points || 0) : 0,
      };

      const token = getCustomerToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(API_ENDPOINTS.orders, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const err: any = new Error(data.message || 'Failed to place order.');
        err.code = data.code;
        err.data = data;
        throw err;
      }

      const savedOrder = data.order || {};
      const confirmed: ConfirmedOrder = {
        order_number: savedOrder.order_number || data.order_number || `PHR-${Date.now().toString().slice(-6)}`,
        customer_name: `${formData.firstName} ${formData.lastName}`.trim(),
        customer_email: formData.email.trim(),
        fulfillment_type: formData.fulfillmentType,
        address: formData.address,
        city: formData.city,
        postal_code: formData.postalCode,
        subtotal: parseFloat(savedOrder.subtotal || '0'),
        tax: parseFloat(savedOrder.tax || '0'),
        shipping: parseFloat(savedOrder.shipping_fee || savedOrder.shipping || '0'),
        total: parseFloat(savedOrder.total || '0'),
        status: savedOrder.status || 'PENDING_PAYMENT',
        payment_method: 'INTERAC',
        payment_status: 'pending',
        created_at: savedOrder.created_at || new Date().toISOString(),
      };

      const currentHistory = get().orderHistory;
      const updatedHistory = [confirmed, ...currentHistory];

      try {
        await AsyncStorage.setItem(ORDER_HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
      } catch (storageErr) {
        console.warn('Could not save order history locally:', storageErr);
      }

      set({
        confirmedOrder: confirmed,
        orderHistory: updatedHistory,
        stage: 'success',
        isSubmitting: false,
        loadingMessage: '',
      });

      return true;
    } catch (err: any) {
      const isAccountExists =
        err.code === 'ACCOUNT_EXISTS' ||
        (err.message && err.message.toLowerCase().includes('already exists'));
      set({
        isSubmitting: false,
        loadingMessage: '',
        errorMessage: isAccountExists
          ? 'An account with this email already exists. Please log in to complete your order.'
          : (err.message || 'Order submission failed. Please check network connection.'),
      });
      return false;
    }
  },

  finalizeMonerisPayment: async () => {
    const { paymentSession, formData } = get();
    if (!paymentSession) {
      set({ errorMessage: 'No active payment session found.' });
      return false;
    }

    set({
      isSubmitting: true,
      loadingMessage: 'Authorizing payment & verifying Manitoba compliance...',
      errorMessage: null,
    });

    try {
      const token = getCustomerToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(API_ENDPOINTS.paymentsFinalize, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          paymentAttemptId: paymentSession.paymentAttemptId,
          ticket: paymentSession.ticket,
          guestToken: paymentSession.guestToken,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.approved) {
        throw new Error(data.message || 'Payment finalization was declined or failed.');
      }

      const confirmed: ConfirmedOrder = data.order || {
        order_number: `PHR-${Date.now().toString().slice(-6)}`,
        customer_name: `${formData.firstName} ${formData.lastName}`.trim(),
        customer_email: formData.email.trim(),
        fulfillment_type: formData.fulfillmentType,
        address: formData.address,
        city: formData.city,
        postal_code: formData.postalCode,
        subtotal: (paymentSession.totalCents - 1) / 100,
        tax: 0.01,
        shipping: 0,
        total: parseFloat(paymentSession.amount || '0.01'),
        status: 'PAID',
        payment_method: 'MONERIS',
        payment_status: 'approved',
        created_at: new Date().toISOString(),
      };

      // Save order to history in AsyncStorage
      const currentHistory = get().orderHistory;
      const updatedHistory = [confirmed, ...currentHistory];

      try {
        await AsyncStorage.setItem(ORDER_HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
      } catch (storageErr) {
        console.warn('Could not save order history locally:', storageErr);
      }

      set({
        confirmedOrder: confirmed,
        orderHistory: updatedHistory,
        stage: 'success',
        isSubmitting: false,
        loadingMessage: '',
      });

      return true;
    } catch (err: any) {
      set({
        isSubmitting: false,
        loadingMessage: '',
        errorMessage: err.message || 'Payment authorization failed.',
      });
      return false;
    }
  },

  cancelPayment: async () => {
    const { paymentSession } = get();
    if (paymentSession) {
      try {
        await fetch(API_ENDPOINTS.paymentsCancel, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentAttemptId: paymentSession.paymentAttemptId,
            ticket: paymentSession.ticket,
          }),
        });
      } catch {
        // Non-blocking
      }
    }
    set({
      stage: 'checkout',
      paymentSession: null,
      errorMessage: null,
      isSubmitting: false,
    });
  },

  resetCheckout: () => {
    set({
      isOpen: false,
      stage: 'checkout',
      formData: { ...initialFormData },
      errors: {},
      paymentSession: null,
      confirmedOrder: null,
      isSubmitting: false,
      loadingMessage: '',
      errorMessage: null,
    });
  },

  loadOrderHistory: async () => {
    try {
      const token = getCustomerToken();
      // If user is not logged in, orders are strictly empty (matches frontend protected state)
      if (!token) {
        set({ orderHistory: [] });
        return;
      }

      const response = await fetch(API_ENDPOINTS.orders, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.orders)) {
          set({ orderHistory: data.orders });
          return;
        }
      } else if (response.status === 401) {
        set({ orderHistory: [] });
        return;
      }
    } catch (e) {
      console.warn('Failed to load authenticated orders from backend:', e);
    }
  },

  clearOrderHistory: async () => {
    try {
      await AsyncStorage.removeItem(ORDER_HISTORY_STORAGE_KEY);
      set({ orderHistory: [] });
    } catch (e) {
      console.warn('Failed to clear order history:', e);
    }
  },
}));
