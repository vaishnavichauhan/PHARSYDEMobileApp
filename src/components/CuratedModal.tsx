/**
 * CuratedModal – Dedicated Full-Screen View for "New Arrivals" & "Best Sellers"
 * Matches Web Frontend NewArrivalsPage.jsx and BestSellersPage.jsx.
 */

import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Search,
  ShoppingCart,
  Sparkles,
  Crown,
  Star,
  Flame,
  Package,
  ArrowUpDown,
  RefreshCw,
  Plus,
  X,
  Check,
  Award,
  ArrowRight,
  Filter,
} from 'lucide-react-native';

import { useCuratedStore, CuratedType } from '../store/curatedStore';
import { Product } from '../store/productStore';
import { useCartStore } from '../store/cartStore';
import { useProductDetailStore } from '../store/productDetailStore';
import { resolveImageUrl } from '../config/api';
import { navigate } from '../navigation/navigationRef';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 14;
const CARD_GAP = 10;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;

const BG = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';
const ACCENT_LIME = '#8EF705';
const ACCENT_GREEN = '#488203';

type SortOption = 'default' | 'price-low' | 'price-high' | 'name';

export default function CuratedModal() {
  const activeModal = useCuratedStore(state => state.activeModal);
  const closeCuratedModal = useCuratedStore(state => state.closeCuratedModal);

  const newArrivals = useCuratedStore(state => state.newArrivals);
  const newArrivalsLimit = useCuratedStore(state => state.newArrivalsLimit);
  const isLoadingNewArrivals = useCuratedStore(state => state.isLoadingNewArrivals);
  const errorNewArrivals = useCuratedStore(state => state.errorNewArrivals);
  const fetchNewArrivals = useCuratedStore(state => state.fetchNewArrivals);

  const bestSellers = useCuratedStore(state => state.bestSellers);
  const isLoadingBestSellers = useCuratedStore(state => state.isLoadingBestSellers);
  const errorBestSellers = useCuratedStore(state => state.errorBestSellers);
  const fetchBestSellers = useCuratedStore(state => state.fetchBestSellers);

  const { totalCount, openCart, addToCart } = useCartStore();
  const { openDetail } = useProductDetailStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortOption, setSortOption] = useState<SortOption>('default');
  const [showSortModal, setShowSortModal] = useState(false);

  const isNewArrivals = activeModal === 'new-arrivals';
  const products = isNewArrivals ? newArrivals : bestSellers;
  const isLoading = isNewArrivals ? isLoadingNewArrivals : isLoadingBestSellers;
  const error = isNewArrivals ? errorNewArrivals : errorBestSellers;

  // Extract unique categories available in this batch
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set).sort()];
  }, [products]);

  // Filter and sort locally
  const filteredProducts = useMemo(() => {
    return products
      .filter(p => {
        // Must have valid image
        const hasValidImage = p.imageUrl && p.imageUrl.trim() !== '' && p.imageUrl !== '[]';
        if (!hasValidImage) return false;

        // Category filter
        if (selectedCategory !== 'All' && p.category !== selectedCategory) {
          return false;
        }

        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const nameMatch = (p.product_name || '').toLowerCase().includes(q);
          const brandMatch = (p.brand || '').toLowerCase().includes(q);
          const categoryMatch = (p.category || '').toLowerCase().includes(q);
          const skuMatch = (p.sku || '').toLowerCase().includes(q);
          if (!nameMatch && !brandMatch && !categoryMatch && !skuMatch) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'price-low') {
          const priceA = parseFloat(a.retail_price || '0');
          const priceB = parseFloat(b.retail_price || '0');
          return priceA - priceB;
        }
        if (sortOption === 'price-high') {
          const priceA = parseFloat(a.retail_price || '0');
          const priceB = parseFloat(b.retail_price || '0');
          return priceB - priceA;
        }
        if (sortOption === 'name') {
          return (a.product_name || '').localeCompare(b.product_name || '');
        }
        return 0;
      });
  }, [products, selectedCategory, searchQuery, sortOption]);

  const handleRefresh = () => {
    if (isNewArrivals) {
      fetchNewArrivals(true);
    } else {
      fetchBestSellers(true);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSortOption('default');
    closeCuratedModal();
  };

  if (!activeModal) return null;

  return (
    <Modal
      visible={Boolean(activeModal)}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" />

        {/* ── Top Bar ────────────────────────────────────────────── */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleClose}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <ArrowLeft size={20} color={TEXT} strokeWidth={2.4} />
          </TouchableOpacity>

          <View style={styles.topBarCenter}>
            <Text style={styles.topBarTitle}>
              {isNewArrivals ? 'NEW ARRIVALS' : 'BEST SELLERS'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.cartButton}
            onPress={openCart}
            activeOpacity={0.75}>
            <ShoppingCart size={20} color={TEXT} strokeWidth={2.2} />
            {totalCount > 0 ? (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>
                  {totalCount > 99 ? '99+' : totalCount}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          {/* ── Hero Banner (Matching Frontend UI) ──────────────── */}
          <View
            style={[
              styles.heroBanner,
              isNewArrivals ? styles.heroBannerNew : styles.heroBannerBest,
            ]}>
            {/* Ambient decorative glow */}
            <View
              style={[
                styles.ambientGlow,
                isNewArrivals ? styles.glowEmerald : styles.glowAmber,
              ]}
            />

            <View style={styles.heroContent}>
              {/* Fresh Drops Tag */}
              <View
                style={[
                  styles.heroBadge,
                  isNewArrivals ? styles.heroBadgeNew : styles.heroBadgeBest,
                ]}>
                {isNewArrivals ? (
                  <Sparkles size={13} color="#8EF705" />
                ) : (
                  <Crown size={13} color="#F59E0B" />
                )}
                <Text
                  style={[
                    styles.heroBadgeText,
                    isNewArrivals
                      ? styles.heroBadgeTextNew
                      : styles.heroBadgeTextBest,
                  ]}>
                  {isNewArrivals
                    ? 'FRESH DROPS & CURATED INVENTORY'
                    : 'CUSTOMER FAVORITES & TOP SHELF'}
                </Text>
              </View>

              {/* Title with Highlight */}
              <Text style={styles.heroTitle}>
                {isNewArrivals ? (
                  <>
                    New <Text style={styles.heroTitleAccent}>Arrivals</Text>
                  </>
                ) : (
                  <>
                    Best <Text style={styles.heroTitleAccent}>Sellers</Text>
                  </>
                )}
              </Text>

              {/* Description */}
              <Text style={styles.heroSubtitle}>
                {isNewArrivals
                  ? 'Explore the latest hand-picked additions to our live store menu. From freshly harvested strains and premium flower to artisan edibles, concentrates, and hardware.'
                  : 'Explore our most sought-after products, community-acclaimed strains, and premier dispensary picks. Hand-selected and updated directly by our store team.'}
              </Text>

              {/* Stats Chips */}
              <View style={styles.heroStatsRow}>
                {isNewArrivals ? (
                  <>
                    <View style={styles.heroStatChip}>
                      <Flame size={12} color="#8EF705" />
                      <Text style={styles.heroStatText}>
                        Showing latest{' '}
                        <Text style={styles.heroStatBold}>{products.length}</Text>{' '}
                        items
                      </Text>
                    </View>
                    <View style={styles.heroStatChip}>
                      <Package size={12} color="#34D399" />
                      <Text style={styles.heroStatText}>
                        Default limit:{' '}
                        <Text style={styles.heroStatBold}>{newArrivalsLimit}</Text>
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.heroStatChip}>
                      <Star size={12} color="#FBBF24" />
                      <Text style={styles.heroStatText}>
                        <Text style={styles.heroStatBold}>{products.length}</Text>{' '}
                        featured best sellers
                      </Text>
                    </View>
                    <View style={styles.heroStatChip}>
                      <Award size={12} color="#8EF705" />
                      <Text style={styles.heroStatText}>Store Curated</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          </View>

          {/* ── Toolbar: Search, Sort & Refresh ──────────────────── */}
          <View style={styles.toolbarCard}>
            <View style={styles.searchRow}>
              <View style={styles.searchInputWrap}>
                <Search size={16} color={MUTED} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={
                    isNewArrivals
                      ? 'Search new arrivals by strain, brand, or SKU...'
                      : 'Search best sellers by strain, brand, or SKU...'
                  }
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery ? (
                  <TouchableOpacity
                    style={styles.clearSearchBtn}
                    onPress={() => setSearchQuery('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <X size={15} color={MUTED} />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Sort button */}
              <TouchableOpacity
                style={styles.toolbarBtn}
                onPress={() => setShowSortModal(true)}
                activeOpacity={0.8}>
                <ArrowUpDown size={15} color={TEXT} />
              </TouchableOpacity>

              {/* Refresh button */}
              <TouchableOpacity
                style={styles.toolbarBtn}
                onPress={handleRefresh}
                disabled={isLoading}
                activeOpacity={0.8}>
                <RefreshCw
                  size={15}
                  color={TEXT}
                  style={isLoading ? styles.spinning : undefined}
                />
              </TouchableOpacity>
            </View>

            {/* Horizontal Category Filter Pills */}
            {categories.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryPillsScroll}>
                <View style={styles.filterLabelWrap}>
                  <Filter size={12} color="#94A3B8" />
                  <Text style={styles.filterLabelText}>CATEGORIES:</Text>
                </View>

                {categories.map(cat => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catPill,
                        isSelected && styles.catPillActive,
                      ]}
                      onPress={() => setSelectedCategory(cat)}
                      activeOpacity={0.8}>
                      <Text
                        style={[
                          styles.catPillText,
                          isSelected && styles.catPillTextActive,
                        ]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* ── Results Counter Banner ───────────────────────────── */}
          <View style={styles.counterRow}>
            <Text style={styles.counterText}>
              Showing <Text style={styles.counterBold}>{filteredProducts.length}</Text>{' '}
              of <Text style={styles.counterBold}>{products.length}</Text>{' '}
              {isNewArrivals ? 'new arrivals' : 'curated best sellers'}
              {selectedCategory !== 'All' ? ` in "${selectedCategory}"` : ''}
            </Text>
            <Text style={styles.counterSub}>
              {isNewArrivals ? 'Updated daily from TechPOS' : 'Store Curated'}
            </Text>
          </View>

          {/* ── Product Grid or Status States ────────────────────── */}
          {isLoading && products.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={ACCENT_GREEN} />
              <Text style={styles.loadingText}>
                Loading {isNewArrivals ? 'new arrivals' : 'best sellers'}...
              </Text>
            </View>
          ) : error && products.length === 0 ? (
            <View style={styles.errorContainer}>
              <View style={styles.errorIconBox}>
                <Text style={styles.errorIconText}>!</Text>
              </View>
              <Text style={styles.errorTitle}>
                Unable to load {isNewArrivals ? 'new arrivals' : 'best sellers'}
              </Text>
              <Text style={styles.errorSub}>{error}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={handleRefresh}
                activeOpacity={0.8}>
                <Text style={styles.retryBtnText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : filteredProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Sparkles size={28} color={ACCENT_GREEN} />
              </View>
              <Text style={styles.emptyTitle}>No matching products found</Text>
              <Text style={styles.emptySub}>
                {searchQuery || selectedCategory !== 'All'
                  ? 'Try resetting your filter or search query to see other products.'
                  : 'Check back soon for new additions to our menu!'}
              </Text>
              {(searchQuery || selectedCategory !== 'All') && (
                <TouchableOpacity
                  style={styles.clearFiltersBtn}
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  activeOpacity={0.8}>
                  <Text style={styles.clearFiltersText}>Clear Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.productsGrid}>
              {filteredProducts.map(product => {
                const strain = product.strain;
                let strainBadgeStyle = styles.hybridBadge;
                let strainTextStyle = styles.hybridText;
                if (strain === 'Sativa') {
                  strainBadgeStyle = styles.sativaBadge;
                  strainTextStyle = styles.sativaText;
                } else if (strain === 'Indica') {
                  strainBadgeStyle = styles.indicaBadge;
                  strainTextStyle = styles.indicaText;
                }

                return (
                  <View key={product.pk || product.sku} style={styles.productCard}>
                    {/* Image & Strain Badge */}
                    <TouchableOpacity
                      style={styles.imageWrap}
                      activeOpacity={0.9}
                      onPress={() => openDetail(product)}>
                      {product.imageUrl ? (
                        <Image
                          source={{
                            uri:
                              resolveImageUrl(product.imageUrl) ||
                              product.imageUrl,
                          }}
                          style={styles.productImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.noImage}>
                          <Text style={styles.noImageText}>🌿</Text>
                        </View>
                      )}

                      {strain ? (
                        <View style={[styles.strainBadge, strainBadgeStyle]}>
                          <Text style={[styles.strainText, strainTextStyle]}>
                            {strain}
                          </Text>
                        </View>
                      ) : product.category ? (
                        <View
                          style={[styles.strainBadge, styles.categoryBadge]}>
                          <Text
                            style={styles.categoryBadgeText}
                            numberOfLines={1}>
                            {product.category}
                          </Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>

                    {/* Card Content */}
                    <View style={styles.cardBody}>
                      {product.brand ? (
                        <Text style={styles.brandText} numberOfLines={1}>
                          {product.brand}
                        </Text>
                      ) : null}

                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => openDetail(product)}>
                        <Text style={styles.productName} numberOfLines={2}>
                          {product.product_name}
                        </Text>
                      </TouchableOpacity>

                      {product.thC_LEVEL ? (
                        <View style={styles.thcRow}>
                          <Text style={styles.thcLabel}>THC:</Text>
                          <Text style={styles.thcValue}>
                            {product.thC_LEVEL}%
                          </Text>
                        </View>
                      ) : null}

                      {/* Price & Add Button */}
                      <View style={styles.priceRow}>
                        <Text style={styles.priceText}>
                          $
                          {parseFloat(
                            product.retail_price || '0',
                          ).toFixed(2)}
                        </Text>

                        <TouchableOpacity
                          style={styles.addBtn}
                          activeOpacity={0.85}
                          onPress={() => addToCart(product, 1, true)}>
                          <Plus size={16} color="#0F172A" strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* ── Bottom Link to Full Catalog ──────────────────────── */}
          <View style={styles.bottomBanner}>
            <Text style={styles.bottomBannerTitle}>
              Looking for something specific?
            </Text>
            <Text style={styles.bottomBannerSub}>
              Browse our complete catalog featuring thousands of cannabis
              products, concentrates, edibles, and hardware.
            </Text>
            <TouchableOpacity
              style={styles.bottomBannerBtn}
              activeOpacity={0.85}
              onPress={() => {
                handleClose();
                navigate('Categories');
              }}>
              <Text style={styles.bottomBannerBtnText}>Explore Full Catalog</Text>
              <ArrowRight size={16} color="#8EF705" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* ── Sort Modal ─────────────────────────────────────────── */}
        <Modal
          visible={showSortModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSortModal(false)}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowSortModal(false)}>
            <View style={styles.sortModalSheet}>
              <View style={styles.sortModalHeader}>
                <Text style={styles.sortModalTitle}>Sort Products</Text>
                <TouchableOpacity
                  onPress={() => setShowSortModal(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={20} color={TEXT} />
                </TouchableOpacity>
              </View>

              <View style={styles.sortOptionsList}>
                {(
                  [
                    {
                      id: 'default',
                      label: isNewArrivals
                        ? 'Newest First (Default)'
                        : 'Curated Order (Default)',
                    },
                    { id: 'price-low', label: 'Price: Low to High' },
                    { id: 'price-high', label: 'Price: High to Low' },
                    { id: 'name', label: 'Product Name (A-Z)' },
                  ] as { id: SortOption; label: string }[]
                ).map(opt => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.sortOptionRow,
                      sortOption === opt.id && styles.sortOptionRowActive,
                    ]}
                    onPress={() => {
                      setSortOption(opt.id);
                      setShowSortModal(false);
                    }}
                    activeOpacity={0.75}>
                    <Text
                      style={[
                        styles.sortOptionText,
                        sortOption === opt.id && styles.sortOptionTextActive,
                      ]}>
                      {opt.label}
                    </Text>
                    {sortOption === opt.id && (
                      <Check size={18} color={ACCENT_GREEN} strokeWidth={2.4} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: CARD_BG,
  },
  topBar: {
    height: 56,
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
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: TEXT,
    letterSpacing: 0.8,
  },
  cartButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: ACCENT_LIME,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  cartBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#0F172A',
  },
  scrollView: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  /* ── Hero Banner ── */
  heroBanner: {
    margin: 14,
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  heroBannerNew: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  heroBannerBest: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  ambientGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  glowEmerald: {
    backgroundColor: 'rgba(142, 247, 5, 0.15)',
  },
  glowAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  heroContent: {
    position: 'relative',
    zIndex: 1,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
  },
  heroBadgeNew: {
    backgroundColor: 'rgba(142, 247, 5, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(142, 247, 5, 0.35)',
  },
  heroBadgeBest: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  heroBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  heroBadgeTextNew: {
    color: ACCENT_LIME,
  },
  heroBadgeTextBest: {
    color: '#FBBF24',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  heroTitleAccent: {
    color: ACCENT_LIME,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 16,
  },
  heroStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroStatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  heroStatText: {
    fontSize: 10.5,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  heroStatBold: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  /* ── Toolbar Card ── */
  toolbarCard: {
    backgroundColor: CARD_BG,
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 42,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: TEXT,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  toolbarBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryPillsScroll: {
    paddingTop: 12,
    gap: 6,
    alignItems: 'center',
  },
  filterLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 4,
  },
  filterLabelText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  catPillActive: {
    backgroundColor: '#0F172A',
  },
  catPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  catPillTextActive: {
    color: '#FFFFFF',
  },

  /* ── Counter Row ── */
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  counterText: {
    fontSize: 11,
    color: MUTED,
    fontWeight: '600',
  },
  counterBold: {
    color: TEXT,
    fontWeight: '900',
  },
  counterSub: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
  },

  /* ── Products Grid ── */
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: HORIZONTAL_PADDING,
    gap: CARD_GAP,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    marginBottom: 2,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  imageWrap: {
    width: '100%',
    height: 140,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  productImage: {
    width: '85%',
    height: '85%',
  },
  noImage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  noImageText: {
    fontSize: 32,
  },
  strainBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  indicaBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
  },
  indicaText: {
    color: '#7E22CE',
  },
  sativaBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  sativaText: {
    color: '#DC2626',
  },
  hybridBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  hybridText: {
    color: '#059669',
  },
  categoryBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
  },
  strainText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardBody: {
    padding: 10,
  },
  brandText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  productName: {
    fontSize: 11.5,
    fontWeight: '800',
    color: TEXT,
    lineHeight: 16,
    height: 32,
    marginBottom: 6,
  },
  thcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  thcLabel: {
    fontSize: 9.5,
    color: MUTED,
    fontWeight: '700',
  },
  thcValue: {
    fontSize: 9.5,
    color: '#10B981',
    fontWeight: '900',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  priceText: {
    fontSize: 13,
    fontWeight: '900',
    color: TEXT,
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: ACCENT_LIME,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── States ── */
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '700',
    color: MUTED,
  },
  errorContainer: {
    margin: 14,
    padding: 30,
    backgroundColor: CARD_BG,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  errorIconText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#DC2626',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: TEXT,
    marginBottom: 4,
  },
  errorSub: {
    fontSize: 11,
    color: MUTED,
    textAlign: 'center',
    marginBottom: 14,
  },
  retryBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  emptyContainer: {
    margin: 14,
    padding: 32,
    backgroundColor: CARD_BG,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  emptyIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: TEXT,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 11,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 14,
    maxWidth: 240,
  },
  clearFiltersBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  clearFiltersText: {
    fontSize: 11,
    fontWeight: '800',
    color: TEXT,
  },

  /* ── Bottom Banner ── */
  bottomBanner: {
    margin: 14,
    marginTop: 20,
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER,
  },
  bottomBannerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: TEXT,
    marginBottom: 6,
  },
  bottomBannerSub: {
    fontSize: 11.5,
    color: MUTED,
    lineHeight: 17,
    marginBottom: 14,
  },
  bottomBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    borderRadius: 12,
  },
  bottomBannerBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },

  /* ── Sort Modal ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sortModalSheet: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  sortModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginBottom: 8,
  },
  sortModalTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: TEXT,
  },
  sortOptionsList: {
    gap: 4,
  },
  sortOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  sortOptionRowActive: {
    backgroundColor: 'rgba(72, 130, 3, 0.08)',
  },
  sortOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT,
  },
  sortOptionTextActive: {
    fontWeight: '900',
    color: ACCENT_GREEN,
  },
  spinning: {
    transform: [{ rotate: '45deg' }],
  },
});
