/**
 * ProductDetailModal
 * Displays a large high-resolution product image and full product details
 * when a user taps on any product image or card.
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Plus,
  Minus,
  ShoppingBag,
  Flame,
  Droplets,
  ShieldCheck,
  Package,
  Barcode,
  Scale,
  Sparkles,
} from 'lucide-react-native';
import { useProductDetailStore } from '../store/productDetailStore';
import { useCartStore } from '../store/cartStore';
import { useProductStore } from '../store/productStore';
import { resolveImageUrl } from '../config/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ProductDetailModal = () => {
  const { selectedProduct, isOpen, closeDetail } = useProductDetailStore();
  const addToCart = useCartStore(state => state.addToCart);

  const [quantity, setQuantity] = useState(1);
  const [activeImageUri, setActiveImageUri] = useState<string | null>(null);

  useEffect(() => {
    if (selectedProduct) {
      setQuantity(1);
      const img = resolveImageUrl(selectedProduct.imageUrl) || resolveImageUrl(selectedProduct.secondImageUrl);
      setActiveImageUri(img);
    }
  }, [selectedProduct]);

  if (!selectedProduct) return null;

  const strain = selectedProduct.strain;
  const priceNum = parseFloat(selectedProduct.retail_price || '0');
  const totalPriceForQty = (priceNum * quantity).toFixed(2);

  const rawSalePrice =
    selectedProduct.sale_price && selectedProduct.sale_price !== 'N.A.'
      ? parseFloat(selectedProduct.sale_price)
      : null;
  const hasValidSalePrice =
    rawSalePrice !== null && !isNaN(rawSalePrice) && rawSalePrice > 0;

  // Strain styling matching frontend
  let strainBadgeStyle = styles.hybridBadge;
  let strainTextStyle = styles.hybridText;
  if (strain === 'Sativa') {
    strainBadgeStyle = styles.sativaBadge;
    strainTextStyle = styles.sativaText;
  } else if (strain === 'Indica') {
    strainBadgeStyle = styles.indicaBadge;
    strainTextStyle = styles.indicaText;
  }

  const handleAddToCart = () => {
    closeDetail();
    setTimeout(() => {
      addToCart(selectedProduct, quantity, true);
    }, 350);
  };

  const handleIncrement = () => setQuantity(prev => prev + 1);
  const handleDecrement = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));

  const imagesList = [
    resolveImageUrl(selectedProduct.imageUrl),
    resolveImageUrl(selectedProduct.secondImageUrl),
  ].filter(Boolean) as string[];

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      onRequestClose={closeDetail}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" />

        {/* ── Top Header Bar ────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={closeDetail}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <X size={20} color="#0F172A" strokeWidth={2.2} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerBrand} numberOfLines={1}>
              {selectedProduct.brand || 'PHARSYDE'}
            </Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* ── Big Image Container ──────────────────────────────────── */}
          <View style={styles.bigImageContainer}>
            {activeImageUri ? (
              <Image
                source={{ uri: activeImageUri }}
                style={styles.bigImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.placeholderImage}>
                <Text style={styles.placeholderEmoji}>🌿</Text>
                <Text style={styles.placeholderText}>Pharsyde Craft Cannabis</Text>
              </View>
            )}

            {/* Strain Badge Overlay */}
            {strain ? (
              <View style={[styles.strainBadge, strainBadgeStyle]}>
                <Sparkles size={11} color={strainTextStyle.color} />
                <Text style={[styles.strainText, strainTextStyle]}>{strain}</Text>
              </View>
            ) : null}

            {/* Category Pill Overlay */}
            {selectedProduct.category ? (
              <View style={styles.categoryPill}>
                <Text style={styles.categoryPillText} numberOfLines={1}>
                  {selectedProduct.category}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Multiple Image Gallery Thumbnails */}
          {imagesList.length > 1 && (
            <View style={styles.thumbnailRow}>
              {imagesList.map((uri, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.thumbBtn,
                    activeImageUri === uri && styles.thumbBtnActive,
                  ]}
                  onPress={() => setActiveImageUri(uri)}>
                  <Image source={{ uri }} style={styles.thumbImage} resizeMode="contain" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── Product Title & Pricing ──────────────────────────────── */}
          <View style={styles.infoCard}>
            <Text style={styles.brandSubtitle}>
              {selectedProduct.brand ? selectedProduct.brand.toUpperCase() : 'PHARSYDE'}
            </Text>

            <Text style={styles.titleText}>{selectedProduct.product_name}</Text>

            <View style={styles.priceRow}>
              <View style={styles.priceColumn}>
                <Text style={styles.priceLabel}>Retail Price</Text>
                <Text style={styles.priceValue}>${priceNum.toFixed(2)} CAD</Text>
              </View>

              {hasValidSalePrice && rawSalePrice !== null && (
                <View style={styles.saleBadge}>
                  <Text style={styles.saleBadgeText}>
                    Sale: ${rawSalePrice.toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* ── Potency Stats Cards (THC & CBD) ───────────────────────── */}
          <View style={styles.potencyRow}>
            <View style={styles.potencyCard}>
              <View style={styles.potencyIconWrapFlame}>
                <Flame size={18} color="#D97706" />
              </View>
              <View style={styles.potencyTextWrap}>
                <Text style={styles.potencyLabel}>THC POTENCY</Text>
                <Text style={styles.potencyValue}>
                  {selectedProduct.thC_LEVEL ? `${selectedProduct.thC_LEVEL}%` : 'Standard'}
                </Text>
              </View>
            </View>

            <View style={styles.potencyCard}>
              <View style={styles.potencyIconWrapDroplet}>
                <Droplets size={18} color="#0284C7" />
              </View>
              <View style={styles.potencyTextWrap}>
                <Text style={styles.potencyLabel}>CBD POTENCY</Text>
                <Text style={styles.potencyValue}>
                  {selectedProduct.cbD_LEVEL ? `${selectedProduct.cbD_LEVEL}%` : '< 1.00%'}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Specifications Grid ──────────────────────────────────── */}
          <View style={styles.specsContainer}>
            <Text style={styles.sectionHeader}>Product Specifications</Text>

            <View style={styles.specsGrid}>
              {selectedProduct.category ? (
                <View style={styles.specItem}>
                  <Package size={15} color="#64748B" />
                  <View style={styles.specTextCol}>
                    <Text style={styles.specLabel}>Category</Text>
                    <Text style={styles.specValue}>{selectedProduct.category}</Text>
                  </View>
                </View>
              ) : null}

              {selectedProduct.sku ? (
                <View style={styles.specItem}>
                  <Barcode size={15} color="#64748B" />
                  <View style={styles.specTextCol}>
                    <Text style={styles.specLabel}>SKU</Text>
                    <Text style={styles.specValue}>{selectedProduct.sku}</Text>
                  </View>
                </View>
              ) : null}

              {selectedProduct.size || selectedProduct.weight ? (
                <View style={styles.specItem}>
                  <Scale size={15} color="#64748B" />
                  <View style={styles.specTextCol}>
                    <Text style={styles.specLabel}>Package Net Weight</Text>
                    <Text style={styles.specValue}>
                      {selectedProduct.size || selectedProduct.weight}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          </View>

          {/* ── Description / Notes ──────────────────────────────────── */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.sectionHeader}>About This Product</Text>
            <Text style={styles.descriptionText}>
              {selectedProduct.description ||
                selectedProduct.notes ||
                `Crafted for quality and precision, ${selectedProduct.product_name} provides consistent potency and flavor. Carefully curated under Pharsyde standards for licensed Manitoba retail fulfillment.`}
            </Text>
          </View>

          {/* ── Compliance Badge ─────────────────────────────────────── */}
          <View style={styles.complianceCard}>
            <ShieldCheck size={18} color="#0166dc" />
            <Text style={styles.complianceText}>
              19+ Age Verification at Fulfillment • Licensed Manitoba Retail • Lab Certified
            </Text>
          </View>
        </ScrollView>

        {/* ── Bottom Action Footer (Quantity + Add to Cart) ─────────── */}
        <View style={styles.bottomBar}>
          {/* Quantity Controls */}
          <View style={styles.quantityControl}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={handleDecrement}
              activeOpacity={0.7}>
              <Minus size={16} color="#0F172A" />
            </TouchableOpacity>

            <Text style={styles.qtyText}>{quantity}</Text>

            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={handleIncrement}
              activeOpacity={0.7}>
              <Plus size={16} color="#0F172A" />
            </TouchableOpacity>
          </View>

          {/* Add to Cart Button */}
          <TouchableOpacity
            style={styles.addToCartBtn}
            onPress={handleAddToCart}
            activeOpacity={0.85}>
            <ShoppingBag size={18} color="#FFFFFF" strokeWidth={2.3} />
            <Text style={styles.addToCartText}>
              ADD TO CART • ${totalPriceForQty}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const BG = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';
const ACCENT = '#3B82F6';
const ACCENT_DEEP = '#0166dc';

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
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  headerBrand: {
    fontSize: 13,
    fontWeight: '800',
    color: ACCENT_DEEP,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerSpacer: {
    width: 38,
    height: 38,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },

  // Big Image
  bigImageContainer: {
    width: '100%',
    height: 290,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    position: 'relative',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    padding: 16,
  },
  bigImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 13,
    color: MUTED,
    fontWeight: '600',
  },
  strainBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  strainText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  sativaBadge: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
  },
  sativaText: {
    color: '#B45309',
  },
  indicaBadge: {
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D5FF',
    borderWidth: 1,
  },
  indicaText: {
    color: '#7E22CE',
  },
  hybridBadge: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
  },
  hybridText: {
    color: '#1D4ED8',
  },
  categoryPill: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BORDER,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  thumbnailRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  thumbBtn: {
    width: 58,
    height: 58,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: BORDER,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbBtnActive: {
    borderColor: ACCENT_DEEP,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },

  // Info Card
  infoCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginTop: 16,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: ACCENT_DEEP,
    letterSpacing: 1,
    marginBottom: 4,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '800',
    color: TEXT,
    lineHeight: 24,
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  priceColumn: {},
  priceLabel: {
    fontSize: 11,
    color: MUTED,
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 22,
    fontWeight: '900',
    color: TEXT,
  },
  saleBadge: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  saleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },

  // Potency Row
  potencyRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  potencyCard: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  potencyIconWrapFlame: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  potencyIconWrapDroplet: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  potencyTextWrap: {
    flex: 1,
  },
  potencyLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: MUTED,
    letterSpacing: 0.5,
  },
  potencyValue: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT,
    marginTop: 2,
  },

  // Specs
  specsContainer: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginTop: 14,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 12,
  },
  specsGrid: {
    gap: 10,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  specTextCol: {
    flex: 1,
  },
  specLabel: {
    fontSize: 11,
    color: MUTED,
  },
  specValue: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT,
    marginTop: 1,
  },

  // Description
  descriptionContainer: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginTop: 14,
  },
  descriptionText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },

  // Compliance
  complianceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 12,
    borderRadius: 12,
    marginTop: 14,
  },
  complianceText: {
    flex: 1,
    fontSize: 11,
    color: '#1E40AF',
    fontWeight: '500',
    lineHeight: 16,
  },

  // Bottom Bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    gap: 12,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT,
    paddingHorizontal: 12,
    minWidth: 36,
    textAlign: 'center',
  },
  addToCartBtn: {
    flex: 1,
    height: 46,
    backgroundColor: ACCENT,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addToCartText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

export default ProductDetailModal;
