/**
 * API configuration for Pharsyde Backend
 * Backend runs on port 5001 (from .env PORT=5001)
 */

// For Android emulator, use 10.0.2.2 instead of localhost
// For iOS simulator or physical device, use your machine's local IP
// export const BASE_URL = 'http://10.0.2.2:5001'; 
export const BASE_URL = "https://pharsyde.jeenhost.in"

/**
 * Mobile Application Current Version
 */
export const CURRENT_APP_VERSION = '1.0.0.';

/**
 * Normalizes version strings for clean comparison (e.g., '1.0.0.' -> '1.0.0')
 */
export const normalizeAppVersion = (v: string = CURRENT_APP_VERSION): string => {
  if (!v || typeof v !== 'string') return '1.0.0';
  return v.trim().replace(/^v/i, '').replace(/\.+$/, '');
};

export const API_ENDPOINTS = {
  health: `${BASE_URL}/api/health`,
  products: `${BASE_URL}/api/products`,
  categories: `${BASE_URL}/api/products/meta/categories`,
  brands: `${BASE_URL}/api/products/meta/brands`,
  login: `${BASE_URL}/api/auth/login`,
  register: `${BASE_URL}/api/auth/register`,
  me: `${BASE_URL}/api/auth/me`,
  checkEmail: `${BASE_URL}/api/auth/check-email`,
  paymentsPreload: `${BASE_URL}/api/payments/moneris/preload`,
  paymentsFinalize: `${BASE_URL}/api/payments/moneris/finalize`,
  paymentsCancel: `${BASE_URL}/api/payments/moneris/cancel`,
  orders: `${BASE_URL}/api/orders`,
  newArrivals: `${BASE_URL}/api/products/new-arrivals`,
  bestSellers: `${BASE_URL}/api/products/best-sellers`,
  checkUpdate: `${BASE_URL}/api/app/check-update`,
  appVersion: `${BASE_URL}/api/app/version`,
  appDownload: `${BASE_URL}/api/app/download`,
  uploadDocument: `${BASE_URL}/api/upload/document`,
};

/**
 * Resolves product image URLs, safely prepending BASE_URL for relative paths
 * like '/images/products/7746-test.png'.
 */
export const resolveImageUrl = (url?: string | null): string | null => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return `${BASE_URL}${trimmed}`;
  }
  return `${BASE_URL}/${trimmed}`;
};

export default BASE_URL;
