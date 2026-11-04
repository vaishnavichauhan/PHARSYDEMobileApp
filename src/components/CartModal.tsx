/**
 * CartModal (Shopping Bag)
 * Matches the Pharsyde Web Frontend CartDrawer.jsx exactly:
 * - Free shipping progress bar ($75 CAD threshold)
 * - Item list with thumbnails, quantity buttons, and trash removal
 * - Promo code form (PHARSYDE10 for 10% discount)
 * - MB 12% GST+PST calculation, delivery fee, and CAD totals
 * - Secure checkout button in #8EF705
 * - Manitoba 19+ age compliance notice
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  Truck,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react-native';
import {
  useCartStore,
  FREE_SHIPPING_THRESHOLD,
  TAX_RATE,
  STANDARD_DELIVERY_FEE,
} from '../store/cartStore';
import { useCheckoutStore } from '../store/checkoutStore';
import { resolveImageUrl } from '../config/api';

interface CartModalProps {
  onNavigateToCatalog?: () => void;
}

const CartModal = ({ onNavigateToCatalog }: CartModalProps) => {
  const isCartOpen = useCartStore(state => state.isCartOpen);
  const closeCart = useCartStore(state => state.closeCart);
  const items = useCartStore(state => state.items);
  const totalCount = useCartStore(state => state.totalCount);
  const totalPrice = useCartStore(state => state.totalPrice);
  const updateQuantity = useCartStore(state => state.updateQuantity);
  const removeFromCart = useCartStore(state => state.removeFromCart);
  const openCheckout = useCheckoutStore(state => state.openCheckout);

  // Promo code
  const promoCode = useCartStore(state => state.promoCode);
  const promoDiscount = useCartStore(state => state.promoDiscount);
  const promoApplied = useCartStore(state => state.promoApplied);
  const promoError = useCartStore(state => state.promoError);
  const setPromoCode = useCartStore(state => state.setPromoCode);
  const applyPromo = useCartStore(state => state.applyPromo);

  const cartList = Object.values(items);

  // Financial calculations matching CartDrawer.jsx
  const cartSubtotal = totalPrice;
  const progressPercent = Math.min(
    100,
    (cartSubtotal / FREE_SHIPPING_THRESHOLD) * 100,
  );
  const remainingForFreeShipping = Math.max(
    0,
    FREE_SHIPPING_THRESHOLD - cartSubtotal,
  );

  const taxableAmount = Math.max(0, cartSubtotal - promoDiscount);
  const estimatedTax = taxableAmount * TAX_RATE;
  const deliveryFee =
    cartSubtotal >= FREE_SHIPPING_THRESHOLD || cartSubtotal === 0
      ? 0
      : STANDARD_DELIVERY_FEE;
  const finalTotal = Math.max(
    0,
    cartSubtotal - promoDiscount + estimatedTax + deliveryFee,
  );

  const handleCheckout = () => {
    closeCart();
    openCheckout();
  };

  const handleExplore = () => {
    closeCart();
    if (onNavigateToCatalog) {
      onNavigateToCatalog();
    }
  };

  return (
    <Modal
      visible={isCartOpen}
      animationType="slide"
      onRequestClose={closeCart}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" />

        {/* ── 1. Header ─────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.bagIconWrap}>
              <ShoppingBag size={20} color="#0F172A" strokeWidth={2.2} />
            </View>
            <View>
              <Text style={styles.headerTitle}>SHOPPING BAG</Text>
              <Text style={styles.headerSubtitle}>
                {totalCount} {totalCount === 1 ? 'item' : 'items'} curated
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={closeCart}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={20} color="#0F172A" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        {/* ── 2. Free Delivery Progress Bar ($75 threshold) ─────── */}
        <View style={styles.deliveryProgressCard}>
          <View style={styles.deliveryProgressTextRow}>
            <View style={styles.deliveryProgressLeft}>
              <Truck size={16} color="#488203" />
              {cartSubtotal >= FREE_SHIPPING_THRESHOLD ? (
                <Text style={styles.freeDeliveryUnlocked}>
                  Unlocked Free Winnipeg Delivery!
                </Text>
              ) : (
                <Text style={styles.freeDeliveryNeeded}>
                  Add{' '}
                  <Text style={styles.freeDeliveryBold}>
                    ${remainingForFreeShipping.toFixed(2)}
                  </Text>{' '}
                  for Free Delivery
                </Text>
              )}
            </View>
            <Text style={styles.progressPercentText}>
              {Math.round(progressPercent)}%
            </Text>
          </View>

          <View style={styles.progressBarTrack}>
            <View
              style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
            />
          </View>
        </View>

        {/* ── 3. Cart Items / Empty State ───────────────────────── */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {cartList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <ShoppingBag size={32} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>Your bag is empty</Text>
              <Text style={styles.emptySub}>
                Explore our collection of craft cannabis and precision
                vaporizers to elevate your ritual.
              </Text>
              <TouchableOpacity
                style={styles.exploreBtn}
                onPress={handleExplore}
                activeOpacity={0.85}>
                <Text style={styles.exploreBtnText}>Explore Catalogue</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.itemsList}>
              {cartList.map(item => {
                const product = item.product;
                const id = product.pk || product.sku;
                const pPrice = parseFloat(product.retail_price || '0');
                const lineTotal = (pPrice * item.quantity).toFixed(2);

                return (
                  <View key={id} style={styles.itemCard}>
                    {/* Thumbnail */}
                    <View style={styles.thumbWrap}>
                      {product.imageUrl ? (
                        <Image
                          source={{ uri: resolveImageUrl(product.imageUrl) || product.imageUrl }}
                          style={styles.itemImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <Text style={styles.itemEmoji}>🌿</Text>
                      )}
                    </View>

                    {/* Info & Controls */}
                    <View style={styles.itemDetails}>
                      <View style={styles.itemTopRow}>
                        <Text style={styles.itemTitle} numberOfLines={1}>
                          {product.product_name}
                        </Text>
                        <TouchableOpacity
                          style={styles.trashBtn}
                          onPress={() => removeFromCart(id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Trash2 size={16} color="#94A3B8" />
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.itemBrandLine} numberOfLines={1}>
                        {(product.brand || 'PHARSYDE').toUpperCase()} •{' '}
                        {product.category || 'Standard Pack'}
                      </Text>

                      <View style={styles.itemBottomRow}>
                        <Text style={styles.itemPrice}>${lineTotal} CAD</Text>

                        {/* Quantity Counter */}
                        <View style={styles.qtyBox}>
                          <TouchableOpacity
                            style={styles.qtyAction}
                            onPress={() => updateQuantity(id, item.quantity - 1)}>
                            <Minus size={13} color="#0F172A" />
                          </TouchableOpacity>

                          <Text style={styles.qtyNumber}>{item.quantity}</Text>

                          <TouchableOpacity
                            style={styles.qtyAction}
                            onPress={() => updateQuantity(id, item.quantity + 1)}>
                            <Plus size={13} color="#0F172A" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* ── 4. Checkout Breakdown & Footer (visible when items > 0) ── */}
        {cartList.length > 0 && (
          <View style={styles.footerContainer}>
            {/* Promo Code Form */}
            <View style={styles.promoForm}>
              <TextInput
                style={styles.promoInput}
                placeholder="Promo Code (e.g. PHARSYDE10)"
                placeholderTextColor="#94A3B8"
                value={promoCode}
                onChangeText={setPromoCode}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={styles.promoBtn}
                onPress={applyPromo}
                activeOpacity={0.85}>
                <Text style={styles.promoBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>

            {promoError ? (
              <Text style={styles.promoErrorText}>{promoError}</Text>
            ) : null}

            {promoApplied ? (
              <View style={styles.promoSuccessRow}>
                <Sparkles size={14} color="#488203" />
                <Text style={styles.promoSuccessText}>
                  10% Welcome Discount Applied!
                </Text>
              </View>
            ) : null}

            {/* Price Breakdown */}
            <View style={styles.breakdownBox}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Subtotal</Text>
                <Text style={styles.breakdownVal}>
                  ${cartSubtotal.toFixed(2)} CAD
                </Text>
              </View>

              {promoDiscount > 0 ? (
                <View style={styles.breakdownRow}>
                  <Text style={styles.discountLabel}>Discount</Text>
                  <Text style={styles.discountVal}>
                    -${promoDiscount.toFixed(2)} CAD
                  </Text>
                </View>
              ) : null}

              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  Estimated Tax (MB 12% GST+PST)
                </Text>
                <Text style={styles.breakdownVal}>
                  ${estimatedTax.toFixed(2)} CAD
                </Text>
              </View>

              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  Winnipeg Delivery / Pickup
                </Text>
                <Text style={styles.breakdownVal}>
                  {deliveryFee === 0 ? 'FREE' : `$${deliveryFee.toFixed(2)} CAD`}
                </Text>
              </View>

              <View style={[styles.breakdownRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Estimated Total</Text>
                <Text style={styles.totalVal}>${finalTotal.toFixed(2)} CAD</Text>
              </View>
            </View>

            {/* Checkout Action Button */}
            <TouchableOpacity
              style={styles.checkoutBtn}
              onPress={handleCheckout}
              activeOpacity={0.85}>
              <Text style={styles.checkoutBtnText}>
                PROCEED TO SECURE CHECKOUT
              </Text>
              <ArrowRight size={17} color="#0F172A" strokeWidth={2.4} />
            </TouchableOpacity>

            {/* Compliance Footer */}
            <View style={styles.complianceRow}>
              <ShieldCheck size={14} color="#488203" />
              <Text style={styles.complianceText}>
                19+ Age Verification at Fulfillment • Manitoba Compliant
              </Text>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const BG = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';
const ACCENT = '#8EF705';
const ACCENT_DEEP = '#488203';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bagIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(142, 247, 5, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(142, 247, 5, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT,
    letterSpacing: 0.8,
  },
  headerSubtitle: {
    fontSize: 11,
    color: MUTED,
    fontWeight: '500',
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },

  // Free delivery progress bar
  deliveryProgressCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  deliveryProgressTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  deliveryProgressLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  freeDeliveryUnlocked: {
    fontSize: 12,
    fontWeight: '800',
    color: ACCENT_DEEP,
  },
  freeDeliveryNeeded: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  freeDeliveryBold: {
    fontWeight: '800',
    color: TEXT,
  },
  progressPercentText: {
    fontSize: 11,
    fontWeight: '700',
    color: MUTED,
    fontFamily: 'monospace',
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#CBD5E1',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: ACCENT_DEEP,
    borderRadius: 3,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: TEXT,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  exploreBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: ACCENT,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  exploreBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Item List
  itemsList: {
    gap: 12,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  thumbWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemEmoji: {
    fontSize: 28,
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 6,
  },
  itemTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: TEXT,
  },
  trashBtn: {
    padding: 2,
  },
  itemBrandLine: {
    fontSize: 10.5,
    fontWeight: '800',
    color: ACCENT_DEEP,
    marginTop: 2,
  },
  itemBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT,
    fontFamily: 'monospace',
  },
  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  qtyAction: {
    padding: 4,
  },
  qtyNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: TEXT,
    fontFamily: 'monospace',
    paddingHorizontal: 8,
  },

  // Footer / Checkout breakdown
  footerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    padding: 16,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  promoForm: {
    flexDirection: 'row',
    gap: 8,
  },
  promoInput: {
    flex: 1,
    height: 38,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    fontSize: 12,
    color: TEXT,
  },
  promoBtn: {
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  promoErrorText: {
    fontSize: 11,
    color: '#E11D48',
    fontWeight: '600',
  },
  promoSuccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  promoSuccessText: {
    fontSize: 11,
    fontWeight: '800',
    color: ACCENT_DEEP,
  },
  breakdownBox: {
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 12,
    color: MUTED,
  },
  breakdownVal: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT,
    fontFamily: 'monospace',
  },
  discountLabel: {
    fontSize: 12,
    color: ACCENT_DEEP,
    fontWeight: '700',
  },
  discountVal: {
    fontSize: 12,
    fontWeight: '800',
    color: ACCENT_DEEP,
    fontFamily: 'monospace',
  },
  totalRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT,
  },
  totalVal: {
    fontSize: 16,
    fontWeight: '900',
    color: ACCENT_DEEP,
    fontFamily: 'monospace',
  },
  checkoutBtn: {
    height: 48,
    backgroundColor: ACCENT,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  checkoutBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.8,
  },
  complianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  complianceText: {
    fontSize: 10,
    color: MUTED,
  },
});

export default CartModal;
