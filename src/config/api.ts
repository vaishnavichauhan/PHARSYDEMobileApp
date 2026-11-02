/**
 * API configuration for Pharsyde Backend
 * Backend runs on port 5001 (from .env PORT=5001)
 */

// For Android emulator, use 10.0.2.2 instead of localhost
// For iOS simulator or physical device, use your machine's local IP
const BASE_URL = 'http://10.0.2.2:5001';

export const API_ENDPOINTS = {
  health: `${BASE_URL}/api/health`,
  products: `${BASE_URL}/api/products`,
  login: `${BASE_URL}/api/auth/login`,
  register: `${BASE_URL}/api/auth/register`,
  me: `${BASE_URL}/api/auth/me`,
};

export default BASE_URL;
