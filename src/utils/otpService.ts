/**
 * OTP Service for Email Verification
 * Handles generating and verifying 6-digit OTP codes for:
 * 1) customer_register (Member registration)
 * 2) guest_checkout (Guest order confirmation)
 */

import { API_ENDPOINTS } from '../config/api';

export interface SendOtpParams {
  email: string;
  purpose: 'customer_register' | 'guest_checkout';
}

export interface SendOtpResponse {
  success: boolean;
  message: string;
  cooldownSeconds?: number;
  remainingSeconds?: number;
  code?: string;
}

export interface VerifyOtpParams {
  email: string;
  otp: string;
  purpose: 'customer_register' | 'guest_checkout';
}

export interface VerifyOtpResponse {
  success: boolean;
  verificationToken?: string;
  message?: string;
  code?: string;
}

export async function sendOtpApi(params: SendOtpParams): Promise<SendOtpResponse> {
  const cleanEmail = (params.email || '').trim().toLowerCase();
  const response = await fetch(API_ENDPOINTS.sendOtp, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: cleanEmail, purpose: params.purpose }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    const error: any = new Error(data.message || 'Failed to send verification code.');
    error.code = data.code;
    error.remainingSeconds = data.remainingSeconds;
    throw error;
  }
  return data;
}

export async function verifyOtpApi(params: VerifyOtpParams): Promise<VerifyOtpResponse> {
  const cleanEmail = (params.email || '').trim().toLowerCase();
  const cleanOtp = String(params.otp || '').trim();

  const response = await fetch(API_ENDPOINTS.verifyOtp, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: cleanEmail,
      otp: cleanOtp,
      purpose: params.purpose,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    const error: any = new Error(data.message || 'Verification failed. Please check the code.');
    error.code = data.code;
    throw error;
  }
  return data;
}

