/**
 * CheckoutModal – Mobile App Secure Transaction Checkout & Moneris Flow
 * Mirrors the Web Frontend CheckoutPage, PaymentPage, and OrderSuccessPage.
 *
 * Stage 1: "SECURE TRANSACTION CHECKOUT"
 *  - Fulfillment switcher (In-Store Pickup vs Winnipeg Courier Delivery)
 *  - Customer contact fields (First Name, Last Name, Email, Phone)
 *  - Courier address fields (Address, Postal Code)
 *  - Payment Method (Moneris Credit Card)
 *  - Manitoba Compliance Checkboxes (19+ Age Consent & Photo ID acknowledgment)
 *  - Order summary breakdown (Subtotal, 12% MB Tax, Delivery, Total)
 *  - "CONTINUE TO MONERIS PAYMENT" action
 *
 * Stage 2: "MONERIS HOSTED CHECKOUT / PAYMENT AUTHORIZATION"
 *  - Moneris QA Sandbox Interactive Terminal
 *  - One-click Test Card autofill (Visa 4242..., Mastercard 5454...)
 *  - Cardholder Name, Card Number, Expiry, CVV inputs
 *  - "SUBMIT MONERIS PAYMENT" action
 *  - Verification loading state
 *
 * Stage 3: "ORDER CONFIRMED"
 *  - Order #PHR-100xxx banner
 *  - Manitoba compliance & receipt breakdown
 *  - "Continue Shopping" & "View in Order History" actions
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Alert,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  Truck,
  Store,
  CreditCard,
  Building,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Receipt,
  Sparkles,
  Package,
  X,
  RefreshCw,
  Check,
  AlertTriangle,
  User,
  FileCheck,
  UploadCloud,
  Image as ImageIcon,
  FileText,
} from 'lucide-react-native';
import { pick, types, isErrorWithCode, errorCodes } from '@react-native-documents/picker';

import { useCheckoutStore } from '../store/checkoutStore';
import { useCartStore, FREE_SHIPPING_THRESHOLD, TAX_RATE, STANDARD_DELIVERY_FEE } from '../store/cartStore';
import { useProfileStore } from '../store/profileStore';
import { API_ENDPOINTS } from '../config/api';
import { navigate } from '../navigation/navigationRef';

const BG = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';
const ACCENT_LIME = '#3B82F6';
const ACCENT_GREEN = '#0166dc';
const ERROR_RED = '#DC2626';

const formatMoney = (val: any): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0');
  return Number.isFinite(num) ? num.toFixed(2) : '0.00';
};

const isImageDoc = (url?: string | null, name?: string | null): boolean => {
  const target = (name || url || '').toLowerCase();
  if (!target) return false;
  if (target.endsWith('.pdf') || target.includes('application/pdf')) {
    return false;
  }
  return true;
};

export default function CheckoutModal() {
  const {
    isOpen,
    stage,
    formData,
    errors,
    paymentSession,
    confirmedOrder,
    isSubmitting,
    loadingMessage,
    errorMessage,
    closeCheckout,
    setStage,
    updateFormField,
    initiateMonerisPreload,
    submitInteracOrder,
    finalizeMonerisPayment,
    cancelPayment,
    resetCheckout,
  } = useCheckoutStore();

  const { items, totalPrice, promoDiscount, clearCart, openCart } = useCartStore();
  const { user: customerUser, isLoggedIn: isCustomerLoggedIn, openProfile } = useProfileStore();

  // Test Card Form State for Stage 2 (Moneris Sandbox)
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardHolder, setCardHolder] = useState('TEST CUSTOMER');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('123');
  const [redeemRewards, setRedeemRewards] = useState(false);

  // Existing Account Detection (Matches Web CheckoutPage.jsx)
  const [existingAccountEmail, setExistingAccountEmail] = useState<string | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  // Government ID Attachment State (Optional - Matches Web CheckoutPage.jsx)
  const [isUploadingId, setIsUploadingId] = useState(false);
  const [idUploadError, setIdUploadError] = useState<string | null>(null);
  const [localDocUri, setLocalDocUri] = useState<string | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  const handlePickDocument = async () => {
    setIdUploadError(null);

    try {
      const [result] = await pick({
        type: [types.images, types.pdf],
        mode: 'import',
      });

      if (!result) return;

      // 10MB limit validation matching backend & web frontend
      const MAX_SIZE_BYTES = 10 * 1024 * 1024;
      if (result.size && result.size > MAX_SIZE_BYTES) {
        Alert.alert(
          'File Too Large',
          'The selected document exceeds the 10MB limit. Please choose a smaller file.',
        );
        return;
      }

      // Store local URI immediately for instant, high-resolution preview
      if (result.uri) {
        setLocalDocUri(result.uri);
      }

      setIsUploadingId(true);

      const formDataUpload = new FormData();
      formDataUpload.append('document', {
        uri: result.uri,
        name: result.name || `gov-id-${Date.now()}.${result.type?.includes('pdf') ? 'pdf' : 'jpg'}`,
        type: result.type || (result.name?.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
      } as any);

      const response = await fetch(API_ENDPOINTS.uploadDocument, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
        body: formDataUpload,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to upload document.');
      }

      updateFormField('govIdUrl', data.fileUrl);
      updateFormField('govIdName', data.originalName || result.name || 'Government ID');
      updateFormField('govIdSize', data.size || result.size || null);
      Alert.alert('ID Uploaded', 'Government ID uploaded successfully.');
    } catch (err: any) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
        // User cancelled picker, do nothing
        return;
      }
      console.warn('Document pick/upload error:', err);
      const errMsg = err.message || 'Failed to attach document.';
      setIdUploadError(errMsg);
      Alert.alert('Upload Error', errMsg);
    } finally {
      setIsUploadingId(false);
    }
  };

  const handleRemoveDocument = () => {
    setLocalDocUri(null);
    setIsImageViewerOpen(false);
    updateFormField('govIdUrl', null);
    updateFormField('govIdName', null);
    updateFormField('govIdSize', null);
    setIdUploadError(null);
  };

  // Sync customer info when logged in
  useEffect(() => {
    if (isCustomerLoggedIn && customerUser) {
      setExistingAccountEmail(null);
      const parts = (customerUser.name || '').trim().split(' ');
      const first = parts[0] || '';
      const last = parts.slice(1).join(' ') || '';
      if (first) updateFormField('firstName', first);
      if (last) updateFormField('lastName', last);
      if (customerUser.email) updateFormField('email', customerUser.email);
      const ph = customerUser.phone || customerUser.mob_no || '';
      if (ph) updateFormField('phone', ph);
    }
  }, [isCustomerLoggedIn, customerUser]);

  // Check if an entered email belongs to an existing account
  const checkEmailAvailability = async (emailToCheck: string) => {
    if (isCustomerLoggedIn) {
      setExistingAccountEmail(null);
      return;
    }
    const clean = (emailToCheck || '').trim().toLowerCase();
    if (!clean || !clean.includes('@') || clean.length < 5) {
      setExistingAccountEmail(null);
      return;
    }
    try {
      setIsCheckingEmail(true);
      const res = await fetch(`${API_ENDPOINTS.checkEmail}?email=${encodeURIComponent(clean)}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data && data.exists) {
        setExistingAccountEmail(clean);
      } else {
        setExistingAccountEmail(null);
      }
    } catch (err) {
      console.warn('Check email error:', err);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleEmailChange = (val: string) => {
    updateFormField('email', val);
    if (existingAccountEmail && val.trim().toLowerCase() !== existingAccountEmail) {
      setExistingAccountEmail(null);
    }
  };

  // Debounced real-time email existence check (Matches Web UX)
  useEffect(() => {
    if (isCustomerLoggedIn) {
      setExistingAccountEmail(null);
      return;
    }
    const clean = (formData.email || '').trim().toLowerCase();
    if (!clean || !clean.includes('@') || !clean.includes('.') || clean.length < 5) {
      setExistingAccountEmail(null);
      return;
    }
    const timer = setTimeout(() => {
      checkEmailAvailability(clean);
    }, 350);
    return () => clearTimeout(timer);
  }, [formData.email, isCustomerLoggedIn]);

  const cartList = Object.values(items);
  const cartSubtotal = Math.max(0, totalPrice);
  const isPickup = formData.fulfillmentType === 'pickup';
  const deliveryFee =
    isPickup || cartSubtotal >= FREE_SHIPPING_THRESHOLD || cartSubtotal === 0
      ? 0
      : STANDARD_DELIVERY_FEE;

  // ── TechPOS Loyalty Program Calculations (Matches Web CheckoutPage.jsx) ──
  const availablePoints = isCustomerLoggedIn ? Number(customerUser?.reward_points || 0) : 0;
  const pointRate =
    Number(customerUser?.reward_points_dollar_value) > 0 && availablePoints > 0
      ? Number(customerUser?.reward_points_dollar_value) / availablePoints
      : 1.0;
  const availableDollarValue =
    Number(customerUser?.reward_points_dollar_value) > 0
      ? Number(customerUser?.reward_points_dollar_value)
      : availablePoints * pointRate;
  const maxRedeemablePoints = Math.min(availablePoints, Math.floor(cartSubtotal / pointRate));
  const rewardDiscount = redeemRewards ? Math.round(maxRedeemablePoints * pointRate * 100) / 100 : 0.0;
  const discountedSubtotal = Math.max(0, cartSubtotal - rewardDiscount);
  const taxableAmount = Math.max(0, discountedSubtotal - promoDiscount);
  const calculatedTax = Math.round(taxableAmount * TAX_RATE * 100) / 100;
  const orderTotal = Math.max(0, Math.round((taxableAmount + deliveryFee + calculatedTax) * 100) / 100);

  // Sync customer name into cardholder
  useEffect(() => {
    if (formData.firstName || formData.lastName) {
      const full = `${formData.firstName} ${formData.lastName}`.trim().toUpperCase();
      if (full) setCardHolder(full);
    }
  }, [formData.firstName, formData.lastName]);

  if (!isOpen) return null;

  // ── Stage 1: Proceed to Moneris Preload ──────────────────────────────────
  const handleProceedToPayment = async () => {
    if (cartList.length === 0) {
      Alert.alert('Cart is Empty', 'Please add items to your cart before proceeding.');
      return;
    }

    const cleanEmail = (formData.email || '').trim().toLowerCase();

    // Verify if email belongs to an existing registered user when unauthenticated
    if (!isCustomerLoggedIn && cleanEmail) {
      let accountExists = existingAccountEmail === cleanEmail;
      if (!accountExists && cleanEmail.includes('@')) {
        try {
          setIsCheckingEmail(true);
          const res = await fetch(`${API_ENDPOINTS.checkEmail}?email=${encodeURIComponent(cleanEmail)}`, {
            headers: { 'Content-Type': 'application/json' },
          });
          const data = await res.json();
          if (data?.exists) {
            accountExists = true;
            setExistingAccountEmail(cleanEmail);
          }
        } catch {
        } finally {
          setIsCheckingEmail(false);
        }
      }

      if (accountExists) {
        Alert.alert(
          'Account Found',
          `We found an account for ${cleanEmail}! Please log in to complete your checkout.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Log In',
              style: 'default',
              onPress: () => openProfile('login', cleanEmail),
            },
          ],
        );
        return;
      }
    }

    // Branch based on payment method (Matches Web CheckoutPage.jsx)
    if (formData.paymentMethod === 'interac') {
      const success = await submitInteracOrder(cartList, cartSubtotal, {
        redeem_rewards: redeemRewards,
        redeemed_points: redeemRewards ? maxRedeemablePoints : 0,
      });

      if (success) {
        clearCart();
        if (isCustomerLoggedIn) {
          useProfileStore.getState().fetchCurrentUser();
        }
      } else {
        const currentError = useCheckoutStore.getState().errorMessage;
        if (currentError && currentError.toLowerCase().includes('already exists')) {
          setExistingAccountEmail(cleanEmail);
          Alert.alert(
            'Account Found',
            `We found an account for ${cleanEmail}! Please log in to complete your checkout.`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Log In',
                onPress: () => openProfile('login', cleanEmail),
              },
            ],
          );
        }
      }
      return;
    }

    // Credit Card via Moneris Hosted Checkout
    const success = await initiateMonerisPreload(cartList, cartSubtotal, {
      redeem_rewards: redeemRewards,
      redeemed_points: redeemRewards ? maxRedeemablePoints : 0,
    });

    if (!success) {
      const currentError = useCheckoutStore.getState().errorMessage;
      if (currentError && currentError.toLowerCase().includes('already exists')) {
        setExistingAccountEmail(cleanEmail);
        Alert.alert(
          'Account Found',
          `We found an account for ${cleanEmail}! Please log in to complete your checkout.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Log In',
              onPress: () => openProfile('login', cleanEmail),
            },
          ],
        );
      }
    }
  };

  // ── Stage 2: Finalize Moneris Payment ────────────────────────────────────
  const handleSubmitCardPayment = async () => {
    if (!cardNumber || cardNumber.length < 15) {
      Alert.alert('Card Number', 'Please enter a valid card number.');
      return;
    }
    const success = await finalizeMonerisPayment();
    if (success) {
      clearCart();
      if (isCustomerLoggedIn) {
        useProfileStore.getState().fetchCurrentUser();
      }
    }
  };

  // ── Stage 3: Complete / Nav Actions ──────────────────────────────────────
  const handleContinueShopping = () => {
    resetCheckout();
  };

  const handleViewOrderHistory = () => {
    resetCheckout();
    navigate('Order');
  };

  // Select test card preset
  const selectTestCard = (type: 'visa' | 'mc') => {
    if (type === 'visa') {
      setCardNumber('4242 4242 4242 4242');
      setCardExpiry('12/28');
      setCardCvv('123');
    } else {
      setCardNumber('5454 5454 5454 5454');
      setCardExpiry('12/28');
      setCardCvv('123');
    }
  };

  return (
    <>
      <Modal
      visible={isOpen}
      animationType="slide"
      onRequestClose={() => {
        if (stage === 'payment') {
          cancelPayment();
        } else if (stage === 'success') {
          resetCheckout();
        } else {
          closeCheckout();
        }
      }}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" />

        {/* ── Top Bar ─────────────────────────────────────────────── */}
        <View style={styles.navBar}>
          {stage === 'payment' ? (
            <TouchableOpacity
              style={styles.navBtn}
              onPress={cancelPayment}
              disabled={isSubmitting}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <ArrowLeft size={18} color={TEXT} />
              <Text style={styles.navBtnText}>Return to Review</Text>
            </TouchableOpacity>
          ) : stage === 'checkout' ? (
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => {
                closeCheckout();
                openCart();
              }}
              disabled={isSubmitting}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <ArrowLeft size={18} color={TEXT} />
              <Text style={styles.navBtnText}>Back to Cart</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.emptyNavPlaceholder} />
          )}

          
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {/* ══════════════════════════════════════════════════════════
              STAGE 1: CHECKOUT FORM ("SECURE TRANSACTION CHECKOUT")
             ══════════════════════════════════════════════════════════ */}
          {stage === 'checkout' && (
            <View style={styles.stageContainer}>
              {/* Header */}
              <View style={styles.pageHeader}>
                <Text style={styles.badgeSubtitle}>SECURE TRANSACTION</Text>
                <Text style={styles.pageTitle}>CHECKOUT</Text>
                <Text style={styles.pageSubDescription}>
                  Complete your Manitoba age-verified fulfillment details.
                </Text>
              </View>

              {/* Member Sign In Callout if Guest (Matches Web CheckoutPage.jsx lines 448-467) */}
              {!isCustomerLoggedIn && (
                <View style={styles.guestCalloutBanner}>
                  <View style={styles.guestCalloutLeft}>
                    <View style={styles.guestCalloutIconWrap}>
                      <Sparkles size={16} color={ACCENT_GREEN} />
                    </View>
                    <Text style={styles.guestCalloutText}>
                      Already registered?{' '}
                      <Text style={styles.guestCalloutBold}>
                        Sign in to autofill your details and link this order to your account.
                      </Text>
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.guestSignInBtn}
                    onPress={() => openProfile('login')}
                    activeOpacity={0.8}>
                    <Text style={styles.guestSignInBtnText}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Global Error message */}
              {errorMessage && (
                <View style={styles.errorBox}>
                  <AlertCircle size={16} color={ERROR_RED} />
                  <Text style={styles.errorBoxText}>{errorMessage}</Text>
                </View>
              )}

              {/* Step 1: 1. Age & Eligibility Compliance */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <ShieldCheck size={20} color="#EA580C" />
                  <Text style={styles.sectionTitle}>1. Age & Eligibility Compliance</Text>
                </View>

                {/* Consent 1: 19+ age */}
                <TouchableOpacity
                  style={[
                    styles.checkboxRow,
                    errors.ageConsent && styles.checkboxRowError,
                  ]}
                  onPress={() => updateFormField('ageConsent', !formData.ageConsent)}
                  activeOpacity={0.8}>
                  <View
                    style={[
                      styles.checkbox,
                      formData.ageConsent && styles.checkboxChecked,
                    ]}>
                    {formData.ageConsent && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                  <Text style={styles.checkboxText}>
                    I confirm under penalty of law that I am <Text style={styles.boldText}>19 years of age or older</Text> (legal age in Manitoba).
                  </Text>
                </TouchableOpacity>
                {errors.ageConsent ? (
                  <Text style={styles.fieldErrorText}>{errors.ageConsent}</Text>
                ) : null}

                {/* Consent 2: Photo ID on receipt */}
                <TouchableOpacity
                  style={[
                    styles.checkboxRow,
                    errors.idConsent && styles.checkboxRowError,
                  ]}
                  onPress={() => updateFormField('idConsent', !formData.idConsent)}
                  activeOpacity={0.8}>
                  <View
                    style={[
                      styles.checkbox,
                      formData.idConsent && styles.checkboxChecked,
                    ]}>
                    {formData.idConsent && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                  <Text style={styles.checkboxText}>
                    I acknowledge that <Text style={styles.boldText}>valid government-issued photo ID</Text> will be physically inspected upon store pickup or courier delivery.
                  </Text>
                </TouchableOpacity>
                {errors.idConsent ? (
                  <Text style={styles.fieldErrorText}>{errors.idConsent}</Text>
                ) : null}
              </View>

              {/* Step 2: 2. Customer Information */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>2. Customer Information</Text>

                <View style={styles.inputRow}>
                  <View style={styles.inputHalf}>
                    <Text style={styles.fieldLabel}>First Name *</Text>
                    <TextInput
                      style={[styles.input, errors.firstName && styles.inputError]}
                      value={formData.firstName}
                      onChangeText={val => updateFormField('firstName', val)}
                      placeholder="Jane"
                      placeholderTextColor="#94A3B8"
                    />
                    {errors.firstName ? (
                      <Text style={styles.fieldErrorText}>{errors.firstName}</Text>
                    ) : null}
                  </View>

                  <View style={styles.inputHalf}>
                    <Text style={styles.fieldLabel}>Last Name *</Text>
                    <TextInput
                      style={[styles.input, errors.lastName && styles.inputError]}
                      value={formData.lastName}
                      onChangeText={val => updateFormField('lastName', val)}
                      placeholder="Doe"
                      placeholderTextColor="#94A3B8"
                    />
                    {errors.lastName ? (
                      <Text style={styles.fieldErrorText}>{errors.lastName}</Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.fieldLabel}>Email Address *</Text>
                    {isCheckingEmail ? (
                      <Text style={styles.checkingEmailText}>Checking account...</Text>
                    ) : null}
                  </View>
                  <TextInput
                    style={[
                      styles.input,
                      errors.email && styles.inputError,
                      existingAccountEmail && styles.inputWarning,
                    ]}
                    value={formData.email}
                    onChangeText={handleEmailChange}
                    onBlur={() => checkEmailAvailability(formData.email)}
                    placeholder="customer@pharsyde.ca"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {errors.email ? (
                    <Text style={styles.fieldErrorText}>{errors.email}</Text>
                  ) : null}

                  {/* Amber Alert Banner matching Web Frontend Screenshot */}
                  {existingAccountEmail ? (
                    <View style={styles.existingAccountBanner}>
                      <View style={styles.existingAccountLeft}>
                        <AlertTriangle size={18} color="#D97706" style={styles.alertIcon} />
                        <Text style={styles.existingAccountText}>
                          We found an account for{' '}
                          <Text style={styles.existingAccountEmailBold}>
                            {existingAccountEmail}
                          </Text>
                          ! Please log in to complete your checkout.
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.existingAccountLoginBtn}
                        activeOpacity={0.8}
                        onPress={() => openProfile('login', existingAccountEmail)}>
                        <User size={13} color="#FFFFFF" strokeWidth={2.4} />
                        <Text style={styles.existingAccountLoginText}>Log In</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={styles.fieldHint}>
                      Order confirmation & Moneris receipt will be sent here
                    </Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Phone Number *</Text>
                  <TextInput
                    style={[styles.input, errors.phone && styles.inputError]}
                    value={formData.phone}
                    onChangeText={val => updateFormField('phone', val)}
                    placeholder="(204) 000-0000"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                  />
                  {errors.phone ? (
                    <Text style={styles.fieldErrorText}>{errors.phone}</Text>
                  ) : (
                    <Text style={styles.fieldHint}>
                      Used for fulfillment SMS and order pickup notification
                    </Text>
                  )}
                </View>

                {/* Optional Government-Approved ID Upload (Matches Web CheckoutPage.jsx) */}
                <View style={styles.govIdContainer}>
                  <View style={styles.govIdHeaderRow}>
                    <View style={styles.govIdHeaderLeft}>
                      <FileCheck size={16} color={ACCENT_GREEN} />
                      <Text style={styles.govIdTitle}>Government-Approved ID</Text>
                    </View>
                    <View style={styles.govIdOptionalBadge}>
                      <Text style={styles.govIdOptionalText}>Optional</Text>
                    </View>
                  </View>

                  <Text style={styles.govIdSubtitle}>
                    Upload a photo or PDF of your Driver&apos;s License, Passport, or Age of Majority card to expedite pickup &amp; delivery confirmation. <Text style={styles.boldText}>Physical ID will still be inspected upon store pickup or courier delivery.</Text>
                  </Text>

                  {!formData.govIdUrl ? (
                    <View>
                      <TouchableOpacity
                        style={[
                          styles.uploadDottedBox,
                          isUploadingId && styles.uploadDottedBoxDisabled,
                        ]}
                        onPress={handlePickDocument}
                        disabled={isUploadingId}
                        activeOpacity={0.8}>
                        {isUploadingId ? (
                          <View style={styles.uploadLoadingRow}>
                            <ActivityIndicator size="small" color={ACCENT_GREEN} />
                            <Text style={styles.uploadLoadingText}>
                              Uploading and securing document...
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.uploadIdleCol}>
                            <View style={styles.uploadCloudIconWrap}>
                              <UploadCloud size={20} color="#475569" />
                            </View>
                            <Text style={styles.uploadClickText}>
                              Tap to select Government ID
                            </Text>
                            <Text style={styles.uploadHintText}>
                              PNG, JPG, WEBP, or PDF • Max 10MB
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                      {idUploadError ? (
                        <Text style={styles.govIdErrorText}>{idUploadError}</Text>
                      ) : null}
                    </View>
                  ) : isImageDoc(formData.govIdUrl, formData.govIdName) ? (
                    /* Image uploaded: show small image thumbnail with small image icon inside image and right corner close icon */
                    <View style={styles.imagePreviewContainer}>
                      <View style={styles.thumbnailWrapper}>
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => setIsImageViewerOpen(true)}
                          style={styles.thumbnailTouch}>
                          <Image
                            source={{ uri: localDocUri || formData.govIdUrl || '' }}
                            style={styles.smallImageThumbnail}
                            resizeMode="cover"
                          />
                          {/* Small image icon inside image */}
                          <View style={styles.smallImageIconBadge}>
                            <ImageIcon size={12} color="#FFFFFF" strokeWidth={2.4} />
                          </View>
                        </TouchableOpacity>

                        {/* Right corner close icon */}
                        <TouchableOpacity
                          style={styles.thumbnailCloseBtn}
                          onPress={handleRemoveDocument}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          activeOpacity={0.8}
                          accessibilityLabel="Remove image">
                          <X size={12} color="#FFFFFF" strokeWidth={2.6} />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.imageDocMetaCol}>
                        <View style={styles.imageDocStatusRow}>
                          <CheckCircle2 size={14} color="#059669" />
                          <Text style={styles.imageDocStatusText}>ID Uploaded</Text>
                        </View>
                        <Text style={styles.uploadedDocName} numberOfLines={1}>
                          {formData.govIdName || 'Government ID Photo'}
                        </Text>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => setIsImageViewerOpen(true)}>
                          <Text style={styles.tapToViewText}>
                            Tap image to view full screen
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Right corner close icon */}
                      <TouchableOpacity
                        style={styles.removeDocBtn}
                        onPress={handleRemoveDocument}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        activeOpacity={0.75}
                        accessibilityLabel="Delete uploaded ID">
                        <X size={16} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    /* Non-image (e.g. PDF) document card */
                    <View style={styles.uploadedDocCard}>
                      <View style={styles.uploadedDocLeft}>
                        <View style={styles.uploadedDocIconWrap}>
                          <FileText size={18} color="#059669" />
                        </View>
                        <View style={styles.uploadedDocInfo}>
                          <Text style={styles.uploadedDocName} numberOfLines={1}>
                            {formData.govIdName || 'Government ID Uploaded'}
                          </Text>
                          <Text style={styles.uploadedDocMeta}>
                            Uploaded successfully •{' '}
                            {formData.govIdSize
                              ? `${(formData.govIdSize / (1024 * 1024)).toFixed(2)} MB`
                              : 'Ready'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.uploadedDocActions}>
                        <TouchableOpacity
                          style={styles.previewDocBtn}
                          onPress={() => {
                            if (formData.govIdUrl) {
                              Linking.openURL(formData.govIdUrl).catch(() => {
                                Alert.alert('Preview', 'Could not open document preview.');
                              });
                            }
                          }}
                          activeOpacity={0.75}>
                          <Text style={styles.previewDocBtnText}>Preview</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.removeDocBtn}
                          onPress={handleRemoveDocument}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          activeOpacity={0.75}>
                          <X size={16} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {/* Step 3: 3. Fulfillment Method */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>3. Fulfillment Method</Text>

                <View style={styles.fulfillmentOptions}>
                  {/* Option: Pickup */}
                  <TouchableOpacity
                    style={[
                      styles.fulfillmentOption,
                      formData.fulfillmentType === 'pickup' && styles.fulfillmentOptionActive,
                    ]}
                    onPress={() => updateFormField('fulfillmentType', 'pickup')}
                    activeOpacity={0.85}>
                    <View style={styles.fulfillmentTopRow}>
                      <View style={styles.fulfillmentLeftCol}>
                        <View style={styles.fulfillmentLabelRow}>
                          <Store size={18} color="#0166dc" />
                          <Text style={styles.fulfillmentLabel}>In-Store Boutique Pickup</Text>
                        </View>
                        <Text style={styles.fulfillmentSubtext}>
                          117 Regent Ave W, Winnipeg
                        </Text>
                        <Text style={styles.fulfillmentHighlightGreen}>
                          FREE • Ready in 30 mins
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.paymentRadioOuter,
                          formData.fulfillmentType === 'pickup' && styles.paymentRadioOuterActive,
                        ]}>
                        {formData.fulfillmentType === 'pickup' && (
                          <View style={styles.paymentRadioInnerActive} />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Option: Courier */}
                  <TouchableOpacity
                    style={[
                      styles.fulfillmentOption,
                      formData.fulfillmentType === 'delivery' && styles.fulfillmentOptionActive,
                    ]}
                    onPress={() => updateFormField('fulfillmentType', 'delivery')}
                    activeOpacity={0.85}>
                    <View style={styles.fulfillmentTopRow}>
                      <View style={styles.fulfillmentLeftCol}>
                        <View style={styles.fulfillmentLabelRow}>
                          <Truck size={18} color="#EA580C" />
                          <Text style={styles.fulfillmentLabel}>Winnipeg Local Courier</Text>
                        </View>
                        <Text style={styles.fulfillmentSubtext}>
                          Same-day delivery (19+ ID check)
                        </Text>
                        <Text style={styles.fulfillmentHighlightOrange}>
                          {cartSubtotal >= FREE_SHIPPING_THRESHOLD ? 'FREE (Over $75)' : '$9.99 CAD'}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.paymentRadioOuter,
                          formData.fulfillmentType === 'delivery' && styles.paymentRadioOuterActive,
                        ]}>
                        {formData.fulfillmentType === 'delivery' && (
                          <View style={styles.paymentRadioInnerActive} />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Delivery Address fields if courier selected */}
                {formData.fulfillmentType === 'delivery' && (
                  <View style={styles.deliveryFieldsBox}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.fieldLabel}>Street Address *</Text>
                      <TextInput
                        style={[styles.input, errors.address && styles.inputError]}
                        value={formData.address}
                        onChangeText={val => updateFormField('address', val)}
                        placeholder="123 Main St, Apt 4B"
                        placeholderTextColor="#94A3B8"
                      />
                      {errors.address ? (
                        <Text style={styles.fieldErrorText}>{errors.address}</Text>
                      ) : null}
                    </View>

                    <View style={styles.inputRow}>
                      <View style={styles.inputHalf}>
                        <Text style={styles.fieldLabel}>City</Text>
                        <TextInput
                          style={[styles.input, styles.inputDisabled]}
                          value={formData.city}
                          editable={false}
                        />
                      </View>

                      <View style={styles.inputHalf}>
                        <Text style={styles.fieldLabel}>Postal Code *</Text>
                        <TextInput
                          style={[styles.input, errors.postalCode && styles.inputError]}
                          value={formData.postalCode}
                          onChangeText={val => updateFormField('postalCode', val.toUpperCase())}
                          placeholder="R2C 1R1"
                          placeholderTextColor="#94A3B8"
                          autoCapitalize="characters"
                        />
                        {errors.postalCode ? (
                          <Text style={styles.fieldErrorText}>{errors.postalCode}</Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.fieldLabel}>Delivery Notes (Optional)</Text>
                      <TextInput
                        style={styles.input}
                        value={formData.specialInstructions}
                        onChangeText={val => updateFormField('specialInstructions', val)}
                        placeholder="Buzzer code, gate access, etc."
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>
                )}
              </View>

              {/* Step 4: 4. Payment Method */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>4. Payment Method</Text>

                <View style={styles.paymentMethodList}>
                  {/* Option 1: Credit Card (Instant Online Payment) */}
                  <TouchableOpacity
                    style={[
                      styles.paymentOptionCard,
                      formData.paymentMethod === 'card' && styles.paymentOptionCardActive,
                    ]}
                    onPress={() => updateFormField('paymentMethod', 'card')}
                    activeOpacity={0.8}>
                    <View style={styles.paymentOptionLeft}>
                      <CreditCard size={20} color="#EA580C" />
                      <View style={styles.paymentOptionInfo}>
                        <Text style={styles.paymentOptionName}>
                          Credit Card (Instant Online Payment)
                        </Text>
                        <Text style={styles.paymentOptionSub}>
                          Secure encrypted 256-bit checkout
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.paymentRadioOuter,
                        formData.paymentMethod === 'card' && styles.paymentRadioOuterActive,
                      ]}>
                      {formData.paymentMethod === 'card' && (
                        <View style={styles.paymentRadioInnerActive} />
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Option 2: Interac e-Transfer */}
                  <TouchableOpacity
                    style={[
                      styles.paymentOptionCard,
                      formData.paymentMethod === 'interac' && styles.paymentOptionCardActive,
                    ]}
                    onPress={() => updateFormField('paymentMethod', 'interac')}
                    activeOpacity={0.8}>
                    <View style={styles.paymentOptionLeft}>
                      <Building size={20} color="#0166dc" />
                      <View style={styles.paymentOptionInfo}>
                        <Text style={styles.paymentOptionName}>
                          Interac e-Transfer
                        </Text>
                        <Text style={styles.paymentOptionSub}>
                          Instant transfer instructions sent via email to pay@pharsyde.ca
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.paymentRadioOuter,
                        formData.paymentMethod === 'interac' && styles.paymentRadioOuterActive,
                      ]}>
                      {formData.paymentMethod === 'interac' && (
                        <View style={styles.paymentRadioInnerActive} />
                      )}
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Moneris Hosted Gateway Checkout Notice (Shown when Card is selected) */}
                {formData.paymentMethod === 'card' && (
                  <View style={styles.monerisHostedNotice}>
                    <View style={styles.monerisHostedNoticeHeader}>
                      <ShieldCheck size={16} color="#059669" />
                      <Text style={styles.monerisHostedNoticeTitle}>
                        Moneris Hosted Gateway Checkout
                      </Text>
                    </View>
                    <Text style={styles.monerisHostedNoticeText}>
                      You will complete payment in the next step via Moneris's secure hosted payment portal. Your card details are processed directly by the banking network and are never stored on Pharsyde servers (PCI-DSS SAQ-A Certified).
                    </Text>
                  </View>
                )}
              </View>

              {/* Order Summary & Pricing Breakdown */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>ORDER SUMMARY</Text>

                {/* Items preview list */}
                <View style={styles.orderItemsList}>
                  {cartList.map(item => {
                    const price = parseFloat(item.product.retail_price || '0');
                    return (
                      <View key={item.product.pk} style={styles.orderItemRow}>
                        <Text style={styles.orderItemName} numberOfLines={1}>
                          {item.quantity}x {item.product.product_name}
                        </Text>
                        <Text style={styles.orderItemPrice}>
                          ${(price * item.quantity).toFixed(2)} CAD
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {/* TechPOS Loyalty Reward Tokens Card (Always Visible - Matches Web CheckoutPage.jsx) */}
                <View style={styles.rewardTokensCard}>
                  <View style={styles.rewardTokensHeader}>
                    <View style={styles.rewardTokensLeft}>
                      <View style={styles.rewardIconBadge}>
                        <Sparkles size={18} color="#D97706" />
                      </View>
                      <View>
                        <View style={styles.rewardTitleRow}>
                          <Text style={styles.rewardTokensTitle}>Reward Tokens</Text>
                          {isCustomerLoggedIn && customerUser?.techpos_member_id ? (
                            <View style={styles.memberPill}>
                              <Text style={styles.memberPillText}>
                                #{customerUser.techpos_member_id}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.rewardTokensSub}>TechPOS Loyalty Program</Text>
                      </View>
                    </View>

                    <View style={styles.rewardTokensRight}>
                      <Text style={styles.rewardTokensPointsText}>
                        ⭐ {availablePoints} tokens
                      </Text>
                      <Text style={styles.rewardTokensCadText}>
                        (${availableDollarValue.toFixed(2)} CAD)
                      </Text>
                    </View>
                  </View>

                  {isCustomerLoggedIn ? (
                    availablePoints > 0 ? (
                      <TouchableOpacity
                        style={[
                          styles.rewardRedeemOption,
                          redeemRewards && styles.rewardRedeemOptionActive,
                        ]}
                        activeOpacity={0.75}
                        onPress={() => setRedeemRewards(!redeemRewards)}>
                        <View
                          style={[
                            styles.checkboxSquare,
                            redeemRewards && styles.checkboxSquareChecked,
                          ]}>
                          {redeemRewards && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                        </View>
                        <View style={styles.rewardRedeemTextCol}>
                          <Text style={styles.rewardRedeemTitle}>
                            Redeem {maxRedeemablePoints} tokens for instant discount
                          </Text>
                          <Text style={styles.rewardRedeemSub}>
                            -${(maxRedeemablePoints * pointRate).toFixed(2)} CAD off order total
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.rewardNoticeBox}>
                        <View style={styles.rewardNoticeLeft}>
                          <View style={styles.rewardNoticeDot} />
                          <Text style={styles.rewardNoticeText}>
                            Balance: <Text style={styles.boldText}>0 tokens ($0.00 CAD)</Text>
                          </Text>
                        </View>
                        <View style={styles.earnBadge}>
                          <Text style={styles.earnBadgeText}>+Earn tokens on this order</Text>
                        </View>
                      </View>
                    )
                  ) : (
                    <View style={styles.rewardNoticeBox}>
                      <Text style={styles.rewardNoticeText}>
                        Balance: <Text style={styles.boldText}>0 tokens</Text> (Guest)
                      </Text>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                          closeCheckout();
                          openProfile('login');
                        }}>
                        <Text style={styles.signInLinkText}>Sign In to Link Tokens</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View style={styles.divider} />

                {/* Totals */}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryValue}>${cartSubtotal.toFixed(2)} CAD</Text>
                </View>

                {promoDiscount > 0 ? (
                  <View style={styles.summaryRow}>
                    <Text style={styles.discountLabel}>Promo Discount (10%)</Text>
                    <Text style={styles.discountValue}>-${promoDiscount.toFixed(2)} CAD</Text>
                  </View>
                ) : null}

                {/* Reward Tokens Line Item - Always Shown */}
                <View style={styles.summaryRow}>
                  <View style={styles.rewardSummaryLeft}>
                    <Sparkles size={14} color="#D97706" />
                    <Text style={styles.summaryLabel}>Reward Tokens</Text>
                    <Text style={styles.rewardAvailTag}>({availablePoints} avail)</Text>
                  </View>
                  <Text
                    style={[
                      styles.summaryValue,
                      redeemRewards && rewardDiscount > 0
                        ? styles.rewardDiscountActive
                        : styles.rewardDiscountZero,
                    ]}>
                    {redeemRewards && rewardDiscount > 0
                      ? `-$${rewardDiscount.toFixed(2)} CAD`
                      : '$0.00 CAD'}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Estimated Manitoba Tax (12%)</Text>
                  <Text style={styles.summaryValue}>${calculatedTax.toFixed(2)} CAD</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    {isPickup ? 'In-Store Pickup' : 'Courier Delivery'}
                  </Text>
                  <Text style={styles.summaryValue}>
                    {deliveryFee === 0 ? 'FREE' : `$${deliveryFee.toFixed(2)} CAD`}
                  </Text>
                </View>

                <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                  <Text style={styles.summaryTotalLabel}>Total Due</Text>
                  <Text style={styles.summaryTotalValue}>${orderTotal.toFixed(2)} CAD</Text>
                </View>
              </View>

              {/* Action Button */}
              <TouchableOpacity
                style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
                onPress={handleProceedToPayment}
                disabled={isSubmitting}
                activeOpacity={0.85}>
                {isSubmitting ? (
                  <View style={styles.btnLoadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>
                      {loadingMessage || (formData.paymentMethod === 'card' ? 'INITIALIZING MONERIS...' : 'SUBMITTING ORDER...')}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.btnRow}>
                    {formData.paymentMethod === 'card' ? (
                      <Lock size={16} color="#FFFFFF" strokeWidth={2.4} />
                    ) : (
                      <CheckCircle2 size={16} color="#FFFFFF" strokeWidth={2.4} />
                    )}
                    <Text style={styles.primaryButtonText}>
                      {formData.paymentMethod === 'card'
                        ? `PROCEED TO PAYMENT • $${orderTotal.toFixed(2)} CAD`
                        : `CONFIRM ORDER • $${orderTotal.toFixed(2)} CAD`}
                    </Text>
                    <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.4} />
                  </View>
                )}
              </TouchableOpacity>

              {/* Bottom security reassurance */}
              <View style={styles.bottomTrustRow}>
                <ShieldCheck size={14} color="#059669" />
                <Text style={styles.bottomTrustText}>
                  Bank-grade 256-bit TLS encrypted transaction via Moneris Solutions
                </Text>
              </View>
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════
              STAGE 2: MONERIS HOSTED CHECKOUT / PAYMENT AUTHORIZATION
             ══════════════════════════════════════════════════════════ */}
          {stage === 'payment' && (
            <View style={styles.stageContainer}>
              {/* Header */}
              <View style={styles.pageHeader}>
                <Text style={styles.badgeSubtitle}>MONERIS HOSTED PAYMENT GATEWAY</Text>
                <Text style={styles.pageTitle}>SECURE CARD CHECKOUT</Text>
                {paymentSession?.amount && (
                  <Text style={styles.pageSubAmount}>
                    Order Total: <Text style={styles.boldAmount}>${paymentSession.amount} CAD</Text>
                  </Text>
                )}
              </View>

              {/* Error Banner */}
              {errorMessage && (
                <View style={styles.errorBox}>
                  <AlertCircle size={18} color={ERROR_RED} />
                  <View style={styles.errorTextCol}>
                    <Text style={styles.errorTitle}>Transaction Alert</Text>
                    <Text style={styles.errorBoxText}>{errorMessage}</Text>
                  </View>
                </View>
              )}

              {/* Finalizing Overlay spinner */}
              {isSubmitting ? (
                <View style={styles.finalizingBox}>
                  <ActivityIndicator size="large" color={ACCENT_GREEN} />
                  <Text style={styles.finalizingTitle}>Processing Verification</Text>
                  <Text style={styles.finalizingSub}>
                    {loadingMessage || 'Payment authorized. Creating your verified order...'}
                  </Text>
                  <Text style={styles.finalizingWarning}>
                    Please do not close this screen or navigate away.
                  </Text>
                </View>
              ) : (
                <>
                  {/* Moneris QA Sandbox Interactive Terminal */}
                  <View style={styles.sandboxCard}>
                    <View style={styles.sandboxHeader}>
                      <View style={styles.sandboxPill}>
                        <CheckCircle2 size={13} color="#059669" />
                        <Text style={styles.sandboxPillText}>Moneris QA Sandbox • $0.00 Charged</Text>
                      </View>
                      <Text style={styles.sandboxTicketText}>
                        {paymentSession?.ticket || 'QA-SANDBOX-TICKET'}
                      </Text>
                    </View>

                    <Text style={styles.sandboxDesc}>
                      This is the <Text style={styles.boldText}>Moneris Official QA Test Sandbox</Text>. No real bank account will be charged.
                    </Text>

                    <Text style={styles.sandboxPresetsLabel}>
                      Tap a test card below to autofill:
                    </Text>

                    {/* Test Card Presets */}
                    <View style={styles.testCardsRow}>
                      <TouchableOpacity
                        style={[
                          styles.testCardBox,
                          cardNumber.startsWith('4242') && styles.testCardBoxActive,
                        ]}
                        onPress={() => selectTestCard('visa')}
                        activeOpacity={0.8}>
                        <View style={styles.testCardTitleRow}>
                          <CreditCard size={14} color="#0F172A" />
                          <Text style={styles.testCardTitle}>Test Visa</Text>
                          <Text style={styles.testCardApproved}>APPROVED</Text>
                        </View>
                        <Text style={styles.testCardNumber}>4242 •••• •••• 4242</Text>
                        <Text style={styles.testCardMeta}>Exp: 12/28 • CVV: 123</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.testCardBox,
                          cardNumber.startsWith('5454') && styles.testCardBoxActive,
                        ]}
                        onPress={() => selectTestCard('mc')}
                        activeOpacity={0.8}>
                        <View style={styles.testCardTitleRow}>
                          <CreditCard size={14} color="#0F172A" />
                          <Text style={styles.testCardTitle}>Test Mastercard</Text>
                          <Text style={styles.testCardApproved}>APPROVED</Text>
                        </View>
                        <Text style={styles.testCardNumber}>5454 •••• •••• 5454</Text>
                        <Text style={styles.testCardMeta}>Exp: 12/28 • CVV: 123</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Card Entry Fields */}
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>CARD DETAILS</Text>

                    <View style={styles.inputGroup}>
                      <Text style={styles.fieldLabel}>Cardholder Name</Text>
                      <TextInput
                        style={styles.input}
                        value={cardHolder}
                        onChangeText={setCardHolder}
                        placeholder="NAME ON CARD"
                        placeholderTextColor="#94A3B8"
                        autoCapitalize="characters"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.fieldLabel}>Card Number</Text>
                      <TextInput
                        style={styles.input}
                        value={cardNumber}
                        onChangeText={setCardNumber}
                        placeholder="4242 4242 4242 4242"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                      />
                    </View>

                    <View style={styles.inputRow}>
                      <View style={styles.inputHalf}>
                        <Text style={styles.fieldLabel}>Expiry Date</Text>
                        <TextInput
                          style={styles.input}
                          value={cardExpiry}
                          onChangeText={setCardExpiry}
                          placeholder="MM/YY"
                          placeholderTextColor="#94A3B8"
                        />
                      </View>

                      <View style={styles.inputHalf}>
                        <Text style={styles.fieldLabel}>CVV / CVC</Text>
                        <TextInput
                          style={styles.input}
                          value={cardCvv}
                          onChangeText={setCardCvv}
                          placeholder="123"
                          placeholderTextColor="#94A3B8"
                          keyboardType="numeric"
                          secureTextEntry
                          maxLength={4}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleSubmitCardPayment}
                    disabled={isSubmitting}
                    activeOpacity={0.85}>
                    <View style={styles.btnRow}>
                      <CreditCard size={18} color="#0F172A" strokeWidth={2.4} />
                      <Text style={styles.primaryButtonText}>
                        SUBMIT MONERIS PAYMENT (${formatMoney(paymentSession?.amount ?? orderTotal)} CAD)
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Security trust badges */}
                  <View style={styles.securityBadgesGrid}>
                    <View style={styles.securityBadgeItem}>
                      <ShieldCheck size={16} color="#059669" />
                      <Text style={styles.securityBadgeText}>
                        Zero card data touches Pharsyde servers
                      </Text>
                    </View>
                    <View style={styles.securityBadgeItem}>
                      <Lock size={16} color="#059669" />
                      <Text style={styles.securityBadgeText}>
                        Direct Bank TLS 1.3 256-bit Encryption
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════
              STAGE 3: ORDER CONFIRMED / SUCCESS ("ORDER CONFIRMED")
             ══════════════════════════════════════════════════════════ */}
          {stage === 'success' && (
            <View style={styles.stageContainer}>
              <View style={styles.successCard}>
                {/* Checkmark icon badge */}
                <View style={styles.successIconBadge}>
                  <CheckCircle2 size={36} color={ACCENT_GREEN} strokeWidth={2.5} />
                </View>

                <Text style={styles.successSubtitle}>
                  ORDER CONFIRMED • MONERIS VERIFIED • MANITOBA COMPLIANT
                </Text>

                <Text style={styles.successOrderNumber}>
                  ORDER #{confirmedOrder?.order_number || 'PHR-SUCCESS'}
                </Text>

                <Text style={styles.successMessage}>
                  Thank you for shopping with Pharsyde! Your order has been placed and synchronized with our fulfillment system.
                </Text>

                {/* Receipt Details Box */}
                <View style={styles.receiptBox}>
                  <View style={styles.receiptRow}>
                    <View style={styles.receiptRowLeft}>
                      <Store size={15} color={MUTED} />
                      <Text style={styles.receiptLabel}>Fulfillment Mode:</Text>
                    </View>
                    <Text style={styles.receiptValue}>
                      {confirmedOrder?.fulfillment_type === 'delivery'
                        ? 'Winnipeg Age-Verified Courier'
                        : 'In-Store Pickup (117 Regent Ave W)'}
                    </Text>
                  </View>

                  <View style={styles.receiptRow}>
                    <View style={styles.receiptRowLeft}>
                      <Receipt size={15} color={MUTED} />
                      <Text style={styles.receiptLabel}>Payment Status:</Text>
                    </View>
                    <Text style={styles.receiptValueGreen}>
                      {confirmedOrder?.payment_method === 'INTERAC'
                        ? 'Interac e-Transfer (Instructions Sent)'
                        : 'Credit Card (Moneris Verified)'}
                    </Text>
                  </View>

                  <View style={styles.receiptRow}>
                    <View style={styles.receiptRowLeft}>
                      <Text style={styles.receiptLabel}>Total Paid:</Text>
                    </View>
                    <Text style={styles.receiptTotalPaid}>
                      ${formatMoney(confirmedOrder?.total ?? orderTotal)} CAD
                    </Text>
                  </View>

                  {/* 19+ Photo ID Reminder */}
                  <View style={styles.idRequirementBox}>
                    <ShieldCheck size={18} color="#059669" />
                    <Text style={styles.idRequirementText}>
                      <Text style={styles.boldText}>19+ Photo ID Required:</Text> Under Manitoba LGCA regulations, physical government-issued photo ID matching your order name must be presented upon pickup or delivery.
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.successActionsCol}>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleContinueShopping}
                    activeOpacity={0.85}>
                    <View style={styles.btnRow}>
                      <Package size={18} color="#0F172A" />
                      <Text style={styles.primaryButtonText}>CONTINUE SHOPPING</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleViewOrderHistory}
                    activeOpacity={0.85}>
                    <View style={styles.btnRow}>
                      <Receipt size={18} color={TEXT} />
                      <Text style={styles.secondaryButtonText}>VIEW ORDER HISTORY</Text>
                      <ArrowRight size={16} color={TEXT} />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </Modal>

    {/* Full-Screen Big Image Preview Modal (Big image only and close icon) */}
    <Modal
      visible={isImageViewerOpen}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setIsImageViewerOpen(false)}
      statusBarTranslucent={true}>
      <View style={styles.bigImageModalOverlay}>
        <SafeAreaView style={styles.bigImageSafeArea} edges={['top', 'bottom', 'left', 'right']}>
          {/* Top Right Close Icon */}
          <View style={styles.bigImageHeader}>
            <TouchableOpacity
              style={styles.bigImageCloseBtn}
              onPress={() => setIsImageViewerOpen(false)}
              activeOpacity={0.8}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
              accessibilityLabel="Close big image preview">
              <X size={26} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>

          {/* Big Image Only */}
          <TouchableOpacity
            activeOpacity={1}
            style={styles.bigImageContainer}
            onPress={() => setIsImageViewerOpen(false)}>
            <Image
              source={{ uri: localDocUri || formData.govIdUrl || '' }}
              style={styles.bigImageOnly}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: '#FFFFFF',
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyNavPlaceholder: {
    width: 60,
  },
  securityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  securityPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  stageContainer: {
    gap: 16,
  },
  pageHeader: {
    marginBottom: 4,
  },
  badgeSubtitle: {
    fontSize: 11,
    fontWeight: '900',
    color: ACCENT_GREEN,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: TEXT,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  pageSubDescription: {
    fontSize: 12,
    color: MUTED,
    marginTop: 4,
  },
  pageSubAmount: {
    fontSize: 14,
    color: MUTED,
    marginTop: 6,
    fontWeight: '600',
  },
  boldAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: TEXT,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 11,
    color: TEXT,
    fontWeight: '600',
  },
  guestCalloutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  guestCalloutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  guestCalloutIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestCalloutText: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  guestCalloutBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  guestSignInBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestSignInBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorTextCol: {
    flex: 1,
  },
  errorTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: ERROR_RED,
    marginBottom: 2,
  },
  errorBoxText: {
    fontSize: 12,
    color: ERROR_RED,
    fontWeight: '500',
    lineHeight: 16,
  },
  sectionCard: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deliveryFieldsBox: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: TEXT,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  fulfillmentOptions: {
    gap: 10,
  },
  fulfillmentOption: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  fulfillmentOptionActive: {
    borderColor: ACCENT_GREEN,
    backgroundColor: '#EFF6FF',
  },
  fulfillmentTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  fulfillmentLeftCol: {
    flex: 1,
    gap: 4,
  },
  fulfillmentLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fulfillmentLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: TEXT,
  },
  fulfillmentSubtext: {
    fontSize: 11,
    color: MUTED,
    lineHeight: 15,
  },
  fulfillmentHighlightGreen: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1D4ED8',
    marginTop: 2,
  },
  fulfillmentHighlightOrange: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EA580C',
    marginTop: 2,
  },
  inputGroup: {
    gap: 6,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputHalf: {
    flex: 1,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    height: 46,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 13,
    color: TEXT,
  },
  inputError: {
    borderColor: ERROR_RED,
    backgroundColor: '#FEF2F2',
  },
  inputDisabled: {
    backgroundColor: '#F1F5F9',
    color: '#64748B',
  },
  fieldErrorText: {
    fontSize: 10,
    fontWeight: '700',
    color: ERROR_RED,
  },
  fieldHint: {
    fontSize: 10,
    color: MUTED,
  },

  // Government-Approved ID Attachment Styles (Matches Web CheckoutPage.jsx)
  govIdContainer: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 10,
  },
  govIdHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  govIdHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  govIdTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  govIdOptionalBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  govIdOptionalText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  govIdSubtitle: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  uploadDottedBox: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadDottedBoxDisabled: {
    opacity: 0.6,
  },
  uploadLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadLoadingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  uploadIdleCol: {
    alignItems: 'center',
    gap: 4,
  },
  uploadCloudIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  uploadClickText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  uploadHintText: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 1,
  },
  govIdErrorText: {
    fontSize: 11,
    color: ERROR_RED,
    fontWeight: '600',
    marginTop: 4,
  },

  // Image Preview & Thumbnail Styles (Gov ID)
  imagePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 16,
    padding: 12,
    gap: 12,
  },
  thumbnailWrapper: {
    position: 'relative',
    paddingTop: 6,
    paddingRight: 6,
  },
  thumbnailTouch: {
    width: 76,
    height: 76,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    borderWidth: 1.5,
    borderColor: '#93C5FD',
  },
  smallImageThumbnail: {
    width: '100%',
    height: '100%',
  },
  smallImageIconBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderRadius: 6,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailCloseBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 6,
    zIndex: 20,
  },
  imageDocMetaCol: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
  },
  imageDocStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  imageDocStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tapToViewText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    textDecorationLine: 'underline',
    marginTop: 2,
  },

  // Big Image Viewer Modal (Big image only and close icon)
  bigImageModalOverlay: {
    flex: 1,
    backgroundColor: '#000000',
  },
  bigImageSafeArea: {
    flex: 1,
  },
  bigImageHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    zIndex: 20,
  },
  bigImageCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  bigImageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  bigImageOnly: {
    width: '100%',
    height: '100%',
  },

  uploadedDocCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 10,
  },
  uploadedDocLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  uploadedDocIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadedDocInfo: {
    flex: 1,
  },
  uploadedDocName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  uploadedDocMeta: {
    fontSize: 10,
    color: '#1D4ED8',
    marginTop: 2,
    fontWeight: '500',
  },
  uploadedDocActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewDocBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  previewDocBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  removeDocBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMethodList: {
    gap: 10,
  },
  paymentOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paymentOptionCardActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#3B82F6',
    borderWidth: 1.5,
  },
  paymentOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  paymentOptionInfo: {
    flex: 1,
  },
  paymentOptionName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  paymentOptionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  paymentRadioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  paymentRadioOuterActive: {
    borderColor: '#0166dc',
  },
  paymentRadioInnerActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0166dc',
  },
  monerisHostedNotice: {
    marginTop: 4,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    gap: 6,
  },
  monerisHostedNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monerisHostedNoticeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  monerisHostedNoticeText: {
    fontSize: 11,
    color: '#1D4ED8',
    lineHeight: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 4,
  },
  checkboxRowError: {
    backgroundColor: '#FEF2F2',
    padding: 6,
    borderRadius: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    borderColor: ACCENT_LIME,
    backgroundColor: ACCENT_LIME,
  },
  checkboxText: {
    flex: 1,
    fontSize: 11,
    color: TEXT,
    lineHeight: 16,
  },
  boldText: {
    fontWeight: '800',
    color: TEXT,
  },
  orderItemsList: {
    gap: 6,
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderItemName: {
    flex: 1,
    fontSize: 12,
    color: TEXT,
    fontWeight: '600',
    marginRight: 8,
  },
  orderItemPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: MUTED,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT,
  },
  discountLabel: {
    fontSize: 12,
    color: ACCENT_GREEN,
    fontWeight: '700',
  },
  discountValue: {
    fontSize: 12,
    fontWeight: '700',
    color: ACCENT_GREEN,
  },
  summaryTotalRow: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  summaryTotalLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: TEXT,
    textTransform: 'uppercase',
  },
  summaryTotalValue: {
    fontSize: 16,
    fontWeight: '900',
    color: ACCENT_GREEN,
  },
  primaryButton: {
    height: 52,
    backgroundColor: ACCENT_LIME,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryButton: {
    height: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: TEXT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bottomTrustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 4,
  },
  bottomTrustText: {
    fontSize: 10,
    color: MUTED,
    fontWeight: '600',
    textAlign: 'center',
  },

  /* ── Stage 2 styles ── */
  sandboxCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 12,
  },
  sandboxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  sandboxPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  sandboxPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
  },
  sandboxTicketText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: MUTED,
    fontWeight: '700',
  },
  sandboxDesc: {
    fontSize: 11,
    color: TEXT,
    lineHeight: 16,
  },
  sandboxPresetsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: MUTED,
    textTransform: 'uppercase',
  },
  testCardsRow: {
    gap: 8,
  },
  testCardBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  testCardBoxActive: {
    borderColor: ACCENT_GREEN,
    backgroundColor: '#EFF6FF',
  },
  testCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  testCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: TEXT,
    flex: 1,
  },
  testCardApproved: {
    fontSize: 9,
    fontWeight: '900',
    color: '#1D4ED8',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  testCardNumber: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: TEXT,
  },
  testCardMeta: {
    fontSize: 10,
    color: MUTED,
  },
  finalizingBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  finalizingTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: TEXT,
    textTransform: 'uppercase',
  },
  finalizingSub: {
    fontSize: 12,
    color: MUTED,
    textAlign: 'center',
    maxWidth: 260,
  },
  finalizingWarning: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 6,
  },
  securityBadgesGrid: {
    gap: 8,
    paddingTop: 8,
  },
  securityBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  securityBadgeText: {
    fontSize: 11,
    color: MUTED,
    fontWeight: '500',
  },

  /* ── Stage 3 styles ── */
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 24,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  successIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successSubtitle: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: ACCENT_GREEN,
    letterSpacing: 1.5,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  successOrderNumber: {
    fontSize: 26,
    fontWeight: '900',
    color: TEXT,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  successMessage: {
    fontSize: 12,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 320,
  },
  receiptBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 12,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  receiptRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  receiptLabel: {
    fontSize: 11,
    color: MUTED,
    fontWeight: '600',
  },
  receiptValue: {
    fontSize: 11,
    fontWeight: '800',
    color: TEXT,
    textTransform: 'uppercase',
    maxWidth: 180,
    textAlign: 'right',
  },
  receiptValueGreen: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    textTransform: 'uppercase',
  },
  receiptTotalPaid: {
    fontSize: 15,
    fontWeight: '900',
    color: ACCENT_GREEN,
  },
  idRequirementBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 10,
  },
  idRequirementText: {
    flex: 1,
    fontSize: 10,
    color: '#065F46',
    lineHeight: 14,
  },
  successActionsCol: {
    width: '100%',
    gap: 10,
    paddingTop: 8,
  },
  // ── TechPOS Loyalty / Reward Tokens Styles ──
  rewardTokensCard: {
    backgroundColor: '#FFFDF5',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  rewardTokensHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardTokensLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  rewardIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardTokensTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  memberPill: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  memberPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  rewardTokensSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  rewardTokensRight: {
    alignItems: 'flex-end',
  },
  rewardTokensPointsText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#78350F',
  },
  rewardTokensCadText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 1,
  },
  rewardRedeemOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
  },
  rewardRedeemOptionActive: {
    borderColor: '#D97706',
    backgroundColor: '#FFFBEB',
  },
  checkboxSquare: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginTop: 2,
  },
  checkboxSquareChecked: {
    backgroundColor: '#3B82F6',
    borderColor: '#0166dc',
  },
  rewardRedeemTextCol: {
    flex: 1,
  },
  rewardRedeemTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  rewardRedeemSub: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0166dc',
    marginTop: 2,
  },
  rewardNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  rewardNoticeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardNoticeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D97706',
  },
  rewardNoticeText: {
    fontSize: 11,
    color: '#78350F',
  },
  earnBadge: {
    backgroundColor: '#FDE68A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  earnBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
  },
  signInLinkText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
    textDecorationLine: 'underline',
  },
  rewardSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardAvailTag: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  rewardDiscountActive: {
    color: '#0166dc',
    fontWeight: '800',
  },
  rewardDiscountZero: {
    color: '#64748B',
  },
  // ── Existing Account Detection Alert Styles (Matches Web Screenshot) ──
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkingEmailText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  inputWarning: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  existingAccountBanner: {
    marginTop: 10,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  existingAccountLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertIcon: {
    marginTop: 1,
    flexShrink: 0,
  },
  existingAccountText: {
    flex: 1,
    fontSize: 11,
    color: '#92400E',
    lineHeight: 16,
  },
  existingAccountEmailBold: {
    fontWeight: '900',
    color: '#78350F',
  },
  existingAccountLoginBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  existingAccountLoginText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
