/**
 * EmailVerificationModal Component
 * Reusable modal for 6-Digit Email OTP Verification matching Pharsyde Web Frontend:
 * 1) Guest Order Confirmation (Checkout)
 * 2) Create Customer Account (Registration)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { Mail, X, CheckCircle2, RotateCcw } from 'lucide-react-native';
import { sendOtpApi, verifyOtpApi } from '../utils/otpService';

const ACCENT_COLOR = '#0166dc';

export interface EmailVerificationModalProps {
  visible: boolean;
  email: string;
  purpose: 'customer_register' | 'guest_checkout';
  title?: string;
  subtitle?: string;
  initialCooldown?: number;
  onSuccess: (verificationToken: string) => void;
  onClose: () => void;
}

export default function EmailVerificationModal({
  visible,
  email,
  purpose,
  title = 'Verify Your Email',
  subtitle,
  initialCooldown = 60,
  onSuccess,
  onClose,
}: EmailVerificationModalProps) {
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(initialCooldown);
  const inputRef = useRef<any>(null);

  const resolvedSubtitle =
    subtitle ||
    (purpose === 'guest_checkout'
      ? 'Guest Order Confirmation'
      : 'Pharsyde Member Portal');

  // Cooldown countdown timer
  useEffect(() => {
    if (!visible) {
      setOtpCode('');
      setError(null);
      return;
    }
    setCooldown(initialCooldown || 60);
    // Auto-focus input
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 250);
    return () => clearTimeout(timer);
  }, [visible, initialCooldown]);

  useEffect(() => {
    if (cooldown <= 0 || !visible) return;
    const interval = setInterval(() => {
      setCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown, visible]);

  const handleVerify = async () => {
    const cleanOtp = otpCode.trim();
    if (cleanOtp.length < 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await verifyOtpApi({
        email,
        otp: cleanOtp,
        purpose,
      });

      if (res.verificationToken) {
        onSuccess(res.verificationToken);
      } else {
        setError('Verification token not received.');
      }
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await sendOtpApi({ email, purpose });
      setCooldown(res.cooldownSeconds || 60);
      setOtpCode('');
      inputRef.current?.focus();
    } catch (err: any) {
      setError(err?.message || 'Failed to resend verification code.');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconBox}>
                <Mail size={18} color={ACCENT_COLOR} strokeWidth={2.4} />
              </View>
              <View>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{resolvedSubtitle}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}>
              <X size={18} color="#64748B" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.body}>
            {/* Email Target Card */}
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>
                We've sent a 6-digit verification code to:
              </Text>
              <Text style={styles.infoEmail}>{email}</Text>
              <Text style={styles.infoFootnote}>
                {purpose === 'guest_checkout'
                  ? 'This protects your order receipt and tracking updates.'
                  : 'Enter the code to verify your email and activate your account.'}
              </Text>
            </View>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorBox}>
                <View style={styles.errorDot} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* 6-Digit OTP Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Enter 6-Digit Code</Text>
              <TextInput
                ref={inputRef}
                style={styles.otpInput}
                value={otpCode}
                onChangeText={val => {
                  const numeric = val.replace(/\D/g, '').slice(0, 6);
                  setOtpCode(numeric);
                  if (error) setError(null);
                }}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="000000"
                placeholderTextColor="#94A3B8"
                returnKeyType="done"
                onSubmitEditing={handleVerify}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.verifyBtn,
                (loading || otpCode.trim().length !== 6) && styles.verifyBtnDisabled,
              ]}
              onPress={handleVerify}
              disabled={loading || otpCode.trim().length !== 6}
              activeOpacity={0.85}>
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <CheckCircle2 size={16} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={styles.verifyBtnText}>
                    {purpose === 'guest_checkout'
                      ? 'Verify & Continue Checkout'
                      : 'Verify & Create Account'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Resend Row */}
            <View style={styles.resendRow}>
              <Text style={styles.resendQuestion}>Didn't receive code?</Text>
              {cooldown > 0 ? (
                <Text style={styles.cooldownText}>Resend in {cooldown}s</Text>
              ) : (
                <TouchableOpacity
                  style={styles.resendBtn}
                  onPress={handleResend}
                  disabled={loading}
                  activeOpacity={0.7}>
                  <RotateCcw size={12} color={ACCENT_COLOR} strokeWidth={2.4} />
                  <Text style={styles.resendBtnText}>Resend Code</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(1, 102, 220, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(1, 102, 220, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 20,
    gap: 14,
  },
  infoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  infoEmail: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center',
  },
  infoFootnote: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 10,
  },
  errorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  errorText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#B91C1C',
  },
  inputContainer: {
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  otpInput: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    paddingVertical: 12,
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT_COLOR,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: ACCENT_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
    marginTop: 4,
  },
  verifyBtnDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  resendQuestion: {
    fontSize: 12,
    color: '#64748B',
  },
  cooldownText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resendBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: ACCENT_COLOR,
  },
});
