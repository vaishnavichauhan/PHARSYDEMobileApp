/**
 * AgeGateModal – Reusable Age Verification Screen
 *
 * Mirrors the web frontend AgeGateModal exactly:
 * - White card with #3B82F6 green accent
 * - ShieldCheck icon, province picker, birth year input
 * - "I am Under 19" + "Enter Pharsyde" buttons
 * - Calls useAgeVerificationStore (Zustand + AsyncStorage + Backend API)
 *
 * NOTE: Rendered as a full-screen View (not a <Modal>).
 * App.tsx conditionally mounts this component only when !isAgeVerified.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Alert,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useAgeVerificationStore,
  PROVINCES,
} from '../store/ageVerificationStore';

// ── Colour tokens (match web exactly) ──────────────────────────────────────
const GREEN = '#3B82F6';
const GREEN_DARK = '#529402';
const GREEN_BG = 'rgba(142,247,5,0.12)';
const GREEN_BORDER = 'rgba(142,247,5,0.45)';
const WHITE = '#FFFFFF';
const SLATE_900 = '#0F172A';
const SLATE_700 = '#374151';
const SLATE_600 = '#475569';
const SLATE_500 = '#64748B';
const SLATE_400 = '#94A3B8';
const SLATE_300 = '#CBD5E1';
const SLATE_200 = '#E2E8F0';
const SLATE_100 = '#F1F5F9';
const SLATE_50 = '#F8FAFC';
const RED_BG = '#FEF2F2';
const RED_BORDER = '#FECACA';
const RED_TEXT = '#B91C1C';
const PAGE_BG = '#0F172A';

// ── Province Picker (bottom-sheet style) ────────────────────────────────────
interface ProvincePickerProps {
  value: string;
  onChange: (code: string) => void;
}

function ProvincePicker({ value, onChange }: ProvincePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = PROVINCES.find(p => p.code === value);

  return (
    <>
      <TouchableOpacity
        style={styles.pickerBtn}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}>
        <Text style={styles.pickerBtnText}>{selected?.label ?? 'Select Province'}</Text>
        <Text style={styles.pickerChevron}>▾</Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setOpen(false)}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerSheetTitle}>Select Province</Text>
            {PROVINCES.map(p => (
              <TouchableOpacity
                key={p.code}
                style={[
                  styles.pickerOption,
                  p.code === value && styles.pickerOptionActive,
                ]}
                onPress={() => {
                  onChange(p.code);
                  setOpen(false);
                }}>
                <Text
                  style={[
                    styles.pickerOptionText,
                    p.code === value && styles.pickerOptionTextActive,
                  ]}>
                  {p.label}
                </Text>
                {p.code === value && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ── Main AgeGateModal ───────────────────────────────────────────────────────
export default function AgeGateModal() {
  const {
    isVerifying,
    errorMessage,
    selectedProvince,
    verifyAge,
    setProvince,
    setError,
    clearError,
  } = useAgeVerificationStore();

  const [birthYear, setBirthYear] = useState('');

  const handleVerify = async () => {
    clearError();
    await verifyAge(birthYear, selectedProvince);
  };

  const handleDecline = () => {
    clearError();
    Alert.alert(
      'Legal Age Required',
      'In accordance with Canadian and Provincial Law, you must be of legal age (19+) to access Pharsyde.\n\nWould you like to close the app?',
      [
        {
          text: 'Close App',
          style: 'destructive',
          onPress: () => {
            if (Platform.OS === 'android') {
              BackHandler.exitApp();
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Card */}
          <View style={styles.card}>
            {/* Ambient glow – top */}
            <View style={styles.glowTop} pointerEvents="none" />

            {/* Shield Icon */}
            <View style={styles.iconWrap}>
              <Text style={styles.shieldIcon}>🛡️</Text>
            </View>

            {/* Eyebrow label */}
            <Text style={styles.topLabel}>AGE VERIFICATION REQUIRED</Text>

            {/* Title */}
            <Text style={styles.title}>WELCOME TO PHARSYDE</Text>

            {/* Description */}
            <Text style={styles.description}>
              In accordance with Canadian federal regulations and Manitoba
              Provincial Law (LGCA), you must be at least{' '}
              <Text style={styles.descriptionBold}>19 years of age</Text> to
              view cannabis and nicotine products.
            </Text>

            {/* Form */}
            <View style={styles.form}>
              {/* Province */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>SELECT PROVINCE</Text>
                <ProvincePicker
                  value={selectedProvince}
                  onChange={code => {
                    setProvince(code);
                    clearError();
                  }}
                />
              </View>

              {/* Birth Year */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>ENTER BIRTH YEAR</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 1995"
                  placeholderTextColor={SLATE_400}
                  keyboardType="number-pad"
                  maxLength={4}
                  value={birthYear}
                  onChangeText={text => {
                    setBirthYear(text);
                    clearError();
                  }}
                  returnKeyType="done"
                  onSubmitEditing={handleVerify}
                />
              </View>
            </View>

            {/* Error Message */}
            {errorMessage !== '' && (
              <View style={styles.errorBox}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Buttons */}
            <View style={styles.buttonRow}>
              {/* Decline / Exit */}
              <TouchableOpacity
                style={styles.declineBtn}
                onPress={handleDecline}
                activeOpacity={0.8}>
                <Text style={styles.declineBtnText}>Exit App</Text>
              </TouchableOpacity>

              {/* Verify / Enter */}
              <TouchableOpacity
                style={[
                  styles.enterBtn,
                  isVerifying && styles.enterBtnDisabled,
                ]}
                onPress={handleVerify}
                activeOpacity={0.85}
                disabled={isVerifying}>
                {isVerifying ? (
                  <ActivityIndicator size="small" color={SLATE_900} />
                ) : (
                  <>
                    <Text style={styles.enterBtnIcon}>🔒</Text>
                    <Text style={styles.enterBtnText}>Enter Pharsyde</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Footer note */}
            <Text style={styles.footer}>
              By entering, you confirm you are of legal age in Manitoba and agree
              to our Terms of Use and Privacy Policy. Valid government ID required
              upon delivery or pickup.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: WHITE,
    borderRadius: 28,
    paddingHorizontal: 26,
    paddingTop: 30,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 28,
    elevation: 24,
    overflow: 'hidden',
    alignItems: 'center',
  },

  // Ambient top glow
  glowTop: {
    position: 'absolute',
    top: -20,
    alignSelf: 'center',
    width: 200,
    height: 120,
    backgroundColor: GREEN_BG,
    borderRadius: 100,
  },

  // Icon
  iconWrap: {
    width: 66,
    height: 66,
    borderRadius: 18,
    backgroundColor: GREEN_BG,
    borderWidth: 1.5,
    borderColor: GREEN_BORDER,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  shieldIcon: { fontSize: 30 },

  // Labels
  topLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.5,
    color: GREEN_DARK,
    textTransform: 'uppercase',
    marginBottom: 8,
    textAlign: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: SLATE_900,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 13,
    color: SLATE_600,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  descriptionBold: {
    fontWeight: '700',
    color: SLATE_900,
  },

  // Form
  form: { width: '100%', marginBottom: 20, gap: 14 },
  fieldGroup: { width: '100%' },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: SLATE_700,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },

  // Province picker
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: SLATE_50,
    borderWidth: 1,
    borderColor: SLATE_300,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  pickerBtnText: { color: SLATE_900, fontSize: 14 },
  pickerChevron: { color: SLATE_500, fontSize: 14 },

  // Province picker bottom sheet
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
  },
  pickerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: SLATE_300,
    alignSelf: 'center',
    marginBottom: 16,
  },
  pickerSheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: SLATE_900,
    marginBottom: 14,
    textAlign: 'center',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 2,
  },
  pickerOptionActive: { backgroundColor: GREEN_BG },
  pickerOptionText: { fontSize: 14, color: SLATE_700 },
  pickerOptionTextActive: { color: GREEN_DARK, fontWeight: '700' },
  checkmark: { color: GREEN_DARK, fontWeight: '700', fontSize: 16 },

  // Input
  input: {
    backgroundColor: SLATE_50,
    borderWidth: 1,
    borderColor: SLATE_300,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: SLATE_900,
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: RED_BG,
    borderWidth: 1,
    borderColor: RED_BORDER,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    width: '100%',
    gap: 8,
  },
  errorIcon: { fontSize: 14 },
  errorText: { flex: 1, color: RED_TEXT, fontSize: 12, lineHeight: 17 },

  // Buttons
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 18,
  },
  declineBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: SLATE_100,
    borderWidth: 1,
    borderColor: SLATE_200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtnText: {
    color: SLATE_600,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  enterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: GREEN,
    gap: 6,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  enterBtnDisabled: { opacity: 0.7 },
  enterBtnIcon: { fontSize: 14 },
  enterBtnText: {
    color: SLATE_900,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // Footer
  footer: {
    fontSize: 10,
    color: SLATE_400,
    textAlign: 'center',
    lineHeight: 15,
    paddingHorizontal: 4,
  },
});
