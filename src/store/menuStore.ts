/**
 * Menu Store (Zustand)
 * Manages active page navigation within Menu, policy collapsible accordion state,
 * and contact inquiry submissions.
 */

import { create } from 'zustand';

export type MenuPage = 'menu' | 'policies' | 'about' | 'terms' | 'contact';

export interface ContactForm {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

interface MenuState {
  activePage: MenuPage;
  expandedPolicies: Record<string, boolean>;
  contactForm: ContactForm;
  isSubmittingContact: boolean;
  contactSubmitted: boolean;

  // Actions
  setActivePage: (page: MenuPage) => void;
  togglePolicy: (id: string) => void;
  setContactField: (field: keyof ContactForm, value: string) => void;
  submitContactForm: () => Promise<boolean>;
  resetContactForm: () => void;
}

const INITIAL_EXPANDED_POLICIES: Record<string, boolean> = {
  return_policy: true, // first one expanded by default for discoverability
  cannabis_recalls: false,
  vape_protocol: false,
  age_verification: false,
};

const INITIAL_CONTACT_FORM: ContactForm = {
  name: '',
  email: '',
  phone: '',
  subject: 'General Inquiry',
  message: '',
};

export const useMenuStore = create<MenuState>((set, get) => ({
  activePage: 'menu',
  expandedPolicies: INITIAL_EXPANDED_POLICIES,
  contactForm: INITIAL_CONTACT_FORM,
  isSubmittingContact: false,
  contactSubmitted: false,

  setActivePage: (page: MenuPage) => set({ activePage: page }),

  togglePolicy: (id: string) => {
    set(state => ({
      expandedPolicies: {
        ...state.expandedPolicies,
        [id]: !state.expandedPolicies[id],
      },
    }));
  },

  setContactField: (field: keyof ContactForm, value: string) => {
    set(state => ({
      contactForm: {
        ...state.contactForm,
        [field]: value,
      },
    }));
  },

  submitContactForm: async () => {
    const { contactForm } = get();
    if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()) {
      return false;
    }

    set({ isSubmittingContact: true });
    // Simulate backend submission delay
    await new Promise(resolve => setTimeout(() => resolve(true), 800));
    set({
      isSubmittingContact: false,
      contactSubmitted: true,
      contactForm: INITIAL_CONTACT_FORM,
    });
    return true;
  },

  resetContactForm: () => {
    set({
      contactForm: INITIAL_CONTACT_FORM,
      contactSubmitted: false,
      isSubmittingContact: false,
    });
  },
}));
