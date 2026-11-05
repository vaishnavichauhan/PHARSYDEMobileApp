import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ShieldCheck,
  Compass,
  FileText,
  PhoneCall,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  RotateCcw,
  ShieldAlert,
  Clock,
  UserCheck,
  MapPin,
  Phone,
  Mail,
  Send,
  CheckCircle2,
  AlertTriangle,
  Store,
  Sparkles,
  Crown,
  HelpCircle,
  Smartphone,
  ArrowDownCircle,
} from 'lucide-react-native';
import { useMenuStore, MenuPage } from '../store/menuStore';
import { useCuratedStore } from '../store/curatedStore';
import { useAppUpdateStore } from '../store/appUpdateStore';

const STORE_INFO = {
  name: 'Pharsyde Cannabis',
  address: '117 Regent Ave W, Winnipeg, MB R2C 1R1',
  phone: '(204) 222-4753',
  phoneRaw: '+12042224753',
  email: 'pharsydecannabis@gmail.com',
  province: 'Manitoba',
  legalAge: 19,
  hours: [
    { days: 'Monday – Friday', time: '7:00 AM – 10:00 PM' },
    { days: 'Saturday', time: '8:00 AM – 10:00 PM' },
    { days: 'Sunday', time: '9:00 AM – 9:00 PM' },
  ],
};

