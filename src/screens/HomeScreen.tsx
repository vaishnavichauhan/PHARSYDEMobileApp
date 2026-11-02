import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CircleUser,
  Search,
  ArrowUpDown,
  ChevronDown,
  Plus,
  X,
  Check,
  ShoppingCart,
} from 'lucide-react-native';
import {
  useProductStore,
  SORT_LABELS,
  SortOption,
  Product,
} from '../store/productStore';
import { useCartStore } from '../store/cartStore';
import { useProductDetailStore } from '../store/productDetailStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;
const BANNER_SPACING = 12;
const BANNER_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING * 2;
const BANNER_HEIGHT = 180;
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;

const HERO_IMAGES = [
  { id: '1', source: require('../assets/Images/hero1.png') },
  { id: '2', source: require('../assets/Images/hero2.png') },
  { id: '3', source: require('../assets/Images/hero3.png') },
];

const HomeScreen = () => {
  // Hero Carousel State (local carousel UI state)
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const scrollRef = useRef<any>(null);

  // Zustand Store: Product State
  const products = useProductStore(state => state.products);
  const isLoading = useProductStore(state => state.isLoading);
  const isRefreshing = useProductStore(state => state.isRefreshing);
  const searchQuery = useProductStore(state => state.searchQuery);
  const selectedCategory = useProductStore(state => state.selectedCategory);
  const selectedSort = useProductStore(state => state.selectedSort);
  const favorites = useProductStore(state => state.favorites);

  // Zustand Store: Actions
  const fetchProducts = useProductStore(state => state.fetchProducts);
  const refreshProducts = useProductStore(state => state.refreshProducts);
  const setSearchQuery = useProductStore(state => state.setSearchQuery);
  const setSelectedCategory = useProductStore(state => state.setSelectedCategory);
  const setSelectedSort = useProductStore(state => state.setSelectedSort);
  const toggleFavorite = useProductStore(state => state.toggleFavorite);
  const resetFilters = useProductStore(state => state.resetFilters);

  // Zustand Store: Cart Actions & Count
  const addToCart = useCartStore(state => state.addToCart);
  const openCart = useCartStore(state => state.openCart);
  const cartCount = useCartStore(state => state.totalCount);

  // Zustand Store: Product Detail Modal
  const openDetail = useProductDetailStore(state => state.openDetail);

  // Local UI Modals
  const [showSortModal, setShowSortModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Memoized categories & filtered products from Zustand state
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return ['All', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(p => {
        const nameMatch = p.product_name?.toLowerCase().includes(q);
        const brandMatch = p.brand?.toLowerCase().includes(q);
        const skuMatch = p.sku?.toLowerCase().includes(q);
        const catMatch = p.category?.toLowerCase().includes(q);
        return nameMatch || brandMatch || skuMatch || catMatch;
      });
    }

    if (selectedCategory !== 'All') {
      result = result.filter(
        p => p.category?.trim().toLowerCase() === selectedCategory.toLowerCase(),
      );
    }

    if (selectedSort === 'price_asc') {
      result.sort((a, b) => parseFloat(a.retail_price || '0') - parseFloat(b.retail_price || '0'));
    } else if (selectedSort === 'price_desc') {
      result.sort((a, b) => parseFloat(b.retail_price || '0') - parseFloat(a.retail_price || '0'));
    } else if (selectedSort === 'name_asc') {
      result.sort((a, b) => (a.product_name || '').localeCompare(b.product_name || ''));
    } else if (selectedSort === 'thc_desc') {
      result.sort((a, b) => parseFloat(b.thC_LEVEL || '0') - parseFloat(a.thC_LEVEL || '0'));
    }

    return result;
  }, [products, searchQuery, selectedCategory, selectedSort]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const onBannerScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const slide = Math.round(offsetX / (BANNER_WIDTH + BANNER_SPACING));
    if (slide !== activeBannerIndex && slide >= 0 && slide < HERO_IMAGES.length) {
      setActiveBannerIndex(slide);
    }
  };

  // ── Header Component for FlatList ───────────────────────────
  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* ── 1. Hero Carousel ──────────────────────────────────── */}
      <View style={styles.heroSection}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled={false}
          snapToInterval={BANNER_WIDTH + BANNER_SPACING}
          snapToAlignment="center"
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          onScroll={onBannerScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.carouselContainer}>
          {HERO_IMAGES.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.bannerCard,
                index === HERO_IMAGES.length - 1 && styles.lastBannerCard,
              ]}>
              <Image
                source={item.source}
                style={styles.bannerImage}
                resizeMode="cover"
              />
            </View>
          ))}
        </ScrollView>

        {/* Carousel Dots */}
        <View style={styles.paginationRow}>
          {HERO_IMAGES.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                idx === activeBannerIndex ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>
      </View>

      {/* ── 2. Search Bar ─────────────────────────────────────── */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <Search size={18} color={MUTED} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Keyword or Product ID"
            placeholderTextColor={MUTED}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.clearSearchBtn}>
              <X size={16} color={MUTED} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── 3. Sort & Category Filter Bar ─────────────────────── */}
      <View style={styles.filterRow}>
        {/* Sort Dropdown Button */}
        <TouchableOpacity
          style={[styles.filterButton, selectedSort !== 'default' && styles.filterButtonActive]}
          onPress={() => setShowSortModal(true)}
          activeOpacity={0.75}>
          <ArrowUpDown size={15} color={selectedSort !== 'default' ? ACCENT_DEEP : TEXT} />
          <Text
            style={[styles.filterButtonText, selectedSort !== 'default' && styles.filterButtonTextActive]}
            numberOfLines={1}>
            {selectedSort === 'default' ? 'Sort' : SORT_LABELS[selectedSort]}
          </Text>
        </TouchableOpacity>

        {/* Category Dropdown Button */}
        <TouchableOpacity
          style={[styles.filterButton, selectedCategory !== 'All' && styles.filterButtonActive]}
          onPress={() => setShowCategoryModal(true)}
          activeOpacity={0.75}>
          <Text
            style={[styles.filterButtonText, selectedCategory !== 'All' && styles.filterButtonTextActive]}
            numberOfLines={1}>
            {selectedCategory === 'All' ? 'Category' : selectedCategory}
          </Text>
          <ChevronDown size={15} color={selectedCategory !== 'All' ? ACCENT_DEEP : TEXT} />
        </TouchableOpacity>
      </View>

      {/* ── 4. Section Title & Results Count ───────────────────── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>All Products</Text>
        <Text style={styles.sectionSubtitle}>
          {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
        </Text>
      </View>
    </View>
  );

  // ── Product Card Item ───────────────────────────────────────
  const renderProductItem = ({ item }: { item: Product }) => {
    const isFav = !!favorites[item.pk];
    const strain = item.strain;

    // Strain badge color
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
      <View style={styles.productCard}>
        {/* Card Image Container – Tapping opens big image and details */}
        <TouchableOpacity
          style={styles.imageWrap}
          activeOpacity={0.9}
          onPress={() => openDetail(item)}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.productImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.noImage}>
              <Text style={styles.noImageText}>🌿</Text>
            </View>
          )}

          {/* Strain / Category Tag */}
          {strain ? (
            <View style={[styles.strainBadge, strainBadgeStyle]}>
              <Text style={[styles.strainText, strainTextStyle]}>{strain}</Text>
            </View>
          ) : item.category ? (
            <View style={[styles.strainBadge, styles.categoryBadge]}>
              <Text style={styles.categoryBadgeText} numberOfLines={1}>
                {item.category}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>

        {/* Card Body */}
        <View style={styles.cardBody}>
          {/* Brand */}
          {item.brand ? (
            <Text style={styles.brandText} numberOfLines={1}>
              {item.brand}
            </Text>
          ) : null}

          {/* Product Title – Tapping opens detail view */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => openDetail(item)}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.product_name}
            </Text>
          </TouchableOpacity>

          {/* THC / CBD */}
          {item.thC_LEVEL ? (
            <View style={styles.thcRow}>
              <Text style={styles.thcLabel}>THC:</Text>
              <Text style={styles.thcValue}>{item.thC_LEVEL}%</Text>
            </View>
          ) : null}

          {/* Price & Add Button */}
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceText}>
                ${parseFloat(item.retail_price || '0').toFixed(2)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.addBtn}
              activeOpacity={0.85}
              onPress={() => addToCart(item, 1, true)}>
              <Plus size={16} color="#0F172A" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* ── Header ────────────────────────────────────────────── */}
      <View style={styles.header}>
        {/* Left: Brand Logo */}
        <View style={styles.logoWrapper}>
          <Image
            source={require('../assets/Images/logo.webp')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Right: Cart and User Avatar */}
        <View style={styles.headerRightRow}>
          <TouchableOpacity
            style={styles.cartButton}
            onPress={openCart}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <ShoppingCart size={22} color="#0F172A" strokeWidth={1.9} />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>
                  {cartCount > 99 ? '99+' : cartCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarButton}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <CircleUser size={26} color="#0F172A" strokeWidth={1.8} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Main FlatList Grid ────────────────────────────────── */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={ACCENT_DEEP} />
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={item => item.pk || item.sku || item.product_name}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
          renderItem={renderProductItem}
          refreshing={isRefreshing}
          onRefresh={refreshProducts}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyTitle}>No Products Found</Text>
              <Text style={styles.emptySub}>
                Try adjusting your search query or category filters.
              </Text>
              {(searchQuery !== '' || selectedCategory !== 'All' || selectedSort !== 'default') && (
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={resetFilters}>
                  <Text style={styles.resetBtnText}>Reset Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* ── Sort Options Modal (Bottom Sheet Style) ────────────── */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Sort Products</Text>

            {(Object.keys(SORT_LABELS) as SortOption[]).map(key => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.modalOption,
                  selectedSort === key && styles.modalOptionActive,
                ]}
                onPress={() => {
                  setSelectedSort(key);
                  setShowSortModal(false);
                }}>
                <Text
                  style={[
                    styles.modalOptionText,
                    selectedSort === key && styles.modalOptionTextActive,
                  ]}>
                  {SORT_LABELS[key]}
                </Text>
                {selectedSort === key && (
                  <Check size={18} color={ACCENT_DEEP} strokeWidth={2.5} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Category Selection Modal (Bottom Sheet Style) ──────── */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryModal(false)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowCategoryModal(false)}>
          <View style={[styles.modalSheet, { maxHeight: '70%' }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Filter by Category</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.modalOption,
                    selectedCategory === cat && styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedCategory(cat);
                    setShowCategoryModal(false);
                  }}>
                  <Text
                    style={[
                      styles.modalOptionText,
                      selectedCategory === cat && styles.modalOptionTextActive,
                    ]}>
                    {cat}
                  </Text>
                  {selectedCategory === cat && (
                    <Check size={18} color={ACCENT_DEEP} strokeWidth={2.5} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

// ── Theme tokens (Pharsyde Light Theme - Matches Frontend) ─────
const BG = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';
const ACCENT_GREEN = '#8EF705';
const ACCENT_DEEP = '#488203';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: '#FFFFFF',
  },
  logoWrapper: {
    justifyContent: 'center',
  },
  logo: {
    width: 140,
    height: 38,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cartButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: ACCENT_GREEN,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },

  // FlatList content
  listContent: {
    paddingBottom: 110,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: CARD_GAP,
  },
  headerContent: {
    paddingTop: 16,
  },

  // Hero Section
  heroSection: {
    width: '100%',
    marginBottom: 16,
  },
  carouselContainer: {
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  bannerCard: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    marginRight: BANNER_SPACING,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: BORDER,
  },
  lastBannerCard: {
    marginRight: 0,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 22,
    backgroundColor: ACCENT_DEEP,
  },
  inactiveDot: {
    width: 6,
    backgroundColor: '#CBD5E1',
  },

  // Search Bar
  searchBarContainer: {
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: BORDER,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: TEXT,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },

  // Filter & Sort Row
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: HORIZONTAL_PADDING,
    gap: 10,
    marginBottom: 18,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 6,
  },
  filterButtonActive: {
    borderColor: ACCENT_DEEP,
    backgroundColor: 'rgba(142, 247, 5, 0.15)',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT,
  },
  filterButtonTextActive: {
    color: ACCENT_DEEP,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT,
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: MUTED,
    fontWeight: '500',
  },

  // Product Card
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  imageWrap: {
    width: '100%',
    height: 140,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
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
    fontSize: 36,
  },
  strainBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  strainText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sativaBadge: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  sativaText: {
    color: '#B45309',
  },
  indicaBadge: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  indicaText: {
    color: '#7E22CE',
  },
  hybridBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  hybridText: {
    color: '#047857',
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
  favBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cardBody: {
    padding: 12,
  },
  brandText: {
    fontSize: 11,
    color: MUTED,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT,
    lineHeight: 18,
    height: 36, // 2 lines
    marginBottom: 6,
  },
  thcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  thcLabel: {
    fontSize: 11,
    color: MUTED,
  },
  thcValue: {
    fontSize: 11,
    color: ACCENT_DEEP,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '800',
    color: TEXT,
  },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: ACCENT_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Loading & Empty States
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 50,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 18,
  },
  resetBtn: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(142, 247, 5, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(72, 130, 3, 0.3)',
  },
  resetBtnText: {
    color: ACCENT_DEEP,
    fontSize: 13,
    fontWeight: '700',
  },

  // Modal / Dropdown Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 34,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
  },
  modalOptionActive: {
    backgroundColor: 'rgba(142, 247, 5, 0.18)',
  },
  modalOptionText: {
    fontSize: 14,
    color: TEXT,
    fontWeight: '500',
  },
  modalOptionTextActive: {
    color: ACCENT_DEEP,
    fontWeight: '700',
  },
});

export default HomeScreen;
