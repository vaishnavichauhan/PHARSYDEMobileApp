/**
 * OrderScreen – Customer Orders & Fulfillment Status
 * Strictly synchronized with customer authentication and backend MySQL orders.
 * Matches Frontend AccountOrdersPage.jsx & Manitoba LGCA regulations.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Package,
  Store,
  Truck,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Receipt,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Lock,
  ShoppingBag,
  RefreshCw,
  LogOut,
  User,
  Sparkles,
} from 'lucide-react-native';

import { useCheckoutStore, ConfirmedOrder } from '../store/checkoutStore';
import { useProfileStore } from '../store/profileStore';

const BG = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';
const ACCENT_LIME = '#3B82F6';
const ACCENT_GREEN = '#0166dc';

const formatMoney = (val: any): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0');
  return Number.isFinite(num) ? num.toFixed(2) : '0.00';
};

interface OrderScreenProps {
  navigation: any;
}

const OrderScreen: React.FC<OrderScreenProps> = ({ navigation }) => {
  const { orderHistory, loadOrderHistory } = useCheckoutStore();
  const user = useProfileStore(state => state.user);
  const isLoggedIn = useProfileStore(state => state.isLoggedIn);
  const openProfile = useProfileStore(state => state.openProfile);
  const logout = useProfileStore(state => state.logout);

  const [refreshing, setRefreshing] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'pickup' | 'delivery'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (isLoggedIn) {
      loadOrderHistory();
    }
  }, [isLoggedIn, loadOrderHistory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrderHistory();
    setRefreshing(false);
  };

  const toggleExpand = (orderNumber: string) => {
    setExpandedId(prev => (prev === orderNumber ? null : orderNumber));
  };

  const filteredOrders = orderHistory.filter(order => {
    if (filterTab === 'pickup') return order.fulfillment_type === 'pickup';
    if (filterTab === 'delivery') return order.fulfillment_type === 'delivery';
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* ── Top Header ──────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
         
          <Text style={styles.headerTitle} numberOfLines={1}>
            {isLoggedIn && user?.name
              ? `WELCOME, ${user.name.toUpperCase()}`
              : 'MY ORDERS'}
          </Text>
        </View>

        {isLoggedIn && 
          <View style={styles.headerRightActions}>
          

            <TouchableOpacity
              style={styles.signOutBtn}
              onPress={() => logout()}
              activeOpacity={0.7}>
              <LogOut size={12} color="#DC2626" />
              <Text style={styles.signOutBtnText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
       }
      </View>

      {/* ── CASE 1: NOT LOGGED IN (PROTECTED VIEW PER FRONTEND) ────── */}
      {!isLoggedIn ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContentProtected}
          showsVerticalScrollIndicator={false}>
          <View style={styles.protectedCard}>
            <View style={styles.lockIconBox}>
              <Lock size={36} color={ACCENT_GREEN} strokeWidth={2.2} />
            </View>

            <View style={styles.compliancePill}>
              <ShieldCheck size={13} color={ACCENT_GREEN} strokeWidth={2.4} />
              <Text style={styles.compliancePillText}>Customer Account Required</Text>
            </View>

            <Text style={styles.protectedHeading}>Sign In to View Orders</Text>
            <Text style={styles.protectedDesc}>
              Please sign in with your Pharsyde customer account to access your orders, track live fulfillment, and view itemized receipts.
            </Text>

            <View style={styles.protectedActions}>
              <TouchableOpacity
                style={styles.primaryAuthBtn}
                activeOpacity={0.85}
                onPress={() => openProfile('login')}>
                <User size={15} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={styles.primaryAuthBtnText}>SIGN IN TO YOUR ACCOUNT</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryAuthBtn}
                activeOpacity={0.8}
                onPress={() => openProfile('register')}>
                <Text style={styles.secondaryAuthBtnText}>CREATE NEW ACCOUNT</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.exploreCatalogLink}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Home')}>
              <Text style={styles.exploreCatalogLinkText}>Browse Products Catalogue</Text>
              <ArrowRight size={14} color={ACCENT_GREEN} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        /* ── CASE 2: LOGGED IN (CUSTOMER ACCOUNT & ORDERS VIEW) ──── */
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={ACCENT_GREEN}
            />
          }>
          {/* ── TechPOS Loyalty & Rewards Card (Matches AccountOrdersPage.jsx) ── */}
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
                  Earn 1 point per $1 CAD spent. Redeem 1,000 points for $1.00 CAD instant discount at checkout.
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

              <View style={[styles.rewardsBalanceCol, styles.rewardsDollarBorder]}>
                <Text style={styles.rewardsBalanceLabel}>DISCOUNT VALUE</Text>
                <Text style={styles.rewardsDiscountText}>
                  ${(
                    Number(user?.reward_points_dollar_value) > 0
                      ? Number(user?.reward_points_dollar_value)
                      : (Number(user?.reward_points) || 0) * 0.001
                  ).toFixed(3)} CAD
                </Text>
                <Text style={styles.rewardsRateText}>1,000 pts = $1 CAD</Text>
              </View>
            </View>
          </View>

          {/* ── 4 Stats Summary Cards (Matching User Screenshot Exactly) ── */}
          <View style={styles.statsCardsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>TOTAL ORDERS</Text>
              <Text style={styles.statValueLarge}>{orderHistory.length}</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>CUSTOMER NAME</Text>
              <Text style={styles.statValue} numberOfLines={1}>
                {user?.name || 'Member'}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>ACCOUNT EMAIL</Text>
              <Text style={styles.statValueSmall} numberOfLines={1}>
                {user?.email || 'customer@pharsyde.ca'}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>COMPLIANCE STATUS</Text>
              <View style={styles.statComplianceRow}>
                <ShieldCheck size={13} color={ACCENT_GREEN} strokeWidth={2.4} />
                <Text style={styles.statComplianceText}>19+ Verified</Text>
              </View>
            </View>
          </View>

          {/* ── Filter Tabs & Header ── */}
          <View style={styles.filterTabsRow}>
            <TouchableOpacity
              style={[styles.filterTab, filterTab === 'all' && styles.filterTabActive]}
              onPress={() => setFilterTab('all')}>
              <Text
                style={[
                  styles.filterTabText,
                  filterTab === 'all' && styles.filterTabTextActive,
                ]}>
                All Orders ({orderHistory.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterTab, filterTab === 'pickup' && styles.filterTabActive]}
              onPress={() => setFilterTab('pickup')}>
              <Store size={13} color={filterTab === 'pickup' ? '#0F172A' : MUTED} />
              <Text
                style={[
                  styles.filterTabText,
                  filterTab === 'pickup' && styles.filterTabTextActive,
                ]}>
                Pickup
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterTab, filterTab === 'delivery' && styles.filterTabActive]}
              onPress={() => setFilterTab('delivery')}>
              <Truck size={13} color={filterTab === 'delivery' ? '#0F172A' : MUTED} />
              <Text
                style={[
                  styles.filterTabText,
                  filterTab === 'delivery' && styles.filterTabTextActive,
                ]}>
                Courier Delivery
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Empty State (Matching User's Screenshot Exactly) ── */}
          {filteredOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <ShoppingBag size={34} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>NO RECENT ORDERS FOUND</Text>
              <Text style={styles.emptySubtitle}>
                You haven&apos;t placed any orders yet. Discover our curated collection of craft cannabis.
              </Text>
              <TouchableOpacity
                style={styles.exploreBtn}
                onPress={() => navigation.navigate('Home')}
                activeOpacity={0.85}>
                <Text style={styles.exploreBtnText}>BROWSE CATALOGUE</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ── Authenticated Orders List ─────────────────────────── */
            <View style={styles.ordersList}>
              {filteredOrders.map(order => {
                const isExpanded = expandedId === (order.order_number || String(order.id));
                const orderKey = order.order_number || `ORD-${order.id}`;
                const isDelivery = order.fulfillment_type === 'delivery';

                return (
                  <View key={orderKey} style={styles.orderCard}>
                    {/* Header */}
                    <TouchableOpacity
                      style={styles.cardHeader}
                      onPress={() => toggleExpand(orderKey)}
                      activeOpacity={0.8}>
                      {/* Top Row: Order # + Status on left, Chevron on right */}
                      <View style={styles.cardHeaderTop}>
                        <View style={styles.orderNumberRow}>
                          <Text style={styles.orderNumber}>
                            ORDER #{order.order_number || orderKey}
                          </Text>
                          <View style={styles.statusBadge}>
                            <CheckCircle2 size={11} color="#059669" />
                            <Text style={styles.statusBadgeText}>
                              {order.order_status?.toUpperCase() ||
                                (order.payment_status === 'approved' ? 'CONFIRMED' : 'PROCESSING')}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.chevronBox}>
                          {isExpanded ? (
                            <ChevronUp size={16} color={MUTED} />
                          ) : (
                            <ChevronDown size={16} color={MUTED} />
                          )}
                        </View>
                      </View>

                      {/* Bottom Row: Order Total on left, Date & Fulfillment on right */}
                      <View style={styles.cardHeaderBottom}>
                        <Text style={styles.orderTotal}>
                          ${formatMoney(order.total || order.subtotal)} CAD
                        </Text>

                        <View style={styles.metaRow}>
                          <Text style={styles.orderDate}>
                            {order.created_at
                              ? new Date(order.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : 'Recently'}
                          </Text>
                          <Text style={styles.metaDot}>•</Text>
                          <View style={styles.fulfillmentRow}>
                            {isDelivery ? (
                              <>
                                <Truck size={12} color={MUTED} />
                                <Text style={styles.fulfillmentText}>Winnipeg Courier</Text>
                              </>
                            ) : (
                              <>
                                <Store size={12} color={MUTED} />
                                <Text style={styles.fulfillmentText}>In-Store Pickup</Text>
                              </>
                            )}
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* Expandable Order Details */}
                    {isExpanded && (
                      <View style={styles.expandedContent}>
                        {/* Fulfillment Destination Banner */}
                        <View style={styles.addressBanner}>
                          {isDelivery ? (
                            <>
                              <View style={styles.addressIconWrap}>
                                <Truck size={15} color={ACCENT_GREEN} />
                              </View>
                              <View style={styles.addressTextWrap}>
                                <Text style={styles.addressTitle}>Winnipeg Local Courier Delivery</Text>
                                <Text style={styles.addressBody}>
                                  {order.address
                                    ? `${order.address}, ${order.city || 'Winnipeg'}, MB ${order.postal_code || ''}`
                                    : 'Delivery address on record'}
                                </Text>
                              </View>
                            </>
                          ) : (
                            <>
                              <View style={styles.addressIconWrap}>
                                <Store size={15} color={ACCENT_GREEN} />
                              </View>
                              <View style={styles.addressTextWrap}>
                                <Text style={styles.addressTitle}>Pharsyde In-Store Boutique Pickup</Text>
                                <Text style={styles.addressBody}>
                                  117 Regent Ave W, Winnipeg, MB R2C 1R1
                                </Text>
                              </View>
                            </>
                          )}
                        </View>

                        {/* Order Items */}
                        {Array.isArray(order.items) && order.items.length > 0 && (
                          <View style={styles.itemsSection}>
                            <Text style={styles.sectionTitle}>CURATED ITEMS</Text>
                            {order.items.map((it: any, idx: number) => (
                              <View key={`item-${idx}`} style={styles.itemRow}>
                                <View style={styles.itemBullet} />
                                <View style={styles.itemInfo}>
                                  <Text style={styles.itemName} numberOfLines={1}>
                                    {it.product_name}
                                  </Text>
                                  {it.variant_label ? (
                                    <Text style={styles.itemVariant}>{it.variant_label}</Text>
                                  ) : null}
                                </View>
                                <Text style={styles.itemQty}>×{it.quantity}</Text>
                                <Text style={styles.itemPrice}>
                                  ${formatMoney((it.unit_price || 0) * (it.quantity || 1))}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* Price Breakdown */}
                        <View style={styles.pricingSection}>
                          <View style={styles.priceRow}>
                            <Text style={styles.priceLabel}>Subtotal</Text>
                            <Text style={styles.priceVal}>${formatMoney(order.subtotal)} CAD</Text>
                          </View>
                          <View style={styles.priceRow}>
                            <Text style={styles.priceLabel}>Estimated Tax (MB 12% GST+PST)</Text>
                            <Text style={styles.priceVal}>${formatMoney(order.tax)} CAD</Text>
                          </View>
                          <View style={styles.priceRow}>
                            <Text style={styles.priceLabel}>
                              {isDelivery ? 'Courier Delivery' : 'In-Store Pickup'}
                            </Text>
                            <Text style={styles.priceVal}>
                              {order.shipping && order.shipping > 0
                                ? `$${formatMoney(order.shipping)} CAD`
                                : 'FREE'}
                            </Text>
                          </View>
                          <View style={[styles.priceRow, styles.totalRow]}>
                            <Text style={styles.totalLabel}>Grand Total Paid</Text>
                            <Text style={styles.totalVal}>${formatMoney(order.total)} CAD</Text>
                          </View>
                        </View>

                        {/* Moneris Payment Card Badge */}
                        <View style={styles.paymentReceiptBanner}>
                          <View style={styles.paymentLeft}>
                            <CreditCard size={15} color="#059669" />
                            <Text style={styles.paymentText}>
                              Moneris S2S Verified ({order.payment_method || 'Card'})
                            </Text>
                          </View>
                          <View style={styles.paidPill}>
                            <Text style={styles.paidPillText}>PAID</Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    marginRight: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  pulsingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: ACCENT_LIME,
  },
  brandSubtitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: ACCENT_GREEN,
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: TEXT,
    letterSpacing: 0.2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  refreshBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: TEXT,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  signOutBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#DC2626',
  },
  signInTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: ACCENT_LIME,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: ACCENT_LIME,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  signInTopBtnText: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },

  /* ── Protected View ── */
  scrollContentProtected: {
    padding: 16,
    paddingBottom: 110,
    flexGrow: 1,
    justifyContent: 'center',
  },
  protectedCard: {
    backgroundColor: CARD_BG,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  lockIconBox: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(1, 102, 220, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  compliancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 10,
  },
  compliancePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  protectedHeading: {
    fontSize: 20,
    fontWeight: '900',
    color: TEXT,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    marginBottom: 8,
    textAlign: 'center',
  },
  protectedDesc: {
    fontSize: 12.5,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  protectedActions: {
    width: '100%',
    gap: 10,
    marginBottom: 18,
  },
  primaryAuthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT_LIME,
    height: 48,
    borderRadius: 14,
    shadowColor: ACCENT_LIME,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryAuthBtnText: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  secondaryAuthBtn: {
    backgroundColor: '#F1F5F9',
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryAuthBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.5,
  },
  exploreCatalogLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    width: '100%',
    justifyContent: 'center',
  },
  exploreCatalogLinkText: {
    fontSize: 12,
    fontWeight: '800',
    color: ACCENT_GREEN,
  },

  /* ── TechPOS Loyalty & Rewards Card ── */
  rewardsCard: {
    marginHorizontal: 16,
    marginTop: 14,
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
  rewardsDiscountText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0166dc',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  rewardsRateText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  /* ── 4 Stats Cards ── */
  statsCardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  statCard: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
  },
  statLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  statValueLarge: {
    fontSize: 22,
    fontWeight: '900',
    color: TEXT,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '800',
    color: TEXT,
  },
  statValueSmall: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
  },
  statComplianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statComplianceText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: ACCENT_GREEN,
  },

  /* ── Filter Tabs ── */
  filterTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
  },
  filterTabActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: MUTED,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  /* ── Scroll & List ── */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
  },

  /* ── Empty State ── */
  emptyContainer: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: CARD_BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: TEXT,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 290,
  },
  exploreBtn: {
    backgroundColor: ACCENT_LIME,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: ACCENT_LIME,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  exploreBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },

  /* ── Orders List ── */
  ordersList: {
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 4,
  },
  orderCard: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: {
    padding: 14,
  },
  cardHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardHeaderBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderNumber: {
    fontSize: 13,
    fontWeight: '900',
    color: TEXT,
    letterSpacing: 0.3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.4,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '900',
    color: TEXT,
  },
  cardHeaderRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderDate: {
    fontSize: 11,
    color: MUTED,
    fontWeight: '600',
  },
  metaDot: {
    fontSize: 11,
    color: MUTED,
  },
  fulfillmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  fulfillmentText: {
    fontSize: 11,
    color: MUTED,
    fontWeight: '600',
  },
  chevronBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Expanded Content ── */
  expandedContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },
  addressBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  addressIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressTextWrap: {
    flex: 1,
  },
  addressTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: TEXT,
    marginBottom: 1,
  },
  addressBody: {
    fontSize: 11,
    color: MUTED,
  },
  itemsSection: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: MUTED,
    letterSpacing: 0.6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  itemBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: ACCENT_GREEN,
    marginRight: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT,
  },
  itemVariant: {
    fontSize: 10.5,
    color: MUTED,
  },
  itemQty: {
    fontSize: 11.5,
    fontWeight: '700',
    color: MUTED,
    marginRight: 12,
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: TEXT,
  },
  pricingSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 1,
  },
  priceLabel: {
    fontSize: 11,
    color: MUTED,
  },
  priceVal: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT,
  },
  totalRow: {
    paddingTop: 6,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: TEXT,
  },
  totalVal: {
    fontSize: 12.5,
    fontWeight: '900',
    color: ACCENT_GREEN,
  },
  paymentReceiptBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paymentText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  paidPill: {
    backgroundColor: '#059669',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  paidPillText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});

export default OrderScreen;