const MenuScreen = () => {
  const activePage = useMenuStore(state => state.activePage);
  const setActivePage = useMenuStore(state => state.setActivePage);
  const expandedPolicies = useMenuStore(state => state.expandedPolicies);
  const togglePolicy = useMenuStore(state => state.togglePolicy);

  // Contact form state from Zustand
  const contactForm = useMenuStore(state => state.contactForm);
  const isSubmittingContact = useMenuStore(state => state.isSubmittingContact);
  const contactSubmitted = useMenuStore(state => state.contactSubmitted);
  const setContactField = useMenuStore(state => state.setContactField);
  const submitContactForm = useMenuStore(state => state.submitContactForm);
  const resetContactForm = useMenuStore(state => state.resetContactForm);

  // Curated Collections (New Arrivals & Best Sellers)
  const openCuratedModal = useCuratedStore(state => state.openCuratedModal);
  const newArrivals = useCuratedStore(state => state.newArrivals);
  const bestSellers = useCuratedStore(state => state.bestSellers);

  // App Version & Update State
  const cleanCurrentVersion = useAppUpdateStore(state => state.cleanCurrentVersion);
  const latestVersion = useAppUpdateStore(state => state.latestVersion);
  const updateRequired = useAppUpdateStore(state => state.updateRequired);
  const updateStatus = useAppUpdateStore(state => state.status);
  const checkForUpdates = useAppUpdateStore(state => state.checkForUpdates);
  const performUpdate = useAppUpdateStore(state => state.performUpdate);

  const handleCall = () => {
    Linking.openURL(`tel:${STORE_INFO.phoneRaw}`).catch(() => {
      Alert.alert('Phone', `Call ${STORE_INFO.phone}`);
    });
  };

  const handleEmail = () => {
    Linking.openURL(`mailto:${STORE_INFO.email}`).catch(() => {
      Alert.alert('Email', `Write to ${STORE_INFO.email}`);
    });
  };

  const handleContactSubmit = async () => {
    if (!contactForm.name.trim()) {
      Alert.alert('Required', 'Please enter your full name');
      return;
    }
    if (!contactForm.email.trim() || !contactForm.email.includes('@')) {
      Alert.alert('Required', 'Please enter a valid email address');
      return;
    }
    if (!contactForm.message.trim() || contactForm.message.length < 6) {
      Alert.alert('Required', 'Please write a message of at least 6 characters');
      return;
    }

    const success = await submitContactForm();
    if (success) {
      Alert.alert('Message Sent', 'Thank you! Our Winnipeg team will respond shortly.');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // SUBPAGE 1: Policies & Protection (with 4 Collapsible Cards)
  // ─────────────────────────────────────────────────────────────
  const renderPoliciesPage = () => {
    const policiesList = [
      {
        id: 'return_policy',
        title: 'Return, Exchange & Warranty Policy',
        badge: '7-DAY WARRANTY',
        badgeColor: '#3B82F6',
        icon: RotateCcw,
        content: (
          <View style={styles.policyBody}>
            <Text style={styles.policyBodyText}>
              Pharsyde is dedicated to providing authentic craft products and transparent service. Eligible non-cannabis hardware and lifestyle goods carry a 7-day store warranty against manufacturer defects.
            </Text>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>7-Day Store Warranty: </Text>
                Eligible electronic vape batteries (e.g., 510 thread batteries, closed pod batteries) are covered for 7 days against internal manufacturer and electrical defects.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Accessories: </Text>
                Unopened, sealed non-cannabis items (grinders, glassware, apparel) may be returned within 7 days in brand-new factory packaging with original receipt.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>In-Store Inspection: </Text>
                For safety compliance, all diagnostic testing and hardware warranty exchanges must be conducted in person at our physical store (117 Regent Ave W, Winnipeg).
              </Text>
            </View>
          </View>
        ),
      },
      {
        id: 'cannabis_recalls',
        title: 'Cannabis Final Sale & Recalls',
        badge: 'FINAL SALE',
        badgeColor: '#F97316',
        icon: ShieldAlert,
        content: (
          <View style={styles.policyBody}>
            <Text style={styles.policyBodyText}>
              In accordance with federal (Health Canada) and Manitoba provincial legislation governing controlled substances:
            </Text>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Strictly Final Sale: </Text>
                All cannabis products—including dried flower, pre-rolls, cartridges, concentrates, edibles, and seeds—are strictly FINAL SALE once handed over to the customer or courier.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Health Canada Recalls: </Text>
                In the rare event of an official manufacturer or Health Canada safety recall, Pharsyde will promptly coordinate an exchange or full refund. Retain your original packaging with lot number and excise stamp intact.
              </Text>
            </View>
          </View>
        ),
      },
      {
        id: 'vape_protocol',
        title: '24-Hour Vape Concern Protocol',
        badge: '24 HOURS',
        badgeColor: '#F97316',
        icon: Clock,
        content: (
          <View style={styles.policyBody}>
            <Text style={styles.policyBodyText}>
              Because disposable vape devices are single-use sealed hardware units, specific expedited protocols apply:
            </Text>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>24-Hour Notification: </Text>
                Any issues regarding Dead-on-Arrival (DOA) units, auto-firing, or unsealed leaking packaging must be reported to Pharsyde within 24 hours of receipt.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Physical Inspection: </Text>
                The unit must be returned to our Winnipeg storefront with original packaging. Units with depleted e-liquid or evidence of physical drops or water damage are ineligible for replacement.
              </Text>
            </View>
          </View>
        ),
      },
      {
        id: 'age_verification',
        title: 'Age & Identity Verification Rules',
        badge: '19+ MANDATORY',
        badgeColor: '#3B82F6',
        icon: UserCheck,
        content: (
          <View style={styles.policyBody}>
            <Text style={styles.policyBodyText}>
              Pharsyde operates under the strict regulatory oversight of the Liquor, Gaming and Cannabis Authority of Manitoba (LGCA).
            </Text>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Minimum Age: </Text>
                You must be 19 years of age or older to enter our dispensary, order online, or accept deliveries in Manitoba.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Photo ID Required: </Text>
                A valid physical government-issued photo ID (Driver's License, Passport, Canadian Citizenship Card) is verified upon delivery and pickup. Expired IDs, photos on phones, or photocopies are strictly refused.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Failed Verification: </Text>
                Orders where the recipient cannot present valid 19+ ID will be cancelled and returned to store, subject to courier and restocking fees.
              </Text>
            </View>
          </View>
        ),
      },
    ];

    return (
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.subpageScroll}
        keyboardShouldPersistTaps="handled">
        <View style={styles.pageHeaderBanner}>
          <Text style={styles.pageTag}>CONSUMER PROTECTION</Text>
          <Text style={styles.pageTitle}>Policies & Protection</Text>
          <Text style={styles.pageSubtitle}>
            Review our official warranty, cannabis compliance, and exchange protocols below. Tap any section to view details.
          </Text>
        </View>

        {/* Accordion Cards */}
        <View style={styles.accordionContainer}>
          {policiesList.map((item, index) => {
            const isExpanded = !!expandedPolicies[item.id];
            const Icon = item.icon;

            return (
              <View key={item.id} style={styles.collapsibleCard}>
                {/* Accordion Header */}
                <TouchableOpacity
                  style={[
                    styles.collapsibleHeader,
                    isExpanded && styles.collapsibleHeaderActive,
                  ]}
                  onPress={() => togglePolicy(item.id)}
                  activeOpacity={0.8}>
                  <View style={styles.collapsibleLeft}>
                    <View
                      style={[
                        styles.policyIconCircle,
                        isExpanded && styles.policyIconCircleActive,
                      ]}>
                      <Icon
                        size={20}
                        color={isExpanded ? '#3B82F6' : '#FFFFFF'}
                        strokeWidth={2}
                      />
                    </View>
                    <View style={styles.policyTitleWrap}>
                      <View style={styles.policyRowTop}>
                        <Text style={styles.policyIndexText}>0{index + 1}</Text>
                        <View
                          style={[
                            styles.policyBadge,
                            { borderColor: item.badgeColor },
                          ]}>
                          <Text
                            style={[
                              styles.policyBadgeText,
                              { color: item.badgeColor },
                            ]}>
                            {item.badge}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.collapsibleTitle}>{item.title}</Text>
                    </View>
                  </View>

                  <View style={styles.chevronWrap}>
                    {isExpanded ? (
                      <ChevronUp size={20} color="#0166dc" />
                    ) : (
                      <ChevronDown size={20} color="#64748B" />
                    )}
                  </View>
                </TouchableOpacity>

                {/* Collapsible Content */}
                {isExpanded && item.content}
              </View>
            );
          })}
        </View>

        {/* Quick Assistance Box */}
        <View style={styles.helpBox}>
          <HelpCircle size={28} color="#0166dc" style={{ marginBottom: 8 }} />
          <Text style={styles.helpBoxTitle}>Need Warranty Assistance?</Text>
          <Text style={styles.helpBoxSub}>
            Bring your device and receipt to our Winnipeg location or call our team for technician advice.
          </Text>
          <TouchableOpacity style={styles.helpCallBtn} onPress={handleCall} activeOpacity={0.85}>
            <Phone size={16} color="#0F172A" />
            <Text style={styles.helpCallBtnText}>Call {STORE_INFO.phone}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };



  // ─────────────────────────────────────────────────────────────
  // SUBPAGE 3: Terms & Conditions
  // ─────────────────────────────────────────────────────────────
  const renderTermsPage = () => {
    return (
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.subpageScroll}
        keyboardShouldPersistTaps="handled">
        <View style={styles.pageHeaderBanner}>
          <Text style={styles.pageTag}>LEGAL AGREEMENT</Text>
          <Text style={styles.pageTitle}>Terms & Conditions</Text>
          <Text style={styles.pageSubtitle}>
            Please review the legal terms governing use of Pharsyde mobile app and retail services.
          </Text>
        </View>

        <View style={styles.termsCard}>
          <Text style={styles.termsHeading}>1. Age & Legal Eligibility</Text>
          <Text style={styles.termsText}>
            By accessing this mobile application, placing orders, or visiting Pharsyde storefront, you certify that you are at least 19 years old (or the legal age of your applicable province). We strictly prohibit minors from accessing regulated products.
          </Text>

          <Text style={styles.termsHeading}>2. Regulated Goods & Final Sale</Text>
          <Text style={styles.termsText}>
            All cannabis sales are regulated under the Manitoba Liquor, Gaming and Cannabis Authority (LGCA). Under provincial statute, all cannabis flower, pre-rolls, extracts, and edibles are strictly final sale.
          </Text>

          <Text style={styles.termsHeading}>3. Delivery & Courier Protocol</Text>
          <Text style={styles.termsText}>
            Local deliveries are completed via licensed, age-verified bonded couriers. The recipient must be 19+ and present valid physical government-issued photo ID matching the order cardholder.
          </Text>

          <Text style={styles.termsHeading}>4. Possession Limits</Text>
          <Text style={styles.termsText}>
            Per Canadian federal law, public possession of recreational cannabis is legally capped at 30 grams of dried cannabis equivalent per adult at any one time.
          </Text>

          <Text style={styles.termsHeading}>5. Privacy & Data Protection</Text>
          <Text style={styles.termsText}>
            Customer information is collected solely for fulfillment, legal age verification, and compliance logging. We never sell personal information to third-party brokers.
          </Text>
        </View>
      </ScrollView>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // SUBPAGE 4: Contact Us
  // ─────────────────────────────────────────────────────────────
  const renderContactPage = () => {
    return (
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.subpageScroll}
        keyboardShouldPersistTaps="handled">
        <View style={styles.pageHeaderBanner}>
          <Text style={styles.pageTag}>CUSTOMER SUPPORT</Text>
          <Text style={styles.pageTitle}>Get In Touch</Text>
          <Text style={styles.pageSubtitle}>
            Have questions about an order, hardware diagnostics, or product availability? Reach our Winnipeg team directly.
          </Text>
        </View>

        {/* Quick Action Buttons */}
        <View style={styles.contactActionsRow}>
          <TouchableOpacity style={styles.contactActionBtn} onPress={handleCall} activeOpacity={0.8}>
            <Phone size={18} color="#0166dc" />
            <Text style={styles.contactActionText}>Call Store</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactActionBtn} onPress={handleEmail} activeOpacity={0.8}>
            <Mail size={18} color="#0166dc" />
            <Text style={styles.contactActionText}>Email Us</Text>
          </TouchableOpacity>
        </View>

        {/* Store Info Card */}
        <View style={styles.storeDetailsCard}>
          <View style={styles.infoRow}>
            <MapPin size={20} color="#0166dc" style={styles.infoIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Dispensary Address</Text>
              <Text style={styles.infoValue}>{STORE_INFO.address}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Phone size={20} color="#0166dc" style={styles.infoIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Telephone</Text>
              <Text style={styles.infoValue}>{STORE_INFO.phone}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Mail size={20} color="#0166dc" style={styles.infoIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Direct Email</Text>
              <Text style={styles.infoValue}>{STORE_INFO.email}</Text>
            </View>
          </View>
        </View>

        {/* Contact Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Send a Message</Text>
          <Text style={styles.formSub}>Our team usually replies within a few business hours.</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Alex Henderson"
              placeholderTextColor="#94A3B8"
              value={contactForm.name}
              onChangeText={t => setContactField('name', t)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="alex@example.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={contactForm.email}
              onChangeText={t => setContactField('email', t)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Message *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Write your inquiry or question here..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={contactForm.message}
              onChangeText={t => setContactField('message', t)}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, isSubmittingContact && styles.submitBtnDisabled]}
            onPress={handleContactSubmit}
            disabled={isSubmittingContact}
            activeOpacity={0.85}>
            {isSubmittingContact ? (
              <ActivityIndicator size="small" color="#0F172A" />
            ) : (
              <>
                <Send size={16} color="#0F172A" />
                <Text style={styles.submitBtnText}>Submit Inquiry</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // MAIN MENU SCREEN: 4 Navigation Cards
  // ─────────────────────────────────────────────────────────────
  const renderMainMenu = () => {
    const menuItems = [
      {
        id: 'policies',
        title: 'Policies & Protection',
        desc: 'Return policies, cannabis regulations, vape protocols & age rules',
        icon: ShieldCheck,
        page: 'policies' as MenuPage,
        badge: 'Official',
      },
      {
        id: 'terms',
        title: 'Terms & Conditions',
        desc: 'Legal compliance, 19+ age restriction, courier & user agreement',
        icon: FileText,
        page: 'terms' as MenuPage,
      },
      {
        id: 'contact',
        title: 'Contact',
        desc: 'Physical address, direct phone & inquiry form',
        icon: PhoneCall,
        page: 'contact' as MenuPage,
      },
    ];

    return (
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.menuScroll}
        keyboardShouldPersistTaps="handled">
        {/* Brand Showcase Header */}
      
        {/* Curated Collections: New Arrivals & Best Sellers */}
       

        <Text style={styles.menuSectionHeader}>INFORMATION & POLICIES</Text>

        {/* 4 Requested Menu Navigation Cards */}
        <View style={styles.cardsContainer}>
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.menuCard}
                onPress={() => setActivePage(item.page)}
                activeOpacity={0.75}>
                <View style={styles.menuCardLeft}>
                  <View style={styles.menuIconContainer}>
                    <Icon size={22} color="#0166dc" strokeWidth={2} />
                  </View>
                  <View style={styles.menuCardTextContainer}>
                    <View style={styles.titleRow}>
                      <Text style={styles.menuCardTitle}>{item.title}</Text>
                      {item.badge && (
                        <View style={styles.cardBadge}>
                          <Text style={styles.cardBadgeText}>{item.badge}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.menuCardDesc} numberOfLines={2}>
                      {item.desc}
                    </Text>
                  </View>
                </View>

                {/* Right Arrow */}
                <View style={styles.arrowContainer}>
                  <ChevronRight size={20} color="#64748B" strokeWidth={2.2} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* App Version & Live Update Card */}
        <View style={styles.appVersionCard}>
          <View style={styles.appVersionHeaderRow}>
            <View style={styles.appVersionHeaderLeft}>
              <View style={styles.appVersionIconWrap}>
                <Smartphone size={20} color="#0166dc" strokeWidth={2.2} />
              </View>
              <View>
                <Text style={styles.appVersionTitle}>App Version</Text>
                <Text style={styles.appVersionSub}>
                  Installed: <Text style={styles.appVersionSubBold}>v{cleanCurrentVersion}</Text>
                </Text>
              </View>
            </View>

            {/* Status Pill Badge */}
            <View
              style={[
                styles.versionStatusPill,
                updateRequired ? styles.versionStatusPillUpdate : styles.versionStatusPillOk,
              ]}>
              {updateRequired ? (
                <ArrowDownCircle size={13} color="#DC2626" strokeWidth={2.4} />
              ) : (
                <CheckCircle2 size={13} color="#059669" strokeWidth={2.4} />
              )}
              <Text
                style={[
                  styles.versionStatusText,
                  updateRequired ? styles.versionStatusTextUpdate : styles.versionStatusTextOk,
                ]}>
                {updateRequired ? `Update: v${latestVersion}` : 'Up to Date'}
              </Text>
            </View>
          </View>

          {/* Description line */}
          <Text style={styles.appVersionDesc}>
            {updateStatus === 'checking'
              ? 'Checking backend for updates...'
              : updateRequired
              ? `A newer version (v${latestVersion}) is available on the server. Update to enjoy the latest features and fixes.`
              : `Your app is running the latest version (v${cleanCurrentVersion}). No update required.`}
          </Text>

          {/* Action Row */}
          <View style={styles.appVersionActionsRow}>
            {updateRequired ? (
              <TouchableOpacity
                style={styles.updateAppBtn}
                onPress={performUpdate}
                activeOpacity={0.85}>
                <ArrowDownCircle size={16} color="#0F172A" strokeWidth={2.4} />
                <Text style={styles.updateAppBtnText}>Update App Now</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.checkUpdateBtn, updateRequired && styles.checkUpdateBtnSecondary]}
              onPress={() => checkForUpdates(true)}
              disabled={updateStatus === 'checking'}
              activeOpacity={0.85}>
              {updateStatus === 'checking' ? (
                <ActivityIndicator size="small" color="#0F172A" />
              ) : (
                <>
                  <RotateCcw size={14} color="#0F172A" strokeWidth={2} />
                  <Text style={styles.checkUpdateBtnText}>Check for Updates</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Support Banner */}
        <View style={styles.menuFooter}>
          <Text style={styles.footerBrand}>Pharsyde Cannabis Dispensary</Text>
          <Text style={styles.footerSub}>Winnipeg, Manitoba, Canada</Text>
          <Text style={styles.footerVersion}>App Version {cleanCurrentVersion} (Build 2026)</Text>
        </View>
      </ScrollView>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // Header with Dynamic Title & Back Arrow
  // ─────────────────────────────────────────────────────────────
  const getHeaderTitle = () => {
    switch (activePage) {
      case 'policies':
        return 'Policies & Protection';
      case 'terms':
        return 'Terms & Conditions';
      case 'contact':
        return 'Contact Us';
      default:
        return 'Menu';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* ── Top Navigation Bar ─────────────────────────────────── */}
      <View style={styles.header}>
        {activePage !== 'menu' ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setActivePage('menu')}
            activeOpacity={0.7}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
            <ArrowLeft size={22} color="#0F172A" strokeWidth={2} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerPlaceholder} />
        )}

        <View style={styles.headerTitleWrap} pointerEvents="none">
          <Text style={styles.headerTitleText} numberOfLines={1}>
            {getHeaderTitle()}
          </Text>
        </View>

        <View style={styles.headerPlaceholder} />
      </View>

      {/* ── Page Content ───────────────────────────────────────── */}
      {activePage === 'menu' && renderMainMenu()}
      {activePage === 'policies' && renderPoliciesPage()}
      {activePage === 'terms' && renderTermsPage()}
      {activePage === 'contact' && renderContactPage()}
    </SafeAreaView>
  );
};

const BG = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const ACCENT = '#3B82F6';
const ACCENT_DEEP = '#0166dc';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  headerTitleWrap: {
    position: 'absolute',
    left: 56,
    right: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  headerPlaceholder: {
    width: 38,
    height: 38,
  },
  scrollView: {
    flex: 1,
  },

  /* ── Main Menu ── */
  menuScroll: {
    padding: 16,
    paddingBottom: 120,
  },
  menuBrandBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  menuBrandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: ACCENT_DEEP,
    letterSpacing: 1.5,
  },
  ageBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
    borderColor: ACCENT_DEEP,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ageBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: ACCENT_DEEP,
  },
  menuBrandSub: {
    fontSize: 12,
    color: MUTED,
    lineHeight: 16,
    marginBottom: 12,
  },
  tagChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },

  /* Menu Cards */
  cardsContainer: {
    gap: 12,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  menuCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },
  menuIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(1, 102, 220, 0.25)',
  },
  menuCardTextContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  menuCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT,
  },
  cardBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  cardBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: ACCENT_DEEP,
  },
  menuCardDesc: {
    fontSize: 11.5,
    color: MUTED,
    lineHeight: 15,
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Footer */
  menuFooter: {
    alignItems: 'center',
    marginTop: 32,
    paddingVertical: 16,
  },
  footerBrand: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 2,
  },
  footerSub: {
    fontSize: 11,
    color: MUTED,
    marginBottom: 4,
  },
  footerVersion: {
    fontSize: 10,
    color: '#94A3B8',
  },

  /* ── Subpages Common ── */
  subpageScroll: {
    padding: 16,
    paddingBottom: 150,
  },
  pageHeaderBanner: {
    marginBottom: 20,
  },
  pageTag: {
    fontSize: 11,
    fontWeight: '800',
    color: ACCENT_DEEP,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: TEXT,
    lineHeight: 30,
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 12.5,
    color: MUTED,
    lineHeight: 18,
  },

  /* ── Subpage 1: Policies Accordion ── */
  accordionContainer: {
    gap: 12,
  },
  collapsibleCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  collapsibleHeaderActive: {
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  collapsibleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  policyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  policyIconCircleActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(1, 102, 220, 0.3)',
  },
  policyTitleWrap: {
    flex: 1,
  },
  policyRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  policyIndexText: {
    fontSize: 10,
    fontWeight: '800',
    color: MUTED,
  },
  policyBadge: {
    borderWidth: 0.8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  policyBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  collapsibleTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: TEXT,
    lineHeight: 18,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  policyBody: {
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  policyBodyText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 10,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 14,
    color: ACCENT_DEEP,
    marginRight: 8,
    lineHeight: 18,
  },
  bulletText: {
    flex: 1,
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 17,
  },
  boldText: {
    color: TEXT,
    fontWeight: '700',
  },
  helpBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  helpBoxTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT,
    marginBottom: 4,
  },
  helpBoxSub: {
    fontSize: 11.5,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 14,
  },
  helpCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  helpCallBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },

  /* ── Subpage 2: About ── */
  aboutCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  aboutPillarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  aboutPillarTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: ACCENT_DEEP,
    letterSpacing: 1,
  },
  aboutBodyText: {
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 19,
    marginBottom: 10,
  },
  valuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  valueItem: {
    width: '48%',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  valueTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 4,
  },
  valueDesc: {
    fontSize: 11,
    color: MUTED,
    lineHeight: 15,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  locationTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT,
  },
  locationSub: {
    fontSize: 11,
    color: MUTED,
    marginTop: 2,
  },

  /* ── Subpage 3: Terms ── */
  termsCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
  },
  termsHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: ACCENT_DEEP,
    marginTop: 12,
    marginBottom: 6,
  },
  termsText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 8,
  },

  /* ── Subpage 4: Contact ── */
  contactActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  contactActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  contactActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT,
  },
  storeDetailsCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoLabel: {
    fontSize: 11,
    color: MUTED,
    fontWeight: '600',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    color: TEXT,
    fontWeight: '600',
  },
  hoursSection: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  hoursHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  hoursTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: TEXT,
  },
  hourItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  hourDay: {
    fontSize: 11.5,
    color: '#334155',
  },
  hourTime: {
    fontSize: 11.5,
    color: ACCENT_DEEP,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT,
    marginBottom: 4,
  },
  formSub: {
    fontSize: 11.5,
    color: MUTED,
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    height: 42,
    color: TEXT,
    fontSize: 12.5,
  },
  textArea: {
    height: 85,
    paddingTop: 10,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: 10,
    height: 44,
    marginTop: 6,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },

  // Curated Drops Section
  curatedSection: {
    marginBottom: 20,
  },
  curatedSectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  menuSectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  curatedCardsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  menuCuratedCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  menuCuratedNew: {
    backgroundColor: '#092612',
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  menuCuratedBest: {
    backgroundColor: '#261908',
    borderColor: 'rgba(245, 158, 11, 0.45)',
  },
  menuCuratedTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  menuCuratedIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCuratedBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  menuCuratedBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  menuCuratedTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  menuCuratedSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '500',
    marginBottom: 10,
  },
  menuCuratedLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  menuCuratedLinkText: {
    fontSize: 11.5,
    fontWeight: '700',
  },

  // App Version & Update Card
  appVersionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
    marginTop:10
  },
  appVersionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appVersionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  appVersionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appVersionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT,
  },
  appVersionSub: {
    fontSize: 11,
    color: MUTED,
    marginTop: 2,
  },
  appVersionSubBold: {
    fontWeight: '700',
    color: TEXT,
  },
  versionStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  versionStatusPillOk: {
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
  },
  versionStatusPillUpdate: {
    backgroundColor: '#FEE2E2',
  },
  versionStatusText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  versionStatusTextOk: {
    color: '#059669',
  },
  versionStatusTextUpdate: {
    color: '#DC2626',
  },
  appVersionDesc: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 16,
  },
  appVersionActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  updateAppBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: ACCENT,
    height: 40,
    borderRadius: 10,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  updateAppBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  checkUpdateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  checkUpdateBtnSecondary: {
    flex: 0.8,
  },
  checkUpdateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
});

export default MenuScreen;
