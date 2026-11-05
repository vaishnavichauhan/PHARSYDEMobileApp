import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Lock,
  Mail,
  User,
  Phone,
  Calendar,
  ShieldCheck,
  Check,
  Eye,
  EyeOff,
  LogOut,
  ShoppingBag,
  Package,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  X,
} from 'lucide-react-native';
import { useProfileStore } from '../store/profileStore';
import { navigate } from '../navigation/navigationRef';

const BG = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';
const ACCENT_LIME = '#3B82F6';
const ACCENT_GREEN = '#0166dc';
const ERROR_BG = '#FEF2F2';
const ERROR_BORDER = '#FECACA';
const ERROR_TEXT = '#B91C1C';

// ── Calendar Date Helpers (Matching Frontend YYYY-MM-DD Format) ───────────
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Manitoba Legal 19+ Range (Born on or before 2007)
const LEGAL_MAX_YEAR = 2007;
const YEARS = Array.from(
  { length: LEGAL_MAX_YEAR - 1940 + 1 },
  (_, i) => LEGAL_MAX_YEAR - i,
);

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfWeek = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

const formatIsoDate = (y: number, m: number, d: number) => {
  const mm = String(m + 1).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
};

const calculateAge = (y: number, m: number, d: number) => {
  const today = new Date();
  let age = today.getFullYear() - y;
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();
  if (currentMonth < m || (currentMonth === m && currentDay < d)) {
    age--;
  }
  return age;
};

