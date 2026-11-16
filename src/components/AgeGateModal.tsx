/**
 * AgeGateModal – Reusable Age Verification Screen
 *
 * Mirrors the web frontend AgeGateModal UI:
 * - Brand logo image (Pharsyde)
 * - White card with ambient blue glow
 * - "WELCOME TO PHARSYDE" heading & Canadian/Manitoba legal age notice
 * - "DATE OF BIRTH" input with "dd/mm/yyyy" placeholder & right-side calendar icon
 * - Interactive Date of Birth Calendar Picker Modal (Day grid + Year selector)
 * - "I AM UNDER 19" decline button + "ENTER PHARSYDE" primary action with lock icon
 * - Strictly 19+ age compliance verification
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Alert,
  BackHandler,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Lock,
  AlertTriangle,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react-native';
import { useAgeVerificationStore } from '../store/ageVerificationStore';

// ── Colour tokens ──────────────────────────────────────────────────────────
const PRIMARY_BLUE = '#0166dc';
const WHITE = '#FFFFFF';
const SLATE_900 = '#0F172A';
const SLATE_800 = '#1E293B';
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

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const CURRENT_YEAR = new Date().getFullYear();
const LEGAL_MAX_YEAR = CURRENT_YEAR - 19;
const MIN_YEAR = 1930;
const YEARS = Array.from(
  { length: LEGAL_MAX_YEAR - MIN_YEAR + 1 },
  (_, i) => LEGAL_MAX_YEAR - i,
);

export default function AgeGateModal() {
  const {
    isVerifying,
    errorMessage,
    verifyAge,
    clearError,
  } = useAgeVerificationStore();

  const [dob, setDob] = useState('');

  // Calendar Modal State
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarYear, setCalendarYear] = useState(1998);
  const [calendarMonth, setCalendarMonth] = useState(0); // 0 = Jan
  const [selectedDay, setSelectedDay] = useState(1);
  const [viewMode, setViewMode] = useState<'calendar' | 'years'>('calendar');

  // Auto-format typed digits into dd/mm/yyyy
  const handleDobChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2 && cleaned.length <= 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    } else if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
    }
    setDob(formatted);
    clearError();
  };

  const handleOpenCalendar = () => {
    // If dob is already entered, try parsing it to set calendar defaults
    const parts = dob.split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      if (y >= MIN_YEAR && y <= CURRENT_YEAR) setCalendarYear(y);
      if (m >= 0 && m <= 11) setCalendarMonth(m);
      if (d >= 1 && d <= 31) setSelectedDay(d);
    }
    setViewMode('calendar');
    setIsCalendarOpen(true);
  };

  const handleConfirmCalendarDate = () => {
    const dStr = String(selectedDay).padStart(2, '0');
    const mStr = String(calendarMonth + 1).padStart(2, '0');
    setDob(`${dStr}/${mStr}/${calendarYear}`);
    setIsCalendarOpen(false);
    clearError();
  };

  const daysInCurrentMonth = useMemo(() => {
    return new Date(calendarYear, calendarMonth + 1, 0).getDate();
  }, [calendarYear, calendarMonth]);

  const firstDayOfWeek = useMemo(() => {
    return new Date(calendarYear, calendarMonth, 1).getDay();
  }, [calendarYear, calendarMonth]);

  const previewAge = useMemo(() => {
    const today = new Date();
    let age = today.getFullYear() - calendarYear;
    const mDiff = today.getMonth() - calendarMonth;
    if (mDiff < 0 || (mDiff === 0 && today.getDate() < selectedDay)) {
      age--;
    }
    return age;
  }, [calendarYear, calendarMonth, selectedDay]);

  const handleVerify = async () => {
    clearError();
    await verifyAge(dob, 'MB');
  };

  const handleDecline = () => {
    clearError();
    Alert.alert(
      'Legal Age Required',
      'In accordance with Canadian federal regulations and Manitoba Provincial Law (LGCA), you must be at least 19 years of age to access Pharsyde.\n\nWould you like to exit the app?',
      [
        {
          text: 'Exit App',
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

          {/* Main Card */}
          <View style={styles.card}>
            {/* Ambient top glow in signature blue */}
            <View style={styles.glowTop} pointerEvents="none" />

            {/* App Logo Image */}
            <View style={styles.logoWrap}>
              <Image
                source={require('../assets/Images/logo.png')}
                style={styles.appLogo}
                resizeMode="contain"
              />
            </View>

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
              {/* Date of Birth Input with Right-Side Calendar Icon */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>DATE OF BIRTH</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.dobInput}
                    placeholder="dd/mm/yyyy"
                    placeholderTextColor={SLATE_400}
                    keyboardType="number-pad"
                    maxLength={10}
                    value={dob}
                    onChangeText={handleDobChange}
                    returnKeyType="done"
                    onSubmitEditing={handleVerify}
                  />
                  <TouchableOpacity
                    style={styles.calendarBtn}
                    onPress={handleOpenCalendar}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Calendar size={18} color="#0F172A" strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Error Message */}
            {errorMessage !== '' && (
              <View style={styles.errorBox}>
                <AlertTriangle size={16} color={RED_TEXT} style={styles.errorIcon} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              {/* Decline: I AM UNDER 19 */}
              <TouchableOpacity
                style={styles.declineBtn}
                onPress={handleDecline}
                activeOpacity={0.8}>
                <Text style={styles.declineBtnText}>I AM UNDER 19</Text>
              </TouchableOpacity>

              {/* Verify: ENTER PHARSYDE */}
              <TouchableOpacity
                style={[
                  styles.enterBtn,
                  isVerifying && styles.enterBtnDisabled,
                ]}
                onPress={handleVerify}
                activeOpacity={0.85}
                disabled={isVerifying}>
                {isVerifying ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Lock size={15} color="#FFFFFF" strokeWidth={2.4} />
                    <Text style={styles.enterBtnText}>ENTER PHARSYDE</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Interactive Date of Birth Calendar Modal ── */}
      <Modal
        visible={isCalendarOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCalendarOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <Calendar size={18} color={PRIMARY_BLUE} strokeWidth={2.2} />
                <Text style={styles.modalTitle}>DATE OF BIRTH</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsCalendarOpen(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={18} color={SLATE_500} />
              </TouchableOpacity>
            </View>

            {/* Selected Date Preview Bar */}
            <View style={styles.modalPreviewBar}>
              <View>
                <Text style={styles.modalPreviewLabel}>Selected Date:</Text>
                <Text style={styles.modalPreviewDate}>
                  {String(selectedDay).padStart(2, '0')}/{String(calendarMonth + 1).padStart(2, '0')}/{calendarYear}
                </Text>
              </View>
              <View
                style={[
                  styles.ageStatusPill,
                  previewAge >= 19 ? styles.ageStatusPillValid : styles.ageStatusPillInvalid,
                ]}>
                {previewAge >= 19 ? (
                  <>
                    <CheckCircle2 size={12} color="#059669" strokeWidth={2.4} />
                    <Text style={styles.ageStatusTextValid}>{previewAge} yrs • 19+ Verified</Text>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={12} color="#DC2626" strokeWidth={2.4} />
                    <Text style={styles.ageStatusTextInvalid}>Under 19 ({previewAge} yrs)</Text>
                  </>
                )}
              </View>
            </View>

            {/* Mode Switcher: Days Grid vs Year Selector */}
            <View style={styles.modeSwitcherRow}>
              <TouchableOpacity
                style={[styles.modeBtn, viewMode === 'calendar' && styles.modeBtnActive]}
                onPress={() => setViewMode('calendar')}>
                <Text style={[styles.modeBtnText, viewMode === 'calendar' && styles.modeBtnTextActive]}>
                  Day & Month
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, viewMode === 'years' && styles.modeBtnActive]}
                onPress={() => setViewMode('years')}>
                <Text style={[styles.modeBtnText, viewMode === 'years' && styles.modeBtnTextActive]}>
                  Select Year ({calendarYear})
                </Text>
              </TouchableOpacity>
            </View>

            {/* VIEW 1: Calendar Grid */}
            {viewMode === 'calendar' && (
              <View style={styles.calendarContainer}>
                {/* Month Navigator */}
                <View style={styles.monthNavRow}>
                  <TouchableOpacity
                    style={styles.monthNavBtn}
                    onPress={() => {
                      if (calendarMonth === 0) {
                        setCalendarMonth(11);
                        setCalendarYear(prev => Math.max(MIN_YEAR, prev - 1));
                      } else {
                        setCalendarMonth(prev => prev - 1);
                      }
                    }}>
                    <ChevronLeft size={18} color={SLATE_700} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setViewMode('years')}
                    style={styles.monthTitleBtn}>
                    <Text style={styles.monthTitleText}>
                      {MONTH_NAMES[calendarMonth]} {calendarYear} ▾
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.monthNavBtn}
                    onPress={() => {
                      if (calendarMonth === 11) {
                        setCalendarMonth(0);
                        setCalendarYear(prev => Math.min(CURRENT_YEAR, prev + 1));
                      } else {
                        setCalendarMonth(prev => prev + 1);
                      }
                    }}>
                    <ChevronRight size={18} color={SLATE_700} />
                  </TouchableOpacity>
                </View>

                {/* Days of week */}
                <View style={styles.weekDaysRow}>
                  {DAYS_OF_WEEK.map(day => (
                    <Text key={day} style={styles.weekDayText}>
                      {day}
                    </Text>
                  ))}
                </View>

                {/* Days grid */}
                <View style={styles.daysGrid}>
                  {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                    <View key={`empty-${i}`} style={styles.dayCellEmpty} />
                  ))}
                  {Array.from({ length: daysInCurrentMonth }).map((_, i) => {
                    const day = i + 1;
                    const isSelected = selectedDay === day;
                    return (
                      <TouchableOpacity
                        key={`day-${day}`}
                        style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                        onPress={() => setSelectedDay(day)}>
                        <Text style={[styles.dayCellText, isSelected && styles.dayCellTextSelected]}>
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* VIEW 2: Quick Year Picker */}
            {viewMode === 'years' && (
              <View style={styles.yearsContainer}>
                <Text style={styles.yearsHeader}>Select Birth Year:</Text>
                <ScrollView
                  style={styles.yearsScroll}
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={styles.yearsGrid}>
                  {YEARS.map(y => {
                    const isSelected = calendarYear === y;
                    return (
                      <TouchableOpacity
                        key={y}
                        style={[styles.yearPill, isSelected && styles.yearPillSelected]}
                        onPress={() => {
                          setCalendarYear(y);
                          setViewMode('calendar');
                        }}>
                        <Text style={[styles.yearPillText, isSelected && styles.yearPillTextSelected]}>
                          {y}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Modal Bottom Actions */}
            <View style={styles.modalBottomRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsCalendarOpen(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleConfirmCalendarDate}>
                <Text style={styles.modalConfirmBtnText}>Apply Date</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    maxWidth: 440,
    backgroundColor: WHITE,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
    elevation: 20,
    overflow: 'hidden',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SLATE_200,
  },

  // Ambient top glow
  glowTop: {
    position: 'absolute',
    top: -30,
    alignSelf: 'center',
    width: 240,
    height: 120,
    backgroundColor: 'rgba(1, 102, 220, 0.12)',
    borderRadius: 120,
  },

  // App Logo Container
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    width: '100%',
  },
  appLogo: {
    width: 170,
    height: 46,
  },

  // Titles
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: SLATE_900,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.4,
  },
  description: {
    fontSize: 13,
    color: SLATE_600,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
    paddingHorizontal: 6,
  },
  descriptionBold: {
    fontWeight: '800',
    color: SLATE_900,
  },

  // Form
  form: {
    width: '100%',
    marginBottom: 16,
  },
  fieldGroup: {
    width: '100%',
  },
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: SLATE_700,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },

  // Input with right-side calendar icon
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SLATE_50,
    borderWidth: 1,
    borderColor: SLATE_300,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
  },
  dobInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: SLATE_900,
    paddingVertical: 0,
  },
  calendarBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: RED_BG,
    borderWidth: 1,
    borderColor: RED_BORDER,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    width: '100%',
    gap: 8,
  },
  errorIcon: {
    marginRight: 2,
  },
  errorText: {
    flex: 1,
    color: RED_TEXT,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },

  // Buttons
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 16,
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
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  enterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: PRIMARY_BLUE,
    gap: 6,
    shadowColor: PRIMARY_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  enterBtnDisabled: {
    opacity: 0.7,
  },
  enterBtnText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // ── Modal Styles ──────────────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: SLATE_100,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: SLATE_900,
    letterSpacing: 0.8,
  },
  modalPreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: SLATE_50,
    borderWidth: 1,
    borderColor: SLATE_200,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
  },
  modalPreviewLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: SLATE_500,
    textTransform: 'uppercase',
  },
  modalPreviewDate: {
    fontSize: 14,
    fontWeight: '800',
    color: SLATE_900,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 1,
  },
  ageStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  ageStatusPillValid: {
    backgroundColor: '#ECFDF5',
  },
  ageStatusPillInvalid: {
    backgroundColor: '#FEF2F2',
  },
  ageStatusTextValid: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  ageStatusTextInvalid: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  modeSwitcherRow: {
    flexDirection: 'row',
    backgroundColor: SLATE_100,
    borderRadius: 10,
    padding: 3,
    marginTop: 12,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: WHITE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  modeBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: SLATE_500,
  },
  modeBtnTextActive: {
    color: PRIMARY_BLUE,
    fontWeight: '800',
  },

  // Calendar container
  calendarContainer: {
    marginTop: 12,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  monthNavBtn: {
    padding: 6,
  },
  monthTitleBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  monthTitleText: {
    fontSize: 13,
    fontWeight: '800',
    color: SLATE_800,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  weekDayText: {
    width: 38,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: SLATE_400,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 4,
  },
  dayCellEmpty: {
    width: 38,
    height: 34,
  },
  dayCell: {
    width: 38,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellSelected: {
    backgroundColor: PRIMARY_BLUE,
  },
  dayCellText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: SLATE_700,
  },
  dayCellTextSelected: {
    color: WHITE,
    fontWeight: '800',
  },

  // Years container
  yearsContainer: {
    marginTop: 12,
    maxHeight: 220,
  },
  yearsHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: SLATE_600,
    marginBottom: 8,
  },
  yearsScroll: {
    maxHeight: 180,
  },
  yearsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingBottom: 10,
  },
  yearPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: SLATE_100,
    borderWidth: 1,
    borderColor: SLATE_200,
  },
  yearPillSelected: {
    backgroundColor: PRIMARY_BLUE,
    borderColor: PRIMARY_BLUE,
  },
  yearPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: SLATE_700,
  },
  yearPillTextSelected: {
    color: WHITE,
    fontWeight: '800',
  },

  // Modal Bottom Actions
  modalBottomRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: SLATE_100,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: SLATE_100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: SLATE_600,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: PRIMARY_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: WHITE,
  },
});
