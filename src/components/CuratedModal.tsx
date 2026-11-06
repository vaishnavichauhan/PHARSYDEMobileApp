/**
 * CuratedModal – Dedicated Full-Screen View for "New Arrivals" & "Best Sellers"
 * Matches Web Frontend NewArrivalsPage.jsx and BestSellersPage.jsx.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Animated,
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
  Leaf,
} from 'lucide-react-native';

import { useCuratedStore, CuratedType } from '../store/curatedStore';
import { Product } from '../store/productStore';
import { useCartStore } from '../store/cartStore';
import { useProductDetailStore } from '../store/productDetailStore';
import { resolveImageUrl } from '../config/api';
import { navigate } from '../navigation/navigationRef';
import { getProductWeightDisplay } from '../utils/cannabisLimit';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 14;
const CARD_GAP = 10;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;

const BG = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';
const ACCENT_LIME = '#3B82F6';
const ACCENT_GREEN = '#0166dc';

type SortOption = 'default' | 'price-low' | 'price-high' | 'name';

const ProductCardSkeleton = ({ pulseAnim }: { pulseAnim: Animated.Value }) => (
  <Animated.View style={[styles.productCard, { opacity: pulseAnim }]}>
    <View style={styles.skeletonImage} />
    <View style={styles.cardBody}>
      <View style={styles.brandRow}>
        <View style={styles.skeletonBrand} />
        <View style={styles.skeletonWeight} />
      </View>
      <View style={styles.skeletonTitleLine1} />
      <View style={styles.skeletonTitleLine2} />
      <View style={styles.skeletonSpecs} />
      <View style={styles.priceRow}>
        <View style={styles.skeletonPrice} />
        <View style={styles.skeletonAddBtn} />
      </View>
    </View>
  </Animated.View>
);

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
  const [addedProductId, setAddedProductId] = useState<string | null>(null);

  // ── Pulse Animation for Skeletons ────────────────────────────
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.9,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const handleAddToCart = (item: any) => {
    addToCart(item, 1, false);
    const key = item.pk || item.sku || item.product_name;
    setAddedProductId(key);
    setTimeout(() => {
      setAddedProductId(null);
    }, 1200);
  };

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
          {/* ── Hero Banner (Matching Frontend UI with Cannabis/Nicotine Visuals) ── */}
          <View
            style={[
              styles.heroBanner,
              isNewArrivals ? styles.heroBannerNew : styles.heroBannerBest,
            ]}>
            {/* Ambient decorative glowing backdrops */}
            <View
              style={[
                styles.ambientGlow,
                isNewArrivals ? styles.glowEmerald : styles.glowAmber,
              ]}
            />
            <View
              style={[
                styles.ambientGlowSecondary,
                isNewArrivals ? styles.glowCyan : styles.glowOrange,
              ]}
            />

            {/* Background Cannabis & Nicotine Graphic Art Composition */}
            <View style={styles.heroArtworkArea} pointerEvents="none">
              {isNewArrivals ? (
                <>
                  {/* Floating Cannabis Card */}
                  <View style={styles.heroCannabisCard}>
                    <Image
                      source={require('../assets/Images/Nicotine.png')}
                      style={styles.heroCannabisCardImg}
                      resizeMode="cover"
                    />
                    <View style={styles.heroCardOverlay}>
                      <View style={styles.heroCardTag}>
                        <Leaf size={9} color="#10B981" />
                        <Text style={styles.heroCardTagText}>CANNABIS</Text>
                      </View>
                    </View>
                  </View>

                  {/* Overlapping Floating Nicotine Vape Card */}
                  <View style={styles.heroVapeCard}>
                    <Image
                      source={require('../assets/Images/cannabis.png')}
                      style={styles.heroVapeCardImg}
                      resizeMode="cover"
                    />
                    <View style={styles.heroCardOverlay}>
                      <View style={[styles.heroCardTag, styles.heroCardTagVape]}>
                        <Flame size={9} color="#38BDF8" />
                        <Text style={[styles.heroCardTagText, styles.heroCardTagTextVape]}>VAPES</Text>
                      </View>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.heroBestCard}>
                  <Image
                    source={require('../assets/Images/hero2.png')}
                    style={styles.heroBestCardImg}
                    resizeMode="cover"
                  />
                  <View style={styles.heroCardOverlay}>
                    <View style={[styles.heroCardTag, styles.heroCardTagBest]}>
                      <Star size={9} color="#FBBF24" />
                      <Text style={[styles.heroCardTagText, styles.heroCardTagTextBest]}>TOP RATED</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.heroContent}>
              {/* Badge Pill */}
              <View
                style={[
                  styles.heroBadge,
                  isNewArrivals ? styles.heroBadgeNew : styles.heroBadgeBest,
                ]}>
                <Sparkles size={11} color={isNewArrivals ? '#1D4ED8' : '#F59E0B'} />
                <Text
                  style={[
                    styles.heroBadgeText,
                    isNewArrivals ? styles.heroBadgeTextNew : styles.heroBadgeTextBest,
                  ]}>
                  {isNewArrivals ? 'CRAFT CANNABIS & VAPES' : 'TOP RATED MENU'}
                </Text>
              </View>

              {/* Title with Highlight */}
              <Text style={[styles.heroTitle, isNewArrivals && styles.heroTitleDark]}>
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
              <Text style={[styles.heroSubtitle, isNewArrivals && styles.heroSubtitleDark]}>
                {isNewArrivals
                  ? 'Explore the latest hand-picked additions to our live store menu. From freshly harvested strains and premium flower to artisan edibles, concentrates, and hardware.'
                  : 'Explore our most sought-after products, community-acclaimed strains, and premier dispensary picks. Hand-selected and updated directly by our store team.'}
              </Text>

              {/* Stats Chips */}
              <View style={styles.heroStatsRow}>
                {isNewArrivals ? (
                  <>
                    <View style={[styles.heroStatChip, styles.heroStatChipLight]}>
                      <Flame size={12} color="#0166dc" />
                      <Text style={styles.heroStatTextLight}>
                        Showing latest{' '}
                        <Text style={styles.heroStatBoldLight}>{products.length}</Text>{' '}
                        items
                      </Text>
                    </View>
                    <View style={[styles.heroStatChip, styles.heroStatChipLight]}>
                      <Leaf size={12} color="#16A34A" />
                      <Text style={styles.heroStatTextLight}>Fresh Drops</Text>
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
                      <Award size={12} color="#3B82F6" />
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
              {/* <TouchableOpacity
                style={styles.toolbarBtn}
                onPress={handleRefresh}
                disabled={isLoading}
                activeOpacity={0.8}>
                <RefreshCw
                  size={15}
                  color={TEXT}
                  style={isLoading ? styles.spinning : undefined}
                />
              </TouchableOpacity> */}
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
            <View style={styles.skeletonGrid}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <ProductCardSkeleton key={i} pulseAnim={pulseAnim} />
              ))}
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
                const rawStrain = product.strain;
                const isNoneStrain =
                  !rawStrain ||
                  typeof rawStrain !== 'string' ||
                  rawStrain.trim().toLowerCase() === 'none' ||
                  rawStrain.trim().toLowerCase() === 'null' ||
                  rawStrain.trim().toLowerCase() === 'n/a';
                const strain = isNoneStrain ? null : rawStrain.trim();

                // 1) Indica: Blue, Hybrid: Black, Sativa: Red
                let strainBadgeStyle = styles.hybridBadge;
                let strainTextStyle = styles.hybridText;
                let strainDotStyle = styles.hybridDot;
                if (strain) {
                  const lower = strain.toLowerCase();
                  if (lower.includes('sativa')) {
                    strainBadgeStyle = styles.sativaBadge;
                    strainTextStyle = styles.sativaText;
                    strainDotStyle = styles.sativaDot;
                  } else if (lower.includes('indica')) {
                    strainBadgeStyle = styles.indicaBadge;
                    strainTextStyle = styles.indicaText;
                    strainDotStyle = styles.indicaDot;
                  }
                }

                const priceNum = parseFloat(product.retail_price || '0');
                const itemKey = product.pk || product.sku || product.product_name;
                const isAdded = addedProductId === itemKey;

                return (
                  <View key={itemKey} style={styles.productCard}>
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
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.noImage}>
                          <Text style={styles.noImageText}>🌿</Text>
                        </View>
                      )}

                      {/* 2) Highlighted Strain Badge */}
                      {strain ? (
                        <View style={[styles.strainBadge, strainBadgeStyle]}>
                          <View style={[styles.strainDot, strainDotStyle]} />
                          <Text style={[styles.strainText, strainTextStyle]}>
                            {strain}
                          </Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>

                    {/* Card Content */}
                    <View style={styles.cardBody}>
                      {/* Brand & Weight */}
                      <View style={styles.brandRow}>
                        <Text style={styles.brandText} numberOfLines={1}>
                          {product.brand?.trim() || 'PHARSYDE'}
                        </Text>
                        {getProductWeightDisplay(product) ? (
                          <View style={styles.weightBadge}>
                            <Text style={styles.weightBadgeText}>
                              {getProductWeightDisplay(product)}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => openDetail(product)}>
                        <Text style={styles.productName} numberOfLines={2}>
                          {product.product_name}
                        </Text>
                      </TouchableOpacity>

                      {/* Key Specs: THC / Category */}
                      <View style={styles.specsRow}>
                        {parseFloat(product.thC_LEVEL || '0') > 0 ? (
                          <View style={styles.thcBadge}>
                            <Text style={styles.thcBadgeLabel}>THC</Text>
                            <Text style={styles.thcBadgeValue}>
                              {parseFloat(product.thC_LEVEL || '0').toFixed(1)}%
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.categoryBadgePill}>
                            <Text style={styles.categoryTag} numberOfLines={1}>
                              {product.category || 'Curated'}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Price & Add Button */}
                      <View style={styles.priceRow}>
                        <View style={styles.priceWrap}>
                          <Text style={styles.priceText}>
                            ${priceNum.toFixed(2)}
                          </Text>
                          <Text style={styles.priceCurrency}>CAD</Text>
                        </View>

                        <TouchableOpacity
                          style={[styles.addBtn, isAdded && styles.addBtnSuccess]}
                          activeOpacity={0.85}
                          onPress={() => handleAddToCart(product)}>
                          {isAdded ? (
                            <Check size={16} color="#FFFFFF" strokeWidth={3} />
                          ) : (
                            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
                          )}
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
                navigate('Cannabis');
              }}>
              <Text style={styles.bottomBannerBtnText}>Explore Full Catalog</Text>
              <ArrowRight size={16} color="#3B82F6" strokeWidth={2.4} />
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
    color: '#FFFFFF',
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
    padding: 18,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 185,
  },
  heroBannerNew: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  heroBannerBest: {
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  ambientGlow: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  ambientGlowSecondary: {
    position: 'absolute',
    bottom: -30,
    right: 70,
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  glowEmerald: {
    backgroundColor: 'rgba(1, 102, 220, 0.07)',
  },
  glowCyan: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  glowAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
  },
  glowOrange: {
    backgroundColor: 'rgba(234, 88, 12, 0.15)',
  },
  heroArtworkArea: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 175,
    zIndex: 1,
  },
  heroCannabisCard: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 98,
    height: 122,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#0F172A',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 4,
  },
  heroCannabisCardImg: {
    width: '100%',
    height: '100%',
  },
  heroVapeCard: {
    position: 'absolute',
    bottom: 12,
    right: 80,
    width: 72,
    height: 88,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#020617',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 5,
    transform: [{ rotate: '-6deg' }],
  },
  heroVapeCardImg: {
    width: '100%',
    height: '100%',
  },
  heroBestCard: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 120,
    height: 130,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.45)',
    backgroundColor: '#0F172A',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  heroBestCardImg: {
    width: '100%',
    height: '100%',
  },
  heroCardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 4,
    paddingBottom: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
  },
  heroCardTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  heroCardTagVape: {
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
  },
  heroCardTagBest: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
  },
  heroCardTagText: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#34D399',
    letterSpacing: 0.4,
  },
  heroCardTagTextVape: {
    color: '#38BDF8',
  },
  heroCardTagTextBest: {
    color: '#FBBF24',
  },
  heroContent: {
    position: 'relative',
    zIndex: 2,
    maxWidth: '52%',
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  heroBadgeNew: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  heroBadgeBest: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.45)',
  },
  heroBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  heroBadgeTextNew: {
    color: '#1D4ED8',
  },
  heroBadgeTextBest: {
    color: '#FBBF24',
  },
  heroTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  heroTitleDark: {
    color: '#0F172A',
  },
  heroTitleAccent: {
    color: '#0166dc',
  },
  heroSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
    marginBottom: 12,
  },
  heroSubtitleDark: {
    color: '#64748B',
  },
  heroStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  heroStatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  heroStatChipLight: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  heroStatText: {
    fontSize: 10,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  heroStatTextLight: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
  heroStatBold: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  heroStatBoldLight: {
    color: '#0F172A',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    padding: 8,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  noImageText: {
    fontSize: 32,
  },

  // 1 & 2) Highlighted Strain Badges: Indica = Blue, Hybrid = Black, Sativa = Red
  strainBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.5,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 10,
  },
  strainDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  strainText: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  sativaBadge: {
    backgroundColor: '#DC2626',
    borderColor: '#EF4444',
  },
  sativaText: {
    color: '#FFFFFF',
  },
  sativaDot: {
    backgroundColor: '#FCA5A5',
  },
  indicaBadge: {
    backgroundColor: '#1D4ED8',
    borderColor: '#3B82F6',
  },
  indicaText: {
    color: '#FFFFFF',
  },
  indicaDot: {
    backgroundColor: '#93C5FD',
  },
  hybridBadge: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  hybridText: {
    color: '#FFFFFF',
  },
  hybridDot: {
    backgroundColor: '#94A3B8',
  },
  categoryBadge: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: BORDER,
    maxWidth: CARD_WIDTH - 50,
  },
  categoryBadgeText: {
    color: '#475569',
    fontSize: 9,
    fontWeight: '600',
  },

  // 3) Card Details & UI Changes
  cardBody: {
    padding: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 4,
  },
  brandText: {
    flex: 1,
    fontSize: 10,
    color: '#0166dc',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weightBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  weightBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#475569',
  },
  productName: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 17,
    minHeight: 34,
    marginBottom: 6,
  },
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  thcBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    gap: 3,
  },
  thcBadgeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  thcBadgeValue: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0166dc',
  },
  categoryBadgePill: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxWidth: CARD_WIDTH - 30,
  },
  categoryTag: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  priceCurrency: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#0166dc',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0166dc',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  addBtnSuccess: {
    backgroundColor: '#16A34A',
  },

  // 4) Loading Skeleton Elements
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: HORIZONTAL_PADDING,
    gap: CARD_GAP,
    paddingBottom: 24,
  },
  skeletonImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#E2E8F0',
  },
  skeletonBrand: {
    width: 60,
    height: 10,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  skeletonWeight: {
    width: 45,
    height: 10,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  skeletonTitleLine1: {
    width: '90%',
    height: 12,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    marginTop: 6,
  },
  skeletonTitleLine2: {
    width: '60%',
    height: 12,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    marginTop: 4,
  },
  skeletonSpecs: {
    width: 55,
    height: 14,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
    marginTop: 8,
    marginBottom: 4,
  },
  skeletonPrice: {
    width: 55,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  skeletonAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
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
    backgroundColor: '#EFF6FF',
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
    backgroundColor: 'rgba(1, 102, 220, 0.08)',
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