const ProfileModal = () => {
  const {
    isOpen,
    closeProfile,
    user,
    isLoggedIn,
    authTab,
    initialEmail,
    setAuthTab,
    isLoading,
    error,
    clearError,
    login,
    register,
    logout,
  } = useProfileStore();

  // Sign In form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  useEffect(() => {
    if (initialEmail) {
      setLoginEmail(initialEmail);
    }
  }, [initialEmail]);

  // Register form state
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerDob, setRegisterDob] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [ageConsent, setAgeConsent] = useState(false);

  // Calendar picker state for Date of Birth
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarYear, setCalendarYear] = useState(1998);
  const [calendarMonth, setCalendarMonth] = useState(0); // 0 = Jan
  const [selectedDay, setSelectedDay] = useState<number | null>(15);
  const [calendarViewMode, setCalendarViewMode] = useState<'calendar' | 'years'>('calendar');

  const openCalendar = () => {
    if (registerDob && registerDob.includes('-')) {
      const parts = registerDob.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        setCalendarYear(y);
        setCalendarMonth(Math.max(0, Math.min(11, m)));
        setSelectedDay(d);
      }
    } else {
      setCalendarYear(1998);
      setCalendarMonth(0);
      setSelectedDay(15);
    }
    setCalendarViewMode('calendar');
    setIsCalendarOpen(true);
  };

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(prev => prev - 1);
    } else {
      setCalendarMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      if (calendarYear < LEGAL_MAX_YEAR) {
        setCalendarMonth(0);
        setCalendarYear(prev => prev + 1);
      }
    } else {
      setCalendarMonth(prev => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    setSelectedDay(day);
  };

  const handleSelectYear = (year: number) => {
    setCalendarYear(year);
    setCalendarViewMode('calendar');
  };

  const handleSelectMonth = (monthIndex: number) => {
    setCalendarMonth(monthIndex);
  };

  const handleConfirmCalendarDate = () => {
    const day = selectedDay || 1;
    const formatted = formatIsoDate(calendarYear, calendarMonth, day);
    setRegisterDob(formatted);
    const age = calculateAge(calendarYear, calendarMonth, day);
    if (age >= 19) {
      setAgeConsent(true);
    }
    setIsCalendarOpen(false);
  };

  // Quick fill test account
  const handleQuickFillDemo = () => {
    setLoginEmail('customer@pharsyde.ca');
    setLoginPassword('password123');
    clearError();
  };

  const handleLoginSubmit = async () => {
    clearError();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      Alert.alert('Required Fields', 'Please provide both your email address and password.');
      return;
    }

    const success = await login(loginEmail, loginPassword);
    if (success) {
      setLoginEmail('');
      setLoginPassword('');
    }
  };

  const handleRegisterSubmit = async () => {
    clearError();
    if (!registerName.trim() || !registerEmail.trim() || !registerPassword.trim()) {
      Alert.alert('Required Fields', 'Please fill in your name, email, and password.');
      return;
    }
    if (!registerDob) {
      Alert.alert('Date of Birth Required', 'Please select your Date of Birth using the calendar.');
      return;
    }
    if (!ageConsent) {
      Alert.alert('Age Verification Required', 'You must confirm you are 19+ years old to create a Pharsyde member account.');
      return;
    }

    const success = await register({
      name: registerName,
      email: registerEmail,
      phone: registerPhone,
      dateOfBirth: registerDob,
      password: registerPassword,
    });

    if (success) {
      setRegisterName('');
      setRegisterEmail('');
      setRegisterPhone('');
      setRegisterDob('');
      setRegisterPassword('');
      setAgeConsent(false);
    }
  };

  const handleSignOutPress = async () => {
    await logout();
  };

  const getUserInitials = (name?: string) => {
    if (!name) return 'PS';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      onRequestClose={closeProfile}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" />

        {/* ── Top Header Bar ───────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={closeProfile}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <ArrowLeft size={20} color={TEXT} strokeWidth={2.2} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.headerBadgeRow}>
              <View style={styles.headerLockBadge}>
                <Lock size={13} color={ACCENT_GREEN} strokeWidth={2.4} />
              </View>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {isLoggedIn
                  ? 'CUSTOMER PROFILE'
                  : authTab === 'login'
                  ? 'CUSTOMER SIGN IN'
                  : 'CREATE CUSTOMER ACCOUNT'}
              </Text>
            </View>
            <Text style={styles.headerSubtitle}>
              {isLoggedIn ? 'Verified 19+ Manitoba Member' : 'Pharsyde Member Portal'}
            </Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>

        <KeyboardAvoidingView
          style={styles.flexOne}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}>

            {/* ── VIEW 1: NOT LOGGED IN (SIGN IN / REGISTER TABS) ────── */}
            {!isLoggedIn ? (
              <View style={styles.authContainer}>
                {/* Tab Switcher (Matches Frontend AuthModal.jsx) */}
                <View style={styles.tabSwitcher}>
                  <TouchableOpacity
                    style={[styles.tabButton, authTab === 'login' && styles.tabButtonActive]}
                    activeOpacity={0.8}
                    onPress={() => {
                      setAuthTab('login');
                      clearError();
                    }}>
                    <Text
                      style={[
                        styles.tabButtonText,
                        authTab === 'login' && styles.tabButtonTextActive,
                      ]}>
                      Sign In
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.tabButton,
                      authTab === 'register' && styles.tabButtonActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => {
                      setAuthTab('register');
                      clearError();
                    }}>
                    <Text
                      style={[
                        styles.tabButtonText,
                        authTab === 'register' && styles.tabButtonTextActive,
                      ]}>
                      New Account
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Error Banner */}
                {error ? (
                  <View style={styles.errorBanner}>
                    <AlertTriangle size={16} color={ERROR_TEXT} style={styles.errorIcon} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                {/* ── Tab 1: Customer Sign In Form ─────────────────────── */}
                {authTab === 'login' ? (
                  <View style={styles.formCard}>
                    {/* Demo Account Quick Fill Helper */}
                    <TouchableOpacity
                      style={styles.quickFillBanner}
                      activeOpacity={0.7}
                      onPress={handleQuickFillDemo}>
                      <Sparkles size={14} color={ACCENT_GREEN} />
                      <Text style={styles.quickFillText}>
                        Tap to autofill demo account ({'customer@pharsyde.ca'})
                      </Text>
                    </TouchableOpacity>

                    {/* Email Input */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Email Address</Text>
                      <View style={styles.inputWrapper}>
                        <Mail size={16} color={MUTED} style={styles.inputIconLeft} />
                        <TextInput
                          style={styles.textInput}
                          placeholder="name@example.com"
                          placeholderTextColor="#94A3B8"
                          value={loginEmail}
                          onChangeText={setLoginEmail}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </View>
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Password</Text>
                      <View style={styles.inputWrapper}>
                        <Lock size={16} color={MUTED} style={styles.inputIconLeft} />
                        <TextInput
                          style={[styles.textInput, styles.passwordInput]}
                          placeholder="••••••••"
                          placeholderTextColor="#94A3B8"
                          value={loginPassword}
                          onChangeText={setLoginPassword}
                          secureTextEntry={!showLoginPassword}
                          autoCapitalize="none"
                        />
                        <TouchableOpacity
                          style={styles.eyeButton}
                          onPress={() => setShowLoginPassword(!showLoginPassword)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          {showLoginPassword ? (
                            <Eye size={16} color={MUTED} />
                          ) : (
                            <EyeOff size={16} color={MUTED} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                      style={styles.submitButton}
                      activeOpacity={0.85}
                      disabled={isLoading}
                      onPress={handleLoginSubmit}>
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#000000" />
                      ) : (
                        <View style={styles.submitBtnInner}>
                          <Lock size={15} color="#000000" strokeWidth={2.4} />
                          <Text style={styles.submitButtonText}>SIGN IN TO ACCOUNT</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* Switch to Register link */}
                    <View style={styles.footerRow}>
                      <Text style={styles.footerNormalText}>Don't have an account yet? </Text>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                          setAuthTab('register');
                          clearError();
                        }}>
                        <Text style={styles.footerLinkText}>Register now</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  /* ── Tab 2: Create Customer Account Form ───────────── */
                  <View style={styles.formCard}>
                    {/* Full Name */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Full Name *</Text>
                      <View style={styles.inputWrapper}>
                        <User size={16} color={MUTED} style={styles.inputIconLeft} />
                        <TextInput
                          style={styles.textInput}
                          placeholder="Jane Doe"
                          placeholderTextColor="#94A3B8"
                          value={registerName}
                          onChangeText={setRegisterName}
                          autoCapitalize="words"
                        />
                      </View>
                    </View>

                    {/* Email Address */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Email Address *</Text>
                      <View style={styles.inputWrapper}>
                        <Mail size={16} color={MUTED} style={styles.inputIconLeft} />
                        <TextInput
                          style={styles.textInput}
                          placeholder="name@example.com"
                          placeholderTextColor="#94A3B8"
                          value={registerEmail}
                          onChangeText={setRegisterEmail}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </View>
                    </View>

                    {/* Phone & Date of Birth Row (With Calendar Picker) */}
                    <View style={styles.twoColumnRow}>
                      <View style={[styles.inputGroup, styles.halfColumn]}>
                        <Text style={styles.inputLabel}>Phone Number</Text>
                        <View style={styles.inputWrapper}>
                          <Phone size={15} color={MUTED} style={styles.inputIconLeft} />
                          <TextInput
                            style={styles.textInput}
                            placeholder="(204) 555-0199"
                            placeholderTextColor="#94A3B8"
                            value={registerPhone}
                            onChangeText={setRegisterPhone}
                            keyboardType="phone-pad"
                          />
                        </View>
                      </View>

                      {/* ── Date of Birth with Calendar Picker Button ── */}
                      <View style={[styles.inputGroup, styles.halfColumn]}>
                        <Text style={styles.inputLabel}>Date of Birth *</Text>
                        <TouchableOpacity
                          style={[
                            styles.inputWrapper,
                            styles.dobButtonWrapper,
                            Boolean(registerDob) && styles.dobButtonWrapperFilled,
                          ]}
                          activeOpacity={0.75}
                          onPress={openCalendar}>
                          <Calendar
                            size={15}
                            color={registerDob ? ACCENT_GREEN : MUTED}
                            style={styles.inputIconLeft}
                          />
                          <Text
                            style={[
                              styles.dobValueText,
                              !registerDob && styles.dobPlaceholderText,
                            ]}
                            numberOfLines={1}>
                            {registerDob || 'YYYY-MM-DD'}
                          </Text>
                          <View style={styles.calendarMiniPill}>
                            <Text style={styles.calendarMiniIcon}>📅</Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Password */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Password *</Text>
                      <View style={styles.inputWrapper}>
                        <Lock size={16} color={MUTED} style={styles.inputIconLeft} />
                        <TextInput
                          style={[styles.textInput, styles.passwordInput]}
                          placeholder="Min 6 characters"
                          placeholderTextColor="#94A3B8"
                          value={registerPassword}
                          onChangeText={setRegisterPassword}
                          secureTextEntry={!showRegisterPassword}
                          autoCapitalize="none"
                        />
                        <TouchableOpacity
                          style={styles.eyeButton}
                          onPress={() => setShowRegisterPassword(!showRegisterPassword)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          {showRegisterPassword ? (
                            <Eye size={16} color={MUTED} />
                          ) : (
                            <EyeOff size={16} color={MUTED} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Age Consent Checkbox (Matches Web Frontend AuthModal) */}
                    <TouchableOpacity
                      style={styles.checkboxRow}
                      activeOpacity={0.7}
                      onPress={() => setAgeConsent(!ageConsent)}>
                      <View
                        style={[
                          styles.checkboxBox,
                          ageConsent && styles.checkboxBoxChecked,
                        ]}>
                        {ageConsent ? (
                          <Check size={14} color="#000000" strokeWidth={3} />
                        ) : null}
                      </View>
                      <Text style={styles.checkboxLabel}>
                        I confirm I am{' '}
                        <Text style={styles.checkboxBold}>19+ years of age</Text> (legal
                        age in Manitoba).
                      </Text>
                    </TouchableOpacity>

                    {/* Submit Button */}
                    <TouchableOpacity
                      style={styles.submitButton}
                      activeOpacity={0.85}
                      disabled={isLoading}
                      onPress={handleRegisterSubmit}>
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#000000" />
                      ) : (
                        <View style={styles.submitBtnInner}>
                          <ShieldCheck size={16} color="#000000" strokeWidth={2.4} />
                          <Text style={styles.submitButtonText}>CREATE MEMBER ACCOUNT</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* Switch to Sign In link */}
                    <View style={styles.footerRow}>
                      <Text style={styles.footerNormalText}>Already have an account? </Text>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                          setAuthTab('login');
                          clearError();
                        }}>
                        <Text style={styles.footerLinkText}>Sign In</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ) : (
              /* ── VIEW 2: LOGGED IN (CUSTOMER PROFILE SCREEN) ───────── */
              <View style={styles.profileContainer}>
                {/* User Hero Banner */}
                <View style={styles.userHeroSection}>
                  <View style={styles.avatarOuterCircle}>
                    <View style={styles.avatarInnerCircle}>
                      <Text style={styles.avatarInitials}>
                        {getUserInitials(user?.name)}
                      </Text>
                    </View>
                    <View style={styles.avatarOnlineDot} />
                  </View>

                  <Text style={styles.userName}>{user?.name || 'Valued Member'}</Text>

                  <View style={styles.memberStatusBadge}>
                    <ShieldCheck size={13} color={ACCENT_GREEN} strokeWidth={2.4} />
                    <Text style={styles.memberStatusText}>
                      19+ VERIFIED MEMBER • MANITOBA
                    </Text>
                  </View>
                </View>

                {/* ── TechPOS Loyalty & Rewards Card (Requested Section) ── */}
                <View style={styles.rewardsCard}>
                  <View style={styles.rewardsHeaderRow}>
                    <View style={styles.rewardsIconBox}>
                      <Sparkles size={22} color="#D97706" />
                    </View>
                    <View style={styles.rewardsHeaderInfo}>
                      <View style={styles.rewardsTitleRow}>
                        <Text style={styles.rewardsTitle}>
                          TechPOS Loyalty & Rewards
                        </Text>
                        {user?.is_elite ? (
                          <View style={styles.vipBadge}>
                            <Text style={styles.vipBadgeText}>VIP ELITE</Text>
                          </View>
                        ) : user?.techpos_member_id ? (
                          <View style={styles.memberIdBadge}>
                            <Text style={styles.memberIdBadgeText}>
                              #{user.techpos_member_id}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.rewardsSubtitle}>
                        Earn points on in-store and online purchases to redeem for instant discounts at checkout.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.rewardsBalancesDivider} />

                  <View style={styles.rewardsBalancesRow}>
                    <View style={styles.rewardsBalanceCol}>
                      <Text style={styles.rewardsBalanceLabel}>AVAILABLE BALANCE</Text>
                      <Text style={styles.rewardsPointsText}>
                        ⭐ {Number(user?.reward_points) || 0}{' '}
                        <Text style={styles.rewardsPointsUnit}>pts</Text>
                      </Text>
                    </View>

                    {Number(user?.reward_points_dollar_value) > 0 ? (
                      <View style={[styles.rewardsBalanceCol, styles.rewardsDollarBorder]}>
                        <Text style={styles.rewardsBalanceLabel}>DOLLAR VALUE</Text>
                        <Text style={styles.rewardsDollarText}>
                          ${Number(user?.reward_points_dollar_value).toFixed(2)} CAD
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Account Details 2x2 Grid (Matches AccountOrdersPage.jsx) */}
                <Text style={styles.sectionHeading}>Member Account Details</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Customer Name</Text>
                    <Text style={styles.statValue} numberOfLines={1}>
                      {user?.name || 'Member'}
                    </Text>
                  </View>

                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Compliance Status</Text>
                    <View style={styles.complianceRow}>
                      <ShieldCheck size={13} color={ACCENT_GREEN} strokeWidth={2.2} />
                      <Text style={styles.complianceText}>19+ Verified</Text>
                    </View>
                  </View>

                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Account Email</Text>
                    <Text style={styles.statValueSmall} numberOfLines={1}>
                      {user?.email || 'customer@pharsyde.ca'}
                    </Text>
                  </View>

                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Phone Number</Text>
                    <Text style={styles.statValueSmall} numberOfLines={1}>
                      {user?.phone || user?.mob_no || 'Not provided'}
                    </Text>
                  </View>
                </View>

                {/* Account Quick Navigation Actions */}
                <Text style={styles.sectionHeading}>Account Quick Actions</Text>
                <View style={styles.cardsContainer}>
                  {/* View Orders Action */}
                  <TouchableOpacity
                    style={styles.actionCard}
                    activeOpacity={0.7}
                    onPress={() => {
                      closeProfile();
                      navigate('Order');
                    }}>
                    <View style={styles.actionIconBox}>
                      <Package size={20} color={ACCENT_GREEN} strokeWidth={2.2} />
                    </View>
                    <View style={styles.actionTextWrap}>
                      <Text style={styles.actionTitle}>My Orders & Receipts</Text>
                      <Text style={styles.actionSubtitle}>
                        Track live courier & boutique pickup orders
                      </Text>
                    </View>
                    <ChevronRight size={18} color={MUTED} />
                  </TouchableOpacity>

                  {/* Browse Store Catalog Action */}
                  <TouchableOpacity
                    style={styles.actionCard}
                    activeOpacity={0.7}
                    onPress={() => {
                      closeProfile();
                      navigate('Home');
                    }}>
                    <View style={styles.actionIconBox}>
                      <ShoppingBag size={20} color={ACCENT_GREEN} strokeWidth={2.2} />
                    </View>
                    <View style={styles.actionTextWrap}>
                      <Text style={styles.actionTitle}>Explore Store Catalog</Text>
                      <Text style={styles.actionSubtitle}>
                        Browse Winnipeg craft flower, edibles & vapes
                      </Text>
                    </View>
                    <ChevronRight size={18} color={MUTED} />
                  </TouchableOpacity>
                </View>

                {/* ── Sign Out Button (Prominent as Requested) ─────────── */}
                <View style={styles.signOutWrapper}>
                  <TouchableOpacity
                    style={styles.signOutButton}
                    activeOpacity={0.8}
                    onPress={handleSignOutPress}>
                    <LogOut size={18} color={ERROR_TEXT} strokeWidth={2.2} />
                    <Text style={styles.signOutButtonText}>Sign Out of Account</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* ── Interactive Date of Birth Calendar Modal ─────────────── */}
        <Modal
          visible={isCalendarOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsCalendarOpen(false)}>
          <View style={styles.calendarBackdrop}>
            <View style={styles.calendarCard}>
              {/* Header */}
              <View style={styles.calendarHeader}>
                <View style={styles.calendarHeaderLeft}>
                  <View style={styles.calendarHeaderIconBox}>
                    <Calendar size={18} color={ACCENT_GREEN} strokeWidth={2.2} />
                  </View>
                  <View>
                    <Text style={styles.calendarHeaderTitle}>DATE OF BIRTH PICKER</Text>
                    <Text style={styles.calendarHeaderSub}>
                      Manitoba Legal Age 19+ (Born ≤ {LEGAL_MAX_YEAR})
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.calendarCloseBtn}
                  onPress={() => setIsCalendarOpen(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <X size={18} color={MUTED} />
                </TouchableOpacity>
              </View>

              {/* Selected Date Preview & Format Banner (Matches Frontend) */}
              <View style={styles.datePreviewBox}>
                <View style={styles.datePreviewTop}>
                  <Text style={styles.datePreviewLabel}>Selected Date of Birth:</Text>
                  <View style={styles.formatPill}>
                    <Text style={styles.formatPillText}>FORMAT: YYYY-MM-DD</Text>
                  </View>
                </View>
                <View style={styles.datePreviewValueRow}>
                  <Text style={styles.datePreviewValue}>
                    {formatIsoDate(calendarYear, calendarMonth, selectedDay || 1)}
                  </Text>
                  {calculateAge(calendarYear, calendarMonth, selectedDay || 1) >= 19 ? (
                    <View style={styles.ageVerifiedPill}>
                      <ShieldCheck size={12} color={ACCENT_GREEN} strokeWidth={2.4} />
                      <Text style={styles.ageVerifiedText}>
                        {calculateAge(calendarYear, calendarMonth, selectedDay || 1)} yrs • 19+ Verified
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.ageUnderPill}>
                      <AlertTriangle size={12} color="#DC2626" />
                      <Text style={styles.ageUnderText}>
                        Under 19 ({calculateAge(calendarYear, calendarMonth, selectedDay || 1)} yrs)
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* View Switcher: Calendar Days vs Quick Year Picker */}
              <View style={styles.calendarModeSwitcher}>
                <TouchableOpacity
                  style={[
                    styles.modeSwitchBtn,
                    calendarViewMode === 'calendar' && styles.modeSwitchBtnActive,
                  ]}
                  onPress={() => setCalendarViewMode('calendar')}>
                  <Text
                    style={[
                      styles.modeSwitchBtnText,
                      calendarViewMode === 'calendar' && styles.modeSwitchBtnTextActive,
                    ]}>
                    Calendar Grid
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modeSwitchBtn,
                    calendarViewMode === 'years' && styles.modeSwitchBtnActive,
                  ]}
                  onPress={() => setCalendarViewMode('years')}>
                  <Text
                    style={[
                      styles.modeSwitchBtnText,
                      calendarViewMode === 'years' && styles.modeSwitchBtnTextActive,
                    ]}>
                    Change Year & Month ({calendarYear})
                  </Text>
                </TouchableOpacity>
              </View>

              {calendarViewMode === 'calendar' ? (
                /* ── View 1: Calendar Month & Days Grid ── */
                <View style={styles.calendarMonthView}>
                  {/* Month Navigation Row */}
                  <View style={styles.monthNavRow}>
                    <TouchableOpacity
                      style={styles.monthNavBtn}
                      onPress={handlePrevMonth}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <ChevronLeft size={18} color={TEXT} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.monthTitleBtn}
                      onPress={() => setCalendarViewMode('years')}>
                      <Text style={styles.monthTitleText}>
                        {MONTH_NAMES[calendarMonth]} {calendarYear}
                      </Text>
                      <Text style={styles.monthTitleChevron}>▾</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.monthNavBtn}
                      onPress={handleNextMonth}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <ChevronRight size={18} color={TEXT} />
                    </TouchableOpacity>
                  </View>

                  {/* Weekdays Row */}
                  <View style={styles.weekdaysRow}>
                    {WEEKDAYS.map(w => (
                      <Text key={w} style={styles.weekdayLabel}>
                        {w}
                      </Text>
                    ))}
                  </View>

                  {/* Days Grid */}
                  <View style={styles.daysGrid}>
                    {/* Empty slots for day alignment */}
                    {Array.from({ length: getFirstDayOfWeek(calendarYear, calendarMonth) }).map(
                      (_, i) => (
                        <View key={`empty-${i}`} style={styles.emptyDayCell} />
                      ),
                    )}

                    {/* Days of current month */}
                    {Array.from({
                      length: getDaysInMonth(calendarYear, calendarMonth),
                    }).map((_, i) => {
                      const day = i + 1;
                      const isSelected = selectedDay === day;
                      return (
                        <TouchableOpacity
                          key={`day-${day}`}
                          style={[
                            styles.dayCell,
                            isSelected && styles.dayCellSelected,
                          ]}
                          activeOpacity={0.7}
                          onPress={() => handleSelectDay(day)}>
                          <Text
                            style={[
                              styles.dayCellText,
                              isSelected && styles.dayCellTextSelected,
                            ]}>
                            {day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : (
                /* ── View 2: Quick Year & Month Selectors ── */
                <View style={styles.yearMonthPickerView}>
                  {/* Months 3x4 Grid */}
                  <Text style={styles.pickerSectionTitle}>SELECT MONTH</Text>
                  <View style={styles.monthsGrid}>
                    {MONTH_SHORT.map((name, idx) => {
                      const isSelected = calendarMonth === idx;
                      return (
                        <TouchableOpacity
                          key={name}
                          style={[
                            styles.monthCell,
                            isSelected && styles.monthCellSelected,
                          ]}
                          onPress={() => handleSelectMonth(idx)}>
                          <Text
                            style={[
                              styles.monthCellText,
                              isSelected && styles.monthCellTextSelected,
                            ]}>
                            {name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Scrollable Years Grid */}
                  <Text style={styles.pickerSectionTitle}>
                    SELECT BIRTH YEAR (1940 – {LEGAL_MAX_YEAR})
                  </Text>
                  <ScrollView
                    style={styles.yearsScroll}
                    contentContainerStyle={styles.yearsGrid}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={true}>
                    {YEARS.map(y => {
                      const isSelected = calendarYear === y;
                      return (
                        <TouchableOpacity
                          key={y}
                          style={[
                            styles.yearCell,
                            isSelected && styles.yearCellSelected,
                          ]}
                          onPress={() => handleSelectYear(y)}>
                          <Text
                            style={[
                              styles.yearCellText,
                              isSelected && styles.yearCellTextSelected,
                            ]}>
                            {y}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.calendarFooter}>
                <TouchableOpacity
                  style={styles.confirmDobBtn}
                  activeOpacity={0.85}
                  onPress={handleConfirmCalendarDate}>
                  <Check size={16} color="#000000" strokeWidth={3} />
                  <Text style={styles.confirmDobBtnText}>
                    Confirm Date ({formatIsoDate(calendarYear, calendarMonth, selectedDay || 1)})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelDobBtn}
                  onPress={() => setIsCalendarOpen(false)}>
                  <Text style={styles.cancelDobBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  flexOne: {
    flex: 1,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: CARD_BG,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  headerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerLockBadge: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: 'rgba(59, 130, 246, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(1, 102, 220, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: MUTED,
    fontWeight: '500',
    marginTop: 1,
  },
  headerSpacer: {
    width: 38,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  /* ── Auth Container & Tabs ── */
  authContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: MUTED,
  },
  tabButtonTextActive: {
    color: TEXT,
    fontWeight: '800',
  },

  /* ── Error Banner ── */
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ERROR_BG,
    borderWidth: 1,
    borderColor: ERROR_BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorIcon: {
    marginRight: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: ERROR_TEXT,
    fontWeight: '500',
    lineHeight: 17,
  },

  /* ── Form Card ── */
  formCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: 14,
  },
  quickFillBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(1, 102, 220, 0.22)',
  },
  quickFillText: {
    fontSize: 11,
    color: ACCENT_GREEN,
    fontWeight: '700',
  },
  inputGroup: {
    gap: 6,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  halfColumn: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    height: 46,
  },
  inputIconLeft: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: TEXT,
    height: '100%',
    paddingVertical: 0,
  },
  passwordInput: {
    paddingRight: 32,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    height: '100%',
    justifyContent: 'center',
  },

  /* ── Date of Birth Touchable Field ── */
  dobButtonWrapper: {
    justifyContent: 'space-between',
  },
  dobButtonWrapperFilled: {
    borderColor: ACCENT_GREEN,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  dobValueText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: TEXT,
  },
  dobPlaceholderText: {
    color: '#94A3B8',
    fontWeight: '500',
  },
  calendarMiniPill: {
    paddingLeft: 4,
  },
  calendarMiniIcon: {
    fontSize: 14,
  },

  /* ── Checkbox ── */
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxBoxChecked: {
    backgroundColor: ACCENT_LIME,
    borderColor: ACCENT_GREEN,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 16,
  },
  checkboxBold: {
    fontWeight: '800',
    color: TEXT,
  },

  /* ── Buttons ── */
  submitButton: {
    backgroundColor: ACCENT_LIME,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: ACCENT_LIME,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
  },
  footerNormalText: {
    fontSize: 11.5,
    color: MUTED,
  },
  footerLinkText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: ACCENT_GREEN,
    textDecorationLine: 'underline',
  },

  /* ── Logged In Profile UI ── */
  profileContainer: {
    paddingBottom: 20,
  },
  userHeroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginBottom: 16,
  },
  avatarOuterCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(59, 130, 246, 0.20)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(1, 102, 220, 0.30)',
  },
  avatarInnerCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarInitials: {
    fontSize: 24,
    fontWeight: '900',
    color: TEXT,
    letterSpacing: 0.5,
  },
  avatarOnlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: ACCENT_LIME,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: TEXT,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  memberStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(59, 130, 246, 0.16)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(1, 102, 220, 0.25)',
  },
  memberStatusText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: ACCENT_GREEN,
    letterSpacing: 0.5,
  },

  /* ── TechPOS Loyalty & Rewards Card ── */
  rewardsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    shadowColor: '#B45309',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  rewardsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  rewardsIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardsHeaderInfo: {
    flex: 1,
  },
  rewardsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  rewardsTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  vipBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  vipBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.4,
  },
  memberIdBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  memberIdBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  rewardsSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
    marginTop: 3,
  },
  rewardsBalancesDivider: {
    height: 1,
    backgroundColor: '#FDE68A',
    marginVertical: 12,
  },
  rewardsBalancesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardsBalanceCol: {
    flex: 1,
  },
  rewardsDollarBorder: {
    borderLeftWidth: 1,
    borderLeftColor: '#FDE68A',
    paddingLeft: 14,
  },
  rewardsBalanceLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.7,
    marginBottom: 3,
  },
  rewardsPointsText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#78350F',
  },
  rewardsPointsUnit: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  rewardsDollarText: {
    fontSize: 18,
    fontWeight: '900',
    color: ACCENT_GREEN,
  },

  /* ── Stats 2x2 Grid ── */
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT,
  },
  statValueSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  complianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  complianceText: {
    fontSize: 12,
    fontWeight: '700',
    color: ACCENT_GREEN,
  },

  /* ── Action Cards ── */
  cardsContainer: {
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 20,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(1, 102, 220, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 11,
    color: MUTED,
    fontWeight: '500',
  },

  /* ── Sign Out Button ── */
  signOutWrapper: {
    paddingHorizontal: 16,
    marginTop: 4,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    paddingVertical: 14,
  },
  signOutButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: ERROR_TEXT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* ── Calendar Date Picker Modal Styles ── */
  calendarBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.70)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  calendarCard: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: CARD_BG,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginBottom: 12,
  },
  calendarHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calendarHeaderIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.20)',
    borderWidth: 1,
    borderColor: 'rgba(1, 102, 220, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarHeaderTitle: {
    fontSize: 13.5,
    fontWeight: '900',
    color: TEXT,
    letterSpacing: 0.4,
  },
  calendarHeaderSub: {
    fontSize: 10.5,
    color: MUTED,
    fontWeight: '600',
    marginTop: 1,
  },
  calendarCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Date Preview Box ── */
  datePreviewBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 12,
  },
  datePreviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  datePreviewLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: MUTED,
  },
  formatPill: {
    backgroundColor: 'rgba(1, 102, 220, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  formatPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: ACCENT_GREEN,
    letterSpacing: 0.5,
  },
  datePreviewValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  datePreviewValue: {
    fontSize: 18,
    fontWeight: '900',
    color: TEXT,
    letterSpacing: 1,
  },
  ageVerifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.22)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ageVerifiedText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: ACCENT_GREEN,
  },
  ageUnderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ageUnderText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#DC2626',
  },

  /* ── Mode Switcher ── */
  calendarModeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    marginBottom: 10,
  },
  modeSwitchBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  modeSwitchBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  modeSwitchBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: MUTED,
  },
  modeSwitchBtnTextActive: {
    color: TEXT,
    fontWeight: '800',
  },

  /* ── Calendar Month View ── */
  calendarMonthView: {
    paddingVertical: 4,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  monthNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  monthTitleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: BORDER,
  },
  monthTitleText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: TEXT,
  },
  monthTitleChevron: {
    fontSize: 12,
    color: MUTED,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  weekdayLabel: {
    width: 38,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    color: MUTED,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingHorizontal: 2,
  },
  emptyDayCell: {
    width: '14.28%',
    height: 36,
  },
  dayCell: {
    width: '14.28%',
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    marginVertical: 1,
  },
  dayCellSelected: {
    backgroundColor: ACCENT_LIME,
    shadowColor: ACCENT_LIME,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  dayCellText: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT,
  },
  dayCellTextSelected: {
    color: '#000000',
    fontWeight: '900',
  },

  /* ── Quick Year & Month Selectors ── */
  yearMonthPickerView: {
    paddingVertical: 4,
  },
  pickerSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: MUTED,
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 4,
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  monthCell: {
    flexBasis: '23%',
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  monthCellSelected: {
    backgroundColor: ACCENT_LIME,
    borderColor: ACCENT_GREEN,
  },
  monthCellText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: TEXT,
  },
  monthCellTextSelected: {
    color: '#000000',
    fontWeight: '900',
  },
  yearsScroll: {
    maxHeight: 140,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 6,
  },
  yearsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  yearCell: {
    flexBasis: '23%',
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  yearCellSelected: {
    backgroundColor: ACCENT_LIME,
    borderColor: ACCENT_GREEN,
  },
  yearCellText: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT,
  },
  yearCellTextSelected: {
    color: '#000000',
    fontWeight: '900',
  },

  /* ── Calendar Footer Actions ── */
  calendarFooter: {
    marginTop: 14,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 12,
  },
  confirmDobBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT_LIME,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: ACCENT_LIME,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  confirmDobBtnText: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.3,
  },
  cancelDobBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  cancelDobBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: MUTED,
  },
});

export default ProfileModal;
